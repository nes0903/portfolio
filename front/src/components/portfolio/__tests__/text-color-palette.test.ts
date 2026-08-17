import { describe, expect, it } from "vitest";

import {
  createThemeTextColors,
  DEFAULT_TEXT_COLOR_PRESETS,
  rememberRecentTextColor,
} from "@/components/portfolio/text-color-palette";
import { portfolioVisualsSchema } from "@/lib/content/schema";

describe("text color palette", () => {
  it("현재 portfolio와 section 테마 색상을 정규화해 중복 없이 제공한다", () => {
    const visuals = portfolioVisualsSchema.parse({
      accentColor: "#ff5b49",
      mutedTextColor: "#a8a6a0",
      textColor: "#eeeae2",
      sections: {
        career: {
          accentColor: "#f28c28",
          textColor: "#eeeae2",
        },
      },
    });

    expect(createThemeTextColors(visuals)).toEqual([
      "#EEEAE2",
      "#A8A6A0",
      "#FF5B49",
      "#F28C28",
    ]);
    expect(DEFAULT_TEXT_COLOR_PRESETS).toContain("#00AEEF");
  });

  it("적용한 색상을 앞으로 이동하고 중복 제거 후 최근 6개만 유지한다", () => {
    const recent = [
      "#111111",
      "#222222",
      "#333333",
      "#444444",
      "#555555",
      "#666666",
    ];

    expect(rememberRecentTextColor(recent, "#333333")).toEqual([
      "#333333",
      "#111111",
      "#222222",
      "#444444",
      "#555555",
      "#666666",
    ]);
    expect(rememberRecentTextColor(recent, "#abcdef")).toEqual([
      "#ABCDEF",
      "#111111",
      "#222222",
      "#333333",
      "#444444",
      "#555555",
    ]);
  });
});
