import { describe, expect, it } from "vitest";

import { normalizePortfolioContentForSave } from "@/lib/content/admin-form";
import type { PortfolioDocumentContent } from "@/lib/content/model";
import { createValidContentFiles } from "@/test/content-fixtures";

function createDocument(): PortfolioDocumentContent {
  const files = createValidContentFiles();
  const firstWork = files["career-work.json"][0];

  if (!firstWork) {
    throw new Error("Expected a career work fixture");
  }

  return {
    introduce: files["introduce.json"],
    skills: files["skill.json"].map((skill) => ({ ...skill, order: 9 })),
    careers: files["career.json"].map((career) => ({ ...career, order: 8 })),
    careerWorks: [
      { ...firstWork, order: 7 },
      { ...firstWork, id: "second-work", order: 7 },
    ],
    sideProjects: files["side-project.json"].map((project) => ({
      ...project,
      order: 6,
    })),
    contacts: files["contact.json"].map((contact) => ({ ...contact, order: 5 })),
  };
}

describe("normalizePortfolioContentForSave", () => {
  it("모든 목록 순번을 저장 순서에 맞게 정규화하고 원본은 변경하지 않는다", () => {
    const content = createDocument();
    const normalized = normalizePortfolioContentForSave(content);
    const sequentialOrders = (length: number) =>
      Array.from({ length }, (_, index) => index);

    expect(normalized.skills.map(({ order }) => order)).toEqual(
      sequentialOrders(content.skills.length),
    );
    expect(normalized.careers.map(({ order }) => order)).toEqual(
      sequentialOrders(content.careers.length),
    );
    expect(normalized.careerWorks.map(({ order }) => order)).toEqual([0, 1]);
    expect(normalized.sideProjects.map(({ order }) => order)).toEqual(
      sequentialOrders(content.sideProjects.length),
    );
    expect(normalized.contacts.map(({ order }) => order)).toEqual(
      sequentialOrders(content.contacts.length),
    );
    expect(content.skills.map(({ order }) => order)).toEqual([9, 9]);
    expect(content.careerWorks.map(({ order }) => order)).toEqual([7, 7]);
  });
});
