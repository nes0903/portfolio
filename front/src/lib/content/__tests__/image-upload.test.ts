import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_IMAGE_MAX_BYTES,
  validatePortfolioGalleryImageFiles,
} from "@/lib/content/image-upload";

const validImage = { size: 1024, type: "image/png" } as const;

describe("portfolio gallery image upload validation", () => {
  it("현재 이미지와 새 파일을 합쳐 최대 8장을 허용한다", () => {
    expect(
      validatePortfolioGalleryImageFiles(
        5,
        [validImage, validImage, validImage],
        "프로젝트 스크린샷",
      ),
    ).toBeNull();
  });

  it("9번째 이미지를 거부한다", () => {
    expect(
      validatePortfolioGalleryImageFiles(
        8,
        [validImage],
        "프로젝트 스크린샷",
      ),
    ).toContain("최대 8장");
  });

  it("5MB 초과 파일과 허용하지 않는 형식을 거부한다", () => {
    expect(
      validatePortfolioGalleryImageFiles(
        0,
        [{ size: PORTFOLIO_IMAGE_MAX_BYTES + 1, type: "image/png" }],
        "프로젝트 스크린샷",
      ),
    ).toContain("5MB");
    expect(
      validatePortfolioGalleryImageFiles(
        0,
        [{ size: 1024, type: "image/svg+xml" }],
        "프로젝트 스크린샷",
      ),
    ).toContain("JPEG, PNG, WebP, AVIF");
  });
});
