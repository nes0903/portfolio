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

  it("공개 화면 전체 canvas와 오른쪽 overlay 편집기를 사용한다", async () => {
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
    expect(source).toContain('id="visual-editor-inspector"');
    expect(source).toContain('aria-controls="visual-editor-inspector"');
    expect(source).toContain("inert={!isInspectorOpen}");
    expect(source).toContain('window.matchMedia("(max-width: 720px)")');
    expect(source).toContain('document.body.style.overflow = "hidden"');
    expect(source).not.toContain("visual-preview-toolbar");
    expect(source).not.toContain("visual-preview-viewport");
    expect(pageSource).not.toContain("admin-header");
  });
});
