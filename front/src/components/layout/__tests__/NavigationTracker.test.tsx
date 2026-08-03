import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import {
  PORTFOLIO_SECTIONS,
  type PortfolioSectionId,
} from "@/components/layout/navigation";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

interface CarouselFixture {
  readonly cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
  readonly carousel: HTMLElement;
  readonly queuedFrames: FrameRequestCallback[];
  readonly scrollToMock: ReturnType<typeof vi.fn>;
  readonly setScrollLeft: (value: number) => void;
  readonly unmount: () => void;
}

function createRect(left: number, width = 1_000): DOMRect {
  return {
    bottom: 700,
    height: 700,
    left,
    right: left + width,
    top: 0,
    width,
    x: left,
    y: 0,
    toJSON: () => ({}),
  };
}

function renderCarouselTracker(): CarouselFixture {
  const queuedFrames: FrameRequestCallback[] = [];
  const cancelAnimationFrameMock = vi.fn();

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);

  const view = render(
    <>
      <PortfolioNavigation ariaLabel="데스크톱 페이지 목차" />
      <PortfolioNavigation ariaLabel="모바일 페이지 목차" />
      <main data-carousel>
        {PORTFOLIO_SECTIONS.map((section) => (
          <section id={section.id} key={section.id} tabIndex={-1}>
            {section.label}
          </section>
        ))}
      </main>
      <NavigationTracker />
    </>,
  );

  const carousel = document.querySelector<HTMLElement>("[data-carousel]");
  if (!carousel) throw new Error("carousel fixture가 필요합니다");

  let scrollLeft = 0;

  Object.defineProperty(carousel, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });

  vi.spyOn(carousel, "getBoundingClientRect").mockImplementation(() =>
    createRect(0),
  );

  for (const [index, section] of PORTFOLIO_SECTIONS.entries()) {
    const element = document.getElementById(section.id);
    if (!element) throw new Error(`${section.id} section fixture가 필요합니다`);

    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() =>
      createRect(index * 1_000 - scrollLeft),
    );
  }

  const scrollToMock = vi.fn((options: ScrollToOptions) => {
    scrollLeft = options.left ?? scrollLeft;
  });
  Object.defineProperty(carousel, "scrollTo", {
    configurable: true,
    value: scrollToMock,
  });

  return {
    cancelAnimationFrameMock,
    carousel,
    queuedFrames,
    scrollToMock,
    setScrollLeft: (value: number) => {
      scrollLeft = value;
    },
    unmount: view.unmount,
  };
}

function expectCurrentSection(sectionId: PortfolioSectionId): void {
  for (const section of PORTFOLIO_SECTIONS) {
    for (const link of screen.getAllByRole("link", { name: section.label })) {
      if (section.id === sectionId) {
        expect(link).toHaveAttribute("aria-current", "location");
      } else {
        expect(link).not.toHaveAttribute("aria-current");
      }
    }
  }
}

function runNextFrame(queuedFrames: FrameRequestCallback[]): void {
  const frame = queuedFrames.shift();
  if (!frame) throw new Error("requestAnimationFrame callback이 필요합니다");
  act(() => frame(0));
}

describe("NavigationTracker carousel", () => {
  it("초기에는 두 navigation 모두 01 소개를 current로 표시한다", () => {
    renderCarouselTracker();

    expectCurrentSection("introduce");
  });

  it("초기 hash는 layout frame 뒤 해당 카드 위치와 focus를 복원한다", () => {
    window.history.replaceState(null, "", "#contact");
    const { queuedFrames, scrollToMock } = renderCarouselTracker();
    const contactSection = document.getElementById("contact");
    if (!contactSection) throw new Error("contact section이 필요합니다");

    runNextFrame(queuedFrames);

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: "instant",
      left: 4_000,
    });
    expectCurrentSection("contact");
    expect(contactSection).toHaveFocus();
  });

  it("번호를 클릭하면 hash와 current를 바꾸고 해당 카드를 가로로 이동한다", () => {
    const { queuedFrames, scrollToMock } = renderCarouselTracker();
    const careerLinks = screen.getAllByRole<HTMLAnchorElement>("link", {
      name: "경력",
    });
    const careerSection = document.getElementById("career");
    if (!careerSection) throw new Error("career section이 필요합니다");

    fireEvent.click(careerLinks[0] as HTMLAnchorElement);

    expect(window.location.hash).toBe("#career");
    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: "smooth",
      left: 2_000,
    });
    expectCurrentSection("career");

    runNextFrame(queuedFrames);
    expect(careerSection).toHaveFocus();
  });

  it("carousel을 가로 스크롤하면 중앙 카드에 맞춰 current를 이동한다", () => {
    const { carousel, queuedFrames, setScrollLeft } = renderCarouselTracker();

    setScrollLeft(1_000);
    fireEvent.scroll(carousel);
    runNextFrame(queuedFrames);
    expectCurrentSection("skills");

    setScrollLeft(3_000);
    fireEvent.scroll(carousel);
    runNextFrame(queuedFrames);
    expectCurrentSection("side-projects");
  });

  it("hashchange로 접근한 section도 carousel과 current에 반영한다", () => {
    const { scrollToMock } = renderCarouselTracker();
    const contactSection = document.getElementById("contact");
    if (!contactSection) throw new Error("contact section이 필요합니다");

    window.history.replaceState(null, "", "#contact");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: "smooth",
      left: 4_000,
    });
    expectCurrentSection("contact");
    expect(contactSection).toHaveFocus();
  });

  it("Fast Refresh 뒤 추가된 navigation에도 가로 스크롤 current를 반영한다", () => {
    const { carousel, queuedFrames, setScrollLeft } = renderCarouselTracker();
    const navigation = document.querySelector("nav");
    if (!navigation) throw new Error("복제할 navigation이 필요합니다");

    const refreshedNavigation = navigation.cloneNode(true) as HTMLElement;
    document.body.append(refreshedNavigation);

    try {
      setScrollLeft(1_000);
      fireEvent.scroll(carousel);
      runNextFrame(queuedFrames);
      expectCurrentSection("skills");
    } finally {
      refreshedNavigation.remove();
    }
  });

  it("unmount 시 pending frame과 global listener를 정리한다", () => {
    const {
      cancelAnimationFrameMock,
      carousel,
      queuedFrames,
      setScrollLeft,
      unmount,
    } = renderCarouselTracker();

    setScrollLeft(1_000);
    fireEvent.scroll(carousel);
    expect(queuedFrames).toHaveLength(1);

    unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);

    fireEvent.scroll(carousel);
    expect(queuedFrames).toHaveLength(1);
  });
});
