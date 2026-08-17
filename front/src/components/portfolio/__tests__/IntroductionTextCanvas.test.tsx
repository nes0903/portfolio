import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntroductionSection } from "@/components/portfolio/IntroductionSection";
import { DEFAULT_INTRODUCTION_VISUAL } from "@/lib/content/schema";

afterEach(() => {
  cleanup();
});

describe("IntroductionTextCanvas", () => {
  it("저장된 위치·크기·글자 크기와 추가 텍스트를 공개 화면에 적용한다", () => {
    const visual = {
      ...DEFAULT_INTRODUCTION_VISUAL,
      textBlocks: [
        ...DEFAULT_INTRODUCTION_VISUAL.textBlocks,
        {
          fontSize: 30,
          height: 12,
          id: "intro-text-extra",
          kind: "custom" as const,
          text: "추가한 소개 텍스트",
          textAlign: "right" as const,
          width: 34,
          x: 60,
          y: 78,
        },
      ],
    };
    const { container } = render(
      <IntroductionSection
        introduce={{ title: "배치 가능한 제목", content: "배치 가능한 내용" }}
        skills={[]}
        visual={visual}
      />,
    );

    const customBlock = container.querySelector<HTMLElement>(
      '[data-text-block-id="intro-text-extra"]',
    );
    const canvas = container.querySelector<HTMLElement>(
      ".introduction-text-canvas",
    );
    expect(canvas).toHaveStyle({ height: "498px" });
    expect(customBlock).toHaveStyle({
      left: "60%",
      minHeight: "60px",
      textAlign: "right",
      top: "390px",
      width: "34%",
    });
    expect(customBlock?.style.getPropertyValue("--text-block-font-size")).toBe(
      "30px",
    );
    expect(screen.getByText("추가한 소개 텍스트")).toBeInTheDocument();
  });

  it("실제 글자 높이 때문에 겹친 박스를 아래로 밀고 관리자 값도 보정한다", () => {
    const onChangeIntroductionTextBlock = vi.fn();
    const editor = {
      onChangeIntroductionTextBlock,
      onChangeRecentTextColors: vi.fn(),
      onSelectIntroductionTextBlock: vi.fn(),
      onSelectSection: vi.fn(),
      onTextCommit: vi.fn(),
      selectedIntroductionTextBlockId: "intro-content",
      selectedSection: "introduce" as const,
    };
    const visual = {
      ...DEFAULT_INTRODUCTION_VISUAL,
      textBlocks: [...DEFAULT_INTRODUCTION_VISUAL.textBlocks],
    };
    const { container, rerender } = render(
      <IntroductionSection
        editor={editor}
        introduce={{ title: "높이가 큰 제목", content: "소개 내용" }}
        skills={[]}
        visual={visual}
      />,
    );
    const titleBlock = container.querySelector<HTMLElement>(
      '[data-text-block-id="intro-title"]',
    );
    const bodyBlock = container.querySelector<HTMLElement>(
      '[data-text-block-id="intro-content"]',
    );
    if (!titleBlock || !bodyBlock) {
      throw new Error("소개 텍스트 박스가 필요합니다");
    }

    titleBlock.getBoundingClientRect = () =>
      ({
        bottom: 350,
        height: 350,
        left: 0,
        right: 740,
        top: 0,
        width: 740,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    bodyBlock.getBoundingClientRect = () =>
      ({
        bottom: 380,
        height: 90,
        left: 0,
        right: 520,
        top: 290,
        width: 520,
        x: 0,
        y: 290,
        toJSON: () => ({}),
      }) as DOMRect;

    rerender(
      <IntroductionSection
        editor={editor}
        introduce={{ title: "높이가 큰 제목", content: "소개 내용" }}
        skills={[]}
        visual={{ ...visual, textBlocks: [...visual.textBlocks] }}
      />,
    );

    expect(bodyBlock).toHaveStyle({ top: "370px" });
    expect(onChangeIntroductionTextBlock).toHaveBeenCalledWith(
      "intro-content",
      { y: 74 },
    );
  });

  it("관리자 이동·크기 핸들이 퍼센트 배치 변경을 전달한다", () => {
    const onChangeIntroductionTextBlock = vi.fn();
    const editor = {
      onChangeIntroductionTextBlock,
      onChangeRecentTextColors: vi.fn(),
      onSelectIntroductionTextBlock: vi.fn(),
      onSelectSection: vi.fn(),
      onTextCommit: vi.fn(),
      selectedIntroductionTextBlockId: "intro-title",
      selectedSection: "introduce" as const,
    };
    const { container } = render(
      <IntroductionSection
        editor={editor}
        introduce={{ title: "이동할 제목", content: "소개 내용" }}
        skills={[]}
      />,
    );
    const canvas = container.querySelector<HTMLElement>(
      ".introduction-text-canvas",
    );
    if (!canvas) throw new Error("소개 텍스트 캔버스가 필요합니다");
    canvas.getBoundingClientRect = () =>
      ({
        bottom: 500,
        height: 500,
        left: 0,
        right: 1000,
        top: 0,
        width: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    const moveHandle = screen.getByRole("button", { name: "소개 제목 이동" });
    const rightResizeEdge = screen.getByRole("button", {
      name: "소개 제목 오른쪽 변 크기 조절",
    });
    const bottomResizeEdge = screen.getByRole("button", {
      name: "소개 제목 아래쪽 변 크기 조절",
    });
    Object.assign(moveHandle, {
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });
    Object.assign(rightResizeEdge, {
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });
    Object.assign(bottomResizeEdge, {
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });

    fireEvent.pointerDown(moveHandle, {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(moveHandle, {
      clientX: 100,
      clientY: 50,
      pointerId: 1,
    });

    expect(onChangeIntroductionTextBlock).toHaveBeenCalledWith("intro-title", {
      x: 10,
      y: 10,
    });

    onChangeIntroductionTextBlock.mockClear();
    fireEvent.pointerDown(rightResizeEdge, {
      clientX: 0,
      clientY: 0,
      pointerId: 2,
    });
    fireEvent.pointerMove(rightResizeEdge, {
      clientX: 100,
      clientY: 50,
      pointerId: 2,
    });

    expect(onChangeIntroductionTextBlock).toHaveBeenCalledWith("intro-title", {
      width: 84,
    });

    onChangeIntroductionTextBlock.mockClear();
    fireEvent.pointerDown(bottomResizeEdge, {
      clientX: 0,
      clientY: 0,
      pointerId: 3,
    });
    fireEvent.pointerMove(bottomResizeEdge, {
      clientX: 100,
      clientY: 50,
      pointerId: 3,
    });

    expect(onChangeIntroductionTextBlock).toHaveBeenCalledWith("intro-title", {
      height: 60,
    });
  });

  it("다른 텍스트 박스와 겹치는 방향의 이동을 막는다", () => {
    const onChangeIntroductionTextBlock = vi.fn();
    const editor = {
      onChangeIntroductionTextBlock,
      onChangeRecentTextColors: vi.fn(),
      onSelectIntroductionTextBlock: vi.fn(),
      onSelectSection: vi.fn(),
      onTextCommit: vi.fn(),
      selectedIntroductionTextBlockId: "intro-content",
      selectedSection: "introduce" as const,
    };
    const { container } = render(
      <IntroductionSection
        editor={editor}
        introduce={{ title: "제목", content: "이동할 본문" }}
        skills={[]}
      />,
    );
    const canvas = container.querySelector<HTMLElement>(
      ".introduction-text-canvas",
    );
    const titleBlock = container.querySelector<HTMLElement>(
      '[data-text-block-id="intro-title"]',
    );
    const bodyBlock = container.querySelector<HTMLElement>(
      '[data-text-block-id="intro-content"]',
    );
    if (!canvas || !titleBlock || !bodyBlock) {
      throw new Error("소개 텍스트 박스가 필요합니다");
    }

    canvas.getBoundingClientRect = () =>
      ({
        bottom: 500,
        height: 500,
        left: 0,
        right: 1000,
        top: 0,
        width: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    titleBlock.getBoundingClientRect = () =>
      ({
        bottom: 250,
        height: 250,
        left: 0,
        right: 740,
        top: 0,
        width: 740,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    bodyBlock.getBoundingClientRect = () =>
      ({
        bottom: 380,
        height: 90,
        left: 0,
        right: 520,
        top: 290,
        width: 520,
        x: 0,
        y: 290,
        toJSON: () => ({}),
      }) as DOMRect;

    const moveEdge = screen.getByRole("button", { name: "소개 내용 이동" });
    Object.assign(moveEdge, {
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });

    fireEvent.pointerDown(moveEdge, {
      clientX: 0,
      clientY: 290,
      pointerId: 4,
    });
    fireEvent.pointerMove(moveEdge, {
      clientX: 0,
      clientY: 90,
      pointerId: 4,
    });

    expect(onChangeIntroductionTextBlock).not.toHaveBeenCalled();

    fireEvent.pointerMove(moveEdge, {
      clientX: 0,
      clientY: 340,
      pointerId: 4,
    });

    expect(onChangeIntroductionTextBlock).toHaveBeenCalledWith(
      "intro-content",
      { x: 0, y: 68 },
    );
  });
});
