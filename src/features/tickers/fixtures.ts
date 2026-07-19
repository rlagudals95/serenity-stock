import type {
  AnalystComparison,
  AnalystSnapshot,
  ChangeType,
  Stance,
  TickerDetail,
  TickerOverview,
  TrendPoint,
} from "./types";

const baseTickerOverviewFixtures: Array<Omit<TickerOverview, "analysts">> = [
  {
    ticker: "COHR",
    companyName: "Coherent Corp.",
    totalMentions: 47,
    positiveCount: 38,
    negativeCount: 3,
    neutralCount: 2,
    mixedCount: 3,
    unknownCount: 1,
    cumulativeSentiment: "positive",
    latestStance: "bullish",
    changeType: "new_claim",
    mentions7d: 8,
    mentions30d: 17,
    lastMentionedAt: "2026-07-18T05:42:00.000Z",
    watchlisted: true,
    reviewCount: 0,
  },
  {
    ticker: "AAOI",
    companyName: "Applied Optoelectronics",
    totalMentions: 31,
    positiveCount: 20,
    negativeCount: 4,
    neutralCount: 3,
    mixedCount: 4,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "mixed",
    changeType: "new_risk",
    mentions7d: 2,
    mentions30d: 12,
    lastMentionedAt: "2026-07-17T08:00:00.000Z",
    watchlisted: false,
    reviewCount: 1,
  },
  {
    ticker: "LITE",
    companyName: "Lumentum Holdings",
    totalMentions: 24,
    positiveCount: 5,
    negativeCount: 12,
    neutralCount: 3,
    mixedCount: 3,
    unknownCount: 1,
    cumulativeSentiment: "negative",
    latestStance: "bearish",
    changeType: "stance_change",
    mentions7d: 5,
    mentions30d: 9,
    lastMentionedAt: "2026-07-18T02:20:00.000Z",
    watchlisted: true,
    reviewCount: 0,
  },
  {
    ticker: "NVDA",
    companyName: "NVIDIA Corp.",
    totalMentions: 18,
    positiveCount: 10,
    negativeCount: 3,
    neutralCount: 2,
    mixedCount: 2,
    unknownCount: 1,
    cumulativeSentiment: "positive",
    latestStance: "neutral",
    changeType: "repeat",
    mentions7d: 3,
    mentions30d: 8,
    lastMentionedAt: "2026-07-16T13:10:00.000Z",
    watchlisted: false,
    reviewCount: 0,
  },
  {
    ticker: "ASTS",
    companyName: "AST SpaceMobile",
    totalMentions: 15,
    positiveCount: 4,
    negativeCount: 6,
    neutralCount: 2,
    mixedCount: 2,
    unknownCount: 1,
    cumulativeSentiment: "mixed",
    latestStance: "bullish",
    changeType: "new_claim",
    mentions7d: 4,
    mentions30d: 7,
    lastMentionedAt: "2026-07-18T01:15:00.000Z",
    watchlisted: true,
    reviewCount: 2,
  },
  {
    ticker: "RKLB",
    companyName: "Rocket Lab USA",
    totalMentions: 13,
    positiveCount: 8,
    negativeCount: 2,
    neutralCount: 1,
    mixedCount: 2,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "bullish",
    changeType: "first_mention",
    mentions7d: 6,
    mentions30d: 13,
    lastMentionedAt: "2026-07-17T22:40:00.000Z",
    watchlisted: false,
    reviewCount: 0,
  },
  {
    ticker: "CRDO",
    companyName: "Credo Technology Group",
    totalMentions: 12,
    positiveCount: 7,
    negativeCount: 1,
    neutralCount: 2,
    mixedCount: 2,
    unknownCount: 0,
    cumulativeSentiment: "positive",
    latestStance: "bullish",
    changeType: "new_claim",
    mentions7d: 4,
    mentions30d: 9,
    lastMentionedAt: "2026-07-17T18:05:00.000Z",
    watchlisted: true,
    reviewCount: 0,
  },
  {
    ticker: "GOOGL",
    companyName: "Alphabet Inc.",
    totalMentions: 9,
    positiveCount: 2,
    negativeCount: 2,
    neutralCount: 3,
    mixedCount: 1,
    unknownCount: 1,
    cumulativeSentiment: "mixed",
    latestStance: "neutral",
    changeType: null,
    mentions7d: 1,
    mentions30d: 4,
    lastMentionedAt: "2026-07-14T09:35:00.000Z",
    watchlisted: false,
    reviewCount: 0,
  },
];

const narratives: Record<
  string,
  {
    claim: string;
    earlierClaim: string;
    risk: string;
    catalyst: string;
    evidence: string;
    stance: Stance;
    changeType: ChangeType;
  }
