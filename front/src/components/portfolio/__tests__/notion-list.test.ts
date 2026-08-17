import { describe, expect, it } from "vitest";

import {
  parseNotionListLine,
  parseNotionListText,
} from "@/components/portfolio/notion-list";

describe("notion list parser", () => {
  it("prefix 없는 줄은 일반 문장으로 유지한다", () => {
    expect(parseNotionListLine("일반 문장")).toEqual({
      isBullet: false,
      text: "일반 문장",
    });
  });

  it("- 와 legacy • prefix만 bullet로 해석한다", () => {
    expect(parseNotionListText("- 첫 항목\n• 두 번째 항목\n세 번째 문장"))
      .toEqual([
        { isBullet: true, text: "첫 항목" },
        { isBullet: true, text: "두 번째 항목" },
        { isBullet: false, text: "세 번째 문장" },
      ]);
  });
});
