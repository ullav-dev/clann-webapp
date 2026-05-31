import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.irishgenealogy.ie";

export interface IrishGenealogyRecordDetail {
  fields: Record<string, string>;
  imageLinks: { label: string; url: string }[];
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

export async function GET(req: NextRequest) {
  const recordId = req.nextUrl.searchParams.get("id");
  if (!recordId) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const url = `${BASE}/view/?record_id=${encodeURIComponent(recordId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Clann/1.3 genealogy research; +https://clann.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 3600 }, // cache detail pages 1 h — they don't change
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `irishgenealogy.ie returned ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Locate the detail section
    const detailStart = html.indexOf('<div id="result-details"');
    if (detailStart < 0) {
      return NextResponse.json({ fields: {}, imageLinks: [] });
    }
    // The section ends at the closing </div></div> after the table and ul
    const detailEnd = html.indexOf("</article>", detailStart);
    const detail = detailEnd > 0 ? html.slice(detailStart, detailEnd) : html.slice(detailStart, detailStart + 5000);

    // Table rows: <td>Key:</td> <td>Value</td>
    const fields: Record<string, string> = {};
    for (const rm of detail.matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
      const key = decodeEntities(rm[1].trim().replace(/:$/, ""));
      const rawVal = rm[2];
      // Skip the raw file path row — we extract image links separately
      if (key === "Image path" || rawVal.includes("/files/")) continue;
      const val = decodeEntities(rawVal.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      if (key && val) fields[key] = val;
    }

    // Image PDF links: href="/files/..."
    const imageLinks: { label: string; url: string }[] = [];
    for (const im of detail.matchAll(/href="(\/files\/[^"]+\.(?:pdf|tif)[^"]*)"/g)) {
      const path = im[1];
      // Derive a clean label from the filename context — look for nearby link text
      const linkTextMatch = detail.slice(
        Math.max(0, im.index! - 20),
        im.index! + 200
      ).match(/>([^<]{1,30})<\/a>/);
      const label = linkTextMatch
        ? decodeEntities(linkTextMatch[1].trim())
        : "View image";
      imageLinks.push({ label, url: `${BASE}${path}` });
    }

    return NextResponse.json({ fields, imageLinks } satisfies IrishGenealogyRecordDetail);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
