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

function createContentWithFormattingAcrossSections() {
  const content = createContent();

  return {
    ...content,
    introduce: {
      ...content.introduce,
      title: "[b]서식 소개 제목[/b]",
    },
    skills: content.skills.map((skill, index) =>
      index === 0 ? { ...skill, name: "[u]서식 기술명[/u]" } : skill,
    ),
    careers: content.careers.map((career, index) =>
      index === 0
        ? { ...career, company: "[i]서식 회사명[/i]" }
        : career,
    ),
    sideProjects: content.sideProjects.map((project, index) =>
      index === 0
        ? { ...project, name: "[mark]서식 프로젝트명[/mark]" }
        : project,
    ),
    contacts: content.contacts.map((contact) =>
      contact.channel === "github"
        ? { ...contact, label: "[b]서식 연락처[/b]" }
        : contact,
    ),
  };
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("PortfolioExperience visual editor bridge", () => {
  it("단일 세로 목차와 네 개 section을 연속 scroll 순서로 렌더링한다", () => {
    const { container } = render(<PortfolioExperience content={createContent()} />);
    const navigation = container.querySelectorAll("[data-section-navigation]");
    const sections = [
      ...container.querySelectorAll<HTMLElement>(
        "[data-scroll-sections] > [data-section]",
      ),
    ];

    expect(navigation).toHaveLength(1);
    expect(sections.map((section) => section.id)).toEqual([
      "introduce",
      "career",
      "side-projects",
      "contact",
    ]);
    expect(container.querySelector("[data-carousel]")).not.toBeInTheDocument();
    expect(container.querySelector("[data-carousel-card]")).not.toBeInTheDocument();
    sections.forEach((section) => {
      expect(section).not.toHaveAttribute("aria-roledescription", "slide");
    });
  });

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
    const customText = screen
      .getByText("직접 수정할 추가 텍스트")
      .closest<HTMLElement>("[contenteditable]");

    if (!customText) throw new Error("추가 텍스트 편집 요소가 필요합니다");

    expect(customText).toHaveAttribute("contenteditable", "true");
    customText.textContent = "화면에서 수정한 추가 텍스트";
    fireEvent.blur(customText);

    expect(onTextCommit).toHaveBeenCalledWith(
      "introductionTextBlocks:intro-text-test:text",
      "화면에서 수정한 추가 텍스트",
    );
  });

  it("모든 주요 섹션의 콘텐츠 서식을 공통 렌더러로 표시한다", () => {
    render(
      <PortfolioExperience content={createContentWithFormattingAcrossSections()} />,
    );

    expect(screen.getByText("서식 소개 제목").tagName).toBe("STRONG");
    expect(screen.getByText("서식 기술명").tagName).toBe("U");
    expect(screen.getByText("서식 회사명").tagName).toBe("EM");
    expect(screen.getByText("서식 프로젝트명").tagName).toBe("MARK");
    expect(screen.getByText("서식 연락처").tagName).toBe("STRONG");
  });

  it("관리자 미리보기에서 편집한 Action 서식을 경량 마크업으로 보존한다", () => {
    const onTextCommit = vi.fn();
    render(
      <PortfolioExperience
        content={createContent()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onSelectIntroductionTextBlock: vi.fn(),
          onSelectSection: vi.fn(),
          onTextCommit,
          selectedIntroductionTextBlockId: null,
          selectedSection: "career",
        }}
      />,
    );
    const actionList = screen.getByRole("list", {
      name: "Define content contract 작업 내용",
    });

    actionList.innerHTML =
      "<li><strong>강조 문구</strong>입니다.</li><li><u>밑줄 문구</u>입니다.</li>";
    fireEvent.blur(actionList);

    expect(onTextCommit).toHaveBeenCalledWith(
      "careerWorks:current-contract:description",
      "- [b]강조 문구[/b]입니다.\n- [u]밑줄 문구[/u]입니다.",
    );
  });

  it("Action 외 제목에서도 선택 서식을 같은 버튼으로 적용하고 해제한다", () => {
    const originalRectDescriptor = Object.getOwnPropertyDescriptor(
      Range.prototype,
      "getBoundingClientRect",
    );
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          bottom: 120,
          height: 20,
          left: 100,
          right: 180,
          top: 100,
          width: 80,
          x: 100,
          y: 100,
        }) as DOMRect,
    });

    try {
      render(
        <PortfolioExperience
          content={createContent()}
          editor={{
            onChangeIntroductionTextBlock: vi.fn(),
            onSelectIntroductionTextBlock: vi.fn(),
            onSelectSection: vi.fn(),
            onTextCommit: vi.fn(),
            selectedIntroductionTextBlockId: null,
            selectedSection: "career",
          }}
        />,
      );
      const heading = screen.getByRole("heading", {
        level: 1,
        name: "제품을 끝까지 책임지는 개발자",
      });
      const textNode = heading.querySelector(".formatted-text")?.firstChild;
      const selection = window.getSelection();

      if (!textNode || !selection) {
        throw new Error("제목 선택 범위가 필요합니다");
      }

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, Math.min(4, textNode.textContent?.length ?? 0));
      selection.removeAllRanges();
      selection.addRange(range);
      fireEvent(document, new Event("selectionchange"));

      const underlineButton = screen.getByRole("button", {
        name: "밑줄 토글",
      });
      fireEvent.mouseDown(underlineButton);
      fireEvent.click(underlineButton);
      expect(heading.querySelectorAll("u")).toHaveLength(1);
      expect(underlineButton).toHaveAttribute("aria-pressed", "true");

      fireEvent.mouseDown(underlineButton);
      fireEvent.click(underlineButton);
      expect(heading.querySelectorAll("u")).toHaveLength(0);
      expect(heading.innerHTML).not.toContain("[u][u]");
    } finally {
      if (originalRectDescriptor) {
        Object.defineProperty(
          Range.prototype,
          "getBoundingClientRect",
          originalRectDescriptor,
        );
      } else {
        Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
      }
    }
  });
});
