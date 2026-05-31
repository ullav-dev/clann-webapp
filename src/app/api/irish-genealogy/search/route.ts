import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.irishgenealogy.ie";

export interface IrishGenealogyRecord {
  recordId: string;
  recordType: "birth" | "marriage" | "death" | "baptism" | "burial";
  title: string;
  civilOrChurch: "civil" | "church";
  fields: Record<string, string>;
  viewUrl: string;
}

export interface IrishGenealogySearchResponse {
  records: IrishGenealogyRecord[];
  totalText: string;
  totalCount: number;
  totalPages: number;
  page: number;
  searchUrl: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function parseResults(html: string): Omit<IrishGenealogySearchResponse, "page" | "searchUrl"> {
  // Total count text, e.g. "33 results found" or "10000+ results found"
  const totalMatch = html.match(/>([\d,+]+ results? found)/);
  const totalText = totalMatch ? totalMatch[1] : "";
  const totalCount = totalText ? parseInt(totalText.replace(/[^0-9]/g, "")) : 0;

  // Pagination — find the highest page number linked
  const pageNums = [...html.matchAll(/pageTo\((\d+)\)/g)].map((m) => parseInt(m[1]));
  const totalPages = pageNums.length > 0 ? Math.max(...pageNums) : 1;

  // The results div ends just before pagination-wrapper
  const resultsStart = html.indexOf('<div id="results"');
  const paginationStart = html.indexOf('<div id="pagination-wrapper"');
  if (resultsStart < 0) return { records: [], totalText, totalCount, totalPages };

  const resultsHtml =
    paginationStart > resultsStart
      ? html.slice(resultsStart, paginationStart)
      : html.slice(resultsStart, resultsStart + 50000);

  // Split on each result item anchor — each starts with /view?record_id=
  const chunks = resultsHtml.split(/<li><a href="\/view\?record_id=/);
  const records: IrishGenealogyRecord[] = [];

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    // record_id is everything up to the first "
    const recordId = chunk.match(/^([^"]+)/)?.[1] ?? "";
    if (!recordId) continue;

    // h5 title — includes civil-church-label span we strip later
    const h5Raw = chunk.match(/<h5[^>]*>([\s\S]*?)<\/h5>/)?.[1] ?? "";
    // Pull out the civil/church label before stripping
    const civilMatch = h5Raw.match(/civil-church-label[^>]*>[\s\S]*?(civil|church)/i);
    const civilOrChurch: "civil" | "church" = civilMatch
      ? (civilMatch[1].toLowerCase() as "civil" | "church")
      : "civil";
    const title = stripTags(h5Raw.replace(/<span[^>]*>[\s\S]*?<\/span>/g, ""));

    // Field rows: <div><strong>Label: </strong>value</div>
    // Note: label ends with ": " (colon + space) before </strong>
    const fields: Record<string, string> = {};
    for (const fm of chunk.matchAll(/<div><strong>([^<:]+):\s*<\/strong>\s*([\s\S]*?)<\/div>/g)) {
      const key = fm[1].trim();
      const val = stripTags(fm[2]);
      if (key && val) fields[key] = val;
    }

    // Derive record type from title text
    let recordType: IrishGenealogyRecord["recordType"] = "birth";
    const t = title.toLowerCase();
    if (t.startsWith("marriage")) recordType = "marriage";
    else if (t.startsWith("death")) recordType = "death";
    else if (t.startsWith("burial")) recordType = "burial";
    else if (t.startsWith("baptism")) recordType = "baptism";

    records.push({
      recordId,
      recordType,
      title,
      civilOrChurch,
      fields,
      viewUrl: `${BASE}/view/?record_id=${recordId}`,
    });
  }

  return { records, totalText, totalCount, totalPages };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const firstname = sp.get("firstname") ?? "";
  const lastname = sp.get("lastname") ?? "";
  const recordSource = sp.get("recordSource") ?? "all"; // all | civil | church
  const events = sp.get("events") ?? "birth,marriage,death,baptism,burial";
  const location = sp.get("location") ?? "";
  const yearStart = sp.get("yearStart") ?? "";
  const yearEnd = sp.get("yearEnd") ?? "";
  const pg = sp.get("pg") ?? "1";

  const params = new URLSearchParams();
  if (firstname) params.set("firstname", firstname);
  if (lastname) params.set("lastname", lastname);
  params.set("church-or-civil", recordSource);
  if (location) params.set("location", location);
  if (yearStart) params.set("yearStart", yearStart);
  if (yearEnd) params.set("yearEnd", yearEnd);
  if (pg !== "1") params.set("pg", pg);
  params.set("per_page", "20");

  const eventList = events.split(",");
  if (eventList.includes("birth")) params.set("event-birth", "1");
  if (eventList.includes("marriage")) params.set("event-marriage", "1");
  if (eventList.includes("death")) params.set("event-death", "1");
  if (eventList.includes("baptism")) params.set("event-baptism", "1");
  if (eventList.includes("burial")) params.set("event-burial", "1");

  const searchUrl = `${BASE}/search/?${params.toString()}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Clann/1.3 genealogy research; +https://clann.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `irishgenealogy.ie returned ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const parsed = parseResults(html);

    const body: IrishGenealogySearchResponse = {
      ...parsed,
      page: parseInt(pg) || 1,
      searchUrl,
    };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
