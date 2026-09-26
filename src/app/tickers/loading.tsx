export default function TickersLoading() {
  return <section className="brief-loading" aria-label="종목 데이터 불러오는 중" role="status">
    <div className="skeleton skeleton--eyebrow" /><div className="skeleton skeleton--heading" /><div className="skeleton skeleton--meta" />
    {[0, 1, 2].map(i => <div className="brief-loading-row" key={i}><div className="skeleton skeleton--ticker" /><div className="skeleton skeleton--meta" /></div>)}
    <span className="sr-only">공개 의견을 불러오고 있어요.</span>
  </section>;
}
