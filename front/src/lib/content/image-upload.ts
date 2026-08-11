export const PORTFOLIO_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PORTFOLIO_GALLERY_MAX_IMAGES = 8;
export const PORTFOLIO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

interface PortfolioImageUploadCandidate {
  readonly size: number;
  readonly type: string;
}

/**
 * 경력·프로젝트 갤러리가 공유하는 파일 개수·형식·용량 계약을 검사한다.
 */
export function validatePortfolioGalleryImageFiles(
  currentCount: number,
  files: readonly PortfolioImageUploadCandidate[],
  label: string,
): string | null {
  if (currentCount + files.length > PORTFOLIO_GALLERY_MAX_IMAGES) {
    return `${label}은 최대 ${PORTFOLIO_GALLERY_MAX_IMAGES}장까지 등록할 수 있습니다. (현재 ${currentCount}장)`;
  }

  for (const file of files) {
    if (!PORTFOLIO_IMAGE_EXTENSIONS[file.type]) {
      return "JPEG, PNG, WebP, AVIF 이미지만 업로드할 수 있습니다.";
    }

    if (file.size > PORTFOLIO_IMAGE_MAX_BYTES) {
      return "이미지는 파일당 5MB 이하여야 합니다.";
    }
  }

  return null;
}
