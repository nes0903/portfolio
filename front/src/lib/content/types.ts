import type { z } from "zod";

import type {
  careerItemSchema,
  careerWorkItemSchema,
  contactItemSchema,
  introduceSchema,
  introductionSectionVisualSchema,
  introductionTextBlockSchema,
  portfolioBackgroundImageSchema,
  portfolioCareerWorkImageSchema,
  portfolioSectionVisualSchema,
  portfolioVisualsSchema,
  sideProjectItemSchema,
  skillItemSchema,
} from "@/lib/content/schema";

/**
 * 중첩 배열과 객체를 포함한 값을 읽기 전용으로 노출한다.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type Introduce = DeepReadonly<z.infer<typeof introduceSchema>>;
export type Skill = DeepReadonly<z.infer<typeof skillItemSchema>>;
export type Career = DeepReadonly<z.infer<typeof careerItemSchema>>;
export type CareerWork = DeepReadonly<z.infer<typeof careerWorkItemSchema>>;
export type SideProject = DeepReadonly<z.infer<typeof sideProjectItemSchema>>;
export type Contact = DeepReadonly<z.infer<typeof contactItemSchema>>;
export type PortfolioBackgroundImage = DeepReadonly<
  z.infer<typeof portfolioBackgroundImageSchema>
>;
export type PortfolioCareerWorkImage = DeepReadonly<
  z.infer<typeof portfolioCareerWorkImageSchema>
>;
export type IntroductionTextBlock = DeepReadonly<
  z.infer<typeof introductionTextBlockSchema>
>;
export type PortfolioIntroductionVisual = DeepReadonly<
  z.infer<typeof introductionSectionVisualSchema>
>;
export type PortfolioSectionVisual = DeepReadonly<
  z.infer<typeof portfolioSectionVisualSchema>
>;
export type PortfolioVisuals = DeepReadonly<z.infer<typeof portfolioVisualsSchema>>;

/**
 * 한 경력에 해당하는 상세 작업을 결합한 뷰 모델.
 */
export type CareerWithWorks = Career & {
  readonly works: readonly CareerWork[];
};

/**
 * Server Component에 전달되는 전체 포트폴리오 콘텐츠 모델.
 */
export interface PortfolioContentViewModel {
  readonly introduce: Introduce;
  readonly skills: readonly Skill[];
  readonly careers: readonly CareerWithWorks[];
  readonly sideProjects: readonly SideProject[];
  readonly contacts: readonly Contact[];
  readonly visuals: PortfolioVisuals;
}
