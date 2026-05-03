import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://clann-server:3001";

// These handlers bypass the middleware rewrite so that multipart/form-data bodies
// are streamed in the Node.js runtime. NextResponse.rewrite() runs in the Edge
// Runtime and doesn't properly forward binary bodies, causing clann-server's
// multipart parser to hang indefinitely.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const search = request.nextUrl.search;
  const upstream = `${API_URL}/api/persons/${id}/image${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  // transfer-encoding is a hop-by-hop header managed by the Node.js runtime;
  // forwarding it causes undici to throw UND_ERR_INVALID_ARG on chunked requests
  // (e.g. browser HTTP/2 FormData uploads converted to chunked by Traefik).
  headers.delete("transfer-encoding");

  console.log(`[image-upload] POST id=${id} ct=${headers.get("content-type")?.slice(0, 40)} te=${request.headers.get("transfer-encoding")}`);
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers,
      body: request.body,
      // @ts-expect-error — duplex is required for streaming request bodies in Node.js fetch
      duplex: "half",
    });
    console.log(`[image-upload] upstream responded ${res.status}`);
    return new NextResponse(res.body, { status: res.status, headers: res.headers });
  } catch (e) {
    console.error(`[image-upload] fetch failed:`, e);
    return new NextResponse(JSON.stringify({ error: "upstream fetch failed" }), { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const search = request.nextUrl.search;
  const upstream = `${API_URL}/api/persons/${id}/image${search}`;

  const res = await fetch(upstream, { headers: request.headers });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
