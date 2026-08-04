import { PortfolioExperience } from "@/components/portfolio/PortfolioExperience";
import { loadPublishedPortfolioContent } from "@/lib/content/supabase-loader";

/**
 * 공개 포트폴리오 문서는 요청 시점에 Supabase에서 읽는다.
 */
export const dynamic = "force-dynamic";

/**
 * 검증된 공개 콘텐츠를 포트폴리오 페이지로 조립한다.
 */
export default async function HomePage() {
  const content = await loadPublishedPortfolioContent();

  return <PortfolioExperience content={content} />;
}
