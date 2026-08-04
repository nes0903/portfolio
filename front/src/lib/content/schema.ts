import { z } from "zod";

/**
 * 원문은 변형하지 않으면서 공백 문자만 있는 문자열을 거부한다.
 */
const nonBlankStringSchema = z.string().min(1).refine(
  (value) => value.trim().length > 0,
  { message: "Expected a non-blank string" },
);

/**
 * YYYY-MM 형식이며 월 범위가 유효한 날짜 문자열 계약.
 */
const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM date format");

const reservedHostnameSuffixes = [
  "localhost",
  "local",
  "localdomain",
  "internal",
  "intranet",
  "lan",
  "home",
  "home.arpa",
  "corp",
  "private",
  "test",
  "invalid",
  "example",
  "onion",
] as const;

/**
 * hostname이 localhost, 내부 DNS, private IP 범위를 사용하지 않는지 검사한다.
 */
function isPublicHostname(rawHostname: string): boolean {
  const hostname = rawHostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    reservedHostnameSuffixes.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    )
  ) {
    return false;
  }

  /**
   * DNS rebinding 우회를 줄이기 위해 public 범위라도 모든 IP literal을 거부한다.
   */
  if (hostname.includes(":") || /^\d+(?:\.\d+){3}$/.test(hostname)) {
    return false;
  }

  /**
   * 외부 링크는 public suffix를 가질 수 있는 multi-label DNS 이름만 허용한다.
   */
  return hostname.includes(".");
}

/**
 * 외부 링크가 credential 없는 정확한 public HTTPS URL인지 검사한다.
 */
function isPublicHttpsUrl(value: string): boolean {
  if (value.trim() !== value || !value.startsWith("https://")) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      isPublicHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * 외부 링크에 허용되는 public HTTPS URL 계약.
 */
const httpsUrlSchema = z
  .string()
  .refine((value) => value.trim() === value, {
    message: "Expected a URL without surrounding whitespace",
  })
  .url()
  .refine(isPublicHttpsUrl, {
    message: "Expected a public HTTPS URL without credentials",
  });

export const DEFAULT_SECTION_VISUAL = {
  accentColor: "#ff5b49",
  backgroundColor: "#121216",
  backgroundImage: null,
  textColor: "#eeeae2",
} as const;

export const DEFAULT_PORTFOLIO_VISUALS = {
  accentColor: "#ff5b49",
  cardRadius: 22,
  mutedTextColor: "#a8a6a0",
  pageBackgroundColor: "#09090b",
  sections: {
    introduce: DEFAULT_SECTION_VISUAL,
    skills: DEFAULT_SECTION_VISUAL,
    career: DEFAULT_SECTION_VISUAL,
    "side-projects": DEFAULT_SECTION_VISUAL,
    contact: DEFAULT_SECTION_VISUAL,
  },
  textColor: "#eeeae2",
} as const;

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color");

const portfolioAssetPathSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f-]+\.(?:avif|jpe?g|png|webp)$/i,
  "Expected an owner-scoped portfolio asset path",
);

export const portfolioBackgroundImageSchema = z
  .object({
    alt: nonBlankStringSchema.max(160),
    overlayOpacity: z.number().min(0).max(0.95).default(0.42),
    path: portfolioAssetPathSchema,
    positionX: z.number().int().min(0).max(100).default(50),
    positionY: z.number().int().min(0).max(100).default(50),
    url: httpsUrlSchema,
  })
  .strict();

export const portfolioSectionVisualSchema = z
  .object({
    accentColor: hexColorSchema.default(DEFAULT_SECTION_VISUAL.accentColor),
    backgroundColor: hexColorSchema.default(
      DEFAULT_SECTION_VISUAL.backgroundColor,
    ),
    backgroundImage: portfolioBackgroundImageSchema
      .nullable()
      .default(DEFAULT_SECTION_VISUAL.backgroundImage),
    textColor: hexColorSchema.default(DEFAULT_SECTION_VISUAL.textColor),
  })
  .strict();

const defaultSectionVisuals = {
  introduce: DEFAULT_SECTION_VISUAL,
  skills: DEFAULT_SECTION_VISUAL,
  career: DEFAULT_SECTION_VISUAL,
  "side-projects": DEFAULT_SECTION_VISUAL,
  contact: DEFAULT_SECTION_VISUAL,
};

