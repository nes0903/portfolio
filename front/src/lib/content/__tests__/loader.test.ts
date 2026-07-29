// @vitest-environment node

import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPortfolioContent } from "@/lib/content/loader";
import {
  createValidContentFiles,
  getCollection,
  type CollectionFileName,
  type ContentFiles,
  writeContentFixture,
} from "@/test/content-fixtures";

vi.mock("server-only", () => ({}));

const fixtureRoots = new Set<string>();

async function createFixture(
  files: Partial<ContentFiles> = createValidContentFiles(),
  extraFiles: Readonly<Record<string, string>> = {},
) {
  const fixture = await writeContentFixture(files, extraFiles);
  fixtureRoots.add(fixture.rootDirectory);
  return fixture;
}

function collectErrorDiagnostics(error: unknown): string {
  const diagnostics: string[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      diagnostics.push(current.message);
      current = current.cause;
    } else {
      diagnostics.push(String(current));
      break;
    }
  }
  return diagnostics.join("\n");
}

async function captureLoaderError(backendDirectory: string): Promise<unknown> {
  try {
    await loadPortfolioContent(backendDirectory);
  } catch (error) {
    return error;
  }
  throw new Error("loader가 실패해야 합니다");
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    [...fixtureRoots].map((rootDirectory) =>
      rm(rootDirectory, { force: true, recursive: true }),
    ),
  );
  fixtureRoots.clear();
});

