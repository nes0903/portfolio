import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioImageGallery } from "@/components/portfolio/CareerWorkImages";
import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const image = {
  alt: "프로젝트 첫 화면",
  path: "owner/image.webp",
  url: "https://portfolio.example.com/image.webp",
};

function createEditor(
  overrides: Partial<PortfolioEditorBridge> = {},
): PortfolioEditorBridge {
  return {
    onChangeIntroductionTextBlock: vi.fn(),
    onChangeRecentTextColors: vi.fn(),
    onSelectIntroductionTextBlock: vi.fn(),
    onSelectSection: vi.fn(),
    onTextCommit: vi.fn(),
    selectedIntroductionTextBlockId: null,
    selectedSection: "side-projects",
    ...overrides,
  };
}

describe("PortfolioImageGallery inline editing", () => {
  it("공개 화면은 일반 figcaption만 렌더링한다", () => {
    const { container } = render(
      <PortfolioImageGallery
        contextLabel="프로젝트"
        heading="Project Screenshots"
        images={[image]}
        title="Project One"
      />,
    );

    const caption = container.querySelector("figcaption");
    expect(caption).toHaveTextContent(image.alt);
    expect(caption?.querySelector("input")).toBeNull();
    expect(screen.queryByRole("button", { name: `${image.alt} 이미지 삭제` }))
      .toBeNull();
  });

  it("관리자 화면의 실제 figcaption에서 캡션을 즉시 변경한다", () => {
    const onChangeGalleryImageAlt = vi.fn();
    const { container } = render(
      <PortfolioImageGallery
        contextLabel="프로젝트"
        editor={createEditor({ onChangeGalleryImageAlt })}
        heading="Project Screenshots"
        images={[image]}
        kind="project"
        ownerId="project-1"
        title="Project One"
      />,
    );

    const caption = container.querySelector("figcaption");
    const input = screen.getByRole("textbox", { name: `${image.alt} 캡션` });
    expect(caption).toContainElement(input);

    fireEvent.change(input, { target: { value: "수정한 캡션" } });
    expect(onChangeGalleryImageAlt).toHaveBeenCalledWith(
      "project",
      "project-1",
      image.path,
      "수정한 캡션",
    );
  });

  it("우측 상단 삭제 버튼은 확인 후에만 삭제하고 뷰어를 열지 않는다", () => {
    const onRemoveGalleryImage = vi.fn();
    render(
      <PortfolioImageGallery
        contextLabel="프로젝트"
        editor={createEditor({ onRemoveGalleryImage })}
        heading="Project Screenshots"
        images={[image]}
        kind="project"
        ownerId="project-1"
        title="Project One"
      />,
    );
    const deleteButton = screen.getByRole("button", {
      name: `${image.alt} 이미지 삭제`,
    });
    expect(deleteButton).toHaveClass("inline-gallery-image-delete");

    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    fireEvent.click(deleteButton);
    expect(onRemoveGalleryImage).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();

    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    fireEvent.click(deleteButton);
    expect(onRemoveGalleryImage).toHaveBeenCalledWith(
      "project",
      "project-1",
      image.path,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