> = {
  COHR: {
    claim: "1.6T 광통신 수요가 예상보다 빠르게 생산 능력을 흡수하고 있다는 주장",
    earlierClaim: "AI 네트워크 투자에서 광학 부품 병목이 장기화될 수 있다는 관점",
    risk: "대규모 증설 이후 주문 전환 속도가 둔화될 가능성",
    catalyst: "하이퍼스케일러의 1.6T 전환 일정과 신규 고객 인증",
    evidence:
      "1.6T demand is pulling forward faster than expected, and qualified capacity remains the constraint.",
    stance: "bullish",
    changeType: "new_claim",
  },
  AAOI: {
    claim: "데이터센터 매출 성장의 질은 높지만 단일 고객 집중도를 함께 봐야 한다는 주장",
    earlierClaim: "800G 출하량 확대가 외형 성장을 이끌 것이라는 관점",
    risk: "주요 고객의 발주 시점 변화가 분기 실적 변동성을 키울 가능성",
    catalyst: "신규 고객향 800G 제품 양산 승인",
    evidence:
      "The demand signal is intact, but customer concentration makes the quarterly path less clean.",
    stance: "mixed",
    changeType: "new_risk",
  },
  LITE: {
    claim: "광학 수요 회복보다 제품 믹스와 마진 정상화가 늦어질 수 있다는 주장",
    earlierClaim: "통신 부문 재고 정상화가 하반기 실적을 지지할 것이라는 관점",
    risk: "산업용 레이저 약세와 가격 경쟁이 회복을 상쇄할 가능성",
    catalyst: "클라우드 고객향 신규 트랜시버 공급",
    evidence:
      "Revenue can recover before earnings quality does; mix and pricing still need proof.",
    stance: "bearish",
    changeType: "stance_change",
  },
  NVDA: {
    claim: "AI 인프라 수요는 유지되지만 공급망 개선 내용은 이미 기대에 반영됐다는 주장",
    earlierClaim: "차세대 GPU 전환이 데이터센터 투자를 다시 가속할 것이라는 관점",
    risk: "고객사의 자본 지출 증가율 둔화",
    catalyst: "차세대 시스템의 랙 단위 출하 안정화",
    evidence:
      "The demand debate is less useful now than the deployment and power bottleneck debate.",
    stance: "neutral",
    changeType: "repeat",
  },
  ASTS: {
    claim: "위성 배치 일정이 지켜지면 상용 서비스 검증 구간에 진입한다는 주장",
    earlierClaim: "기술 검증과 자금 조달 리스크를 동시에 봐야 한다는 관점",
    risk: "발사 일정 지연과 추가 자금 조달 가능성",
    catalyst: "상용 위성 발사와 통신사 서비스 개시",
    evidence:
      "The next set of launches changes this from a technology story into an execution story.",
    stance: "bullish",
    changeType: "new_claim",
  },
  RKLB: {
    claim: "발사 서비스보다 우주 시스템 부문의 반복 매출이 투자 논리의 중심이라는 주장",
    earlierClaim: "초기 관찰 종목으로 편입",
    risk: "Neutron 개발 일정과 자본 지출 증가",
    catalyst: "신규 정부 계약과 Neutron 엔진 시험",
    evidence:
      "The underappreciated piece is recurring space systems revenue, not launch headlines.",
    stance: "bullish",
    changeType: "first_mention",
  },
  CRDO: {
    claim: "AEC 채택 확대가 단기 고객 집중보다 더 중요한 구조적 변화라는 주장",
    earlierClaim: "AI 클러스터 연결 수요가 고속 인터커넥트 시장을 확대한다는 관점",
    risk: "대형 고객의 자체 설계 전환",
    catalyst: "차세대 AEC 제품의 고객 다변화",
    evidence:
      "AEC adoption is moving from a niche topology choice to a default at scale.",
    stance: "bullish",
    changeType: "new_claim",
  },
  GOOGL: {
    claim: "AI 검색 수익화와 인프라 비용의 균형을 더 확인해야 한다는 주장",
    earlierClaim: "검색 광고 방어력은 유지되지만 비용 구조 변화가 중요하다는 관점",
    risk: "AI 응답 비용과 검색 광고 전환율의 불확실성",
    catalyst: "AI Overview 광고 형식의 확장",
    evidence:
      "The product engagement is visible; the unit economics still need a cleaner read.",
    stance: "neutral",
    changeType: null,
  },
};

