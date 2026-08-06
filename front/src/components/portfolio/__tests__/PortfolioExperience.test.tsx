import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioExperience } from "@/components/portfolio/PortfolioExperience";
import {
  createPortfolioContentViewModel,
  portfolioDocumentContentSchema,
} from "@/lib/content/model";
import { createValidContentFiles } from "@/test/content-fixtures";

function createContent() {
  const files = createValidContentFiles();
  const document = portfolioDocumentContentSchema.parse({
    introduce: files["introduce.json"],
    skills: files["skill.json"],
    careers: files["career.json"],
    careerWorks: files["career-work.json"],
    sideProjects: files["side-project.json"],
    contacts: files["contact.json"],
  });

  return createPortfolioContentViewModel({
    ...document,
    visuals: {
      ...document.visuals,
      pageBackgroundColor: "#112233",
      sections: {
        ...document.visuals.sections,
        introduce: {
          ...document.visuals.sections.introduce,
          backgroundColor: "#223344",
        },
      },
    },
  });
}

function createContentWithCustomTextBlock() {
  const content = createContent();

  return {
    ...content,
    visuals: {
      ...content.visuals,
      sections: {
        ...content.visuals.sections,
        introduce: {
          ...content.visuals.sections.introduce,
          textBlocks: [
            ...content.visuals.sections.introduce.textBlocks,
            {
              fontSize: 24,
              height: 12,
              id: "intro-text-test",
              kind: "custom" as const,
              text: "직접 수정할 추가 텍스트",
              textAlign: "left" as const,
              width: 36,
              x: 60,
              y: 78,
            },
          ],
        },
      },
    },
  };
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("PortfolioExperience visual editor bridge", () => {
  it("공개 화면과 같은 컴포넌트에 전체·섹션 디자인 토큰을 적용한다", () => {
    const { container } = render(<PortfolioExperience content={createContent()} />);
    const experience = container.querySelector<HTMLElement>(
      ".portfolio-experience",
    );
    const introduce = container.querySelector<HTMLElement>("#introduce");

    expect(experience?.style.getPropertyValue("--film")).toBe("#112233");
    expect(introduce?.style.getPropertyValue("--section-background")).toBe(
      "#223344",
    );
  });

  it("관리자 모드에서 실제 제목을 직접 편집해 필드 변경을 전달한다", () => {
    const onTextCommit = vi.fn();
    render(
      <PortfolioExperience
        content={createContent()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onSelectIntroductionTextBlock: vi.fn(),
          onSelectSection: vi.fn(),
          onTextCommit,
          selectedIntroductionTextBlockId: "intro-title",
          selectedSection: "introduce",
        }}
      />,
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "제품을 끝까지 책임지는 개발자",
    });

    expect(heading).toHaveAttribute("contenteditable", "true");
    heading.textContent = "화면에서 수정한 제목";
    fireEvent.blur(heading);

    expect(onTextCommit).toHaveBeenCalledWith(
      "introduce.title",
      "화면에서 수정한 제목",
    );
  });

  it("관리자 모드에서 추가한 텍스트 박스도 직접 수정한다", () => {
    const onTextCommit = vi.fn();
    render(
      <PortfolioExperience
        content={createContentWithCustomTextBlock()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onSelectIntroductionTextBlock: vi.fn(),
          onSelectSection: vi.fn(),
          onTextCommit,
          selectedIntroductionTextBlockId: "intro-text-test",
          selectedSection: "introduce",
        }}
      />,
    );
    const customText = screen.getByText("직접 수정할 추가 텍스트");

    expect(customText).toHaveAttribute("contenteditable", "true");
    customText.textContent = "화면에서 수정한 추가 텍스트";
    fireEvent.blur(customText);

    expect(onTextCommit).toHaveBeenCalledWith(
      "introductionTextBlocks:intro-text-test:text",
      "화면에서 수정한 추가 텍스트",
    );
  });
});
