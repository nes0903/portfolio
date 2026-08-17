"use client";

import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import type {
  PortfolioCareerWorkImage,
  PortfolioProjectImage,
} from "@/lib/content/types";

interface InlineImageEditorProps {
  readonly editor?: PortfolioEditorBridge;
  readonly images: readonly (
    | PortfolioCareerWorkImage
    | PortfolioProjectImage
  )[];
  readonly kind: "careerWork" | "project";
  readonly ownerId: string;
  readonly title: string;
}

const CLIPBOARD_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function normalizeClipboardImageFile(file: File, index: number): File | null {
  const extension = CLIPBOARD_IMAGE_EXTENSIONS[file.type];
  if (!extension) return null;
  if (/\.(?:avif|jpe?g|png|webp)$/i.test(file.name)) return file;

  return new File(
    [file],
    `clipboard-${Date.now()}-${index + 1}.${extension}`,
    { lastModified: Date.now(), type: file.type },
  );
}

function clipboardImageFiles(clipboardData: DataTransfer): File[] {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .flatMap((item, index) => {
      const file = item.getAsFile();
      const normalizedFile = file
        ? normalizeClipboardImageFile(file, index)
        : null;
      return normalizedFile ? [normalizedFile] : [];
    });

  if (itemFiles.length > 0) return itemFiles;

  return Array.from(clipboardData.files).flatMap((file, index) => {
    const normalizedFile = normalizeClipboardImageFile(file, index);
    return normalizedFile ? [normalizedFile] : [];
  });
}

export function InlineImageEditor({
  editor,
  images,
  kind,
  ownerId,
  title,
}: InlineImageEditorProps) {
  if (!editor) return null;

  function upload(files: FileList | readonly File[]): void {
    editor?.onUploadGalleryImages?.(kind, ownerId, Array.from(files));
  }

  return (
    <section className="inline-image-editor" aria-label={`${title} 이미지 직접 편집`}>
      <label
        className="inline-image-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          upload(event.dataTransfer.files);
        }}
        onPaste={(event) => {
          const files = clipboardImageFiles(event.clipboardData);
          if (files.length === 0) return;
          event.preventDefault();
          upload(files);
        }}
        tabIndex={0}
      >
        <strong>+ 이미지 추가</strong>
        <span>
          드롭·파일 선택·Cmd/Ctrl+V 붙여넣기 · {images.length}/8
        </span>
        <input
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label={`${title} 이미지 추가`}
          multiple
          onChange={(event) => {
            if (event.currentTarget.files) upload(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
          type="file"
        />
      </label>
    </section>
  );
}