function fixtureAnalysts(
  row: Omit<TickerOverview, "analysts">,
): AnalystSnapshot[] {
  const shayMentions = Math.max(2, Math.round(row.totalMentions * 0.4));
  const serenityMentions = row.totalMentions - shayMentions;
  const shayPositive = Math.min(
    shayMentions,
    Math.round(row.positiveCount * 0.45),
  );
  const shayNegative = Math.min(
    shayMentions - shayPositive,
    Math.round(row.negativeCount * 0.55),
  );
  const shayOther = Math.max(0, shayMentions - shayPositive - shayNegative);
  const serenityPositive = Math.max(0, row.positiveCount - shayPositive);
  const serenityNegative = Math.max(0, row.negativeCount - shayNegative);
  const serenityOther = Math.max(
    0,
    serenityMentions - serenityPositive - serenityNegative,
  );

  return [
    {
      key: "shay_boloor",
      name: "Shay Boloor",
      username: "StockSavvyShay",
      totalMentions: shayMentions,
      positiveCount: shayPositive,
      negativeCount: shayNegative,
      neutralCount: Math.ceil(shayOther / 2),
      mixedCount: Math.floor(shayOther / 2),
      unknownCount: 0,
      cumulativeSentiment:
        shayPositive + shayNegative < 3
          ? "insufficient"
          : shayPositive >= shayNegative
            ? "positive"
            : "negative",
      latestStance: narratives[row.ticker].stance,
      latestClaim: narratives[row.ticker].claim,
      latestChangeType: narratives[row.ticker].changeType,
      firstMentionedAt: "2026-05-10T03:00:00.000Z",
      lastMentionedAt: row.lastMentionedAt,
      latestSourceUrl: sourceUrl(
        row.ticker,
        1,
        "StockSavvyShay",
      ),
    },
    {
      key: "serenity",
      name: "Serenity",
      username: "aleabitoreddit",
      totalMentions: serenityMentions,
      positiveCount: serenityPositive,
      negativeCount: serenityNegative,
      neutralCount: Math.ceil(serenityOther / 2),
      mixedCount: Math.floor(serenityOther / 2),
      unknownCount: 0,
      cumulativeSentiment: row.cumulativeSentiment,
      latestStance: row.latestStance,
      latestClaim: narratives[row.ticker].earlierClaim,
      latestChangeType: row.changeType,
      firstMentionedAt: "2026-04-01T03:00:00.000Z",
      lastMentionedAt: "2026-07-16T03:20:00.000Z",
      latestSourceUrl: sourceUrl(row.ticker, 2, "aleabitoreddit"),
    },
  ];
}

export const tickerOverviewFixtures: TickerOverview[] =
  baseTickerOverviewFixtures.map((row) => ({
    ...row,
    analysts: fixtureAnalysts(row),
  }));

function sourceUrl(
  ticker: string,
  offset: number,
  username = "aleabitoreddit",
) {
  const base = 1900000000000000000n + BigInt(ticker.charCodeAt(0) * 100 + offset);
  return `https://x.com/${username}/status/${base}`;
}

function buildTrend(seed: number): TrendPoint[] {
  const dates = [
    "2026-04-18",
    "2026-04-28",
    "2026-05-08",
    "2026-05-18",
    "2026-05-28",
    "2026-06-07",
    "2026-06-17",
    "2026-06-27",
    "2026-07-02",
    "2026-07-07",
    "2026-07-12",
    "2026-07-18",
  ];

  return dates.map((date, index) => ({
    date,
    positive: (seed + index * 2) % 5,
    negative: (seed + index) % 3 === 0 ? 1 : 0,
    other: (seed + index) % 4 === 0 ? 1 : 0,
  }));
}

