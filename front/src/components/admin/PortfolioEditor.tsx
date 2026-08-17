"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useMemo,
  useState,
} from "react";

import { logoutAction, savePortfolioAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  type PortfolioSectionId,
} from "@/components/layout/navigation";
import { PortfolioExperience } from "@/components/portfolio/PortfolioExperience";
import type { IntroductionTextBlockLayoutPatch } from "@/components/portfolio/editor-types";
import { initialAdminFormState } from "@/lib/auth/form-state";
import { normalizePortfolioContentForSave } from "@/lib/content/admin-form";
import {
  PORTFOLIO_IMAGE_EXTENSIONS,
  validatePortfolioGalleryImageFiles,
} from "@/lib/content/image-upload";
import {
  INTRODUCTION_VERTICAL_INPUT_STEP_PX,
  INTRODUCTION_MAX_VERTICAL_UNITS,
  INTRODUCTION_MIN_HEIGHT_UNITS,
  INTRODUCTION_VERTICAL_UNIT_PX,
} from "@/lib/content/introduction-layout";
import {
  createPortfolioContentViewModel,
  type PortfolioDocumentContent,
} from "@/lib/content/model";
import { createPhoneTelUrl } from "@/lib/content/schema";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface PortfolioEditorProps {
  readonly initialContent: PortfolioDocumentContent;
}

type CareerWorkImage = NonNullable<
  PortfolioDocumentContent["careerWorks"][number]["images"]
>[number];
type ProjectImage = PortfolioDocumentContent["sideProjects"][number]["images"][number];

