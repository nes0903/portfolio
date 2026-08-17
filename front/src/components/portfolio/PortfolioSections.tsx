import { CareerSection } from "@/components/portfolio/CareerSection";
import { IntroductionSection } from "@/components/portfolio/IntroductionSection";
import { SideProjectsSection } from "@/components/portfolio/SideProjectsSection";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import type { PortfolioContentViewModel } from "@/lib/content/types";

interface PortfolioSectionsProps {
  readonly content: PortfolioContentViewModel;
  readonly editor?: PortfolioEditorBridge;
}

/**
 * 전체 portfolio view model의 세 개 scroll section을 렌더링한다.
 */
export function PortfolioSections({ content, editor }: PortfolioSectionsProps) {
  return (
    <>
      <IntroductionSection
        editor={editor}
        introduce={content.introduce}
        skills={content.skills}
        visual={content.visuals.sections.introduce}
      />

      <CareerSection
        careers={content.careers}
        editor={editor}
        visual={content.visuals.sections.career}
      />

      <SideProjectsSection
        editor={editor}
        sideProjects={content.sideProjects}
        visual={content.visuals.sections["side-projects"]}
      />
    </>
  );
}
