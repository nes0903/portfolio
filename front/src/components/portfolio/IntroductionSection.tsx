import { EmptyState } from "@/components/portfolio/EmptyState";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { IntroductionTextCanvas } from "@/components/portfolio/IntroductionTextCanvas";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { DEFAULT_INTRODUCTION_VISUAL } from "@/lib/content/schema";
import type {
  Introduce,
  PortfolioIntroductionVisual,
} from "@/lib/content/types";

interface IntroductionSectionProps {
  readonly editor?: PortfolioEditorBridge;
  readonly introduce: Introduce;
  readonly visual?: PortfolioIntroductionVisual;
}

/**
 * 검증된 introduce JSON을 제목과 semantic paragraph로만 렌더링한다.
 */
export function IntroductionSection({
  editor,
  introduce,
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
      <div className="actions">
        <a className="btn" href="#career">
          경력 근거 보기
        </a>
        <a className="btn alt" href="#contact">
          연락 방법 보기
        </a>
      </div>
      <EmptyState>표시할 소개 근거가 없습니다.</EmptyState>
    </PortfolioSection>
  );
}