export const portfolioVisualsSchema = z
  .object({
    accentColor: hexColorSchema.default(DEFAULT_PORTFOLIO_VISUALS.accentColor),
    cardRadius: z
      .number()
      .int()
      .min(8)
      .max(40)
      .default(DEFAULT_PORTFOLIO_VISUALS.cardRadius),
    mutedTextColor: hexColorSchema.default(
      DEFAULT_PORTFOLIO_VISUALS.mutedTextColor,
    ),
    pageBackgroundColor: hexColorSchema.default(
      DEFAULT_PORTFOLIO_VISUALS.pageBackgroundColor,
    ),
    sections: z
      .object({
        introduce: portfolioSectionVisualSchema.default(DEFAULT_SECTION_VISUAL),
        skills: portfolioSectionVisualSchema.default(DEFAULT_SECTION_VISUAL),
        career: portfolioSectionVisualSchema.default(DEFAULT_SECTION_VISUAL),
        "side-projects": portfolioSectionVisualSchema.default(
          DEFAULT_SECTION_VISUAL,
        ),
        contact: portfolioSectionVisualSchema.default(DEFAULT_SECTION_VISUAL),
      })
      .strict()
      .default(defaultSectionVisuals),
    textColor: hexColorSchema.default(DEFAULT_PORTFOLIO_VISUALS.textColor),
  })
  .strict()
  .default(DEFAULT_PORTFOLIO_VISUALS);

/**
 * 연락 채널에서 재사용하는 유효한 이메일 주소 계약.
 */
const emailAddressSchema = z.string().email();

/**
 * 이메일 주소 하나만 포함하는 mailto URL 계약.
 */
const mailtoUrlSchema = z.string().refine(
  (value) => {
    /**
     * mailto 접두사가 없으면 이메일 주소를 검사하지 않는다.
     */
    if (!value.startsWith("mailto:")) {
      return false;
    }

    return emailAddressSchema.safeParse(value.slice("mailto:".length)).success;
  },
  { message: "Expected a mailto URL with a valid email address" },
);

/**
 * 배열 콘텐츠의 공통 식별자와 정렬 순번 계약.
 */
interface OrderedContentItem {
  readonly id: string;
  readonly order: number;
}

/**
 * 종료 월이 시작 월보다 빠른 경력 범위를 거부한다.
 */
function validateCareerDateRange(
  career: { readonly startDate: string; readonly endDate: string | null },
  context: z.RefinementCtx,
): void {
  /**
   * 현재 재직 중이거나 종료 월이 시작 월 이후면 유효한 범위다.
   */
  if (career.endDate === null || career.endDate >= career.startDate) {
    return;
  }

  context.addIssue({
    code: "custom",
    message: "endDate must be greater than or equal to startDate",
    path: ["endDate"],
  });
}

/**
 * 한 JSON 배열 안에서 id와 order가 각각 유일한지 검증한다.
 */
function validateUniqueIdentityAndOrder<T extends OrderedContentItem>(
  items: readonly T[],
  context: z.RefinementCtx,
): void {
  const ids = new Map<string, number>();
  const orders = new Map<number, number>();

  /**
   * 각 항목의 최초 위치를 기록하고 이후 중복을 오류로 보고한다.
   */
  items.forEach((item, index) => {
    const firstIdIndex = ids.get(item.id);

    /**
     * 같은 id가 이미 있으면 현재 항목의 id 위치에 오류를 추가한다.
     */
    if (firstIdIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate id \"${item.id}\"; first declared at index ${firstIdIndex}`,
        path: [index, "id"],
      });
    } else {
      ids.set(item.id, index);
    }

    const firstOrderIndex = orders.get(item.order);

    /**
     * 같은 order가 이미 있으면 현재 항목의 order 위치에 오류를 추가한다.
     */
    if (firstOrderIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate order ${item.order}; first declared at index ${firstOrderIndex}`,
        path: [index, "order"],
      });
    } else {
      orders.set(item.order, index);
    }
  });
}

/**
 * skill name을 trim하고 대소문자를 접어 파일 전체의 의미상 중복을 검증한다.
 */
function validateUniqueSkillNames(
  items: readonly z.infer<typeof skillItemSchema>[],
  context: z.RefinementCtx,
): void {
  const normalizedNames = new Map<string, number>();

  /**
   * category와 관계없이 각 skill name의 최초 위치를 기록한다.
   */
  items.forEach((item, index) => {
    const normalizedName = item.name.trim().toLowerCase();
    const firstIndex = normalizedNames.get(normalizedName);

    /**
     * 공백과 대소문자만 다른 name도 중복으로 거부한다.
     */
    if (firstIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate normalized skill name \"${item.name}\"; first declared at index ${firstIndex}`,
        path: [index, "name"],
      });
    } else {
      normalizedNames.set(normalizedName, index);
    }
  });
}

