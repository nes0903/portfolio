// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadPublishedPortfolioContent } from "@/lib/content/supabase-loader";
import { getSupabaseServerEnvironment } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createValidContentFiles } from "@/test/content-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseServerEnvironment: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const environmentMock = vi.mocked(getSupabaseServerEnvironment);
const createClientMock = vi.mocked(createServerSupabaseClient);

function createPortfolioDocument() {
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

function mockQuery(result: { readonly data: unknown; readonly error: unknown }) {
  const builder = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    select: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);

  const client = {
    from: vi.fn().mockReturnValue(builder),
  };
  createClientMock.mockReturnValue(
    client as unknown as ReturnType<typeof createServerSupabaseClient>,
  );

  return { builder, client };
}

beforeEach(() => {
  vi.resetAllMocks();
  environmentMock.mockReturnValue({
    portfolioSlug: "main",
    publishableKey: "sb_publishable_test",
    url: "https://portfolio.supabase.co",
  });
});

describe("loadPublishedPortfolioContent", () => {
  it("published slug 문서를 조회하고 검증·정렬된 화면 모델을 반환한다", async () => {
    const query = mockQuery({
      data: { content: createPortfolioDocument() },
      error: null,
    });

    const content = await loadPublishedPortfolioContent();

    expect(query.client.from).toHaveBeenCalledWith("portfolio_documents");
    expect(query.builder.select).toHaveBeenCalledWith("content");
    expect(query.builder.eq).toHaveBeenNthCalledWith(1, "slug", "main");
    expect(query.builder.eq).toHaveBeenNthCalledWith(2, "published", true);
    expect(content.skills.map((skill) => skill.order)).toEqual([1, 2]);
    expect(content.careers[0]?.works).toHaveLength(1);
    expect(Object.isFrozen(content)).toBe(true);
  });

  it("Supabase query 오류의 상세 메시지를 외부 오류에 노출하지 않는다", async () => {
    mockQuery({
      data: null,
      error: { message: "LEAK_SENTINEL_DATABASE_DETAIL" },
    });

    await expect(loadPublishedPortfolioContent()).rejects.toThrow(
      "Published portfolio content query failed",
    );
    await expect(loadPublishedPortfolioContent()).rejects.not.toThrow(
      "LEAK_SENTINEL_DATABASE_DETAIL",
    );
  });

  it("published 문서가 없으면 명확히 실패한다", async () => {
    mockQuery({ data: null, error: null });

    await expect(loadPublishedPortfolioContent()).rejects.toThrow(
      "Published portfolio content was not found",
    );
  });

  it("DB 문서도 기존 Zod 콘텐츠 계약으로 다시 검증한다", async () => {
    mockQuery({
      data: { content: { ...createPortfolioDocument(), contacts: "invalid" } },
      error: null,
    });

    await expect(loadPublishedPortfolioContent()).rejects.toThrow(
      "Published portfolio content failed schema validation",
    );
  });
});