interface PreviewTextBlockRectangle {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

function getPreviewOverlapArea(
  rectangle: PreviewTextBlockRectangle,
  obstacles: readonly PreviewTextBlockRectangle[],
): number {
  return obstacles.reduce((total, obstacle) => {
    const overlapWidth = Math.max(
      0,
      Math.min(rectangle.x + rectangle.width, obstacle.x + obstacle.width) -
        Math.max(rectangle.x, obstacle.x),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(rectangle.y + rectangle.height, obstacle.y + obstacle.height) -
        Math.max(rectangle.y, obstacle.y),
    );

    return total + overlapWidth * overlapHeight;
  }, 0);
}

function blocksLayoutChangeThatIncreasesOverlap(
  blockId: string,
  patch: IntroductionTextBlockLayoutPatch,
): boolean {
  if (
    patch.x === undefined &&
    patch.y === undefined &&
    patch.width === undefined &&
    patch.height === undefined
  ) {
    return false;
  }

  const canvas = document.querySelector<HTMLElement>(
    '[data-editor-preview="true"] [data-editor-canvas="true"]',
  );
  if (!canvas) return false;

  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return false;

  const elements = Array.from(
    canvas.querySelectorAll<HTMLElement>("[data-text-block-id]"),
  );
  const activeElement = elements.find(
    (element) => element.dataset.textBlockId === blockId,
  );
  if (!activeElement) return false;

  function toCanvasRectangle(element: HTMLElement): PreviewTextBlockRectangle {
    const rectangle = element.getBoundingClientRect();
    return {
      height: rectangle.height / INTRODUCTION_VERTICAL_UNIT_PX,
      width: (rectangle.width / canvasRect.width) * 100,
      x: ((rectangle.left - canvasRect.left) / canvasRect.width) * 100,
      y:
        (rectangle.top - canvasRect.top) /
        INTRODUCTION_VERTICAL_UNIT_PX,
    };
  }

  const currentRectangle = toCanvasRectangle(activeElement);
  const nextRectangle = {
    height:
      patch.height === undefined
        ? currentRectangle.height
        : Math.max(currentRectangle.height, patch.height),
    width: patch.width ?? currentRectangle.width,
    x: patch.x ?? currentRectangle.x,
    y: patch.y ?? currentRectangle.y,
  };
  const obstacles = elements
    .filter((element) => element !== activeElement)
    .map(toCanvasRectangle);

  return (
    getPreviewOverlapArea(nextRectangle, obstacles) >
    getPreviewOverlapArea(currentRectangle, obstacles) + 0.01
  );
}

interface FieldProps {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly type?: "text" | "month" | "url" | "email";
  readonly value: string;
}

function Field({ label, onChange, placeholder, type = "text", value }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

interface TextAreaFieldProps extends Omit<FieldProps, "type"> {
  readonly rows?: number;
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: TextAreaFieldProps) {
  return (
    <label className="admin-field admin-field-wide">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function createContentId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function splitLines(value: string): string[] | undefined {
  const items = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const SECTION_LABELS: Readonly<Record<PortfolioSectionId, string>> = {
  introduce: "소개",
  career: "경력",
  "side-projects": "프로젝트",
  contact: "연락처",
};

const IMAGE_EXTENSIONS = PORTFOLIO_IMAGE_EXTENSIONS;

interface ColorFieldProps {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}

function ColorField({ label, onChange, value }: ColorFieldProps) {
  return (
    <label className="admin-field admin-color-field">
      <span>{label}</span>
      <span className="admin-color-control">
        <input
          aria-label={`${label} 색상 선택`}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

interface SectionVisualControlsProps {
  readonly disabled: boolean;
  readonly onChange: (
    patch: Partial<PortfolioDocumentContent["visuals"]["sections"][PortfolioSectionId]>,
  ) => void;
  readonly onRemoveImage: () => void;
  readonly onUploadImage: (file: File) => void;
  readonly sectionId: PortfolioSectionId;
  readonly visual: PortfolioDocumentContent["visuals"]["sections"][PortfolioSectionId];
}

function SectionVisualControls({
  disabled,
  onChange,
  onRemoveImage,
  onUploadImage,
  sectionId,
  visual,
}: SectionVisualControlsProps) {
  const image = visual.backgroundImage;

  return (
    <div className="admin-visual-controls">
      <div className="admin-field-grid">
        <ColorField
          label="글자색"
          onChange={(textColor) => onChange({ textColor })}
          value={visual.textColor}
        />
        <ColorField
          label="강조색"
          onChange={(accentColor) => onChange({ accentColor })}
          value={visual.accentColor}
        />
        <label className="admin-field">
          <span>배경 사진</span>
          <input
            accept="image/avif,image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadImage(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </div>

      {image ? (
        <div className="admin-image-controls">
          <Field
            label="이미지 설명"
            onChange={(alt) =>
              onChange({ backgroundImage: { ...image, alt } })
            }
            value={image.alt}
          />
          <label className="admin-field">
            <span>가로 위치 {image.positionX}%</span>
            <input
              max="100"
              min="0"
              onChange={(event) =>
                onChange({
                  backgroundImage: {
                    ...image,
                    positionX: Number(event.target.value),
                  },
                })
              }
              type="range"
              value={image.positionX}
            />
          </label>
          <label className="admin-field">
            <span>세로 위치 {image.positionY}%</span>
            <input
              max="100"
              min="0"
              onChange={(event) =>
                onChange({
                  backgroundImage: {
                    ...image,
                    positionY: Number(event.target.value),
                  },
                })
              }
              type="range"
              value={image.positionY}
            />
          </label>
          <label className="admin-field">
            <span>배경 덮개 {Math.round(image.overlayOpacity * 100)}%</span>
            <input
              max="0.95"
              min="0"
              onChange={(event) =>
                onChange({
                  backgroundImage: {
                    ...image,
                    overlayOpacity: Number(event.target.value),
                  },
                })
              }
              step="0.05"
              type="range"
              value={image.overlayOpacity}
            />
          </label>
          <button
            className="admin-remove-button"
            disabled={disabled}
            onClick={onRemoveImage}
            type="button"
          >
            {SECTION_LABELS[sectionId]} 배경 사진 삭제
          </button>
        </div>
      ) : (
        <p className="admin-control-note">
          사진을 올리면 카드 배경에 즉시 미리보기 됩니다.
        </p>
      )}
    </div>
  );
}

type IntroductionTextBlock = PortfolioDocumentContent["visuals"]["sections"]["introduce"]["textBlocks"][number];

interface IntroductionTextBlockControlsProps {
  readonly blocks: readonly IntroductionTextBlock[];
  readonly onAdd: () => void;
  readonly onChange: (
    blockId: string,
    patch: IntroductionTextBlockLayoutPatch,
  ) => void;
  readonly onRemove: (blockId: string) => void;
  readonly onSelect: (blockId: string) => void;
  readonly onTextChange: (blockId: string, text: string) => void;
  readonly selectedBlockId: string | null;
}

function getIntroductionTextBlockLabel(
  block: IntroductionTextBlock,
  customIndex: number,
): string {
  if (block.kind === "title") return "제목";
  if (block.kind === "body") return "소개 내용";
  return `추가 텍스트 ${customIndex + 1}`;
}

function IntroductionTextBlockControls({
  blocks,
  onAdd,
  onChange,
  onRemove,
  onSelect,
  onTextChange,
  selectedBlockId,
}: IntroductionTextBlockControlsProps) {
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? blocks[0];
  let customIndex = 0;

  return (
    <div className="admin-text-block-controls">
      <div className="admin-subsection-heading">
        <div>
          <strong>텍스트 박스 배치</strong>
          <p>
            미리보기 박스의 위쪽 변으로 이동하고 왼쪽·오른쪽·아래쪽 변으로
            크기를 조절합니다. 다른 텍스트 박스와 겹치는 이동은 제한됩니다.
            높이를 내용보다 작게 줄이면 글자가 잘리지 않도록 박스가 자동으로
            늘어납니다. 세로 영역에도 끝이 없으며, 길어진 내용은 카드 내부
            스크롤로 확인합니다. 모바일에서는 가독성을 위해 자동 세로
            정렬됩니다.
          </p>
        </div>
        <button
          className="admin-button"
          disabled={blocks.length >= 12}
          onClick={onAdd}
          type="button"
        >
          텍스트 박스 추가
        </button>
      </div>

      <div className="admin-text-block-tabs" aria-label="소개 텍스트 박스">
        {blocks.map((block) => {
          const index = block.kind === "custom" ? customIndex++ : 0;
          return (
            <button
              aria-pressed={selectedBlock?.id === block.id}
              className="admin-button"
              key={block.id}
              onClick={() => onSelect(block.id)}
              type="button"
            >
              {getIntroductionTextBlockLabel(block, index)}
            </button>
          );
        })}
      </div>

      {selectedBlock ? (
        <div className="admin-text-block-detail">
          {selectedBlock.kind === "custom" ? (
            <TextAreaField
              label="추가 텍스트"
              onChange={(text) => onTextChange(selectedBlock.id, text)}
              rows={3}
              value={selectedBlock.text}
            />
          ) : null}

          <div className="admin-field-grid">
            <label className="admin-field">
              <span>가로 위치 {Math.round(selectedBlock.x)}%</span>
              <input
                max={100 - selectedBlock.width}
                min="0"
                onChange={(event) =>
                  onChange(selectedBlock.id, { x: Number(event.target.value) })
                }
                step="0.5"
                type="range"
                value={selectedBlock.x}
              />
            </label>
            <label className="admin-field">
              <span>
                세로 위치 {Math.round(
                  selectedBlock.y * INTRODUCTION_VERTICAL_UNIT_PX,
                )}
                px
              </span>
              <input
                max={
                  INTRODUCTION_MAX_VERTICAL_UNITS *
                  INTRODUCTION_VERTICAL_UNIT_PX
                }
                min="0"
                onChange={(event) =>
                  onChange(selectedBlock.id, {
                    y:
                      Number(event.target.value) /
                      INTRODUCTION_VERTICAL_UNIT_PX,
                  })
                }
                step={INTRODUCTION_VERTICAL_INPUT_STEP_PX}
                type="number"
                value={
                  selectedBlock.y * INTRODUCTION_VERTICAL_UNIT_PX
                }
              />
            </label>
            <label className="admin-field">
              <span>박스 너비 {Math.round(selectedBlock.width)}%</span>
              <input
                max={100 - selectedBlock.x}
                min="10"
                onChange={(event) =>
                  onChange(selectedBlock.id, {
                    width: Number(event.target.value),
                  })
                }
                step="0.5"
                type="range"
                value={selectedBlock.width}
              />
            </label>
            <label className="admin-field">
              <span>
                최소 높이 {Math.round(
                  selectedBlock.height * INTRODUCTION_VERTICAL_UNIT_PX,
                )}
                px
              </span>
              <input
                max={
                  INTRODUCTION_MAX_VERTICAL_UNITS *
                  INTRODUCTION_VERTICAL_UNIT_PX
                }
                min={
                  INTRODUCTION_MIN_HEIGHT_UNITS *
                  INTRODUCTION_VERTICAL_UNIT_PX
                }
                onChange={(event) =>
                  onChange(selectedBlock.id, {
                    height:
                      Number(event.target.value) /
                      INTRODUCTION_VERTICAL_UNIT_PX,
                  })
                }
                step={INTRODUCTION_VERTICAL_INPUT_STEP_PX}
                type="number"
                value={
                  selectedBlock.height * INTRODUCTION_VERTICAL_UNIT_PX
                }
              />
            </label>
            <label className="admin-field">
              <span>글자 크기 {selectedBlock.fontSize}px</span>
              <input
                max="140"
                min="12"
                onChange={(event) =>
                  onChange(selectedBlock.id, {
                    fontSize: Number(event.target.value),
                  })
                }
                type="range"
                value={selectedBlock.fontSize}
              />
            </label>
            <label className="admin-field">
              <span>정렬</span>
              <select
                onChange={(event) =>
                  onChange(selectedBlock.id, {
                    textAlign: event.target.value as IntroductionTextBlock["textAlign"],
                  })
                }
                value={selectedBlock.textAlign}
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </label>
          </div>

          {selectedBlock.kind === "custom" ? (
            <button
              className="admin-remove-button"
              onClick={() => onRemove(selectedBlock.id)}
              type="button"
            >
              이 텍스트 박스 삭제
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PortfolioEditor({ initialContent }: PortfolioEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedSection, setSelectedSection] =
    useState<PortfolioSectionId>("introduce");
  const [selectedIntroductionTextBlockId, setSelectedIntroductionTextBlockId] =
    useState<string | null>("intro-title");
  const [assetMessage, setAssetMessage] = useState("");
  const [uploadingCareerWorkId, setUploadingCareerWorkId] = useState<
    string | null
  >(null);
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(
    null,
  );
  const [uploadingSection, setUploadingSection] =
    useState<PortfolioSectionId | null>(null);
  const [state, formAction] = useActionState(
    savePortfolioAction,
    initialAdminFormState,
  );
  const normalizedContent = useMemo(
    () => normalizePortfolioContentForSave(content),
    [content],
  );
  const previewContent = useMemo(
    () => createPortfolioContentViewModel(normalizedContent),
    [normalizedContent],
  );

  const selectSection = useCallback((sectionId: PortfolioSectionId): void => {
    setSelectedSection(sectionId);
  }, []);

  const changeRecentTextColors = useCallback(
    (recentTextColors: readonly string[]): void => {
      setContent((current) => {
        if (
          current.visuals.recentTextColors.length ===
            recentTextColors.length &&
          current.visuals.recentTextColors.every(
            (color, index) => color === recentTextColors[index],
          )
        ) {
          return current;
        }

        return {
          ...current,
          visuals: {
            ...current.visuals,
            recentTextColors: [...recentTextColors],
          },
        };
      });
    },
    [],
  );

  function updateSectionVisual(
    sectionId: PortfolioSectionId,
    patch: Partial<
      PortfolioDocumentContent["visuals"]["sections"][PortfolioSectionId]
    >,
  ): void {
    setContent((current) => ({
      ...current,
      visuals: {
        ...current.visuals,
        sections: {
          ...current.visuals.sections,
          [sectionId]: {
            ...current.visuals.sections[sectionId],
            ...patch,
          },
        },
      },
    }));
  }

  function changeCareerDates(
    careerId: string,
    startDate: string,
    endDate: string | null,
  ): void {
    setContent((current) => ({
      ...current,
      careers: current.careers.map((career) =>
        career.id === careerId ? { ...career, startDate, endDate } : career,
      ),
    }));
  }

  function changeContactStructure(
    contactId: string,
    channel: PortfolioDocumentContent["contacts"][number]["channel"],
    url: string,
  ): void {
    setContent((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        if (contact.channel === channel) return { ...contact, url };

        if (channel === "email") {
          const value = "hello@example.com";
          return {
            ...contact,
            channel,
            label: "Email",
            url: `mailto:${value}`,
            value,
          };
        }

        if (channel === "phone") {
          const value = "010-0000-0000";
          return {
            ...contact,
            channel,
            label: "Phone",
            url: createPhoneTelUrl(value) ?? "tel:01000000000",
            value,
          };
        }

        return {
          ...contact,
          channel,
          url: url.startsWith("https://") ? url : "https://example.com",
        };
      }),
    }));
  }

  function changeProjectLink(
    projectId: string,
    key: "demo" | "repository",
    value: string,
  ): void {
    setContent((current) => ({
      ...current,
      sideProjects: current.sideProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              links: { ...project.links, [key]: value || undefined },
            }
          : project,
      ),
    }));
  }

  function uploadGalleryImages(
    kind: "careerWork" | "project",
    ownerId: string,
    files: readonly File[],
  ): void {
    if (kind === "careerWork") {
      void uploadCareerWorkImages(ownerId, files);
    } else {
      void uploadProjectImages(ownerId, files);
    }
  }

  function changeGalleryImageAlt(
    kind: "careerWork" | "project",
    ownerId: string,
    path: string,
    alt: string,
  ): void {
    if (kind === "careerWork") {
      updateCareerWorkImageAlt(ownerId, path, alt);
    } else {
      updateProjectImageAlt(ownerId, path, alt);
    }
  }

  function removeGalleryImage(
    kind: "careerWork" | "project",
    ownerId: string,
    path: string,
  ): void {
    if (kind === "careerWork") {
      removeCareerWorkImage(ownerId, path);
    } else {
      removeProjectImage(ownerId, path);
    }
  }

  function addInlineItem(
    kind: "career" | "careerWork" | "contact" | "project" | "skill",
    parentId?: string,
  ): void {
    setContent((current) => {
      if (kind === "skill") {
        return {
          ...current,
          skills: [...current.skills, { category: "새 분류", id: createContentId("skill"), name: "새 기술", order: current.skills.length }],
        };
      }
      if (kind === "career") {
        return {
          ...current,
          careers: [...current.careers, { company: "새 회사", endDate: null, id: createContentId("career"), order: current.careers.length, role: "직무", startDate: new Date().toISOString().slice(0, 7) }],
        };
      }
      if (kind === "careerWork" && parentId) {
        return {
          ...current,
          careerWorks: [...current.careerWorks, { careerId: parentId, description: "작업 설명", id: createContentId("work"), order: current.careerWorks.filter((work) => work.careerId === parentId).length, title: "새 작업" }],
        };
      }
      if (kind === "project") {
        return {
          ...current,
          sideProjects: [...current.sideProjects, { description: "프로젝트 설명", highlights: [], id: createContentId("project"), images: [], links: {}, name: "새 프로젝트", order: current.sideProjects.length, period: String(new Date().getFullYear()), skills: [] }],
        };
      }
      if (kind === "contact") {
        return {
          ...current,
          contacts: [...current.contacts, { channel: "website", id: createContentId("contact"), label: "Website", order: current.contacts.length, url: "https://example.com", value: "example.com" }],
        };
      }
      return current;
    });
  }

  function deleteInlineItem(
    kind: "career" | "careerWork" | "contact" | "project" | "skill",
    id: string,
  ): void {
    setContent((current) => {
      if (kind === "skill") return { ...current, skills: current.skills.filter((item) => item.id !== id) };
      if (kind === "career") return { ...current, careers: current.careers.filter((item) => item.id !== id), careerWorks: current.careerWorks.filter((item) => item.careerId !== id) };
      if (kind === "careerWork") return { ...current, careerWorks: current.careerWorks.filter((item) => item.id !== id) };
      if (kind === "project") return { ...current, sideProjects: current.sideProjects.filter((item) => item.id !== id) };
      if (kind === "contact") return { ...current, contacts: current.contacts.filter((item) => item.id !== id) };
      return current;
    });
  }

  function selectIntroductionTextBlock(blockId: string): void {
    setSelectedSection("introduce");
    setSelectedIntroductionTextBlockId(blockId);
  }

  function updateIntroductionTextBlock(
    blockId: string,
    patch: IntroductionTextBlockLayoutPatch,
  ): void {
    if (blocksLayoutChangeThatIncreasesOverlap(blockId, patch)) return;

    setContent((current) => ({
      ...current,
      visuals: {
        ...current.visuals,
        sections: {
          ...current.visuals.sections,
          introduce: {
            ...current.visuals.sections.introduce,
            textBlocks: current.visuals.sections.introduce.textBlocks.map(
              (block) =>
                block.id === blockId ? { ...block, ...patch } : block,
            ),
          },
        },
      },
    }));
  }

  function updateIntroductionCustomText(blockId: string, text: string): void {
    setContent((current) => ({
      ...current,
      visuals: {
        ...current.visuals,
        sections: {
          ...current.visuals.sections,
          introduce: {
            ...current.visuals.sections.introduce,
            textBlocks: current.visuals.sections.introduce.textBlocks.map(
              (block) =>
                block.id === blockId && block.kind === "custom"
                  ? { ...block, text }
                  : block,
            ),
          },
        },
      },
    }));
  }

  function addIntroductionTextBlock(): void {
    const blocks = content.visuals.sections.introduce.textBlocks;
    if (blocks.length >= 12) return;

    const customCount = blocks.filter((block) => block.kind === "custom").length;
    const id = createContentId("intro-text");
    const block: IntroductionTextBlock = {
      fontSize: 24,
      height: 12,
      id,
      kind: "custom",
      text: "새 텍스트",
      textAlign: "left",
      width: 36,
      x: Math.min(8 + customCount * 4, 50),
      y: Math.min(76 + customCount * 2, 84),
    };

    setContent((current) => ({
      ...current,
      visuals: {
        ...current.visuals,
        sections: {
          ...current.visuals.sections,
          introduce: {
            ...current.visuals.sections.introduce,
            textBlocks: [
              ...current.visuals.sections.introduce.textBlocks,
              block,
            ],
          },
        },
      },
    }));
    selectIntroductionTextBlock(id);
  }

  function removeIntroductionTextBlock(blockId: string): void {
    const block = content.visuals.sections.introduce.textBlocks.find(
      (candidate) => candidate.id === blockId,
    );
    if (!block || block.kind !== "custom") return;

    setContent((current) => ({
      ...current,
      visuals: {
        ...current.visuals,
        sections: {
          ...current.visuals.sections,
          introduce: {
            ...current.visuals.sections.introduce,
            textBlocks: current.visuals.sections.introduce.textBlocks.filter(
              (candidate) => candidate.id !== blockId,
            ),
          },
        },
      },
    }));
    setSelectedIntroductionTextBlockId("intro-title");
  }

  async function uploadSectionImage(
    sectionId: PortfolioSectionId,
    file: File,
  ): Promise<void> {
    const extension = IMAGE_EXTENSIONS[file.type];

    if (!extension) {
      setAssetMessage("JPEG, PNG, WebP, AVIF 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAssetMessage("이미지는 5MB 이하여야 합니다.");
      return;
    }

    setUploadingSection(sectionId);
    setAssetMessage("이미지를 업로드하고 있습니다.");

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setAssetMessage("로그인 세션을 확인할 수 없습니다.");
        return;
      }

      const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio-assets")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setAssetMessage(`이미지를 업로드하지 못했습니다. (${uploadError.message})`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("portfolio-assets")
        .getPublicUrl(path);

      updateSectionVisual(sectionId, {
        backgroundImage: {
          alt: `${SECTION_LABELS[sectionId]} 배경 이미지`,
          overlayOpacity: 0.42,
          path,
          positionX: 50,
          positionY: 50,
          url: publicUrlData.publicUrl,
        },
      });

      setAssetMessage("이미지를 업로드했습니다. 저장하면 공개 화면에 반영됩니다.");
    } catch {
      setAssetMessage("이미지 업로드 중 네트워크 오류가 발생했습니다.");
    } finally {
      setUploadingSection(null);
    }
  }

  async function uploadCareerWorkImages(
    workId: string,
    files: readonly File[],
  ): Promise<void> {
    const work = content.careerWorks.find((item) => item.id === workId);

    if (!work || files.length === 0) return;

    const currentImages = work.images ?? [];
    const validationMessage = validatePortfolioGalleryImageFiles(
      currentImages.length,
      files,
      "작업 스크린샷",
    );

    if (validationMessage) {
      setAssetMessage(validationMessage);
      return;
    }

    setUploadingCareerWorkId(workId);
    setAssetMessage(`${files.length}개 스크린샷을 업로드하고 있습니다.`);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setAssetMessage("로그인 세션을 확인할 수 없습니다.");
        return;
      }

      const uploadResults = await Promise.all(
        files.map(async (file, index) => {
          const extension = IMAGE_EXTENSIONS[file.type];
          if (!extension) {
            return { error: "지원하지 않는 이미지 형식입니다." } as const;
          }

          const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("portfolio-assets")
            .upload(path, file, {
              cacheControl: "3600",
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            return { error: uploadError.message } as const;
          }

          const { data: publicUrlData } = supabase.storage
            .from("portfolio-assets")
            .getPublicUrl(path);
          const image: CareerWorkImage = {
            alt: `${work.title} 작업 스크린샷 ${currentImages.length + index + 1}`,
            path,
            url: publicUrlData.publicUrl,
          };

          return { image } as const;
        }),
      );
      const uploadedImages = uploadResults.flatMap(
        (result): CareerWorkImage[] =>
          "image" in result && result.image ? [result.image] : [],
      );
      const failureCount = uploadResults.length - uploadedImages.length;

      if (uploadedImages.length > 0) {
        setContent((current) => ({
          ...current,
          careerWorks: current.careerWorks.map((item) =>
            item.id === workId
              ? {
                  ...item,
                  images: [...(item.images ?? []), ...uploadedImages],
                }
              : item,
          ),
        }));
      }

      setAssetMessage(
        failureCount === 0
          ? `${uploadedImages.length}개 스크린샷을 업로드했습니다. 저장하면 공개 화면에 반영됩니다.`
          : `${uploadedImages.length}개 업로드, ${failureCount}개 실패했습니다.`,
      );
    } catch {
      setAssetMessage("스크린샷 업로드 중 네트워크 오류가 발생했습니다.");
    } finally {
      setUploadingCareerWorkId(null);
    }
  }

  function updateCareerWorkImageAlt(
    workId: string,
    path: string,
    alt: string,
  ): void {
    setContent((current) => ({
      ...current,
      careerWorks: current.careerWorks.map((work) =>
        work.id === workId
          ? {
              ...work,
              images: work.images?.map((image) =>
                image.path === path ? { ...image, alt } : image,
              ),
            }
          : work,
      ),
    }));
  }

  function removeCareerWorkImage(workId: string, path: string): void {
    setContent((current) => ({
      ...current,
      careerWorks: current.careerWorks.map((work) => {
        if (work.id !== workId) return work;

        const images = work.images?.filter((image) => image.path !== path);
        return { ...work, images: images && images.length > 0 ? images : undefined };
      }),
    }));
    setAssetMessage("스크린샷을 제거했습니다. 저장 후 파일이 정리됩니다.");
  }

  async function uploadProjectImages(
    projectId: string,
    files: readonly File[],
  ): Promise<void> {
    const project = content.sideProjects.find((item) => item.id === projectId);

    if (!project || files.length === 0) return;

    const validationMessage = validatePortfolioGalleryImageFiles(
      project.images.length,
      files,
      "프로젝트 스크린샷",
    );

    if (validationMessage) {
      setAssetMessage(validationMessage);
      return;
    }

    setUploadingProjectId(projectId);
    setAssetMessage(`${files.length}개 프로젝트 스크린샷을 업로드하고 있습니다.`);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setAssetMessage("로그인 세션을 확인할 수 없습니다.");
        return;
      }

      const uploadResults = await Promise.all(
        files.map(async (file, index) => {
          const extension = IMAGE_EXTENSIONS[file.type];
          if (!extension) {
            return { error: "지원하지 않는 이미지 형식입니다." } as const;
          }

          const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("portfolio-assets")
            .upload(path, file, {
              cacheControl: "3600",
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            return { error: uploadError.message } as const;
          }

          const { data: publicUrlData } = supabase.storage
            .from("portfolio-assets")
            .getPublicUrl(path);
          const image: ProjectImage = {
            alt: `${project.name} 프로젝트 스크린샷 ${project.images.length + index + 1}`,
            path,
            url: publicUrlData.publicUrl,
          };

          return { image } as const;
        }),
      );
      const uploadedImages = uploadResults.flatMap(
        (result): ProjectImage[] =>
          "image" in result && result.image ? [result.image] : [],
      );
      const failureCount = uploadResults.length - uploadedImages.length;

      if (uploadedImages.length > 0) {
        setContent((current) => ({
          ...current,
          sideProjects: current.sideProjects.map((item) =>
            item.id === projectId
              ? { ...item, images: [...item.images, ...uploadedImages] }
              : item,
          ),
        }));
      }

      setAssetMessage(
        failureCount === 0
          ? `${uploadedImages.length}개 프로젝트 스크린샷을 업로드했습니다. 저장하면 공개 화면에 반영됩니다.`
          : `${uploadedImages.length}개 업로드, ${failureCount}개 실패했습니다.`,
      );
    } catch {
      setAssetMessage("프로젝트 스크린샷 업로드 중 네트워크 오류가 발생했습니다.");
    } finally {
      setUploadingProjectId(null);
    }
  }

  function updateProjectImageAlt(
    projectId: string,
    path: string,
    alt: string,
  ): void {
    setContent((current) => ({
      ...current,
      sideProjects: current.sideProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              images: project.images.map((image) =>
                image.path === path ? { ...image, alt } : image,
              ),
            }
          : project,
      ),
    }));
  }

  function removeProjectImage(projectId: string, path: string): void {
    setContent((current) => ({
      ...current,
      sideProjects: current.sideProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              images: project.images.filter((image) => image.path !== path),
            }
          : project,
      ),
    }));
    setAssetMessage("프로젝트 스크린샷을 제거했습니다. 저장 후 파일이 정리됩니다.");
  }

