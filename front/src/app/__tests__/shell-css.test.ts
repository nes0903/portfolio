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
    const siteHeaderRule = cssRules.find(
      (rule) => rule.selector === ".site-header",
    );
    expect(siteHeaderRule).toBeDefined();
    expect(siteHeaderRule?.body).not.toMatch(
      /(?:background|backdrop-filter|border|color|position|z-index)\s*:/,
    );
    expectSelectorDeclaration(".layout", /overflow\s*:\s*visible/);
    expectSelectorDeclaration(".layout", /padding-left\s*:/);
    expectSelectorDeclaration(".side-brand", /position\s*:\s*fixed/);
    expectSelectorDeclaration(".side-brand", /color\s*:\s*var\(--signal\)/);
    expectSelectorDeclaration(".side-brand", /top\s*:\s*20px/);
    expectSelectorDeclaration(".side-brand", /white-space\s*:\s*nowrap/);
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
    expectSelectorDeclaration(".section-nav a", /background\s*:\s*transparent/);
    expectSelectorDeclaration(".section-nav a", /border\s*:\s*0/);
    expectSelectorDeclaration(".section-nav a", /border-radius\s*:\s*0/);
    expectSelectorDeclaration(
      '.section-nav a[aria-current="location"]',
      /box-shadow\s*:\s*none/,
    );
  });

  it("활성 navigation을 pill 대신 붉은 밑줄로 표시한다", () => {
    expectSelectorDeclaration(".section-nav a::after", /height\s*:\s*2px/);
    expectSelectorDeclaration(
      ".section-nav a::after",
      /background\s*:\s*var\(--signal\)/,
    );
    expectSelectorDeclaration(
      ".section-nav a::after",
      /transform\s*:\s*scaleX\(0\)/,
    );
    expectSelectorDeclaration(
      ".section-nav a:hover::after",
      /opacity\s*:\s*0\.45/,
    );
    expectSelectorDeclaration(
      '.section-nav a[aria-current="location"]::after',
      /opacity\s*:\s*1/,
    );
    expectSelectorDeclaration(
      '.section-nav a[aria-current="location"]::after',
      /transform\s*:\s*scaleX\(1\)/,
    );
  });

  it("keyboard focus를 배경색만이 아닌 가시적 outline으로 표시한다", () => {
    expectSelectorDeclaration(":focus-visible", /outline\s*:\s*[^;]+/);
    expectSelectorDeclaration("html", /overflow-x\s*:\s*clip/);
  });

  it("carousel 대신 세 section을 자연 높이의 세로 흐름으로 배치한다", () => {
    expectSelectorDeclaration(".portfolio-sections", /display\s*:\s*grid/);
    expectSelectorDeclaration(".portfolio-sections", /gap\s*:\s*0/);
    expectSelectorDeclaration(".section", /position\s*:\s*relative/);
    expectSelectorDeclaration(".section", /height\s*:\s*auto/);
    expectSelectorDeclaration(".section", /min-height\s*:\s*calc\(100svh/);
    expectSelectorDeclaration(".section", /overflow\s*:\s*visible/);
    expect(cssSource).not.toContain("portfolio-carousel");
    expect(cssSource).not.toContain("data-carousel-offset");
  });

  it("외곽 card와 우측 상단 radial 광원 없이 별 배경을 연결한다", () => {
    const portfolioSectionsRule = cssRules.find(
      (rule) => rule.selector === ".portfolio-sections",
    );
    expect(portfolioSectionsRule).toBeDefined();
    expect(portfolioSectionsRule?.body).not.toMatch(
      /(?:background|border|border-radius|box-shadow|overflow)\s*:/,
    );
    const sectionRule = cssRules.find((rule) => rule.selector === ".section");
    expect(sectionRule).toBeDefined();
    expect(sectionRule?.body).not.toMatch(/radial-gradient\s*\(/);
    expectSelectorDeclaration(".section", /background\s*:\s*transparent/);
    expectSelectorDeclaration(".section", /border\s*:\s*0/);
    expectSelectorDeclaration(".section", /border-radius\s*:\s*0/);
    expectSelectorDeclaration(".section", /box-shadow\s*:\s*none/);
    expect(cssSource).toMatch(/--color-film\s*:\s*#000000/);
    expect(cssSource).not.toContain(
      '.section[data-section="introduce"]::before',
    );
    expect(cssSource).not.toContain("@keyframes frame-drift");
    expect(cssSource).not.toMatch(
      /linear-gradient\(135deg,[\s\S]*?72\.2%/,
    );
    expect(cssSource).not.toContain(
      '.section[data-has-background-image="true"]',
    );
  });

  it("별 Canvas를 입력을 막지 않는 고정 배경으로 배치한다", () => {
    expectSelectorDeclaration(".space-starfield", /position\s*:\s*fixed/);
    expectSelectorDeclaration(".space-starfield", /pointer-events\s*:\s*none/);
    expectSelectorDeclaration(".space-starfield", /z-index\s*:\s*0/);
    expectSelectorDeclaration(".layout", /position\s*:\s*relative/);
    expectSelectorDeclaration(".layout", /z-index\s*:\s*1/);
    expect(cssSource).not.toContain(".visual-preview-viewport");
  });

  it("경력 TECH 값의 시작점과 첫 줄을 다른 evidence 행에 맞춘다", () => {
    expectSelectorDeclaration(
      ".evidence .career-evidence-tech .chips",
      /padding-left\s*:\s*0/,
    );
    expectSelectorDeclaration(
      ".evidence .career-evidence-tech .chip",
      /min-height\s*:\s*0/,
    );
    expectSelectorDeclaration(
      ".evidence .career-evidence-tech .chip",
      /align-items\s*:\s*flex-start/,
    );
    expectSelectorDeclaration(
      ".career-evidence-list",
      /padding-inline-start\s*:\s*1\.2rem/,
    );
    expectSelectorDeclaration(".career-evidence-list", /list-style\s*:\s*none/);
    expectSelectorDeclaration(
      '.career-evidence-list li[data-bullet="true"]',
      /list-style-type\s*:\s*"·  "/,
    );
    expectSelectorDeclaration(
      '.career-evidence-list li[data-bullet="true"]::marker',
      /color\s*:\s*currentColor/,
    );
    expect(cssSource).not.toContain(
      '.career-evidence-list li[data-bullet="true"]::before',
    );
  });

  it("project 기술·설명·상세 문장이 같은 content offset을 사용한다", () => {
    expectSelectorDeclaration(
      ".project",
      /--project-content-offset\s*:\s*92px/,
    );
    expectSelectorDeclaration(
      ".project-tech",
      /padding\s*:[^;]*var\(--project-content-offset\)/,
    );
    expectSelectorDeclaration(
      ".project-body",
      /padding\s*:[^;]*var\(--project-content-offset\)/,
    );
    expectSelectorDeclaration(
      ".project-highlights",
      /padding-inline-start\s*:\s*1\.2rem/,
    );
    expectSelectorDeclaration(
      '.project-highlights li[data-bullet="true"]',
      /list-style-type\s*:\s*"·  "/,
    );
    expectSelectorDeclaration(
      '.project-highlights li[data-bullet="true"]::marker',
      /color\s*:\s*var\(--signal\)/,
    );
    expect(cssSource).not.toContain(".project-highlights li::before");
  });

  it("project 링크를 날짜 왼쪽에 두고 날짜를 토글 앞 고정 slot에 맞춘다", () => {
    expectSelectorDeclaration(
      ".project-shell",
      /--project-date-width\s*:\s*92px/,
    );
    expectSelectorDeclaration(
      ".project-shell",
      /--project-toggle-offset\s*:\s*42px/,
    );
    expectSelectorDeclaration(".project-period", /position\s*:\s*absolute/);
    expectSelectorDeclaration(
      ".project-period",
      /right\s*:\s*var\(--project-toggle-offset\)/,
    );
    expectSelectorDeclaration(
      ".project-period",
      /width\s*:\s*var\(--project-date-width\)/,
    );
    expectSelectorDeclaration(
      ".project-header-actions",
      /right\s*:\s*calc\(/,
    );
    expectSelectorDeclaration(
      ".project-header-actions",
      /var\(--project-date-width\)/,
    );
  });

  it("관리자 project 삭제 버튼을 토글 바깥 우측 영역에 배치한다", () => {
    expectSelectorDeclaration(
      '.project-shell[data-editor="true"]',
      /padding-right\s*:\s*56px/,
    );
    expectSelectorDeclaration(".project-inline-delete", /right\s*:\s*0/);
    expectSelectorDeclaration(
      ".project-inline-delete",
      /min-height\s*:\s*44px/,
    );
    expectSelectorDeclaration(
      '.project-shell[data-editor="true"] .project-header-actions',
      /right\s*:\s*calc\([\s\S]*?56px/,
    );
    expectSelectorDeclaration(
      '.project-shell[data-editor="true"] .project-summary',
      /padding-right\s*:\s*min\(520px, 52vw\)/,
    );
  });

  it("연락처를 section 대신 고정 side rail에 배치한다", () => {
    expectSelectorDeclaration(
      ".side-contact-rail",
      /overflow-y\s*:\s*auto/,
    );
    expectSelectorDeclaration(".side-contact-value", /overflow-wrap\s*:\s*anywhere/);
    expectSelectorDeclaration(".side-contact-list", /display\s*:\s*grid/);
    expectSelectorDeclaration(".side-contact-rail", /margin-top\s*:\s*auto/);
    expectSelectorDeclaration(".side-rail", /bottom\s*:\s*20px/);
    expectSelectorDeclaration(
      '.portfolio-experience[data-editor-preview="true"] .side-rail',
      /bottom\s*:\s*124px/,
    );
    expect(cssSource).not.toContain('.section[data-section="contact"]');
    expect(cssSource).not.toContain(".channels");
  });

  it("경력 evidence는 회색 panel 없이 배경 위에 직접 표시한다", () => {
    expectSelectorDeclaration(".evidence", /background\s*:\s*transparent/);
    expectSelectorDeclaration(
      ".evidence section",
      /background\s*:\s*transparent/,
    );
    expectSelectorDeclaration(
      ".evidence section + section",
      /border-top\s*:\s*1px/,
    );
  });

  it("desktop에서는 side brand 아래 같은 중심축에 index를 표시한다", () => {
    expectSelectorDeclaration(
      ".side-rail",
      /position\s*:\s*fixed/,
    );
    expectSelectorDeclaration(
      ".side-rail",
      /top\s*:\s*calc\(var\(--site-header-height\)/,
    );
    expectSelectorDeclaration(
      ".side-rail",
      /left\s*:\s*var\(--side-rail-left\)/,
    );
    expectSelectorDeclaration(
      ".side-rail",
      /width\s*:\s*var\(--side-rail-width\)/,
    );
    expectSelectorDeclaration(
      ".side-brand",
      /left\s*:\s*var\(--side-rail-left\)/,
    );
    expectSelectorDeclaration(
      ".side-brand",
      /width\s*:\s*var\(--side-rail-width\)/,
    );
    expectSelectorDeclaration(".section-nav ol", /display\s*:\s*grid/);
    expectSelectorDeclaration(".section-nav ol", /justify-items\s*:\s*center/);
  });

  it("mobile에서는 scroll 중에만 navigation을 노출한다", () => {
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.section-navigation\s*\{[\s\S]*?opacity\s*:\s*0/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.section-navigation\s*\{[\s\S]*?top\s*:\s*50%/,
    );
    expect(cssSource).toMatch(
      /\.section-navigation\[data-scroll-visible="true"\][\s\S]*?opacity\s*:\s*1/,
    );
    expect(cssSource).toMatch(/pointer-events\s*:\s*none/);
    expect(cssSource).toMatch(/pointer-events\s*:\s*auto/);
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.side-brand\s*\{[\s\S]*?position\s*:\s*absolute[\s\S]*?top\s*:\s*0[\s\S]*?height\s*:\s*var\(--site-header-height\)/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.side-contact-rail\s*\{[\s\S]*?position\s*:\s*fixed[\s\S]*?bottom\s*:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.side-contact-rail\s*\{[\s\S]*?margin-top\s*:\s*0/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.side-contact-list\s*\{[\s\S]*?display\s*:\s*flex[\s\S]*?overflow-x\s*:\s*auto/,
    );
  });

  it("mobile project meta도 링크 왼쪽·날짜 오른쪽 정렬을 유지한다", () => {
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.project-period\s*\{[\s\S]*?right\s*:\s*var\(--project-toggle-offset\)[\s\S]*?bottom\s*:\s*16px/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*820px\s*\)[\s\S]*?\.project-header-actions\s*\{[\s\S]*?right\s*:\s*calc\([\s\S]*?var\(--project-date-width\)[\s\S]*?left\s*:\s*66px/,
    );
  });

  it("관리자 화면은 공개 canvas 위에 상단 bar와 직접 편집 control만 겹친다", () => {
    expectSelectorDeclaration(
      ".admin-page",
      /width\s*:\s*100%/,
    );
    expectSelectorDeclaration(
      ".admin-page",
      /background\s*:\s*#000/,
    );
    expectSelectorDeclaration(
      ".inline-admin-bar",
      /position\s*:\s*fixed/,
    );
    expectSelectorDeclaration(".inline-admin-bar", /left\s*:\s*16px/);
    expectSelectorDeclaration(".inline-admin-bar", /bottom\s*:\s*16px/);
    expectSelectorDeclaration(".inline-admin-bar", /width\s*:\s*fit-content/);
    const inlineAdminBarRule = cssRules.find(
      (rule) => rule.selector === ".inline-admin-bar",
    );
    expect(inlineAdminBarRule?.body).not.toMatch(/(?:top|transform)\s*:/);
    expectSelectorDeclaration(
      ".admin-page .visual-editor-canvas .portfolio-experience",
      /padding-bottom\s*:\s*calc\(108px \+ env\(safe-area-inset-bottom\)\)/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*720px\s*\)[\s\S]*?\.admin-page \.visual-editor-canvas \.portfolio-experience\s*\{[\s\S]*?padding-bottom\s*:\s*calc\(260px \+ env\(safe-area-inset-bottom\)\)/,
    );
    expect(cssSource).toMatch(
      /@media\s*\(\s*max-width\s*:\s*720px\s*\)[\s\S]*?\.inline-admin-bar\s*\{[\s\S]*?left\s*:\s*8px[\s\S]*?bottom\s*:\s*calc\(8px \+ env\(safe-area-inset-bottom\)\)/,
    );
    expectSelectorDeclaration(
      ".inline-section-design-strip",
      /position\s*:\s*absolute/,
    );
    expectSelectorDeclaration(
      ".inline-image-dropzone",
      /border\s*:\s*1px dashed/,
    );
    expectSelectorDeclaration(
      ".inline-image-dropzone",
      /min-height\s*:\s*112px/,
    );
    expectSelectorDeclaration(
      ".inline-gallery-image-delete",
      /top\s*:\s*12px/,
    );
    expectSelectorDeclaration(
      ".inline-gallery-image-delete",
      /right\s*:\s*12px/,
    );
    expectSelectorDeclaration(
      ".inline-gallery-image-delete",
      /width\s*:\s*44px/,
    );
    expectSelectorDeclaration(
      ".inline-gallery-image-delete",
      /height\s*:\s*44px/,
    );
    expectSelectorDeclaration(
      ".inline-image-caption-input",
      /background\s*:\s*transparent/,
    );
    expect(cssSource).not.toContain(".visual-preview-panel");
    expect(cssSource).not.toContain("height: min(780px");
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
