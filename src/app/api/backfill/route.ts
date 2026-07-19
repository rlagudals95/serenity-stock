import { NextRequest, NextResponse } from "next/server";

import { backfillTrackedAnalystHistory } from "@/lib/pipeline/backfill";
import { getPipelineConfig } from "@/lib/pipeline/config";

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
      { error: "백필은 로컬 환경에서만 실행할 수 있습니다." },
      { status: 403 },
    );
  }

  try {
    return NextResponse.json(
      await backfillTrackedAnalystHistory(getPipelineConfig()),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "백필 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
