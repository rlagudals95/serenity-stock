import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TickerNotFound() {
  return (
    <section className="route-empty">
      <p className="section-kicker">NOT FOUND</p>
      <h1>종목을 찾을 수 없습니다.</h1>
      <p>분석된 ticker인지 확인하고 Overview에서 다시 선택해 주세요.</p>
      <Link className="text-button" href="/tickers">
        <ArrowLeft aria-hidden="true" size={14} />
        종목 분석으로
      </Link>
    </section>
  );
}
