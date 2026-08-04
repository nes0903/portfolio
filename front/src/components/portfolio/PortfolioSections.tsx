import { CareerSection } from "@/components/portfolio/CareerSection";
import { ContactSection } from "@/components/portfolio/ContactSection";
import { IntroductionSection } from "@/components/portfolio/IntroductionSection";
import { SideProjectsSection } from "@/components/portfolio/SideProjectsSection";
import { SkillsSection } from "@/components/portfolio/SkillsSection";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import type { PortfolioContentViewModel } from "@/lib/content/types";

interface PortfolioSectionsProps {
  readonly content: PortfolioContentViewModel;
  readonly editor?: PortfolioEditorBridge;
}

/**
 * 전체 portfolio view model을 정확히 다섯 개 section으로 렌더링한다.
 */
export function PortfolioSections({ content, editor }: PortfolioSectionsProps) {
  return (
    <>
      <IntroductionSection
        editor={editor}
        introduce={content.introduce}
        visual={content.visuals.sections.introduce}
      />

      <SkillsSection
        editor={editor}
        skills={content.skills}
        visual={content.visuals.sections.skills}
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

      <ContactSection
        contacts={content.contacts}
        editor={editor}
        visual={content.visuals.sections.contact}
      />
    </>
  );
}
