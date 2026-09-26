"use client";

import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { TickerDetail } from "../types";
import { useResearch } from "../use-research";
import { saveResearch } from "../research-state";
import { trackProductEvent } from "../product-events";
import { formatKstDate } from "../format";

export function ResearchTab({ ticker }: { ticker: TickerDetail }) {
  const { records, ready } = useResearch();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const record = records[ticker.ticker];
  const value = record ?? ticker.research;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      saveResearch(ticker.ticker, {
        note: String(form.get("note") ?? ""),
        priority: form.get("priority") as TickerDetail["research"]["priority"],
        status: form.get("status") as TickerDetail["research"]["status"],
      });
      setError(false); setDirty(false); setMessage("기록을 이 브라우저에 저장했어요.");
      trackProductEvent("review_saved", ticker.ticker, "research");
    } catch {
      setError(true); setMessage("저장하지 못했어요. 입력한 내용은 남아 있으니 다시 시도해 주세요.");
    }
  }

  if (!ready) return <p role="status">저장한 기록을 불러오는 중이에요.</p>;
  return <form key={ticker.ticker} className="research-form brief-research" onSubmit={save} onChange={() => { setDirty(true); setMessage(""); }}>
    <header><h2>관심을 가진 이유를 남겨보세요</h2><p>다음에 이 종목을 볼 때 다시 확인할 수 있어요.</p></header>
    <label className="research-field"><span>관심을 가진 이유 · 다음에 확인할 것</span><textarea name="note" defaultValue={value.note} maxLength={10000} rows={6} placeholder="어떤 근거에 관심을 가졌나요? 무엇이 달라지면 다시 판단할까요?" /></label>
    <div className="brief-research-options">
      <label className="research-field"><span>검토 상태</span><select name="status" defaultValue={value.status}><option value="unreviewed">확인 전</option><option value="researching">검토 중</option><option value="complete">확인 완료</option><option value="paused">보류</option></select></label>
      <label className="research-field"><span>우선순위</span><select name="priority" defaultValue={value.priority}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></label>
    </div>
    <footer className="research-form__footer"><span className="save-status" role={error ? "alert" : "status"}>{message || (dirty ? "아직 저장하지 않은 내용이 있어요." : record?.savedAt ? `마지막 저장 ${formatKstDate(record.savedAt)} KST` : "이 브라우저에 기록을 보관해요.")}</span><button className="brief-button" type="submit" disabled={!dirty}><Save size={16} aria-hidden="true" />기록 저장</button></footer>
    <p className="brief-storage-note">기록은 현재 브라우저에 보관됩니다. 다른 기기에는 동기화되지 않으며 브라우저 데이터를 지우면 삭제돼요.</p>
  </form>;
}
