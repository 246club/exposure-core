import { NextResponse } from "next/server";

import { loadIncludedExposureForAsset } from "@/lib/incident/includedExposure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const url = new URL(request.url);
  const chain = url.searchParams.get("chain") ?? undefined;
  const protocol = url.searchParams.get("protocol") ?? undefined;

  const payload = await loadIncludedExposureForAsset({ id, chain, protocol });
  if (!payload) {
    return NextResponse.json(
      { error: "Included exposure unavailable", id, chain, protocol },
      { status: 404 },
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
