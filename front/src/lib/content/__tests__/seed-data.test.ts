// @vitest-environment node

import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { loadPortfolioContent } from "@/lib/content/loader";

vi.mock("server-only", () => ({}));

const BACKEND_DIRECTORY = resolve(process.cwd(), "../backend");

describe("portfolio backend seed data", () => {
  it("실제 seed의 introduce와 5개 collection을 하나씩 로드하고 career-work를 결합한다", async () => {
    const content = await loadPortfolioContent(BACKEND_DIRECTORY);

    expect(content.introduce.title.trim()).not.toBe("");
    expect(content.introduce.content.trim()).not.toBe("");
    expect(content.skills).toHaveLength(1);
    expect(content.careers).toHaveLength(1);
    expect(content.sideProjects).toHaveLength(1);
    expect(content.contacts).toHaveLength(1);

    const career = content.careers[0];
    if (!career) throw new Error("career seed가 필요합니다");
    expect(career.works).toHaveLength(1);

    const work = career.works[0];
    if (!work) throw new Error("career-work seed가 필요합니다");
    expect(work.careerId).toBe(career.id);
  });
});
