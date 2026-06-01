import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://clann-server:3001";

// Bypasses the middleware Edge Runtime rewrite so multipart/form-data bodies
// are streamed correctly in the Node.js runtime (same pattern as persons/[id]/image).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const search = request.nextUrl.search;
  const upstream = `${API_URL}/api/trees/${encodeURIComponent(name)}/image${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("transfer-encoding");

  const res = await fetch(upstream, {
    method: "POST",
    headers,
    body: request.body,
    // @ts-expect-error — duplex is required for streaming request bodies in Node.js fetch
    duplex: "half",
  });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const search = request.nextUrl.search;
  const upstream = `${API_URL}/api/trees/${encodeURIComponent(name)}/image${search}`;

  const res = await fetch(upstream, { headers: request.headers });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
