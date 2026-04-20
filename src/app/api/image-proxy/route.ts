import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  return Response.json({
    ok: true,
    gotUrl: url,
  });
}