import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { IntroductionTextCanvas } from "@/components/portfolio/IntroductionTextCanvas";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { SkillsContent } from "@/components/portfolio/SkillsSection";
import { DEFAULT_INTRODUCTION_VISUAL } from "@/lib/content/schema";
import type {
  Introduce,
  PortfolioIntroductionVisual,
  Skill,
} from "@/lib/content/types";

interface IntroductionSectionProps {
  readonly editor?: PortfolioEditorBridge;
  readonly introduce: Introduce;
  readonly skills: readonly Skill[];
  readonly visual?: PortfolioIntroductionVisual;
}

/**
 * 검증된 introduce JSON을 제목과 semantic paragraph로만 렌더링한다.
 */
export function IntroductionSection({
  editor,
  introduce,
  skills,
  visual = DEFAULT_INTRODUCTION_VISUAL,
}: IntroductionSectionProps) {
  return (
    <PortfolioSection
      id="introduce"
      number="01"
      eyebrow="소개"
      title={introduce.title}
      editor={editor}
      renderTitle={false}
      visual={visual}
    >
      <IntroductionTextCanvas
        blocks={visual.textBlocks}
        editor={editor}
        introduce={introduce}
      />
      <SkillsContent editor={editor} skills={skills} />
    </PortfolioSection>
  );
}