/**
 * side-project name을 trim하고 대소문자를 접어 파일 전체 중복을 검증한다.
 */
function validateUniqueSideProjectNames(
  items: readonly z.infer<typeof sideProjectItemSchema>[],
  context: z.RefinementCtx,
): void {
  const normalizedNames = new Map<string, number>();

  /**
   * 각 project name의 정규화 값과 최초 위치를 기록한다.
   */
  items.forEach((item, index) => {
    const normalizedName = item.name.trim().toLowerCase();
    const firstIndex = normalizedNames.get(normalizedName);

    /**
     * 공백과 대소문자만 다른 project name도 중복으로 거부한다.
     */
    if (firstIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate normalized side-project name \"${item.name}\"; first declared at index ${firstIndex}`,
        path: [index, "name"],
      });
    } else {
      normalizedNames.set(normalizedName, index);
    }
  });
}

/**
 * 경력 작업은 id를 파일 전체에서, order를 같은 careerId 안에서 유일하게 검증한다.
 */
function validateUniqueCareerWorkIdentityAndOrder(
  items: readonly z.infer<typeof careerWorkItemSchema>[],
  context: z.RefinementCtx,
): void {
  const ids = new Map<string, number>();
  const ordersByCareer = new Map<string, Map<number, number>>();

  /**
   * 각 작업을 순회하며 전역 id와 경력별 order의 최초 위치를 기록한다.
   */
  items.forEach((item, index) => {
    const firstIdIndex = ids.get(item.id);

    /**
     * 같은 작업 id는 서로 다른 경력에 속하더라도 중복될 수 없다.
     */
    if (firstIdIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate id \"${item.id}\"; first declared at index ${firstIdIndex}`,
        path: [index, "id"],
      });
    } else {
      ids.set(item.id, index);
    }

    const careerOrders = ordersByCareer.get(item.careerId) ?? new Map();
    const firstOrderIndex = careerOrders.get(item.order);

    /**
     * 작업 order는 동일한 경력의 works 배열 안에서만 유일해야 한다.
     */
    if (firstOrderIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate order ${item.order} for careerId \"${item.careerId}\"; first declared at index ${firstOrderIndex}`,
        path: [index, "order"],
      });
    } else {
      careerOrders.set(item.order, index);
      ordersByCareer.set(item.careerId, careerOrders);
    }
  });
}

/**
 * evidence 문자열 배열에서 trim·case-insensitive 의미 중복을 거부한다.
 */
function validateUniqueNormalizedStrings(
  items: readonly string[],
  context: z.RefinementCtx,
): void {
  const normalizedItems = new Map<string, number>();

  /**
   * 각 문자열의 최초 정규화 값을 기록하고 이후 중복 위치에 오류를 추가한다.
   */
  items.forEach((item, index) => {
    const normalizedItem = item.trim().toLowerCase();
    const firstIndex = normalizedItems.get(normalizedItem);

    if (firstIndex !== undefined) {
      context.addIssue({
        code: "custom",
        message: `Duplicate normalized evidence; first declared at index ${firstIndex}`,
        path: [index],
      });
    } else {
      normalizedItems.set(normalizedItem, index);
    }
  });
}

/**
 * 경력 evidence의 nonblank 및 의미상 유일성 계약.
 */
const careerEvidenceSchema = z
  .array(nonBlankStringSchema)
  .superRefine(validateUniqueNormalizedStrings);

/**
 * 소개 JSON 파일 계약.
 */
export const introduceSchema = z
  .object({
    title: nonBlankStringSchema,
    content: nonBlankStringSchema,
  })
  .strict();

/**
 * 기술 항목 계약.
 */
export const skillItemSchema = z
  .object({
    id: nonBlankStringSchema,
    name: nonBlankStringSchema,
    category: nonBlankStringSchema,
    order: z.number().int().min(0),
  })
  .strict();

/**
 * 기술 JSON 배열 계약.
 */
export const skillsSchema = z
  .array(skillItemSchema)
  .superRefine(validateUniqueIdentityAndOrder)
  .superRefine(validateUniqueSkillNames);

/**
 * 경력 항목 계약.
 */
export const careerItemSchema = z
  .object({
    id: nonBlankStringSchema,
    company: nonBlankStringSchema,
    role: nonBlankStringSchema,
    startDate: yearMonthSchema,
    endDate: yearMonthSchema.nullable(),
    summary: nonBlankStringSchema.optional(),
    order: z.number().int().min(0),
  })
  .strict()
  .superRefine(validateCareerDateRange);

