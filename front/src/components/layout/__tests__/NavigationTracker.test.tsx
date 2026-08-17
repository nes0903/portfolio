import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { PortfolioNavigation } from "@/components/layout/PortfolioNavigation";
import {
  PORTFOLIO_SECTIONS,
  type PortfolioScrollSectionId,
} from "@/components/layout/navigation";

interface MockEntry {
  readonly id: PortfolioScrollSectionId;
  readonly isIntersecting: boolean;
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entries: readonly MockEntry[]): void {
    this.callback(
      entries.map(({ id, isIntersecting }) => {
        const target = document.getElementById(id);
        if (!target) throw new Error(`${id} section이 필요합니다`);

        return {
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting,
          rootBounds: null,
          target,
          time: 0,
        } as IntersectionObserverEntry;
      }),
      this as unknown as IntersectionObserver,
    );
  }
}

interface TrackerFixture {
  readonly cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
  readonly queuedFrames: FrameRequestCallback[];
  readonly scrollIntoViewMock: ReturnType<typeof vi.fn>;
  readonly unmount: () => void;
}

function TrackerTestPage({
  onActiveSectionChange,
  useContainerScroll = false,
}: {
  readonly onActiveSectionChange?: (
    sectionId: PortfolioScrollSectionId,
  ) => void;
  readonly useContainerScroll?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div data-testid="portfolio" ref={containerRef}>
      <div data-section-navigation>
        <PortfolioNavigation ariaLabel="페이지 목차" className="section-nav" />
      </div>
      <main data-scroll-sections>
        {PORTFOLIO_SECTIONS.map((section) => (
          <section
            data-section={section.id}
            id={section.id}
            key={section.id}
            tabIndex={-1}
          >
            {section.label}
          </section>
        ))}
      </main>
      <NavigationTracker
        containerRef={containerRef}
        onActiveSectionChange={onActiveSectionChange}
        useContainerScroll={useContainerScroll}
      />
    </div>
  );
}

function renderTracker(
  useContainerScroll = false,
  onActiveSectionChange?: (sectionId: PortfolioScrollSectionId) => void,
): TrackerFixture {
  const queuedFrames: FrameRequestCallback[] = [];
  const cancelAnimationFrameMock = vi.fn();
  const scrollIntoViewMock = vi.fn();

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoViewMock,
  });

  const view = render(
    <TrackerTestPage
      onActiveSectionChange={onActiveSectionChange}
      useContainerScroll={useContainerScroll}
    />,
  );

  return {
    cancelAnimationFrameMock,
    queuedFrames,
    scrollIntoViewMock,
    unmount: view.unmount,
  };
}

function getObserver(): MockIntersectionObserver {
  const observer = MockIntersectionObserver.instances.at(-1);
  if (!observer) throw new Error("IntersectionObserver instance가 필요합니다");
  return observer;
}

function expectCurrentSection(sectionId: PortfolioScrollSectionId): void {
  for (const section of PORTFOLIO_SECTIONS) {
    const link = screen.getByRole("link", { name: section.label });

    if (section.id === sectionId) {
      expect(link).toHaveAttribute("aria-current", "location");
    } else {
      expect(link).not.toHaveAttribute("aria-current");
    }
  }
}

function setSectionRect(
  sectionId: PortfolioScrollSectionId,
  top: number,
  height: number,
): void {
  const section = document.getElementById(sectionId);
  if (!section) throw new Error(`${sectionId} section이 필요합니다`);

  Object.defineProperty(section, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        bottom: top + height,
        height,
        left: 0,
        right: 100,
        top,
        width: 100,
        x: 0,
        y: top,
        toJSON: () => undefined,
      }) as DOMRect,
  });
}

function runNextFrame(queuedFrames: FrameRequestCallback[]): void {
  const frame = queuedFrames.shift();
  if (!frame) throw new Error("requestAnimationFrame callback이 필요합니다");
  act(() => frame(0));
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  window.history.replaceState(null, "", "/");
});