function buildDetail(row: TickerOverview, index: number): TickerDetail {
  const narrative = narratives[row.ticker];
  const analysts = row.analysts ?? [];
  const source1 = sourceUrl(row.ticker, 1, "StockSavvyShay");
  const source2 = sourceUrl(row.ticker, 2, "aleabitoreddit");
  const source3 = sourceUrl(row.ticker, 3, "StockSavvyShay");
  const analystComparison: AnalystComparison =
    analysts.length < 2
      ? "single_source"
      : analysts.some((analyst) => analyst.latestStance === "bullish") &&
          analysts.some((analyst) => analyst.latestStance === "bearish")
        ? "disagreement"
        : analysts.every(
              (analyst) =>
                analyst.latestStance === analysts[0].latestStance,
            )
          ? "agreement"
          : "mixed";
  const shay = {
    key: "shay_boloor" as const,
    name: "Shay Boloor",
    username: "StockSavvyShay",
  };
  const serenity = {
    key: "serenity" as const,
    name: "Serenity",
    username: "aleabitoreddit",
  };

  return {
    ...row,
    analysts,
    threadCount: Math.max(4, Math.round(row.totalMentions * 0.64)),
    lastAnalysisAt: "2026-07-18T08:02:00.000Z",
    analystComparison,
    recentChange: {
      summary: narrative.claim,
      confidence: row.reviewCount > 0 ? 0.72 : 0.91,
      currentSourceUrl: source1,
      previousSourceUrl: narrative.changeType === "first_mention" ? null : source2,
    },
    claims: [
      {
        id: `${row.ticker}-claim-1`,
        date: row.lastMentionedAt,
        stance: narrative.stance,
        changeType: narrative.changeType,
        text: narrative.claim,
        sourceUrl: source1,
        analyst: shay,
      },
      {
        id: `${row.ticker}-claim-2`,
        date: "2026-07-09T03:20:00.000Z",
        stance: row.cumulativeSentiment === "negative" ? "bearish" : "bullish",
        changeType: "repeat",
        text: narrative.earlierClaim,
        sourceUrl: source2,
        repeatCount: 3,
        analyst: serenity,
      },
      {
        id: `${row.ticker}-claim-3`,
        date: "2026-06-28T11:10:00.000Z",
        stance: "neutral",
        changeType: "unclear",
        text: `${row.companyName}의 다음 실적에서 주문과 매출 인식 시차를 확인해야 한다는 주장`,
        sourceUrl: source3,
        analyst: shay,
      },
    ],
    risks: [
      {
        id: `${row.ticker}-risk-1`,
        text: narrative.risk,
        date: "2026-07-16T06:30:00.000Z",
        sourceUrl: source2,
        analyst: serenity,
      },
      {
        id: `${row.ticker}-risk-2`,
        text: "시장 기대가 실제 실적 개선보다 빠르게 높아질 가능성",
        date: "2026-07-05T02:15:00.000Z",
        sourceUrl: source3,
        analyst: shay,
      },
    ],
    catalysts: [
      {
        id: `${row.ticker}-catalyst-1`,
        text: narrative.catalyst,
        date: "2026-07-15T01:40:00.000Z",
        sourceUrl: source1,
        analyst: shay,
      },
      {
        id: `${row.ticker}-catalyst-2`,
        text: "다음 분기 가이던스에서 확인되는 수요 지속성",
        date: "2026-07-03T04:25:00.000Z",
        sourceUrl: source3,
        analyst: shay,
      },
    ],
    trend: buildTrend(index + 1),
    opinions: [
      {
        id: `${row.ticker}-opinion-1`,
        postedAt: row.lastMentionedAt,
        stance: narrative.stance,
        changeType: narrative.changeType,
        claimType: narrative.changeType === "new_risk" ? "risk" : "thesis",
        novelty: narrative.changeType === "repeat" ? "repeat" : "new",
        conviction: "medium",
        claim: narrative.claim,
        evidence: narrative.evidence,
        fullText: `${narrative.evidence} ${narrative.claim} 다음 실적에서 주문 전환과 생산 능력의 균형을 다시 확인할 필요가 있다.`,
        sourceUrl: source1,
        confidence: row.reviewCount > 0 ? 0.72 : 0.93,
        reviewStatus: row.reviewCount > 0 ? "needs_review" : "auto",
        analyst: shay,
      },
      {
        id: `${row.ticker}-opinion-2`,
        postedAt: "2026-07-09T03:20:00.000Z",
        stance: row.cumulativeSentiment === "negative" ? "bearish" : "bullish",
        changeType: "repeat",
        claimType: "thesis",
        novelty: "repeat",
        conviction: "high",
        claim: narrative.earlierClaim,
        evidence:
          "The setup is unchanged, but the next quarter should tell us whether demand converts into revenue.",
        fullText: `${narrative.earlierClaim} 반복 언급이며 새로운 방향 전환으로 보기는 어렵다.`,
        sourceUrl: source2,
        confidence: 0.9,
        reviewStatus: "approved",
        analyst: serenity,
      },
      {
        id: `${row.ticker}-opinion-3`,
        postedAt: "2026-07-05T02:15:00.000Z",
        stance: "mixed",
        changeType: "new_risk",
        claimType: "risk",
        novelty: "new",
        conviction: "low",
        claim: narrative.risk,
        evidence:
          "Expectations are moving faster than the evidence in the reported numbers.",
        fullText: `${narrative.risk} 이 가능성은 방향 전환보다는 확인할 리스크로 기록한다.`,
        sourceUrl: source3,
        confidence: 0.84,
        reviewStatus: "auto",
        analyst: shay,
      },
    ],
    research: {
      priority: row.watchlisted ? "high" : "medium",
      status: row.watchlisted ? "researching" : "unreviewed",
      note: row.watchlisted
        ? `${narrative.catalyst} 관련 원문과 다음 실적 자료를 함께 확인한다.`
        : "",
    },
  };
}

export const tickerDetailFixtures = tickerOverviewFixtures.map(buildDetail);

export function getFixtureTickerDetail(ticker: string) {
  const normalized = ticker.toUpperCase();
  return tickerDetailFixtures.find((item) => item.ticker === normalized);
}
