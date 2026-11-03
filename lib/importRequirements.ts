// 수입요건(세관장확인) 확인 "후보" 목록.
// 확정 목록이 아니라 관세사가 요건확인서류를 다시 살펴볼 대상을 좁히기 위한 참고용입니다.
// 해당 여부는 품목 사양·정격에 따라 달라지므로, 반드시 관세청 수출입요건확인 통합공고와 대조해야 합니다.
// 필요한 항목을 이 배열에 추가·수정하면 보고서에 바로 반영됩니다. (prefix: HS코드 앞자리 4~10자리)
export interface RequirementRule {
  prefix: string;
  product: string;
  basis: string;
  note: string;
}

export const REQUIREMENT_RULES: RequirementRule[] = [
  { prefix: "850760", product: "리튬이온 축전지", basis: "전기용품 및 생활용품 안전관리법", note: "안전확인 대상 여부 확인" },
  { prefix: "850440", product: "정지형 변환기(충전기·전원공급장치 등)", basis: "전기용품 및 생활용품 안전관리법 · 전파법(적합성평가)", note: "정격·용도에 따라 대상 여부가 다름" },
  { prefix: "853650", product: "전기회로 개폐용 기기(스위치 등)", basis: "전기용품 및 생활용품 안전관리법", note: "정격전압·용도에 따라 대상 여부가 다름" },
  { prefix: "853669", product: "플러그·소켓 등 접속기", basis: "전기용품 및 생활용품 안전관리법", note: "정격전압·용도에 따라 대상 여부가 다름" },
  { prefix: "8517", product: "통신기기", basis: "전파법(적합성평가)", note: "방송통신기자재 해당 여부 확인" },
  { prefix: "8471", product: "자동자료처리기계", basis: "전파법(적합성평가)", note: "방송통신기자재 해당 여부 확인" },
];

export function matchRequirement(hsCode: string): RequirementRule | undefined {
  return REQUIREMENT_RULES.filter((rule) => hsCode.startsWith(rule.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
}