/**
 * 경력 JSON 배열 계약.
 */
export const careersSchema = z
  .array(careerItemSchema)
  .superRefine(validateUniqueIdentityAndOrder);

/**
 * 경력 상세 작업 항목 계약.
 */
export const careerWorkItemSchema = z
  .object({
    id: nonBlankStringSchema,
    careerId: nonBlankStringSchema,
    title: nonBlankStringSchema,
    description: nonBlankStringSchema,
    achievements: careerEvidenceSchema.optional(),
    technologies: careerEvidenceSchema.optional(),
    order: z.number().int().min(0),
  })
  .strict();

/**
 * 경력 상세 작업 JSON 배열 계약.
 */
export const careerWorksSchema = z
  .array(careerWorkItemSchema)
  .superRefine(validateUniqueCareerWorkIdentityAndOrder);

/**
 * 사이드 프로젝트 링크 계약.
 */
const sideProjectLinksSchema = z
  .object({
    repository: httpsUrlSchema.optional(),
    demo: httpsUrlSchema.optional(),
  })
  .strict();

/**
 * 사이드 프로젝트 항목 계약.
 */
export const sideProjectItemSchema = z
  .object({
    id: nonBlankStringSchema,
    name: nonBlankStringSchema,
    description: nonBlankStringSchema,
    role: nonBlankStringSchema,
    skills: z.array(nonBlankStringSchema),
    links: sideProjectLinksSchema,
    order: z.number().int().min(0),
  })
  .strict();

/**
 * 사이드 프로젝트 JSON 배열 계약.
 */
export const sideProjectsSchema = z
  .array(sideProjectItemSchema)
  .superRefine(validateUniqueIdentityAndOrder)
  .superRefine(validateUniqueSideProjectNames);

/**
 * 연락 채널 계약.
 */
const contactChannelSchema = z.enum([
  "email",
  "github",
  "linkedin",
  "blog",
  "website",
]);

/**
 * 연락 채널과 표시 값, URL protocol의 의미 관계를 검증한다.
 */
function validateContactRelationship(
  contact: {
    readonly channel: z.infer<typeof contactChannelSchema>;
    readonly value: string;
    readonly url: string;
  },
  context: z.RefinementCtx,
): void {
  /**
   * email 채널은 표시 값이 이메일이고 동일한 mailto payload를 가져야 한다.
   */
  if (contact.channel === "email") {
    if (!emailAddressSchema.safeParse(contact.value).success) {
      context.addIssue({
        code: "custom",
        message: "Email contact value must be a valid email address",
        path: ["value"],
      });
    }

    if (!contact.url.startsWith("mailto:")) {
      context.addIssue({
        code: "custom",
        message: "Email contact URL must use the mailto protocol",
        path: ["url"],
      });
      return;
    }

    if (contact.url.slice("mailto:".length) !== contact.value) {
      context.addIssue({
        code: "custom",
        message: "Email contact URL payload must exactly match value",
        path: ["url"],
      });
    }

    return;
  }

  /**
   * 외부 프로필 채널은 mailto를 허용하지 않고 HTTPS URL만 허용한다.
   */
  if (!contact.url.startsWith("https://")) {
    context.addIssue({
      code: "custom",
      message: "External contact URL must use the HTTPS protocol",
      path: ["url"],
    });
  }
}

/**
 * 연락처 항목 계약.
 */
export const contactItemSchema = z
  .object({
    id: nonBlankStringSchema,
    channel: contactChannelSchema,
    label: nonBlankStringSchema,
    value: nonBlankStringSchema,
    url: z.union([mailtoUrlSchema, httpsUrlSchema]),
    order: z.number().int().min(0),
  })
  .strict()
  .superRefine(validateContactRelationship);

/**
 * 연락처 JSON 배열 계약.
 */
export const contactsSchema = z
  .array(contactItemSchema)
  .superRefine(validateUniqueIdentityAndOrder)
  .superRefine((items, context) => {
    const channels = new Map<z.infer<typeof contactChannelSchema>, number>();

    /**
     * 화면에서 채널별 항목이 유실되지 않도록 한 채널은 한 번만 허용한다.
     */
    items.forEach((item, index) => {
      const firstIndex = channels.get(item.channel);

      if (firstIndex !== undefined) {
        context.addIssue({
          code: "custom",
          message: `Duplicate contact channel \"${item.channel}\"; first declared at index ${firstIndex}`,
          path: [index, "channel"],
        });
      } else {
        channels.set(item.channel, index);
      }
    });
  });
