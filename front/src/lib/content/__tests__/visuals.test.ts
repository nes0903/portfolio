import { describe, expect, it } from "vitest";

import { portfolioDocumentContentSchema } from "@/lib/content/model";
import { DEFAULT_PORTFOLIO_VISUALS } from "@/lib/content/schema";
import { createValidContentFiles } from "@/test/content-fixtures";

function createDocumentWithoutVisuals() {
  const files = createValidContentFiles();

  return {
    introduce: files["introduce.json"],
    skills: files["skill.json"],
    careers: files["career.json"],
    careerWorks: files["career-work.json"],
    sideProjects: files["side-project.json"],
    contacts: files["contact.json"],
  };
}

describe("portfolio visual schema", () => {
  it("기존 콘텐츠에는 현재 디자인 기본값을 채운다", () => {
    const parsed = portfolioDocumentContentSchema.parse(
      createDocumentWithoutVisuals(),
    );

    expect(parsed.visuals).toEqual(DEFAULT_PORTFOLIO_VISUALS);
  });

  it("검증된 섹션 배경 이미지와 표시 위치만 허용한다", () => {
    const content = createDocumentWithoutVisuals();
    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      visuals: {
        ...DEFAULT_PORTFOLIO_VISUALS,
        sections: {
          ...DEFAULT_PORTFOLIO_VISUALS.sections,
          introduce: {
            ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce,
            backgroundImage: {
              alt: "소개 배경 이미지",
              overlayOpacity: 0.4,
              path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
              positionX: 35,
              positionY: 62,
              url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/example.webp",
            },
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("소개 제목·내용·추가 텍스트의 캔버스 배치를 검증한다", () => {
    const content = createDocumentWithoutVisuals();
    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      visuals: {
        ...DEFAULT_PORTFOLIO_VISUALS,
        sections: {
          ...DEFAULT_PORTFOLIO_VISUALS.sections,
          introduce: {
            ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce,
            textBlocks: [
              ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce.textBlocks,
              {
                fontSize: 28,
                height: 12,
                id: "intro-text-valid",
                kind: "custom",
                text: "추가 소개 문구",
                textAlign: "center",
                width: 32,
                x: 60,
                y: 78,
              },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("소개 텍스트 박스의 세로 영역은 기존 캔버스 높이보다 길어질 수 있다", () => {
    const content = createDocumentWithoutVisuals();
    const blocks = DEFAULT_PORTFOLIO_VISUALS.sections.introduce.textBlocks;
    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      visuals: {
        ...DEFAULT_PORTFOLIO_VISUALS,
        sections: {
          ...DEFAULT_PORTFOLIO_VISUALS.sections,
          introduce: {
            ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce,
            textBlocks: blocks.map((block) =>
              block.kind === "body"
                ? { ...block, height: 80, y: 240 }
                : block,
            ),
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("가로 캔버스 밖으로 나가는 텍스트 박스와 필수 블록 중복을 거부한다", () => {
    const content = createDocumentWithoutVisuals();
    const title = DEFAULT_PORTFOLIO_VISUALS.sections.introduce.textBlocks[0];
    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      visuals: {
        ...DEFAULT_PORTFOLIO_VISUALS,
        sections: {
          ...DEFAULT_PORTFOLIO_VISUALS.sections,
          introduce: {
            ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce,
            textBlocks: [
              ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce.textBlocks,
              { ...title, id: "intro-title-duplicate", width: 50, x: 70 },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("임의 CSS 색상과 버킷 범위를 벗어난 이미지 경로를 거부한다", () => {
    const content = createDocumentWithoutVisuals();
    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      visuals: {
        ...DEFAULT_PORTFOLIO_VISUALS,
        accentColor: "red",
        sections: {
          ...DEFAULT_PORTFOLIO_VISUALS.sections,
          introduce: {
            ...DEFAULT_PORTFOLIO_VISUALS.sections.introduce,
            backgroundImage: {
              alt: "잘못된 이미지",
              overlayOpacity: 0.4,
              path: "shared/image.svg",
              positionX: 50,
              positionY: 50,
              url: "http://example.com/image.svg",
            },
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("경력 작업에 소유자 범위의 스크린샷을 최대 8장까지 허용한다", () => {
    const content = createDocumentWithoutVisuals();
    const firstWork = content.careerWorks[0];
    if (!firstWork) throw new Error("경력 작업 fixture가 필요합니다");

    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      careerWorks: [
        {
          ...firstWork,
          images: [
            {
              alt: "관리자 작업 화면",
              path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
              url: "https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp",
            },
          ],
        },
        ...content.careerWorks.slice(1),
      ],
    });

    expect(result.success).toBe(true);
  });

  it("경력 작업의 9번째 이미지와 소유자 범위 밖 경로를 거부한다", () => {
    const content = createDocumentWithoutVisuals();
    const firstWork = content.careerWorks[0];
    if (!firstWork) throw new Error("경력 작업 fixture가 필요합니다");

    const result = portfolioDocumentContentSchema.safeParse({
      ...content,
      careerWorks: [
        {
          ...firstWork,
          images: Array.from({ length: 9 }, (_, index) => ({
            alt: `작업 화면 ${index + 1}`,
            path: `shared/${index}.webp`,
            url: `https://portfolio.supabase.co/storage/v1/object/public/portfolio-assets/shared/${index}.webp`,
          })),
        },
        ...content.careerWorks.slice(1),
      ],
    });

    expect(result.success).toBe(false);
  });
});
