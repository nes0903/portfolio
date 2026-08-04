import {
  careerWorksSchema,
  careersSchema,
  contactsSchema,
  introduceSchema,
  portfolioVisualsSchema,
  sideProjectsSchema,
  skillsSchema,
} from "@/lib/content/schema";
import type {
  Career,
  CareerWork,
  DeepReadonly,
  PortfolioContentViewModel,
} from "@/lib/content/types";
import { z } from "zod";

/**
 * Supabase JSONB 문서와 로컬 seed가 공유하는 원본 콘텐츠 계약.
 */
export const portfolioDocumentContentSchema = z
  .object({
    introduce: introduceSchema,
    skills: skillsSchema,
    careers: careersSchema,
    careerWorks: careerWorksSchema,
    sideProjects: sideProjectsSchema,
    contacts: contactsSchema,
    visuals: portfolioVisualsSchema,
  })
  .strict();

export type PortfolioDocumentContent = z.infer<
  typeof portfolioDocumentContentSchema
>;

/**
 * 값을 변경하지 않고 order 오름차순의 새 배열을 만든다.
 */
function sortByOrder<T extends { readonly order: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

/**
 * 모든 중첩 객체와 배열을 동결해 읽기 전용 뷰 모델을 런타임에도 보장한다.
 */
function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return Object.freeze(value) as DeepReadonly<T>;
}

/**
 * 모든 career-work가 실제 career를 참조하는지 검증한다.
 */
function assertCareerReferences(
  careers: readonly Career[],
  careerWorks: readonly CareerWork[],
): void {
  const careerIds = new Set(careers.map((career) => career.id));

  for (const work of careerWorks) {
    if (!careerIds.has(work.careerId)) {
      throw new Error(
        "Portfolio content relationship error; field=careerWorks.careerId",
      );
    }
  }
}

/**
 * 검증된 원본 콘텐츠를 화면용 정렬·경력 연결 모델로 변환한다.
 */
export function createPortfolioContentViewModel(
  content: PortfolioDocumentContent,
): PortfolioContentViewModel {
  assertCareerReferences(content.careers, content.careerWorks);

  const sortedCareerWorks = sortByOrder(content.careerWorks);
  const joinedCareers = sortByOrder(content.careers).map((career) => ({
    ...career,
    works: sortedCareerWorks.filter((work) => work.careerId === career.id),
  }));

  return deepFreeze({
    introduce: content.introduce,
    skills: sortByOrder(content.skills),
    careers: joinedCareers,
    sideProjects: sortByOrder(content.sideProjects),
    contacts: sortByOrder(content.contacts),
    visuals: content.visuals,
  });
}

/**
 * 신뢰할 수 없는 JSONB payload를 검증하고 안전한 화면 모델로 변환한다.
 */
export function parsePortfolioDocumentContent(
  value: unknown,
): PortfolioContentViewModel {
  const result = portfolioDocumentContentSchema.safeParse(value);

  if (!result.success) {
    throw new Error("Published portfolio content failed schema validation");
  }

  return createPortfolioContentViewModel(result.data);
}
