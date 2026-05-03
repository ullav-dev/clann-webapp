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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const search = request.nextUrl.search;
  const upstream = `${API_URL}/api/persons/${id}/image${search}`;

  const res = await fetch(upstream, { headers: request.headers });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