describe("NavigationTracker continuous scroll navigation", () => {
  it("세 section을 중앙 10% 영역에서 관찰하고 소개를 초기 활성화한다", () => {
    renderTracker();
    const observer = getObserver();

    expect(observer.root).toBeNull();
    expect(observer.rootMargin).toBe("-45% 0px -45% 0px");
    expect(observer.observe).toHaveBeenCalledTimes(3);
    expectCurrentSection("introduce");
  });

  it("여러 section이 교차하면 viewport 중앙에 가까운 section을 선택한다", () => {
    renderTracker();
    const observer = getObserver();

    setSectionRect("introduce", 0, 700);
    setSectionRect("career", 360, 800);
    act(() => {
      observer.trigger([
        { id: "introduce", isIntersecting: true },
        { id: "career", isIntersecting: true },
      ]);
    });
    expectCurrentSection("introduce");

    setSectionRect("introduce", -620, 700);
    setSectionRect("career", 80, 800);
    act(() => {
      observer.trigger([
        { id: "introduce", isIntersecting: true },
        { id: "career", isIntersecting: true },
      ]);
    });

    expectCurrentSection("career");
    expect(window.location.hash).toBe("#career");
  });

  it("활성 section이 바뀌면 관리자 편집 상태에 변경을 알린다", () => {
    const onActiveSectionChange = vi.fn();
    renderTracker(false, onActiveSectionChange);
    const observer = getObserver();

    expect(onActiveSectionChange).toHaveBeenCalledWith("introduce");

    setSectionRect("introduce", -700, 700);
    setSectionRect("career", 0, 800);
    act(() => {
      observer.trigger([
        { id: "introduce", isIntersecting: false },
        { id: "career", isIntersecting: true },
      ]);
    });

    expect(onActiveSectionChange).toHaveBeenLastCalledWith("career");
  });

  it("메뉴 클릭 시 hash를 추가하고 section으로 이동한 뒤 focus를 옮긴다", () => {
    const { queuedFrames, scrollIntoViewMock } = renderTracker();
    const career = document.getElementById("career");
    if (!career) throw new Error("career section이 필요합니다");

    fireEvent.click(screen.getByRole("link", { name: "경력" }));

    expect(window.location.hash).toBe("#career");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expectCurrentSection("career");

    runNextFrame(queuedFrames);
    expect(career).toHaveFocus();
  });

  it("reduced motion 사용자는 즉시 section으로 이동한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const { scrollIntoViewMock } = renderTracker();

    fireEvent.click(screen.getByRole("link", { name: "프로젝트" }));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("초기 hash와 browser history 이동을 같은 section에 복원한다", () => {
    window.history.replaceState(null, "", "#side-projects");
    const { queuedFrames, scrollIntoViewMock } = renderTracker();

    expectCurrentSection("side-projects");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    runNextFrame(queuedFrames);

    const callsBeforeLegacyHash = scrollIntoViewMock.mock.calls.length;
    window.history.replaceState(null, "", "#contact");
    act(() => window.dispatchEvent(new HashChangeEvent("hashchange")));

    expectCurrentSection("side-projects");
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(callsBeforeLegacyHash);
  });

  it("관리자 미리보기는 자체 scroll root를 관찰하고 URL을 변경하지 않는다", () => {
    const { scrollIntoViewMock } = renderTracker(true);
    const observer = getObserver();
    const container = screen.getByTestId("portfolio");

    expect(observer.root).toBe(container);
    fireEvent.click(screen.getByRole("link", { name: "프로젝트" }));

    expect(window.location.hash).toBe("");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expectCurrentSection("side-projects");
  });

  it("unmount 시 observer와 pending frame을 정리한다", () => {
    const { cancelAnimationFrameMock, queuedFrames, unmount } = renderTracker();
    const observer = getObserver();

    fireEvent.click(screen.getByRole("link", { name: "경력" }));
    expect(queuedFrames).toHaveLength(1);

    unmount();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
  });
});
