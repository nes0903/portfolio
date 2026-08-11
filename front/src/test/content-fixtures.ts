import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CONTENT_FILE_NAMES = [
  "introduce.json",
  "skill.json",
  "career.json",
  "career-work.json",
  "side-project.json",
  "contact.json",
] as const;

export type ContentFileName = (typeof CONTENT_FILE_NAMES)[number];
export type CollectionFileName = Exclude<ContentFileName, "introduce.json">;

export interface IntroduceFixture {
  title: string;
  content: string;
}

export interface SkillFixture {
  id: string;
  name: string;
  category: string;
  order: number;
}

export interface CareerFixture {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  summary?: string;
  order: number;
}

export interface CareerWorkFixture {
  id: string;
  careerId: string;
  title: string;
  description: string;
  achievements?: string[];
  technologies?: string[];
  order: number;
}

export interface SideProjectFixture {
  id: string;
  name: string;
  period?: string;
  description: string;
  highlights: string[];
  images: Array<{
    alt: string;
    path: string;
    url: string;
  }>;
  skills: string[];
  links: {
    repository?: string;
    demo?: string;
  };
  order: number;
}

export interface ContactFixture {
  id: string;
  channel: "email" | "phone" | "github" | "linkedin" | "blog" | "website";
  label: string;
  value: string;
  url: string;
  order: number;
}

export interface ContentFiles {
  "introduce.json": IntroduceFixture;
  "skill.json": SkillFixture[];
  "career.json": CareerFixture[];
  "career-work.json": CareerWorkFixture[];
  "side-project.json": SideProjectFixture[];
  "contact.json": ContactFixture[];
}

export interface ContentFixtureDirectory {
  backendDirectory: string;
  frontDirectory: string;
  rootDirectory: string;
}

export function createValidContentFiles(): ContentFiles {
  return {
    "introduce.json": {
      title: "제품을 끝까지 책임지는 개발자",
      content: "검증 가능한 제품을 만들고 운영합니다.",
    },
    "skill.json": [
      { id: "typescript", name: "TypeScript", category: "language", order: 2 },
      { id: "nextjs", name: "Next.js", category: "frontend", order: 1 },
    ],
    "career.json": [
      {
        id: "current-career",
        company: "Current Company",
        role: "Frontend Engineer",
        startDate: "2024-01",
        endDate: null,
        summary: "정적 콘텐츠 플랫폼 개발",
        order: 2,
      },
      {
        id: "earlier-career",
        company: "Earlier Company",
        role: "Software Engineer",
        startDate: "2021-03",
        endDate: "2023-12",
        order: 1,
      },
    ],
    "career-work.json": [
      {
        id: "current-observability",
        careerId: "current-career",
        title: "Build observability",
        description: "빌드 실패 원인을 빠르게 찾도록 개선했습니다.",
        technologies: ["TypeScript", "GitHub Actions"],
        order: 2,
      },
      {
        id: "earlier-platform",
        careerId: "earlier-career",
        title: "Create platform",
        description: "사내 플랫폼을 구축했습니다.",
        order: 1,
      },
      {
        id: "current-contract",
        careerId: "current-career",
        title: "Define content contract",
        description: "콘텐츠 계약과 검증 파이프라인을 설계했습니다.",
        achievements: ["잘못된 배포를 사전에 차단"],
        order: 1,
      },
    ],
    "side-project.json": [
      {
        id: "second-project",
        name: "Second project",
        period: "2025-07~",
        description: "두 번째 프로젝트",
        highlights: ["두 번째 프로젝트 상세 작업"],
        images: [],
        skills: ["React"],
        links: { demo: "https://example.com/demo" },
        order: 2,
      },
      {
        id: "first-project",
        name: "First project",
        period: "2026",
        description: "첫 번째 프로젝트",
        highlights: ["첫 번째 프로젝트 상세 작업"],
        images: [],
        skills: ["TypeScript", "Next.js"],
        links: { repository: "https://github.com/example/portfolio" },
        order: 1,
      },
    ],
    "contact.json": [
      {
        id: "github",
        channel: "github",
        label: "GitHub",
        value: "example",
        url: "https://github.com/example",
        order: 2,
      },
      {
        id: "email",
        channel: "email",
        label: "Email",
        value: "hello@example.com",
        url: "mailto:hello@example.com",
        order: 1,
      },
    ],
  };
}

export function getCollection(
  files: ContentFiles,
  fileName: CollectionFileName,
): Array<{ id: string; order: number }> {
  return files[fileName];
}

export async function writeContentFixture(
  files: Partial<ContentFiles> = createValidContentFiles(),
  extraFiles: Readonly<Record<string, string>> = {},
): Promise<ContentFixtureDirectory> {
  const rootDirectory = await mkdtemp(join(tmpdir(), "portfolio-content-"));
  const frontDirectory = join(rootDirectory, "front");
  const backendDirectory = join(rootDirectory, "back");

  await Promise.all([
    mkdir(frontDirectory, { recursive: true }),
    mkdir(backendDirectory, { recursive: true }),
  ]);

  await Promise.all(
    Object.entries(files).map(([fileName, content]) =>
      writeFile(
        join(backendDirectory, fileName),
        `${JSON.stringify(content, null, 2)}\n`,
        "utf8",
      ),
    ),
  );
  await Promise.all(
    Object.entries(extraFiles).map(([fileName, content]) =>
      writeFile(join(backendDirectory, fileName), content, "utf8"),
    ),
  );

  return { backendDirectory, frontDirectory, rootDirectory };
}
