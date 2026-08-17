import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortfolioExperience } from "@/components/portfolio/PortfolioExperience";
import { stripInlineFormatting } from "@/components/portfolio/FormattedText";
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

function createContentWithBackgroundImage() {
  const content = createContent();

  return {
    ...content,
    visuals: {
      ...content.visuals,
      sections: {
        ...content.visuals.sections,
        introduce: {
          ...content.visuals.sections.introduce,
          backgroundImage: {
            alt: "검정 덮개를 사용하는 소개 배경",
            overlayOpacity: 0.4,
            path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
            positionX: 35,
            positionY: 62,
            url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/example.webp",
          },
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

function setCaret(item: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  const range = document.createRange();
  const textNode = item.firstChild;

  if (textNode instanceof Text) {
    range.setStart(textNode, Math.min(offset, textNode.data.length));
  } else {
    range.setStart(item, 0);
  }

  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
  item.focus();
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("PortfolioExperience visual editor bridge", () => {
  it("단일 세로 목차와 세 개 section 및 고정 연락처 rail을 렌더링한다", () => {
    const { container } = render(<PortfolioExperience content={createContent()} />);
    const navigation = container.querySelectorAll("[data-section-navigation]");
    const sections = [
      ...container.querySelectorAll<HTMLElement>(
        "[data-scroll-sections] > [data-section]",
      ),
    ];

    expect(navigation).toHaveLength(1);
    expect(container.querySelectorAll("[data-starfield]")).toHaveLength(1);
    expect(sections.map((section) => section.id)).toEqual([
      "introduce",
      "career",
      "side-projects",
    ]);
    expect(container.querySelector("section#contact")).toBeNull();
    expect(
      screen.getByRole("complementary", { name: "연락처" }),
    ).toHaveAttribute("id", "contact");
    expect(container.querySelector("[data-carousel]")).not.toBeInTheDocument();
    expect(container.querySelector("[data-carousel-card]")).not.toBeInTheDocument();
    sections.forEach((section) => {
      expect(section).not.toHaveAttribute("aria-roledescription", "slide");
    });
  });

  it("저장된 배경색을 무시하고 나머지 디자인 토큰만 적용한다", () => {
    const { container } = render(<PortfolioExperience content={createContent()} />);
    const experience = container.querySelector<HTMLElement>(
      ".portfolio-experience",
    );
    const introduce = container.querySelector<HTMLElement>("#introduce");

    expect(experience?.style.getPropertyValue("--film")).toBe("");
    expect(
      experience?.style.getPropertyValue("--portfolio-card-radius"),
    ).toBe("");
    expect(introduce?.style.getPropertyValue("--section-background")).toBe("");
  });

  it("사용자 배경 사진에는 고정된 검정 덮개를 적용한다", () => {
    const { container } = render(
      <PortfolioExperience content={createContentWithBackgroundImage()} />,
    );
    const overlay = container.querySelector<HTMLElement>(
      ".section-background-overlay",
    );

    expect(overlay).toHaveStyle({
      backgroundColor: "#000000",
      opacity: "0.4",
    });
  });

  it("관리자 모드에서 실제 제목을 직접 편집해 필드 변경을 전달한다", () => {
    const onTextCommit = vi.fn();
    render(
      <PortfolioExperience
        content={createContent()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onChangeRecentTextColors: vi.fn(),
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
          onChangeRecentTextColors: vi.fn(),
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

  it("검증된 HEX 글자색 마크업만 렌더링하고 접근성 문구에서는 제거한다", () => {
    const content = createContent();
    render(
      <PortfolioExperience
        content={{
          ...content,
          introduce: {
            ...content.introduce,
            title: "제품을 [color=#F28C28]끝까지[/color] 책임지는 개발자",
          },
        }}
      />,
    );

    const coloredText = screen.getByText("끝까지");
    expect(coloredText).toHaveAttribute("data-text-color", "#F28C28");
    expect(coloredText).toHaveStyle({ color: "#F28C28" });
    expect(
      stripInlineFormatting(
        "제품을 [color=#F28C28]끝까지[/color] 책임지는 개발자",
      ),
    ).toBe("제품을 끝까지 책임지는 개발자");
  });

  it("관리자 미리보기에서 편집한 Action 서식을 경량 마크업으로 보존한다", () => {
    const onTextCommit = vi.fn();
    render(
      <PortfolioExperience
        content={createContent()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onChangeRecentTextColors: vi.fn(),
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
      '<li data-bullet="true"><strong>강조 문구</strong>입니다.</li><li><u>일반 문장</u>입니다.</li>';
    fireEvent.blur(actionList);

    expect(onTextCommit).toHaveBeenCalledWith(
      "careerWorks:current-contract:description",
      "- [b]강조 문구[/b]입니다.\n[u]일반 문장[/u]입니다.",
    );
  });

  it("- 입력·Enter·빈 bullet Enter·줄 시작 Backspace를 Notion 방식으로 처리한다", () => {
    const content = createContent();
    const project = content.sideProjects[0];
    if (!project) throw new Error("project fixture가 필요합니다");
    const editor = {
      onChangeIntroductionTextBlock: vi.fn(),
      onChangeRecentTextColors: vi.fn(),
      onSelectIntroductionTextBlock: vi.fn(),
      onSelectSection: vi.fn(),
      onTextCommit: vi.fn(),
      selectedIntroductionTextBlockId: null,
      selectedSection: "side-projects" as const,
    };
    const { container } = render(
      <PortfolioExperience
        content={{
          ...content,
          sideProjects: content.sideProjects.map((item) =>
            item.id === project.id ? { ...item, highlights: [] } : item,
          ),
        }}
        editor={editor}
      />,
    );
    const list = container.querySelector<HTMLElement>(
      `[data-editor-field="sideProjectHighlights:${project.id}:all"]`,
    );
    const firstItem = list?.querySelector<HTMLLIElement>(":scope > li");
    if (!list || !firstItem) throw new Error("editable project list가 필요합니다");

    firstItem.textContent = "- ";
    setCaret(firstItem, 2);
    fireEvent.input(list, { data: " ", inputType: "insertText" });
    expect(firstItem).toHaveAttribute("data-bullet", "true");
    expect(firstItem).toHaveTextContent("");

    firstItem.textContent = "첫 항목";
    firstItem.dataset.bullet = "true";
    setCaret(firstItem, firstItem.textContent.length);
    fireEvent.keyDown(list, { key: "Enter" });
    const itemsAfterEnter = list.querySelectorAll<HTMLLIElement>(":scope > li");
    expect(itemsAfterEnter).toHaveLength(2);
    const secondItem = itemsAfterEnter[1];
    if (!secondItem) throw new Error("두 번째 bullet이 필요합니다");
    expect(secondItem).toHaveAttribute("data-bullet", "true");

    setCaret(secondItem, 0);
    fireEvent.keyDown(list, { key: "Enter" });
    expect(secondItem).not.toHaveAttribute("data-bullet");

    setCaret(firstItem, 0);
    fireEvent.keyDown(list, { key: "Backspace" });
    expect(firstItem).not.toHaveAttribute("data-bullet");
  });

  it("Outcome과 프로젝트 목록을 bullet 상태가 포함된 전체 값으로 직렬화한다", () => {
    const content = createContent();
    const work = content.careers[0]?.works[0];
    const project = content.sideProjects[0];
    if (!work || !project) throw new Error("list fixture가 필요합니다");
    const onTextCommit = vi.fn();
    const { container } = render(
      <PortfolioExperience
        content={content}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onChangeRecentTextColors: vi.fn(),
          onSelectIntroductionTextBlock: vi.fn(),
          onSelectSection: vi.fn(),
          onTextCommit,
          selectedIntroductionTextBlockId: null,
          selectedSection: "career",
        }}
      />,
    );
    const outcome = container.querySelector<HTMLElement>(
      `[data-editor-field="careerWorkAchievements:${work.id}:all"]`,
    );
    const highlights = container.querySelector<HTMLElement>(
      `[data-editor-field="sideProjectHighlights:${project.id}:all"]`,
    );
    if (!outcome || !highlights) throw new Error("editable lists가 필요합니다");

    outcome.innerHTML =
      '<li data-bullet="true"><strong>성과</strong></li><li>일반 결과</li>';
    fireEvent.blur(outcome);
    highlights.innerHTML =
      '<li>일반 작업</li><li data-bullet="true"><u>목록 작업</u></li>';
    fireEvent.blur(highlights);

    expect(onTextCommit).toHaveBeenCalledWith(
      `careerWorkAchievements:${work.id}:all`,
      "- [b]성과[/b]\n일반 결과",
    );
    expect(onTextCommit).toHaveBeenCalledWith(
      `sideProjectHighlights:${project.id}:all`,
      "일반 작업\n- [u]목록 작업[/u]",
    );
  });

  it("경력 제목은 더블클릭 편집 후 blur에서 한 번만 저장한다", () => {
    const onTextCommit = vi.fn();
    const { container } = render(
      <PortfolioExperience
        content={createContent()}
        editor={{
          onChangeIntroductionTextBlock: vi.fn(),
          onChangeRecentTextColors: vi.fn(),
          onSelectIntroductionTextBlock: vi.fn(),
          onSelectSection: vi.fn(),
          onTextCommit,
          selectedIntroductionTextBlockId: null,
          selectedSection: "career",
        }}
      />,
    );
    const title = container.querySelector<HTMLElement>(
      '[data-editor-disclosure-title="careerWorks:current-contract:title"]',
    );
    const summary = title?.closest("summary");

    if (!title || !summary) {
      throw new Error("경력 작업 제목이 필요합니다");
    }

    expect(summary).not.toHaveAttribute("contenteditable");
    expect(title).not.toHaveAttribute("contenteditable");

    fireEvent.doubleClick(title);
    const editingTitle = container.querySelector<HTMLElement>(
      '[data-editor-disclosure-title="careerWorks:current-contract:title"]',
    );
    expect(editingTitle).toHaveAttribute("contenteditable", "true");

    if (!editingTitle) throw new Error("편집 중인 경력 제목이 필요합니다");
    editingTitle.textContent = "중복 없이 수정한 제목";
    fireEvent.blur(editingTitle);
    fireEvent.blur(editingTitle);

    expect(onTextCommit).toHaveBeenCalledTimes(1);
    expect(onTextCommit).toHaveBeenCalledWith(
      "careerWorks:current-contract:title",
      "중복 없이 수정한 제목",
    );
    const displayTitle = container.querySelector<HTMLElement>(
      '[data-editor-disclosure-title="careerWorks:current-contract:title"]',
    );
    expect(displayTitle).not.toHaveAttribute("contenteditable");
    expect(displayTitle).toHaveTextContent("Define content contract");
    expect(
      container.querySelectorAll(
        '[data-editor-disclosure-title="careerWorks:current-contract:title"]',
      ),
    ).toHaveLength(1);
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
            onChangeRecentTextColors: vi.fn(),
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

  it("선택한 일부 문자열의 글자색을 경량 마크업으로 저장한다", () => {
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
      const onTextCommit = vi.fn();
      const onChangeRecentTextColors = vi.fn();
      render(
        <PortfolioExperience
          content={createContent()}
          editor={{
            onChangeIntroductionTextBlock: vi.fn(),
            onChangeRecentTextColors,
            onSelectIntroductionTextBlock: vi.fn(),
            onSelectSection: vi.fn(),
            onTextCommit,
            selectedIntroductionTextBlockId: null,
            selectedSection: "introduce",
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
        throw new Error("글자색을 적용할 선택 범위가 필요합니다");
      }

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 2);
      selection.removeAllRanges();
      selection.addRange(range);
      fireEvent(document, new Event("selectionchange"));

      fireEvent.click(
        screen.getByRole("button", { name: "글자색 팔레트" }),
      );
      expect(
        screen.getByRole("dialog", { name: "글자색 선택" }),
      ).toBeInTheDocument();
      expect(screen.getByText("포트폴리오 테마")).toBeInTheDocument();
      expect(screen.getByText("기본 색상")).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: "#F28C28 색상 선택" }),
      );
      expect(heading.querySelector("[data-text-color]")).toBeNull();
      expect(onTextCommit).not.toHaveBeenCalled();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog", { name: "글자색 선택" }))
        .not.toBeInTheDocument();
      expect(heading.querySelector("[data-text-color]")).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: "글자색 팔레트" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "#F28C28 색상 선택" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "적용" }));

      const coloredText = heading.querySelector<HTMLElement>(
        'span[data-text-color="#F28C28"]',
      );
      expect(coloredText).not.toBeNull();
      expect(coloredText).toHaveTextContent("제품");

      fireEvent.click(
        screen.getByRole("button", { name: "글자색 팔레트" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "#00AEEF 색상 선택" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "적용" }));
      expect(heading.querySelectorAll("span[data-text-color]")).toHaveLength(1);
      expect(
        heading.querySelector('span[data-text-color="#00AEEF"]'),
      ).not.toBeNull();

      fireEvent.blur(heading);
      expect(onTextCommit).toHaveBeenCalledWith(
        "introduce.title",
        "[color=#00AEEF]제품[/color]을 끝까지 책임지는 개발자",
      );
      expect(onChangeRecentTextColors).toHaveBeenCalledWith([
        "#00AEEF",
        "#F28C28",
      ]);
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
