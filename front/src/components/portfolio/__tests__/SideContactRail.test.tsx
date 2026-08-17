import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PortfolioEditorBridge } from "@/components/portfolio/editor-types";
import { SideContactRail } from "@/components/portfolio/SideContactRail";
import type { Contact } from "@/lib/content/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const contacts: readonly Contact[] = [
  {
    id: "email",
    channel: "email",
    label: "Email",
    value: "hello@example.com",
    url: "mailto:hello@example.com",
    order: 1,
  },
  {
    id: "phone",
    channel: "phone",
    label: "Phone",
    value: "010-2261-0439",
    url: "tel:01022610439",
    order: 2,
  },
  {
    id: "github",
    channel: "github",
    label: "GitHub",
    value: "example",
    url: "https://github.com/example",
    order: 3,
  },
];

function createEditor(
  overrides: Partial<PortfolioEditorBridge> = {},
): PortfolioEditorBridge {
  return {
    onChangeIntroductionTextBlock: vi.fn(),
    onChangeRecentTextColors: vi.fn(),
    onSelectIntroductionTextBlock: vi.fn(),
    onSelectSection: vi.fn(),
    onTextCommit: vi.fn(),
    selectedIntroductionTextBlockId: null,
    selectedSection: "contact",
    ...overrides,
  };
}

describe("SideContactRail", () => {
  it("contact anchor와 loader 순서의 라벨·값을 고정 aside에 표시한다", () => {
    const { container } = render(<SideContactRail contacts={contacts} />);
    const aside = screen.getByRole("complementary", { name: "연락처" });
    const items = within(aside).getAllByRole("listitem");

    expect(aside).toHaveAttribute("id", "contact");
    expect(aside).toHaveAttribute("tabindex", "-1");
    expect(items).toHaveLength(contacts.length);
    expect(items.map((item) => item.querySelector("strong")?.textContent))
      .toEqual(contacts.map((contact) => contact.label));
    expect(
      items.map((item) => item.querySelector(".side-contact-value")?.textContent),
    ).toEqual(contacts.map((contact) => contact.value));
    expect(container.querySelector("section#contact")).toBeNull();
  });

  it("Email은 텍스트, Phone은 tel, 외부 채널은 HTTPS 새 창 링크로 표시한다", () => {
    render(<SideContactRail contacts={contacts} />);

    const email = screen.getByText("hello@example.com");
    expect(email.tagName).toBe("SPAN");
    expect(email.closest("a")).toBeNull();

    const phone = screen.getByRole("link", {
      name: "Phone: 010-2261-0439",
    });
    expect(phone).toHaveAttribute("href", "tel:01022610439");
    expect(phone).not.toHaveAttribute("target");

    const github = screen.getByRole("link", {
      name: "GitHub: example (새 창)",
    });
    expect(github).toHaveAttribute("href", "https://github.com/example");
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("관리자 rail에서 직접 편집·채널/URL 변경·추가·삭제한다", () => {
    const onAddItem = vi.fn();
    const onChangeContactStructure = vi.fn();
    const onDeleteItem = vi.fn();
    const onSelectSection = vi.fn();
    const editor = createEditor({
      onAddItem,
      onChangeContactStructure,
      onDeleteItem,
      onSelectSection,
    });
    const { container } = render(
      <SideContactRail contacts={contacts} editor={editor} />,
    );

    const aside = screen.getByRole("complementary", { name: "연락처" });
    expect(aside).toHaveAttribute("data-editor-selected", "true");
    expect(
      container.querySelector('[data-editor-field="contacts:email:label"]'),
    ).toHaveAttribute("contenteditable", "true");
    expect(
      container.querySelector('[data-editor-field="contacts:email:value"]'),
    ).toHaveAttribute("contenteditable", "true");

    fireEvent.change(screen.getByLabelText("GitHub 연락 채널"), {
      target: { value: "website" },
    });
    expect(onChangeContactStructure).toHaveBeenCalledWith(
      "github",
      "website",
      "https://github.com/example",
    );

    fireEvent.change(screen.getByLabelText("GitHub 연결 URL"), {
      target: { value: "https://example.com" },
    });
    expect(onChangeContactStructure).toHaveBeenCalledWith(
      "github",
      "github",
      "https://example.com",
    );

    fireEvent.click(screen.getByRole("button", { name: "+ 연락처" }));
    expect(onAddItem).toHaveBeenCalledWith("contact");

    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Phone 연락처 삭제" }),
    );
    expect(confirmMock).toHaveBeenCalled();
    expect(onDeleteItem).toHaveBeenCalledWith("contact", "phone");
    expect(onSelectSection).toHaveBeenCalledWith("contact");
  });
});
