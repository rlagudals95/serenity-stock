export default function TickersLoading() {
  return (
    <section aria-label="종목 데이터 불러오는 중" className="overview-page">
      <header className="page-heading">
        <div>
          <div className="skeleton skeleton--eyebrow" />
          <div className="skeleton skeleton--heading" />
          <div className="skeleton skeleton--meta" />
        </div>
      </header>
      <div className="table-workspace">
        <div className="skeleton skeleton--controls" />
        <div className="loading-table">
          <div className="loading-table__header" />
          {Array.from({ length: 8 }, (_, index) => (
            <div className="loading-table__row" key={index}>
              <span className="skeleton skeleton--ticker" />
              <span className="skeleton skeleton--number" />
              <span className="skeleton skeleton--distribution" />
              <span className="skeleton skeleton--pill" />
              <span className="skeleton skeleton--pill" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
