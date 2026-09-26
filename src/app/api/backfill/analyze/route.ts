import { TICKER_DATA_CACHE_TAG } from "@/features/tickers/cache-policy";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getPipelineConfig } from "@/lib/pipeline/config";
import { analyzeHeldPostsBatch } from "@/lib/pipeline/held-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLocalRequest(request: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(
    request.nextUrl.hostname,
  );
}

export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      { error: "과거 글 분석은 로컬 환경에서만 실행할 수 있습니다." },
      { status: 403 },
    );
  }

  try {
    const result = await analyzeHeldPostsBatch(getPipelineConfig());
    revalidateTag(TICKER_DATA_CACHE_TAG, { expire: 0 });
    revalidatePath("/tickers", "layout");
    revalidatePath("/watchlist");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "과거 글 분석 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