describe("loadPortfolioContent", () => {
  it("정확한 6개 파일을 검증하고 order 정렬과 career-work join을 적용한다", async () => {
    const fixture = await createFixture();

    await expect(loadPortfolioContent(fixture.backendDirectory)).resolves.toEqual({
      introduce: {
        title: "제품을 끝까지 책임지는 개발자",
        content: "검증 가능한 제품을 만들고 운영합니다.",
      },
      skills: [
        { id: "nextjs", name: "Next.js", category: "frontend", order: 1 },
        {
          id: "typescript",
          name: "TypeScript",
          category: "language",
          order: 2,
        },
      ],
      careers: [
        {
          id: "earlier-career",
          company: "Earlier Company",
          role: "Software Engineer",
          startDate: "2021-03",
          endDate: "2023-12",
          order: 1,
          works: [
            {
              id: "earlier-platform",
              careerId: "earlier-career",
              title: "Create platform",
              description: "사내 플랫폼을 구축했습니다.",
              order: 1,
            },
          ],
        },
        {
          id: "current-career",
          company: "Current Company",
          role: "Frontend Engineer",
          startDate: "2024-01",
          endDate: null,
          summary: "정적 콘텐츠 플랫폼 개발",
          order: 2,
          works: [
            {
              id: "current-contract",
              careerId: "current-career",
              title: "Define content contract",
              description: "콘텐츠 계약과 검증 파이프라인을 설계했습니다.",
              achievements: ["잘못된 배포를 사전에 차단"],
              order: 1,
            },
            {
              id: "current-observability",
              careerId: "current-career",
              title: "Build observability",
              description: "빌드 실패 원인을 빠르게 찾도록 개선했습니다.",
              technologies: ["TypeScript", "GitHub Actions"],
              order: 2,
            },
          ],
        },
      ],
      sideProjects: [
        {
          id: "first-project",
          name: "First project",
          description: "첫 번째 프로젝트",
          role: "Creator",
          skills: ["TypeScript", "Next.js"],
          links: { repository: "https://github.com/example/portfolio" },
          order: 1,
        },
        {
          id: "second-project",
          name: "Second project",
          description: "두 번째 프로젝트",
          role: "Maintainer",
          skills: ["React"],
          links: { demo: "https://example.com/demo" },
          order: 2,
        },
      ],
      contacts: [
        {
          id: "email",
          channel: "email",
          label: "Email",
          value: "hello@example.com",
          url: "mailto:hello@example.com",
          order: 1,
        },
        {
          id: "github",
          channel: "github",
          label: "GitHub",
          value: "example",
          url: "https://github.com/example",
          order: 2,
        },
      ],
    });
  });

  it("인자 생략 시 front cwd의 ../backend를 읽는다", async () => {
    const fixture = await createFixture();
    vi.spyOn(process, "cwd").mockReturnValue(fixture.frontDirectory);

    const content = await loadPortfolioContent();

    expect(content.introduce.title).toBe("제품을 끝까지 책임지는 개발자");
  });

  it("allowlist 파일 하나라도 누락되면 실패한다", async () => {
    const files: Partial<ContentFiles> = createValidContentFiles();
    delete files["contact.json"];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["unexpected.json", "README.txt"])(
    "allowlist 밖의 추가 파일 %s가 있으면 실패한다",
    async (fileName) => {
      const fixture = await createFixture(createValidContentFiles(), {
        [fileName]: "{}\n",
      });

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it("유효하지 않은 JSON 문법을 거부한다", async () => {
    const fixture = await createFixture(createValidContentFiles(), {
      "skill.json": "[{ id: 'typescript' }]\n",
    });

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it("JSON syntax 오류의 원문 sentinel을 error cause까지 노출하지 않는다", async () => {
    const sentinel = "LEAK_SENTINEL_JSON_SECRET";
    const fixture = await createFixture(createValidContentFiles(), {
      "introduce.json": `{\"title\":${sentinel},\"content\":\"approved\"}\n`,
    });

    const error = await captureLoaderError(fixture.backendDirectory);
    expect(collectErrorDiagnostics(error)).not.toContain(sentinel);
  });

  it("schema 오류의 원문 key/value를 error cause까지 노출하지 않는다", async () => {
    const sentinel = "LEAK_SENTINEL_SCHEMA_SECRET";
    const files = createValidContentFiles();
    files["introduce.json"] = {
      ...files["introduce.json"],
      [sentinel]: sentinel,
    } as unknown as ContentFiles["introduce.json"];
    const fixture = await createFixture(files);

    const error = await captureLoaderError(fixture.backendDirectory);
    expect(collectErrorDiagnostics(error)).not.toContain(sentinel);
  });

  it.each([
    {
      label: "introduce 최상위",
      mutate: (files: ContentFiles) => {
        files["introduce.json"] = {
          ...files["introduce.json"],
          unexpected: true,
        } as unknown as ContentFiles["introduce.json"];
      },
    },
    {
      label: "side-project links 중첩 객체",
      mutate: (files: ContentFiles) => {
        const [project] = files["side-project.json"];
        if (!project) throw new Error("fixture project가 필요합니다");
        files["side-project.json"] = [
          {
            ...project,
            links: {
              ...project.links,
              unexpected: "https://example.com",
            } as unknown as typeof project.links,
          },
        ];
      },
    },
  ])("$label의 unknown key를 strict schema로 거부한다", async ({ mutate }) => {
    const files = createValidContentFiles();
    mutate(files);
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it("필수 필드 누락을 거부한다", async () => {
    const files = createValidContentFiles();
    const [skill] = files["skill.json"];
    if (!skill) throw new Error("fixture skill이 필요합니다");
    const withoutName: Partial<typeof skill> = { ...skill };
    delete withoutName.name;
    files["skill.json"] = [withoutName as unknown as typeof skill];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it("잘못된 필드 타입을 거부한다", async () => {
    const files = createValidContentFiles();
    const [skill] = files["skill.json"];
    if (!skill) throw new Error("fixture skill이 필요합니다");
    files["skill.json"] = [
      { ...skill, order: "first" } as unknown as typeof skill,
    ];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each([
    ["startDate", "2024-1"],
    ["endDate", "2024-13"],
  ] as const)("잘못된 %s YYYY-MM 값을 거부한다", async (field, value) => {
    const files = createValidContentFiles();
    const [career] = files["career.json"];
    if (!career) throw new Error("fixture career가 필요합니다");
    files["career.json"] = [{ ...career, [field]: value }];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each([
    {
      label: "side-project repository의 http URL",
      mutate: (files: ContentFiles) => {
        const [project] = files["side-project.json"];
        if (!project) throw new Error("fixture project가 필요합니다");
        files["side-project.json"] = [
          { ...project, links: { repository: "http://example.com/repository" } },
        ];
      },
    },
    {
      label: "contact의 허용되지 않은 protocol",
      mutate: (files: ContentFiles) => {
        const [contact] = files["contact.json"];
        if (!contact) throw new Error("fixture contact가 필요합니다");
        files["contact.json"] = [{ ...contact, url: "ftp://example.com" }];
      },
    },
  ])("$label을 거부한다", async ({ mutate }) => {
    const files = createValidContentFiles();
    mutate(files);
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  const nonPublicHttpsUrls = [
    ["credential 포함", "https://user:password@example.com/profile"],
    ["localhost", "https://localhost/profile"],
    ["single-label 내부 host", "https://intranet/profile"],
    ["IPv4 loopback", "https://127.0.0.1/profile"],
    ["IPv4 private network", "https://192.168.10.20/profile"],
    ["public IPv4 literal", "https://8.8.8.8/profile"],
    ["IPv6 loopback", "https://[::1]/profile"],
    ["public IPv6 literal", "https://[2001:4860:4860::8888]/profile"],
    ["special-use home.arpa", "https://router.home.arpa/profile"],
    ["private corp suffix", "https://service.corp/profile"],
    ["reserved example suffix", "https://service.example/profile"],
    ["special-use onion suffix", "https://service.onion/profile"],
    ["trailing whitespace", "https://github.com/example "],
  ] as const;

  it.each(nonPublicHttpsUrls)(
    "side-project public link에서 %s HTTPS URL을 거부한다",
    async (_label, url) => {
      const files = createValidContentFiles();
      const [project] = files["side-project.json"];
      if (!project) throw new Error("fixture project가 필요합니다");
      files["side-project.json"] = [
        { ...project, links: { repository: url } },
      ];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it.each(nonPublicHttpsUrls)(
    "external contact public link에서 %s HTTPS URL을 거부한다",
    async (_label, url) => {
      const files = createValidContentFiles();
      const externalContact = files["contact.json"].find(
        (contact) => contact.channel !== "email",
      );
      if (!externalContact) throw new Error("external contact fixture가 필요합니다");
      files["contact.json"] = [{ ...externalContact, url }];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  const collectionFiles: CollectionFileName[] = [
    "skill.json",
    "career.json",
    "career-work.json",
    "side-project.json",
    "contact.json",
  ];

  it.each(collectionFiles)("%s의 중복 id를 거부한다", async (fileName) => {
    const files = createValidContentFiles();
    const collection = getCollection(files, fileName);
    const [first] = collection;
    if (!first) throw new Error(`${fileName} fixture가 필요합니다`);
    collection.push({ ...first, order: 99 });
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(collectionFiles)("%s의 중복 order를 거부한다", async (fileName) => {
    const files = createValidContentFiles();
    const collection = getCollection(files, fileName);
    const [first] = collection;
    if (!first) throw new Error(`${fileName} fixture가 필요합니다`);
    collection.push({ ...first, id: `${first.id}-duplicate-order` });
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it("존재하지 않는 careerId를 참조하는 career-work를 거부한다", async () => {
    const files = createValidContentFiles();
    const [work] = files["career-work.json"];
    if (!work) throw new Error("fixture career-work가 필요합니다");
    files["career-work.json"] = [{ ...work, careerId: "missing-career" }];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each([
    ["title", ""],
    ["content", ""],
    ["title", "   "],
    ["content", " \n\t "],
  ] as const)("introduce.%s가 blank이면 build-time 검증에 실패한다", async (field, value) => {
    const files = createValidContentFiles();
    files["introduce.json"] = {
      ...files["introduce.json"],
      [field]: value,
    };
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["id", "name", "category"] as const)(
    "skill.%s가 whitespace-only이면 build-time 검증에 실패한다",
    async (field) => {
      const files = createValidContentFiles();
      const [skill] = files["skill.json"];
      if (!skill) throw new Error("fixture skill이 필요합니다");
      files["skill.json"] = [{ ...skill, [field]: " \n\t " }];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it("skill name이 trim·case-insensitive 기준으로 중복이면 거부한다", async () => {
    const files = createValidContentFiles();
    const [firstSkill, secondSkill] = files["skill.json"];
    if (!firstSkill || !secondSkill) {
      throw new Error("skill fixture 두 개가 필요합니다");
    }
    files["skill.json"] = [
      { ...firstSkill, name: "TypeScript" },
      {
        ...secondSkill,
        id: "typescript-duplicate-name",
        name: "  typescript  ",
      },
    ];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["id", "company", "role"] as const)(
    "career.%s가 whitespace-only이면 build-time 검증에 실패한다",
    async (field) => {
      const files = createValidContentFiles();
      const [career] = files["career.json"];
      if (!career) throw new Error("fixture career가 필요합니다");
      const originalCareerId = career.id;
      files["career.json"] = [{ ...career, [field]: " \n\t " }];
      if (field === "id") {
        files["career-work.json"] = files["career-work.json"]
          .filter((work) => work.careerId === originalCareerId)
          .map((work) => ({ ...work, careerId: " \n\t " }));
      } else {
        files["career-work.json"] = files["career-work.json"].filter(
          (work) => work.careerId === originalCareerId,
        );
      }
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it.each(["id", "title", "description"] as const)(
    "career-work.%s가 whitespace-only이면 build-time 검증에 실패한다",
    async (field) => {
      const files = createValidContentFiles();
      const [work] = files["career-work.json"];
      if (!work) throw new Error("fixture career-work가 필요합니다");
      files["career-work.json"] = [{ ...work, [field]: " \n\t " }];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it.each(["achievements", "technologies"] as const)(
    "career-work.%s item이 whitespace-only이면 거부한다",
    async (field) => {
      const files = createValidContentFiles();
      const [work] = files["career-work.json"];
      if (!work) throw new Error("fixture career-work가 필요합니다");
      files["career-work.json"] = [
        { ...work, [field]: ["Approved evidence", " \n\t "] },
      ];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it.each(["achievements", "technologies"] as const)(
    "career-work.%s가 trim·case-insensitive 기준으로 중복이면 거부한다",
    async (field) => {
      const files = createValidContentFiles();
      const [work] = files["career-work.json"];
      if (!work) throw new Error("fixture career-work가 필요합니다");
      files["career-work.json"] = [
        { ...work, [field]: ["TypeScript", "  typescript  "] },
      ];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it("career.endDate가 startDate보다 이르면 build-time 검증에 실패한다", async () => {
    const files = createValidContentFiles();
    const [career] = files["career.json"];
    if (!career) throw new Error("fixture career가 필요합니다");
    files["career.json"] = [
      { ...career, startDate: "2024-02", endDate: "2024-01" },
    ];
    files["career-work.json"] = files["career-work.json"].filter(
      (work) => work.careerId === career.id,
    );
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["id", "name", "description", "role"] as const)(
    "side-project.%s가 whitespace-only이면 build-time 검증에 실패한다",
    async (field) => {
      const files = createValidContentFiles();
      const [project] = files["side-project.json"];
      if (!project) throw new Error("fixture side-project가 필요합니다");
      files["side-project.json"] = [{ ...project, [field]: " \n\t " }];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it("side-project skill item이 whitespace-only이면 build-time 검증에 실패한다", async () => {
    const files = createValidContentFiles();
    const [project] = files["side-project.json"];
    if (!project) throw new Error("fixture side-project가 필요합니다");
    files["side-project.json"] = [
      { ...project, skills: [...project.skills, " \n\t "] },
    ];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it("side-project name이 trim·case-insensitive 기준으로 중복이면 거부한다", async () => {
    const files = createValidContentFiles();
    const [firstProject, secondProject] = files["side-project.json"];
    if (!firstProject || !secondProject) {
      throw new Error("side-project fixture 두 개가 필요합니다");
    }
    files["side-project.json"] = [
      { ...firstProject, name: "Portfolio Project" },
      { ...secondProject, name: "  portfolio PROJECT  " },
    ];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["id", "label", "value"] as const)(
    "contact.%s가 whitespace-only이면 build-time 검증에 실패한다",
    async (field) => {
      const files = createValidContentFiles();
      const [contact] = files["contact.json"];
      if (!contact) throw new Error("fixture contact가 필요합니다");
      files["contact.json"] = [{ ...contact, [field]: " \n\t " }];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it.each([
    {
      label: "value가 email 형식이 아님",
      value: "not-an-email",
      url: "mailto:hello@example.com",
    },
    {
      label: "email channel URL이 mailto가 아님",
      value: "hello@example.com",
      url: "https://example.com/contact",
    },
    {
      label: "value와 mailto payload가 다름",
      value: "hello@example.com",
      url: "mailto:other@example.com",
    },
  ])("email contact는 $label 상태를 거부한다", async ({ value, url }) => {
    const files = createValidContentFiles();
    const [contact] = files["contact.json"];
    if (!contact) throw new Error("fixture contact가 필요합니다");
    files["contact.json"] = [
      { ...contact, channel: "email", value, url },
    ];
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });

  it.each(["github", "linkedin", "blog", "website"] as const)(
    "%s contact는 mailto URL을 거부한다",
    async (channel) => {
      const files = createValidContentFiles();
      const [contact] = files["contact.json"];
      if (!contact) throw new Error("fixture contact가 필요합니다");
      files["contact.json"] = [
        {
          ...contact,
          channel,
          value: `${channel}-profile`,
          url: "mailto:hello@example.com",
        },
      ];
      const fixture = await createFixture(files);

      await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
    },
  );

  it("contact.json에서 email channel이 둘 이상이면 거부한다", async () => {
    const files = createValidContentFiles();
    const emailContact = files["contact.json"].find(
      (contact) => contact.channel === "email",
    );
    if (!emailContact) throw new Error("email contact fixture가 필요합니다");
    files["contact.json"].push({
      ...emailContact,
      id: "secondary-email",
      value: "secondary@example.com",
      url: "mailto:secondary@example.com",
      order: 99,
    });
    const fixture = await createFixture(files);

    await expect(loadPortfolioContent(fixture.backendDirectory)).rejects.toThrow();
  });
});
