import type { TickerBrief } from "./briefing-model";

export interface OpportunityCopy {
  angle: string;
  title: string;
  teaser: string;
}

/** Editorial hooks are matched to the displayed source claim, never inferred from ticker or price. */
export function opportunityCopy(brief: TickerBrief): OpportunityCopy {
  const claim = brief.expectation?.text ?? "";
  const context = [claim, ...brief.snapshot.sources.map(source => source.claim)].join(" ");
  if (/AI|인공지능/i.test(context) && /광통신|광학/.test(claim) && /수요/.test(claim) && /생산|병목|공급/.test(claim)) {
    return { angle: "수요와 공급의 틈", title: "AI가 커질수록,\n더 필요한 기업", teaser: "광통신 수요가 생산능력을 앞선다는 관점" };
  }
  if (/위성/.test(claim) && /상용/.test(claim)) {
    return { angle: "상용화의 전환점", title: "상용화 문턱,\n다음은 매출일까?", teaser: "위성 발사 이후의 서비스 전환에 주목" };
  }
  if (/반복\s*매출|recurring revenue/i.test(claim)) {
    return { angle: "반복 매출의 힘", title: "한 번의 흥행보다,\n반복해서 버는 사업", teaser: "반복 매출이 성장의 중심이라는 관점" };
  }
  if (/채택\s*확대|adoption/i.test(claim)) {
    return { angle: "제품 확산의 기회", title: "더 많은 고객이\n쓰게 된다면?", teaser: "제품 채택이 확대된다는 의견에 주목" };
  }
  // Without a matched thesis, keep a neutral hook and a bounded excerpt of the source.
  return { angle: "새로 살펴볼 기업", title: claim ? "이 기업을\n눈여겨보는 이유" : "이 기업의\n다음 변화는?", teaser: claim ? (claim.length > 60 ? `${claim.slice(0, 60)}…` : claim) : "판단할 근거를 더 확인해 보세요" };
}
