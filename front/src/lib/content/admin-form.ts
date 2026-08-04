import type { PortfolioDocumentContent } from "@/lib/content/model";

/**
 * 화면에서 항목을 추가·삭제한 뒤 저장 순번을 연속 값으로 정규화한다.
 */
export function normalizePortfolioContentForSave(
  content: PortfolioDocumentContent,
): PortfolioDocumentContent {
  const careerWorkOrders = new Map<string, number>();

  return {
    ...content,
    skills: content.skills.map((skill, order) => ({ ...skill, order })),
    careers: content.careers.map((career, order) => ({ ...career, order })),
    careerWorks: content.careerWorks.map((work) => {
      const order = careerWorkOrders.get(work.careerId) ?? 0;
      careerWorkOrders.set(work.careerId, order + 1);
      return { ...work, order };
    }),
    sideProjects: content.sideProjects.map((project, order) => ({
      ...project,
      order,
    })),
    contacts: content.contacts.map((contact, order) => ({ ...contact, order })),
  };
}
