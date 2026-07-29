import { CareerSection } from "@/components/portfolio/CareerSection";
import { ContactSection } from "@/components/portfolio/ContactSection";
import { IntroductionSection } from "@/components/portfolio/IntroductionSection";
import { SideProjectsSection } from "@/components/portfolio/SideProjectsSection";
import { SkillsSection } from "@/components/portfolio/SkillsSection";
import type { PortfolioContentViewModel } from "@/lib/content/types";

interface PortfolioSectionsProps {
  readonly content: PortfolioContentViewModel;
}

/**
 * 전체 portfolio view model을 정확히 다섯 개 section으로 렌더링한다.
 */
export function PortfolioSections({ content }: PortfolioSectionsProps) {
  return (
    <>
      <IntroductionSection introduce={content.introduce} />

      <SkillsSection skills={content.skills} />

      <CareerSection careers={content.careers} />

      <SideProjectsSection sideProjects={content.sideProjects} />

      <ContactSection contacts={content.contacts} />
    </>
  );
}
