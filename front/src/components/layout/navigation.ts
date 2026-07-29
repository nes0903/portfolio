/**
 * 단일 페이지 내비게이션과 section이 공유하는 anchor 계약.
 */
export const PORTFOLIO_SECTIONS = [
  { id: "introduce", label: "소개", number: "01" },
  { id: "skills", label: "기술", number: "02" },
  { id: "career", label: "경력", number: "03" },
  { id: "side-projects", label: "사이드 프로젝트", number: "04" },
  { id: "contact", label: "연락처", number: "05" },
] as const;

export type PortfolioSectionId = (typeof PORTFOLIO_SECTIONS)[number]["id"];
