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
});
