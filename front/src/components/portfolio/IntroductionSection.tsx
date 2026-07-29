import { Fragment } from "react";

import { EmptyState } from "@/components/portfolio/EmptyState";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import type { Introduce } from "@/lib/content/types";

interface IntroductionSectionProps {
  readonly introduce: Introduce;
}

interface ParagraphLinesProps {
  readonly paragraph: string;
}

/**
 * 한 semantic paragraph 안의 단일 줄바꿈을 명시적인 line break로 보존한다.
 */
function ParagraphLines({ paragraph }: ParagraphLinesProps) {
  const lines = paragraph.split(/\r?\n/);

  return lines.map((line, index) => (
    <Fragment key={index}>
      {line}
      {index < lines.length - 1 ? (
        <>
          <br />{" "}
        </>
      ) : null}
    </Fragment>
  ));
}

/**
 * 검증된 introduce JSON을 제목과 semantic paragraph로만 렌더링한다.
 */
export function IntroductionSection({
  introduce,
}: IntroductionSectionProps) {
  const paragraphs = introduce.content
    .split(/\r?\n\s*\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0);

  return (
    <PortfolioSection
      id="introduce"
      number="01"
      eyebrow="소개"
      title={introduce.title}
    >
      {paragraphs.map((paragraph, index) => (
        <p className="lead" key={index}>
          <ParagraphLines paragraph={paragraph} />
        </p>
      ))}
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