  function removeSectionImage(sectionId: PortfolioSectionId): void {
    const image = content.visuals.sections[sectionId].backgroundImage;

    if (!image) return;

    updateSectionVisual(sectionId, { backgroundImage: null });
    setAssetMessage("배경 이미지를 제거했습니다. 저장 후 파일이 정리됩니다.");
  }

  function commitInlineText(field: string, value: string): void {
    const isNotionList =
      (field.startsWith("careerWorks:") &&
        field.endsWith(":description")) ||
      (field.startsWith("careerWorkAchievements:") &&
        field.endsWith(":all")) ||
      (field.startsWith("sideProjectHighlights:") && field.endsWith(":all"));
    const allowsEmptyList =
      field.startsWith("careerWorkAchievements:") ||
      field.startsWith("sideProjectHighlights:");
    const normalizedValue = isNotionList
      ? value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n")
      : field === "introduce.content" ||
          field.startsWith("introductionTextBlocks:")
        ? value.trim()
        : value.replace(/\s+/g, " ").trim();

    if (!normalizedValue && !allowsEmptyList) {
      setAssetMessage("필수 문구는 비워둘 수 없습니다.");
      return;
    }

    if (field === "introduce.title") {
      setContent((current) => ({
        ...current,
        introduce: { ...current.introduce, title: normalizedValue },
      }));
      return;
    }

    if (field === "introduce.content") {
      setContent((current) => ({
        ...current,
        introduce: { ...current.introduce, content: normalizedValue },
      }));
      return;
    }

    if (field.startsWith("introductionTextBlocks:")) {
      const [, blockId, key] = field.split(":");
      if (blockId && key === "text") {
        updateIntroductionCustomText(blockId, normalizedValue);
      }
      return;
    }

    if (field.startsWith("skill-category:")) {
      const skillIds = new Set(field.slice("skill-category:".length).split(","));
      setContent((current) => ({
        ...current,
        skills: current.skills.map((skill) =>
          skillIds.has(skill.id)
            ? { ...skill, category: normalizedValue }
            : skill,
        ),
      }));
      return;
    }

    const [collection, id, key] = field.split(":");

    if (!collection || !id || !key) return;

    setContent((current) => {
      if (collection === "skills" && key === "name") {
        return {
          ...current,
          skills: current.skills.map((item) =>
            item.id === id ? { ...item, name: normalizedValue } : item,
          ),
        };
      }

      if (collection === "careers") {
        return {
          ...current,
          careers: current.careers.map((item) => {
            if (item.id !== id) return item;
            if (key === "company") return { ...item, company: normalizedValue };
            if (key === "role") return { ...item, role: normalizedValue };
            if (key === "summary") return { ...item, summary: normalizedValue };
            return item;
          }),
        };
      }

      if (collection === "careerWorks") {
        const existingWork = current.careerWorks.find(
          (item) => item.id === id,
        );

        if (!existingWork) return current;
        if (key === "title" && existingWork.title === normalizedValue) {
          return current;
        }

        return {
          ...current,
          careerWorks: current.careerWorks.map((item) => {
            if (item.id !== id) return item;
            if (key === "title") return { ...item, title: normalizedValue };
            if (key === "description") {
              return { ...item, description: normalizedValue };
            }
            return item;
          }),
        };
      }

      if (collection === "careerWorkTechnologies") {
        const itemIndex = Number(key);
        if (!Number.isInteger(itemIndex)) return current;

        return {
          ...current,
          careerWorks: current.careerWorks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  technologies: item.technologies?.map((technology, index) =>
                    index === itemIndex ? normalizedValue : technology,
                  ),
                }
              : item,
          ),
        };
      }

      if (collection === "careerWorkAchievements") {
        if (key === "all") {
          return {
            ...current,
            careerWorks: current.careerWorks.map((item) =>
              item.id === id
                ? { ...item, achievements: splitLines(normalizedValue) }
                : item,
            ),
          };
        }

        const itemIndex = Number(key);
        if (!Number.isInteger(itemIndex)) return current;

        return {
          ...current,
          careerWorks: current.careerWorks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  achievements: item.achievements?.map((achievement, index) =>
                    index === itemIndex ? normalizedValue : achievement,
                  ),
                }
              : item,
          ),
        };
      }

      if (collection === "sideProjects") {
        return {
          ...current,
          sideProjects: current.sideProjects.map((item) => {
            if (item.id !== id) return item;
            if (key === "name") return { ...item, name: normalizedValue };
            if (key === "period") return { ...item, period: normalizedValue };
            if (key === "description") {
              return { ...item, description: normalizedValue };
            }
            return item;
          }),
        };
      }

      if (collection === "sideProjectHighlights") {
        if (key === "all") {
          return {
            ...current,
            sideProjects: current.sideProjects.map((item) =>
              item.id === id
                ? { ...item, highlights: splitLines(normalizedValue) ?? [] }
                : item,
            ),
          };
        }

        const itemIndex = Number(key);
        if (!Number.isInteger(itemIndex)) return current;

        return {
          ...current,
          sideProjects: current.sideProjects.map((item) =>
            item.id === id
              ? {
                  ...item,
                  highlights: item.highlights.map((highlight, index) =>
                    index === itemIndex ? normalizedValue : highlight,
                  ),
                }
              : item,
          ),
        };
      }

      if (collection === "sideProjectSkills") {
        const itemIndex = Number(key);
        if (!Number.isInteger(itemIndex)) return current;

        return {
          ...current,
          sideProjects: current.sideProjects.map((item) =>
            item.id === id
              ? {
                  ...item,
                  skills: item.skills.map((skill, index) =>
                    index === itemIndex ? normalizedValue : skill,
                  ),
                }
              : item,
          ),
        };
      }

      if (collection === "contacts") {
        return {
          ...current,
          contacts: current.contacts.map((item) => {
            if (item.id !== id) return item;
            if (key === "label") return { ...item, label: normalizedValue };
            if (key === "value") {
              return {
                ...item,
                value: normalizedValue,
                url:
                  item.channel === "email"
                    ? `mailto:${normalizedValue}`
                    : item.channel === "phone"
                      ? createPhoneTelUrl(normalizedValue) ?? item.url
                      : item.url,
              };
            }
            return item;
          }),
        };
      }

      return current;
    });
  }

  return (
    <form
      action={formAction}
      className="admin-editor"
      onReset={(event) => event.preventDefault()}
    >
      <input
        name="content"
        type="hidden"
        value={JSON.stringify(normalizedContent)}
      />

      <header className="inline-admin-bar">
        <div className="inline-admin-bar-title">
          <span className="admin-kicker">PORTFOLIO CMS</span>
          <strong>{SECTION_LABELS[selectedSection]}</strong>
        </div>
        <div className="inline-admin-global-colors" aria-label="전체 글자색 직접 편집">
          <label>
            기본
            <input
              aria-label="전체 기본 글자색"
              onInput={(event) =>
                setContent((current) => ({
                  ...current,
                  visuals: {
                    ...current.visuals,
                    textColor: event.currentTarget.value,
                  },
                }))
              }
              type="color"
              value={content.visuals.textColor}
            />
          </label>
          <label>
            보조
            <input
              aria-label="전체 보조 글자색"
              onInput={(event) =>
                setContent((current) => ({
                  ...current,
                  visuals: {
                    ...current.visuals,
                    mutedTextColor: event.currentTarget.value,
                  },
                }))
              }
              type="color"
              value={content.visuals.mutedTextColor}
            />
          </label>
        </div>
        <div className="inline-admin-bar-actions">
          <Link className="admin-button" href="/" rel="noreferrer" target="_blank">
            공개 화면
          </Link>
          <button className="admin-button" formAction={logoutAction} type="submit">
            로그아웃
          </button>
          <SubmitButton>저장</SubmitButton>
        </div>
        <p className="inline-admin-save-status" data-status={state.status} role="status">
          {state.message ?? "화면에서 직접 수정한 뒤 저장하세요."}
        </p>
      </header>

      <div className="visual-editor-workspace">
        <div
          className="visual-editor-canvas"
          aria-label="편집 가능한 공개 포트폴리오"
        >
          <PortfolioExperience
            content={previewContent}
            editor={{
              onChangeIntroductionTextBlock: updateIntroductionTextBlock,
              onChangeRecentTextColors: changeRecentTextColors,
              onChangeCareerDates: changeCareerDates,
              onChangeContactStructure: changeContactStructure,
              onChangeGalleryImageAlt: changeGalleryImageAlt,
              onChangeProjectLink: changeProjectLink,
              onChangeSectionVisual: updateSectionVisual,
              onRemoveGalleryImage: removeGalleryImage,
              onRemoveSectionBackground: removeSectionImage,
              onSelectIntroductionTextBlock: selectIntroductionTextBlock,
              onSelectSection: selectSection,
              onTextCommit: commitInlineText,
              onUploadGalleryImages: uploadGalleryImages,
              onUploadSectionBackground: (sectionId, file) =>
                void uploadSectionImage(sectionId, file),
              onAddItem: addInlineItem,
              onDeleteItem: deleteInlineItem,
              selectedIntroductionTextBlockId,
              selectedSection,
            }}
            scrollMode="window"
          />
        </div>

        <div className="legacy-admin-fields" hidden>
          <section className="admin-edit-section admin-theme-section">
            <div className="admin-section-heading">
              <div>
                <span>STYLE</span>
                <h2>전체 디자인</h2>
              </div>
            </div>
            <div className="admin-field-grid">
              <ColorField
                label="기본 글자색"
                onChange={(textColor) =>
                  setContent((current) => ({
                    ...current,
                    visuals: { ...current.visuals, textColor },
                  }))
                }
                value={content.visuals.textColor}
              />
              <ColorField
                label="보조 글자색"
                onChange={(mutedTextColor) =>
                  setContent((current) => ({
                    ...current,
                    visuals: { ...current.visuals, mutedTextColor },
                  }))
                }
                value={content.visuals.mutedTextColor}
              />
              <ColorField
                label="전체 강조색"
                onChange={(accentColor) =>
                  setContent((current) => ({
                    ...current,
                    visuals: { ...current.visuals, accentColor },
                  }))
                }
                value={content.visuals.accentColor}
              />
            </div>
          </section>

          {assetMessage ? (
            <p className="admin-asset-message" role="status">
              {assetMessage}
            </p>
          ) : null}

      <section
        className="admin-edit-section"
        data-admin-section="introduce"
        data-selected={selectedSection === "introduce" ? "true" : undefined}
      >
        <div className="admin-section-heading">
          <div>
            <span>01</span>
            <h2>소개</h2>
          </div>
        </div>
        <SectionVisualControls
          disabled={uploadingSection === "introduce"}
          onChange={(visualPatch) =>
            updateSectionVisual("introduce", visualPatch)
          }
          onRemoveImage={() => removeSectionImage("introduce")}
          onUploadImage={(file) => void uploadSectionImage("introduce", file)}
          sectionId="introduce"
          visual={content.visuals.sections.introduce}
        />
        <IntroductionTextBlockControls
          blocks={content.visuals.sections.introduce.textBlocks}
          onAdd={addIntroductionTextBlock}
          onChange={updateIntroductionTextBlock}
          onRemove={removeIntroductionTextBlock}
          onSelect={selectIntroductionTextBlock}
          onTextChange={updateIntroductionCustomText}
          selectedBlockId={selectedIntroductionTextBlockId}
        />
        <div className="admin-field-grid">
          <Field
            label="제목"
            onChange={(title) =>
              setContent((current) => ({
                ...current,
                introduce: { ...current.introduce, title },
              }))
            }
            value={content.introduce.title}
          />
          <TextAreaField
            label="소개 문구"
            onChange={(value) =>
              setContent((current) => ({
                ...current,
                introduce: { ...current.introduce, content: value },
              }))
            }
            rows={5}
            value={content.introduce.content}
          />
        </div>
        <div className="admin-subsection-heading">
          <h3>소개에 표시할 기술</h3>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                skills: [
                  ...current.skills,
                  {
                    category: "Language",
                    id: createContentId("skill"),
                    name: "새 기술",
                    order: current.skills.length,
                  },
                ],
              }))
            }
            type="button"
          >
            기술 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.skills.map((skill, index) => (
            <fieldset
              className="admin-item"
              data-admin-target-id={skill.id}
              key={skill.id}
            >
              <legend>기술 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="이름"
                  onChange={(name) =>
                    setContent((current) => ({
                      ...current,
                      skills: current.skills.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name } : item,
                      ),
                    }))
                  }
                  value={skill.name}
                />
                <Field
                  label="분류"
                  onChange={(category) =>
                    setContent((current) => ({
                      ...current,
                      skills: current.skills.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, category } : item,
                      ),
                    }))
                  }
                  value={skill.category}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    skills: current.skills.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section
        className="admin-edit-section"
        data-admin-section="career"
        data-selected={selectedSection === "career" ? "true" : undefined}
      >
        <div className="admin-section-heading">
          <div>
            <span>02</span>
            <h2>경력</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                careers: [
                  ...current.careers,
                  {
                    company: "새 회사",
                    endDate: null,
                    id: createContentId("career"),
                    order: current.careers.length,
                    role: "직무",
                    startDate: new Date().toISOString().slice(0, 7),
                  },
                ],
              }))
            }
            type="button"
          >
            경력 추가
          </button>
        </div>
        <SectionVisualControls
          disabled={uploadingSection === "career"}
          onChange={(visualPatch) => updateSectionVisual("career", visualPatch)}
          onRemoveImage={() => removeSectionImage("career")}
          onUploadImage={(file) => void uploadSectionImage("career", file)}
          sectionId="career"
          visual={content.visuals.sections.career}
        />
        <div className="admin-item-list">
          {content.careers.map((career, index) => (
            <fieldset
              className="admin-item"
              data-admin-target-id={career.id}
              key={career.id}
            >
              <legend>경력 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="회사"
                  onChange={(company) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, company } : item,
                      ),
                    }))
                  }
                  value={career.company}
                />
                <Field
                  label="직무"
                  onChange={(role) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, role } : item,
                      ),
                    }))
                  }
                  value={career.role}
                />
                <Field
                  label="시작 월"
                  onChange={(startDate) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, startDate } : item,
                      ),
                    }))
                  }
                  type="month"
                  value={career.startDate}
                />
                <Field
                  label="종료 월 (재직 중이면 비움)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, endDate: value || null } : item,
                      ),
                    }))
                  }
                  type="month"
                  value={career.endDate ?? ""}
                />
                <TextAreaField
                  label="요약"
                  onChange={(summary) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, summary: summary || undefined }
                          : item,
                      ),
                    }))
                  }
                  value={career.summary ?? ""}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    careers: current.careers.filter((_, itemIndex) => itemIndex !== index),
                    careerWorks: current.careerWorks.filter(
                      (work) => work.careerId !== career.id,
                    ),
                  }))
                }
                type="button"
              >
                경력과 연결 작업 삭제
              </button>
            </fieldset>
          ))}
        </div>

        <div className="admin-subsection-heading">
          <h3>경력 상세 작업</h3>
          <button
            className="admin-button"
            disabled={content.careers.length === 0}
            onClick={() => {
              const careerId = content.careers[0]?.id;
              if (!careerId) return;
              setContent((current) => ({
                ...current,
                careerWorks: [
                  ...current.careerWorks,
                  {
                    careerId,
                    description: "작업 설명",
                    id: createContentId("work"),
                    order: current.careerWorks.filter((work) => work.careerId === careerId)
                      .length,
                    title: "새 작업",
                  },
                ],
              }));
            }}
            type="button"
          >
            작업 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.careerWorks.map((work, index) => (
            <fieldset
              className="admin-item"
              data-admin-target-id={work.id}
              key={work.id}
            >
              <legend>작업 {index + 1}</legend>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>소속 경력</span>
                  <select
                    onChange={(event) => {
                      const careerId = event.target.value;
                      setContent((current) => ({
                        ...current,
                        careerWorks: current.careerWorks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, careerId } : item,
                        ),
                      }));
                    }}
                    value={work.careerId}
                  >
                    {content.careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.company} — {career.role}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="작업명"
                  onChange={(title) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    }))
                  }
                  value={work.title}
                />
                <TextAreaField
                  label="Action (한 줄에 하나)"
                  onChange={(description) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description } : item,
                      ),
                    }))
                  }
                  placeholder={"- 첫 번째 작업 내용\n- 두 번째 작업 내용"}
                  rows={6}
                  value={work.description}
                />
                <TextAreaField
                  label="성과 (한 줄에 하나)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, achievements: splitLines(value) }
                          : item,
                      ),
                    }))
                  }
                  value={work.achievements?.join("\n") ?? ""}
                />
                <TextAreaField
                  label="기술 (한 줄에 하나)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, technologies: splitLines(value) }
                          : item,
                      ),
                    }))
                  }
                  value={work.technologies?.join("\n") ?? ""}
                />
              </div>
              <div className="admin-career-work-images">
                <div className="admin-career-work-images-heading">
                  <div>
                    <strong>작업 스크린샷</strong>
                    <p>JPEG, PNG, WebP, AVIF · 파일당 5MB · 최대 8장</p>
                  </div>
                  <span>{work.images?.length ?? 0}/8</span>
                </div>
                <label className="admin-field">
                  <span>이미지 첨부</span>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    aria-label={`${work.title} 작업 스크린샷 첨부`}
                    disabled={uploadingCareerWorkId !== null}
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      void uploadCareerWorkImages(work.id, files);
                    }}
                    type="file"
                  />
                </label>
                {work.images && work.images.length > 0 ? (
                  <div className="admin-career-work-image-grid">
                    {work.images.map((image, imageIndex) => (
                      <div className="admin-career-work-image" key={image.path}>
                        <div className="admin-career-work-image-preview">
                          <Image
                            alt={image.alt}
                            fill
                            sizes="(max-width: 720px) 100vw, 220px"
                            src={image.url}
                          />
                        </div>
                        <label className="admin-field">
                          <span>대체 텍스트 {imageIndex + 1}</span>
                          <input
                            maxLength={160}
                            onChange={(event) =>
                              updateCareerWorkImageAlt(
                                work.id,
                                image.path,
                                event.target.value,
                              )
                            }
                            type="text"
                            value={image.alt}
                          />
                        </label>
                        <button
                          className="admin-remove-button"
                          onClick={() =>
                            removeCareerWorkImage(work.id, image.path)
                          }
                          type="button"
                        >
                          스크린샷 삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    careerWorks: current.careerWorks.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section
        className="admin-edit-section"
        data-admin-section="side-projects"
        data-selected={
          selectedSection === "side-projects" ? "true" : undefined
        }
      >
        <div className="admin-section-heading">
          <div>
            <span>03</span>
            <h2>프로젝트</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                sideProjects: [
                  ...current.sideProjects,
                  {
                    description: "프로젝트 설명",
                    highlights: [],
                    id: createContentId("project"),
                    images: [],
                    links: {},
                    name: "새 프로젝트",
                    order: current.sideProjects.length,
                    period: String(new Date().getFullYear()),
                    skills: [],
                  },
                ],
              }))
            }
            type="button"
          >
            프로젝트 추가
          </button>
        </div>
        <SectionVisualControls
          disabled={uploadingSection === "side-projects"}
          onChange={(visualPatch) =>
            updateSectionVisual("side-projects", visualPatch)
          }
          onRemoveImage={() => removeSectionImage("side-projects")}
          onUploadImage={(file) =>
            void uploadSectionImage("side-projects", file)
          }
          sectionId="side-projects"
          visual={content.visuals.sections["side-projects"]}
        />
        <div className="admin-item-list">
          {content.sideProjects.map((project, index) => (
            <fieldset
              className="admin-item"
              data-admin-target-id={project.id}
              key={project.id}
            >
              <legend>프로젝트 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="이름"
                  onChange={(name) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name } : item,
                      ),
                    }))
                  }
                  value={project.name}
                />
                <Field
                  label="기간"
                  onChange={(period) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, period: period || undefined }
                          : item,
                      ),
                    }))
                  }
                  placeholder="예: 2026 / 2025-07~"
                  value={project.period ?? ""}
                />
                <TextAreaField
                  label="설명"
                  onChange={(description) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description } : item,
                      ),
                    }))
                  }
                  value={project.description}
                />
                <TextAreaField
                  label="상세 작업 (한 줄에 하나)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, highlights: splitLines(value) ?? [] }
                          : item,
                      ),
                    }))
                  }
                  placeholder={"첫 번째 상세 작업\n두 번째 상세 작업"}
                  rows={6}
                  value={project.highlights.join("\n")}
                />
                <Field
                  label="기술 (쉼표로 구분)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, skills: splitCommaSeparated(value) }
                          : item,
                      ),
                    }))
                  }
                  value={project.skills.join(", ")}
                />
                <Field
                  label="저장소 URL"
                  onChange={(repository) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              links: { ...item.links, repository: repository || undefined },
                            }
                          : item,
                      ),
                    }))
                  }
                  type="url"
                  value={project.links.repository ?? ""}
                />
                <Field
                  label="데모 URL"
                  onChange={(demo) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, links: { ...item.links, demo: demo || undefined } }
                          : item,
                      ),
                    }))
                  }
                  type="url"
                  value={project.links.demo ?? ""}
                />
              </div>
              <div className="admin-career-work-images">
                <div className="admin-career-work-images-heading">
                  <div>
                    <strong>프로젝트 스크린샷</strong>
                    <p>JPEG, PNG, WebP, AVIF · 파일당 5MB · 최대 8장</p>
                  </div>
                  <span>{project.images.length}/8</span>
                </div>
                <label className="admin-field">
                  <span>이미지 첨부</span>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    aria-label={`${project.name} 프로젝트 스크린샷 첨부`}
                    disabled={uploadingProjectId !== null}
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      void uploadProjectImages(project.id, files);
                    }}
                    type="file"
                  />
                </label>
                {project.images.length > 0 ? (
                  <div className="admin-career-work-image-grid">
                    {project.images.map((image, imageIndex) => (
                      <div className="admin-career-work-image" key={image.path}>
                        <div className="admin-career-work-image-preview">
                          <Image
                            alt={image.alt}
                            fill
                            sizes="(max-width: 720px) 100vw, 220px"
                            src={image.url}
                          />
                        </div>
                        <label className="admin-field">
                          <span>대체 텍스트 {imageIndex + 1}</span>
                          <input
                            maxLength={160}
                            onChange={(event) =>
                              updateProjectImageAlt(
                                project.id,
                                image.path,
                                event.target.value,
                              )
                            }
                            type="text"
                            value={image.alt}
                          />
                        </label>
                        <button
                          className="admin-remove-button"
                          onClick={() =>
                            removeProjectImage(project.id, image.path)
                          }
                          type="button"
                        >
                          스크린샷 삭제
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    sideProjects: current.sideProjects.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section
        className="admin-edit-section"
        data-admin-section="contact"
        data-selected={selectedSection === "contact" ? "true" : undefined}
      >
        <div className="admin-section-heading">
          <div>
            <span>04</span>
            <h2>연락처</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                contacts: [
                  ...current.contacts,
                  {
                    channel: "website",
                    id: createContentId("contact"),
                    label: "Website",
                    order: current.contacts.length,
                    url: "https://example.com",
                    value: "example.com",
                  },
                ],
              }))
            }
            type="button"
          >
            연락처 추가
          </button>
        </div>
        <SectionVisualControls
          disabled={uploadingSection === "contact"}
          onChange={(visualPatch) => updateSectionVisual("contact", visualPatch)}
          onRemoveImage={() => removeSectionImage("contact")}
          onUploadImage={(file) => void uploadSectionImage("contact", file)}
          sectionId="contact"
          visual={content.visuals.sections.contact}
        />
        <div className="admin-item-list">
          {content.contacts.map((contact, index) => (
            <fieldset
              className="admin-item"
              data-admin-target-id={contact.id}
              key={contact.id}
            >
              <legend>연락처 {index + 1}</legend>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>채널</span>
                  <select
                    onChange={(event) => {
                      const channel = event.target.value as typeof contact.channel;
                      setContent((current) => ({
                        ...current,
                        contacts: current.contacts.map((item, itemIndex) => {
                          if (itemIndex !== index) return item;

                          if (channel === "phone") {
                            const value =
                              item.channel === "phone"
                                ? item.value
                                : "010-0000-0000";
                            return {
                              ...item,
                              channel,
                              label:
                                item.channel === "phone" ? item.label : "Phone",
                              url: createPhoneTelUrl(value) ?? "tel:01000000000",
                              value,
                            };
                          }

                          if (channel === "email") {
                            const value =
                              item.channel === "email"
                                ? item.value
                                : "hello@example.com";
                            return {
                              ...item,
                              channel,
                              label:
                                item.channel === "email" ? item.label : "Email",
                              url: `mailto:${value}`,
                              value,
                            };
                          }

                          return {
                            ...item,
                            channel,
                            url: item.url.startsWith("https://")
                              ? item.url
                              : "https://example.com",
                          };
                        }),
                      }));
                    }}
                    value={contact.channel}
                  >
                    <option value="email">email</option>
                    <option value="phone">phone</option>
                    <option value="github">github</option>
                    <option value="linkedin">linkedin</option>
                    <option value="blog">blog</option>
                    <option value="website">website</option>
                  </select>
                </label>
                <Field
                  label="표시명"
                  onChange={(label) =>
                    setContent((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label } : item,
                      ),
                    }))
                  }
                  value={contact.label}
                />
                <Field
                  label="표시 값"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) => {
                        if (itemIndex !== index) return item;
                        return {
                          ...item,
                          url:
                            item.channel === "email"
                              ? `mailto:${value}`
                              : item.channel === "phone"
                                ? createPhoneTelUrl(value) ?? item.url
                                : item.url,
                          value,
                        };
                      }),
                    }))
                  }
                  value={contact.value}
                />
                {contact.channel === "phone" ? (
                  <label className="admin-field">
                    <span>연결 URL (자동 생성)</span>
                    <input readOnly type="text" value={contact.url} />
                  </label>
                ) : (
                  <Field
                    label="연결 URL"
                    onChange={(url) =>
                      setContent((current) => ({
                        ...current,
                        contacts: current.contacts.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url } : item,
                        ),
                      }))
                    }
                    value={contact.url}
                  />
                )}
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    contacts: current.contacts.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
          </section>
          </div>
      </div>
    </form>
  );
}
