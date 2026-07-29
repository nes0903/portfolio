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

describe("W7 v2 + A5 + D13 v2 shell CSS contract", () => {
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
  });

  it("anchor 대상 section에 sticky navigation 여백을 둔다", () => {
    expectSelectorDeclaration(
      ".section",
      /scroll-margin-(?:top|block-start)\s*:\s*(?!0(?:px|rem)?\b)[^;]+/,
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
