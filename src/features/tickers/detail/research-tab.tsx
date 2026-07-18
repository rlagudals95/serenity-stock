"use client";

import { Check, Save } from "lucide-react";
import { FormEvent, useState } from "react";

import type { TickerDetail } from "../types";

export function ResearchTab({ ticker }: { ticker: TickerDetail }) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDirty(false);
    setSavedAt(
      new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
  }

  return (
    <form
      className="research-form"
      onChange={() => {
        setDirty(true);
        setSavedAt(null);
      }}
      onSubmit={save}
    >
      <div className="research-field">
        <label>Watchlist 우선순위</label>
        <div className="segmented-control">
          {[
            ["low", "낮음"],
            ["medium", "보통"],
            ["high", "높음"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                defaultChecked={ticker.research.priority === value}
                name="priority"
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="research-field">
        <span>리서치 상태</span>
        <select defaultValue={ticker.research.status}>
          <option value="unreviewed">확인 전</option>
          <option value="researching">조사 중</option>
          <option value="complete">확인 완료</option>
          <option value="paused">보류</option>
        </select>
      </label>

      <label className="research-field">
        <span>개인 메모</span>
        <textarea
          defaultValue={ticker.research.note}
          placeholder="다음에 확인할 자료나 생각을 기록합니다."
          rows={9}
        />
      </label>

      <footer className="research-form__footer">
        <span className="save-status" role="status">
          {savedAt ? (
            <>
              <Check aria-hidden="true" size={14} />
              저장됨 · {savedAt} KST
            </>
          ) : dirty ? (
            "저장하지 않은 변경"
          ) : (
            "마지막 저장 상태"
          )}
        </span>
        <button className="primary-button" disabled={!dirty} type="submit">
          <Save aria-hidden="true" size={15} />
          저장
        </button>
      </footer>
    </form>
  );
}
