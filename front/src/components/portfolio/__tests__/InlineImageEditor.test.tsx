import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { InlineImageEditor } from "@/components/portfolio/InlineImageEditor";

afterEach(() => {
  cleanup();
});

type UploadGalleryImages = NonNullable<
  PortfolioEditorBridge["onUploadGalleryImages"]
>;

function createEditor(
  onUploadGalleryImages: UploadGalleryImages,
): PortfolioEditorBridge {
  return {
    onChangeIntroductionTextBlock: vi.fn(),
    onChangeRecentTextColors: vi.fn(),
    onSelectIntroductionTextBlock: vi.fn(),
    onSelectSection: vi.fn(),
    onTextCommit: vi.fn(),
    onUploadGalleryImages,
    selectedIntroductionTextBlockId: null,
    selectedSection: "side-projects",
  } satisfies PortfolioEditorBridge;
}

describe("InlineImageEditor clipboard upload", () => {
  it("기존 이미지의 별도 캡션·삭제 목록 없이 dropzone만 렌더링한다", () => {
    const onUploadGalleryImages = vi.fn<UploadGalleryImages>();
    const { container } = render(
      <InlineImageEditor
        editor={createEditor(onUploadGalleryImages)}
        images={[
          {
            alt: "기존 이미지",
            path: "project/image.webp",
            url: "https://portfolio.example.com/image.webp",
          },
        ]}
        kind="project"
        ownerId="project-1"
        title="Project One"
      />,
    );

    expect(container.querySelector(".inline-image-editor-list")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /이미지 삭제/ })).toBeNull();
    expect(container.querySelector(".inline-image-dropzone"))
      .not.toBeNull();
  });

  it("clipboard PNG를 이름 있는 File로 정규화해 기존 upload callback에 전달한다", () => {
    const onUploadGalleryImages = vi.fn<UploadGalleryImages>();
    const file = new File(["image"], "", { type: "image/png" });
    render(
      <InlineImageEditor
        editor={createEditor(onUploadGalleryImages)}
        images={[]}
        kind="project"
        ownerId="project-1"
        title="Project One"
      />,
    );
    const dropzone = screen.getByLabelText("Project One 이미지 직접 편집").querySelector(".inline-image-dropzone");
    if (!dropzone) throw new Error("image dropzone이 필요합니다");

    fireEvent.paste(dropzone, {
      clipboardData: {
        files: [],
        items: [
          { getAsFile: () => file, kind: "file", type: "image/png" },
        ],
      },
    });

    expect(onUploadGalleryImages).toHaveBeenCalledOnce();
    const [kind, ownerId, files] = onUploadGalleryImages.mock.calls[0]!;
    expect(kind).toBe("project");
    expect(ownerId).toBe("project-1");
    expect(files).toHaveLength(1);
    const uploadedFile = files[0];
    if (!uploadedFile) throw new Error("clipboard image가 필요합니다");
    expect(uploadedFile.name).toMatch(/^clipboard-\d+-1\.png$/);
    expect(uploadedFile.type).toBe("image/png");
  });

  it("텍스트 clipboard는 upload callback을 호출하지 않는다", () => {
    const onUploadGalleryImages = vi.fn<UploadGalleryImages>();
    render(
      <InlineImageEditor
        editor={createEditor(onUploadGalleryImages)}
        images={[]}
        kind="careerWork"
        ownerId="work-1"
        title="Work One"
      />,
    );
    const dropzone = screen.getByLabelText("Work One 이미지 직접 편집").querySelector(".inline-image-dropzone");
    if (!dropzone) throw new Error("image dropzone이 필요합니다");

    fireEvent.paste(dropzone, {
      clipboardData: {
        files: [],
        items: [
          { getAsFile: () => null, kind: "string", type: "text/plain" },
        ],
      },
    });

    expect(onUploadGalleryImages).not.toHaveBeenCalled();
  });
});
