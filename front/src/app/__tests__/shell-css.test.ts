// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

interface CssRule {
  readonly body: string;
  readonly selector: string;
}

let cssSource = "";
let cssRules: CssRule[] = [];

beforeAll(async () => {
  cssSource = await readFile(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  cssRules = [...cssSource.matchAll(/([^@{}][^{}]*)\{([^{}]*)\}/g)].map(
    ([, selector = "", body = ""]) => ({ selector: selector.trim(), body }),
  );
});

function expectSelectorDeclaration(
  selectorFragment: string,
  declaration: RegExp,
): void {
  expect(
    cssRules.some(
      (rule) =>
        rule.selector.includes(selectorFragment) && declaration.test(rule.body),
    ),
  ).toBe(true);
}

describe("Portfolio continuous scroll shell CSS contract", () => {
  it("빈 상단 spacer와 side brand를 자연 높이 page layout에서 분리한다", () => {
    expectSelectorDeclaration(
      ".site-header",
      /height\s*:\s*var\(--site-header-height\)/,
    );
    expectSelectorDeclaration(".layout", /overflow\s*:\s*visible/);
    expectSelectorDeclaration(".layout", /padding-left\s*:/);
    expectSelectorDeclaration(".side-brand", /position\s*:\s*fixed/);
    expectSelectorDeclaration(".side-brand", /color\s*:\s*var\(--signal\)/);
    expectSelectorDeclaration(
      ".side-brand",
      /top\s*:\s*calc\(var\(--site-header-height\)/,
    );
  });

  it("세로 navigation link에 최소 44px target과 현재 위치를 제공한다", () => {
    expectSelectorDeclaration(
      ".section-nav a",
      /min-(?:height|block-size)\s*:\s*(?:44|48)px/,
    );
    expectSelectorDeclaration(
      '.section-nav a[aria-current="location"]',
      /color\s*:\s*var\(--signal\)/,
    );
    expectSelectorDeclaration(
      '.section-nav a[aria-current="location"] .nav-label',
      /opacity\s*:\s*1/,
    );
  });

  it("keyboard focus를 배경색만이 아닌 가시적 outline으로 표시한다", () => {
    expectSelectorDeclaration(":focus-visible", /outline\s*:\s*[^;]+/);
    expectSelectorDeclaration("html", /overflow-x\s*:\s*clip/);
  });

  it("carousel 대신 네 section을 자연 높이의 세로 흐름으로 배치한다", () => {
    expectSelectorDeclaration(".portfolio-sections", /display\s*:\s*grid/);
    expectSelectorDeclaration(".portfolio-sections", /gap\s*:\s*0/);
    expectSelectorDeclaration(".section", /position\s*:\s*relative/);
    expectSelectorDeclaration(".section", /height\s*:\s*auto/);
    expectSelectorDeclaration(".section", /min-height\s*:\s*calc\(100svh/);
    expectSelectorDeclaration(".section", /overflow\s*:\s*visible/);
    expect(cssSource).not.toContain("portfolio-carousel");
    expect(cssSource).not.toContain("data-carousel-offset");
  });

  it("네 section을 하나의 외곽 card 안에서 여백 없이 연결한다", () => {
    expectSelectorDeclaration(
      ".portfolio-sections",
      /border\s*:\s*(?!0\b)[^;]+/,
    );
    expectSelectorDeclaration(
      ".portfolio-sections",
      /border-radius\s*:\s*var\(--card-radius\)/,
    );
    expectSelectorDeclaration(".portfolio-sections", /overflow\s*:\s*hidden/);
    expectSelectorDeclaration(".section", /radial-gradient\s*\(/);
    expectSelectorDeclaration(".section", /#121216/);
    expectSelectorDeclaration(".section", /border\s*:\s*0/);
    expectSelectorDeclaration(".section", /border-radius\s*:\s*0/);
    expectSelectorDeclaration(".section", /box-shadow\s*:\s*none/);
  });

  it("desktop에서는 좌측 중앙에 고정된 단일 열 index를 표시한다", () => {
    expectSelectorDeclaration(
      ".section-navigation",
      /position\s*:\s*fixed/,
    );
    expectSelectorDeclaration(".section-navigation", /top\s*:\s*50%/);
    expectSelectorDeclaration(".section-navigation", /left\s*:/);
    expectSelectorDeclaration(".section-nav ol", /display\s*:\s*grid/);
  });

  it("mobile에서는 scroll 중에만 navigation을 노출한다", () => {
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.section-navigation\s*\{[\s\S]*?opacity\s*:\s*0/,
    );
    expect(cssSource).toMatch(
      /\.section-navigation\[data-scroll-visible="true"\][\s\S]*?opacity\s*:\s*1/,
    );
    expect(cssSource).toMatch(/pointer-events\s*:\s*none/);
    expect(cssSource).toMatch(/pointer-events\s*:\s*auto/);
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.side-brand\s*\{[\s\S]*?position\s*:\s*absolute[\s\S]*?height\s*:\s*var\(--site-header-height\)/,
    );
  });

  it("관리자 미리보기는 내부 연속 scroll과 내부 navigation을 사용한다", () => {
    expectSelectorDeclaration(
      ".visual-preview-viewport .portfolio-experience",
      /overflow-y\s*:\s*auto/,
    );
    expectSelectorDeclaration(
      ".visual-preview-viewport .section-navigation",
      /position\s*:\s*sticky/,
    );
    expectSelectorDeclaration(
      ".visual-preview-viewport .side-brand",
      /position\s*:\s*sticky/,
    );
  });

  it("reduced motion과 좁은 viewport에서도 안전하게 reflow한다", () => {
    expect(cssSource).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
    );
    expect(cssSource).toMatch(/scroll-behavior\s*:\s*auto/);
    expect(cssSource).toMatch(/overflow-wrap\s*:\s*anywhere/);
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*\d+px\s*\)[\s\S]*?(?:grid-template-columns\s*:\s*1fr|display\s*:\s*block)/,
    );
  });
});
