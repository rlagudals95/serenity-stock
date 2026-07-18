"use client";

import { CircleCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SyncResult {
  fetched: number;
  inserted: number;
  duplicates: number;
  analyzed: number;
  failed: number;
}

type SyncState =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "success"; result: SyncResult }
  | { status: "error"; message: string };

export function SyncButton({
  configured,
  missing,
}: {
  configured: boolean;
  missing: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SyncState>({ status: "idle" });
  const syncing = state.status === "syncing";

  async function sync() {
    setState({ status: "syncing" });
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const body = (await response.json()) as SyncResult & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "동기화에 실패했습니다.");
      }
      setState({ status: "success", result: body });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "동기화에 실패했습니다.",
      });
    }
  }

  const title = !configured
    ? `필수 환경 변수: ${missing.join(", ")}`
    : state.status === "error"
      ? state.message
      : state.status === "success"
        ? `수집 ${state.result.fetched} · 신규 ${state.result.inserted} · 중복 ${state.result.duplicates} · 분석 ${state.result.analyzed}`
        : "Serenity의 신규 X 글을 수집하고 DeepSeek로 분석";
  const label =
    state.status === "syncing"
      ? "분석 중"
      : state.status === "success"
        ? `${state.result.analyzed}건 완료`
        : state.status === "error"
          ? "재시도"
          : "동기화";
  const Icon =
    state.status === "success"
      ? CircleCheck
      : state.status === "error"
        ? TriangleAlert
        : RefreshCw;

  return (
    <button
      aria-label="데이터 동기화"
      className={`sync-button sync-button--${state.status}`}
      disabled={!configured || syncing}
      onClick={sync}
      title={title}
      type="button"
    >
      <Icon aria-hidden="true" className={syncing ? "is-spinning" : ""} size={14} />
      <span>{label}</span>
    </button>
  );
}
