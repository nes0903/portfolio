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

describe("Portfolio carousel shell CSS contract", () => {
  it("portfolio header 높이를 분리하고 남은 viewport를 carousel layout에 사용한다", () => {
    expectSelectorDeclaration(
      ".site-header",
      /height\s*:\s*var\(--site-header-height\)/,
    );
    expectSelectorDeclaration(
      ".layout",
      /height\s*:\s*calc\(100svh\s*-\s*var\(--site-header-height\)\)/,
    );
    expectSelectorDeclaration(
      ".site-brand",
      /color\s*:\s*var\(--signal\)/,
    );
    expect(
      cssRules.some((rule) => rule.selector.includes(".site-brand::before")),
    ).toBe(false);
  });

  it("desktop와 mobile 목차 link에 최소 44px target을 보장한다", () => {
    expectSelectorDeclaration(
      ".nav a",
      /min-(?:height|block-size)\s*:\s*44px/,
    );
    expectSelectorDeclaration(
      ".mobile-toc a",
      /min-(?:height|block-size)\s*:\s*44px/,
    );
  });

  it("keyboard focus를 배경색만이 아닌 가시적 outline으로 표시한다", () => {
    expectSelectorDeclaration(":focus-visible", /outline\s*:\s*[^;]+/);
    expectSelectorDeclaration("html", /overflow-x\s*:\s*clip/);
  });

  it("원래 크기의 독립 card를 유지하고 중앙 바깥의 양옆 원형 위치에 배치한다", () => {
    const baseSectionRules = cssRules.filter(
      (rule) => rule.selector === ".section",
    );
    const adjacentCardRules = cssRules.filter((rule) =>
      /data-carousel-offset="(?:-1|1)"/.test(rule.selector),
    );

    expectSelectorDeclaration(
      ".portfolio-carousel",
      /overflow\s*:\s*visible/,
    );
    expectSelectorDeclaration(
      ".section",
      /position\s*:\s*absolute/,
    );
    expect(
      baseSectionRules.some((rule) => /width\s*:\s*100%/.test(rule.body)),
    ).toBe(true);
    expect(
      baseSectionRules.some((rule) =>
        /height\s*:\s*calc\(100%\s*-\s*var\(--card-top-gap\)\)/.test(
          rule.body,
        ),
      ),
    ).toBe(true);
    expect(adjacentCardRules).toHaveLength(2);
    adjacentCardRules.forEach((rule) => {
      expect(rule.body).not.toMatch(/scale\s*\(/);
      expect(rule.body).toMatch(/opacity\s*:\s*1/);
      expect(rule.body).toMatch(/filter\s*:\s*none/);
      expect(rule.body).toMatch(/pointer-events\s*:\s*auto/);
      expect(rule.body).toMatch(/cursor\s*:\s*pointer/);
    });
    expectSelectorDeclaration(
      ".section",
      /border\s*:\s*(?!0\b)[^;]+/,
    );
    expectSelectorDeclaration(
      '[data-carousel-offset="0"]',
      /transform\s*:/,
    );
    expectSelectorDeclaration(
      '[data-carousel-offset="-1"]',
      /transform\s*:/,
    );
    expectSelectorDeclaration(
      '[data-carousel-offset="1"]',
      /transform\s*:/,
    );
  });

  it("carousel 무대가 아닌 각 card가 불투명한 전체 배경을 소유한다", () => {
    const carouselRule = cssRules.find(
      (rule) => rule.selector === ".portfolio-carousel",
    );
    const sectionVariantRules = cssRules.filter((rule) =>
      rule.selector.includes(".section[data-section="),
    );

    expect(carouselRule?.body).toMatch(/background\s*:\s*var\(--film\)/);
    expectSelectorDeclaration(".section", /radial-gradient\s*\(/);
    expectSelectorDeclaration(".section", /#121216/);
    sectionVariantRules.forEach((rule) => {
      expect(rule.body).not.toMatch(/background\s*:\s*transparent/);
    });
  });

  it("card 위에 배경이 그대로 비치는 여백을 두고 모서리를 둥글게 표시한다", () => {
    expectSelectorDeclaration(
      ".section",
      /top\s*:\s*var\(--card-top-gap\)/,
    );
    expectSelectorDeclaration(
      ".section",
      /border-radius\s*:\s*var\(--card-radius\)/,
    );
  });

  it("reduced motion 선호에서 smooth scroll과 animation을 완화한다", () => {
    expect(cssSource).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/,
    );
    expect(cssSource).toMatch(/scroll-behavior\s*:\s*auto/);
    expect(cssSource).toMatch(/(?:transition|animation)-duration\s*:/);
  });

  it("좁은 viewport와 200% 확대에서 단일 열 reflow와 긴 문자열 줄바꿈을 제공한다", () => {
    expect(cssSource).toMatch(/overflow-wrap\s*:\s*anywhere/);
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*\d+px\s*\)[\s\S]*?(?:grid-template-columns\s*:\s*1fr|display\s*:\s*block)/,
    );
  });
});
