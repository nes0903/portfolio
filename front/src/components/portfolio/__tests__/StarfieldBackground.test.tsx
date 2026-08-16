import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StarfieldBackground } from "@/components/portfolio/StarfieldBackground";

const context = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  fillStyle: "",
  lineTo: vi.fn(),
  lineWidth: 1,
  moveTo: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: "",
};

function installMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mediaQuery = {
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === "change") listeners.add(listener);
    }),
    dispatchChange() {
      listeners.forEach((listener) => listener());
    },
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === "change") listeners.delete(listener);
    }),
  };

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
  return mediaQuery;
}

beforeEach(() => {
  Object.values(context).forEach((value) => {
    if (typeof value === "function" && "mockClear" in value) value.mockClear();
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(
    {
      bottom: 900,
      height: 900,
      left: 0,
      right: 1440,
      top: 0,
      width: 1440,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});

describe("StarfieldBackground", () => {
  it("장식 전용 Canvas를 그리고 애니메이션을 예약한다", () => {
    installMatchMedia(false);
    const requestAnimationFrame = vi.fn(() => 17);
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const { container } = render(<StarfieldBackground />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-starfield");
    expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(context.fill).toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("reduced motion에서는 정적인 별만 그리고 frame을 예약하지 않는다", () => {
    installMatchMedia(true);
    const requestAnimationFrame = vi.fn(() => 18);
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    render(<StarfieldBackground />);

    expect(context.fill).toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("숨겨진 tab에서 animation을 멈추고 resize 시 별을 다시 그린다", () => {
    installMatchMedia(false);
    const requestAnimationFrame = vi.fn(() => 19);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    render(<StarfieldBackground />);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(19);

    const drawsBeforeResize = context.fill.mock.calls.length;
    fireEvent(window, new Event("resize"));
    expect(context.fill.mock.calls.length).toBeGreaterThan(drawsBeforeResize);
  });
});
