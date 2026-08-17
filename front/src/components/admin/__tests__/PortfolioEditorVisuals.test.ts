// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PortfolioEditor fixed background contract", () => {
  it("배경색 선택은 제거하고 나머지 디자인 설정은 유지한다", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/components/admin/PortfolioEditor.tsx"),
      "utf8",
    );

    expect(source).not.toContain('label="페이지 배경색"');
    expect(source).not.toContain('label="카드 배경색"');
    expect(source).toContain('label="글자색"');
    expect(source).toContain('label="강조색"');
    expect(source).toContain("배경 사진");
  });

  it("공개 canvas 위에 상단 bar와 직접 편집 bridge만 사용한다", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/components/admin/PortfolioEditor.tsx"),
      "utf8",
    );
    const pageSource = await readFile(
      resolve(process.cwd(), "src/app/admin/page.tsx"),
      "utf8",
    );

    expect(source).toContain('className="visual-editor-canvas"');
    expect(source).toContain('scrollMode="window"');
    expect(source).toContain('className="inline-admin-bar"');
    expect(source).toContain("onChangeCareerDates: changeCareerDates");
    expect(source).toContain("onUploadGalleryImages: uploadGalleryImages");
    expect(source).toContain("onChangeSectionVisual: updateSectionVisual");
    expect(source).not.toContain("inline-admin-popover");
    expect(source).not.toContain("onOpenControls");
    expect(source).not.toContain("섹션 설정");
    expect(source).not.toContain("visual-editor-inspector");
    expect(source).not.toContain("visual-editor-toggle");
    expect(source).not.toContain("visual-preview-toolbar");
    expect(source).not.toContain("visual-preview-viewport");
    expect(pageSource).not.toContain("admin-header");
  });

  it("같은 경력 작업 제목을 다시 commit하면 상태를 재생성하지 않는다", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/components/admin/PortfolioEditor.tsx"),
      "utf8",
    );

    expect(source).toContain(
      'key === "title" && existingWork.title === normalizedValue',
    );
    expect(source).toMatch(
      /key === "title" && existingWork\.title === normalizedValue\)[\s\S]*?return current;/,
    );
  });

  it("관리자 이메일 value 편집 시 검증용 mailto URL도 함께 갱신한다", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/components/admin/PortfolioEditor.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /item\.channel === "email"[\s\S]*?`mailto:\$\{normalizedValue\}`/,
    );
  });

  it("Outcome과 프로젝트 상세 작업의 전체 notion list를 기존 배열에 저장한다", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/components/admin/PortfolioEditor.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /collection === "careerWorkAchievements"[\s\S]*?key === "all"[\s\S]*?achievements: splitLines\(normalizedValue\)/,
    );
    expect(source).toMatch(
      /collection === "sideProjectHighlights"[\s\S]*?key === "all"[\s\S]*?highlights: splitLines\(normalizedValue\) \?\? \[\]/,
    );
  });
});
