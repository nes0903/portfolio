import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { Dirent } from "node:fs";
import type { ZodType } from "zod";

import {
  careerWorksSchema,
  careersSchema,
  contactsSchema,
  introduceSchema,
  sideProjectsSchema,
  skillsSchema,
} from "@/lib/content/schema";
import { DEFAULT_PORTFOLIO_VISUALS } from "@/lib/content/schema";
import { createPortfolioContentViewModel } from "@/lib/content/model";
import type { PortfolioContentViewModel } from "@/lib/content/types";

/**
 * 빌드 입력으로 허용하는 JSON 파일 이름의 단일 계약.
 */
export const PORTFOLIO_CONTENT_FILE_NAMES = [
  "introduce.json",
  "skill.json",
  "career.json",
  "career-work.json",
  "side-project.json",
  "contact.json",
] as const;

const allowedFileNames = new Set<string>(PORTFOLIO_CONTENT_FILE_NAMES);

/**
 * 디렉터리가 정확히 여섯 개의 일반 JSON 파일만 포함하는지 검증한다.
 */
function assertExactContentFiles(entries: readonly Dirent[]): void {
  const entriesByName = new Map(entries.map((entry) => [entry.name, entry]));

  /**
   * 필수 파일이 빠졌거나 일반 파일이 아니면 즉시 빌드를 중단한다.
   */
  for (const fileName of PORTFOLIO_CONTENT_FILE_NAMES) {
    const entry = entriesByName.get(fileName);

    /**
     * allowlist의 모든 이름은 실제 파일로 존재해야 한다.
     */
    if (!entry) {
      throw new Error(`Missing portfolio content file: ${fileName}`);
    }

    /**
     * 디렉터리나 심볼릭 링크를 JSON 파일 대신 사용할 수 없다.
     */
    if (!entry.isFile()) {
      throw new Error(`Portfolio content entry must be a file: ${fileName}`);
    }
  }

  /**
   * 숨김 파일과 non-JSON 파일을 포함한 모든 추가 엔트리를 거부한다.
   */
  for (const entry of entries) {
    /**
     * allowlist에 없는 이름은 콘텐츠 디렉터리에 둘 수 없다.
     */
    if (!allowedFileNames.has(entry.name)) {
      throw new Error(`Unexpected portfolio content entry: ${entry.name}`);
    }
  }
}

/**
 * JSON 파일 하나를 읽고 해당 파일 전용 Zod 계약으로 검증한다.
 */
async function readValidatedJson<T>(
  contentDirectory: string,
  fileName: string,
  schema: ZodType<T>,
): Promise<T> {
  const filePath = path.join(contentDirectory, fileName);
  let source: string;
  let parsed: unknown;

  /**
   * filesystem 오류의 원인 객체와 절대 경로를 보존하지 않고 파일 단위로 보고한다.
   */
  try {
    source = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`Portfolio content read error; file=${fileName}`);
  }

  /**
   * JSON 문법 오류는 원문이나 SyntaxError cause 없이 오류 종류와 파일만 보고한다.
   */
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new Error(
      `Portfolio content JSON syntax error; file=${fileName}; field=<root>`,
    );
  }

  /**
   * 스키마 오류는 입력 key/value와 ZodError cause 없이 안전한 field path만 보고한다.
   */
  const result = schema.safeParse(parsed);

  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map((issue) => {
          if (issue.path.length === 0) {
            return "<root>";
          }

          return issue.path
            .map((segment) => {
              if (typeof segment === "number") {
                return `[${segment}]`;
              }

              return typeof segment === "string" &&
                /^[A-Za-z][A-Za-z0-9_-]*$/.test(segment)
                ? segment
                : "<field>";
            })
            .join(".");
        }),
      ),
    ];

    throw new Error(
      `Portfolio content schema error; file=${fileName}; field=${fields.join(",")}`,
    );
  }

  return result.data;
}

/**
 * sibling back JSON을 build-time에 읽어 검증된 전체 뷰 모델을 반환한다.
 */
export async function loadPortfolioContent(
  contentDirectory = path.resolve(process.cwd(), "../back"),
): Promise<PortfolioContentViewModel> {
  const entries = await readdir(contentDirectory, { withFileTypes: true });
  assertExactContentFiles(entries);

  const [introduce, skills, careers, careerWorks, sideProjects, contacts] =
    await Promise.all([
      readValidatedJson(contentDirectory, "introduce.json", introduceSchema),
      readValidatedJson(contentDirectory, "skill.json", skillsSchema),
      readValidatedJson(contentDirectory, "career.json", careersSchema),
      readValidatedJson(
        contentDirectory,
        "career-work.json",
        careerWorksSchema,
      ),
      readValidatedJson(
        contentDirectory,
        "side-project.json",
        sideProjectsSchema,
      ),
      readValidatedJson(contentDirectory, "contact.json", contactsSchema),
    ]);

  return createPortfolioContentViewModel({
    introduce,
    skills,
    careers,
    careerWorks,
    sideProjects,
    contacts,
    visuals: DEFAULT_PORTFOLIO_VISUALS,
  });
}
