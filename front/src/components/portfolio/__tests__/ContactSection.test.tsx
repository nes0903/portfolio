import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ContactSection } from "@/components/portfolio/ContactSection";
import type { Contact } from "@/lib/content/types";

afterEach(() => {
  cleanup();
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
    id: "github",
    channel: "github",
    label: "GitHub",
    value: "example",
    url: "https://github.com/example",
    order: 2,
  },
  {
    id: "linkedin",
    channel: "linkedin",
    label: "LinkedIn",
    value: "Example Person",
    url: "https://www.linkedin.com/in/example",
    order: 3,
  },
  {
    id: "blog",
    channel: "blog",
    label: "Blog",
    value: "Engineering Notes",
    url: "https://blog.example.com",
    order: 4,
  },
  {
    id: "website",
    channel: "website",
    label: "Website",
    value: "example.com",
    url: "https://example.com",
    order: 5,
  },
];

describe("ContactSection", () => {
  it("contact를 loader order와 명확한 accessible name으로 한 번씩 표시한다", () => {
    render(<ContactSection contacts={contacts} />);
    const list = screen.getByRole("list", { name: "연락처" });
    const items = within(list).getAllByRole("listitem");
    const email = contacts.find((contact) => contact.channel === "email");
    const externalContacts = contacts.filter(
      (contact) => contact.channel !== "email",
    );
    if (!email) throw new Error("email contact fixture가 필요합니다");
    const panel = list.closest<HTMLElement>(".contact");
    const actions = panel?.querySelector<HTMLElement>(".actions");
    if (!panel || !actions) throw new Error("contact panel/actions가 필요합니다");

    expect(items).toHaveLength(externalContacts.length);
    expect(
      items.map((item) => within(item).getByRole("link").getAttribute("aria-label")),
    ).toEqual(
      externalContacts.map(
        (contact) => `${contact.label}: ${contact.value} (새 창)`,
      ),
    );

    const emailValue = within(panel).getByText(email.value, {
      selector: "code.contact-value",
    });
    const emailLink = within(actions).getByRole("link", {
      name: "이메일 보내기",
    });
    expect(emailValue).toHaveClass("contact-value");
    expect(emailLink.tagName).toBe("A");
    expect(emailLink).toHaveClass("btn");
    expect(emailLink).toHaveAttribute("href", email.url);
    expect(emailLink).toHaveTextContent(/^이메일 보내기$/);
    expect(actions).toContainElement(emailLink);
    expect(list).not.toContainElement(emailLink);
    expect(screen.getAllByText(email.value)).toHaveLength(1);

    for (const contact of externalContacts) {
      expect(screen.getAllByText(contact.value)).toHaveLength(1);
    }
  });

  it("email은 현재 창 mailto와 copy button, 나머지는 안전한 HTTPS 새 창 link를 제공한다", () => {
    const { container } = render(<ContactSection contacts={contacts} />);
    const panel = container.querySelector<HTMLElement>("section#contact .contact");
    const actions = panel?.querySelector<HTMLElement>(".actions");
    if (!panel || !actions) throw new Error("contact panel/actions가 필요합니다");

    expect(
      within(panel).getByText("hello@example.com", {
        selector: "code.contact-value",
      }),
    ).toBeInTheDocument();

    const emailLink = within(actions).getByRole("link", {
      name: "이메일 보내기",
    });
    expect(emailLink.tagName).toBe("A");
    expect(emailLink).toHaveClass("btn");
    expect(emailLink).toHaveAttribute("href", "mailto:hello@example.com");
    expect(emailLink).not.toHaveAttribute("target");
    expect(emailLink).not.toHaveAttribute("rel");
    expect(
      screen.getByRole("button", {
        name: "이메일 복사",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /^복사할 연락처를 확인해 주세요\.$/,
    );
    expect(screen.queryByText("[EMAIL]")).not.toBeInTheDocument();

    for (const contact of contacts.filter(
      (candidate) => candidate.channel !== "email",
    )) {
      const link = screen.getByRole("link", {
        name: `${contact.label}: ${contact.value} (새 창)`,
      });
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")?.split(/\s+/)).toEqual(
        expect.arrayContaining(["noopener", "noreferrer"]),
      );
    }
  });

  it("요구되지 않은 문의 form, 전화, 주소, token UI를 생성하지 않는다", () => {
    const { container } = render(<ContactSection contacts={contacts} />);

    expect(container.querySelector("form, input, textarea, select")).toBeNull();
    expect(container).not.toHaveTextContent(
      /전화|전화번호|phone|주소|address|token|api[ -]?key/i,
    );
  });

  it("빈 배열도 contact panel, [EMAIL], disabled action과 idle live status를 유지한다", () => {
    const { container } = render(<ContactSection contacts={[]} />);
    const section = container.querySelector<HTMLElement>("section#contact");

    if (!section) throw new Error("contact section이 필요합니다");
    const panel = section.querySelector<HTMLElement>(".contact");
    if (!panel) throw new Error("contact panel이 필요합니다");
    expect(
      within(panel).getByText("[EMAIL]", { selector: "code.contact-value" }),
    ).toBeInTheDocument();
    const actions = panel.querySelector<HTMLElement>(".actions");
    if (!actions) throw new Error("contact actions가 필요합니다");
    const disabledEmailLink = within(actions).getByRole("link", {
      name: "이메일 보내기",
    });
    expect(disabledEmailLink).toHaveAttribute("aria-disabled", "true");
    expect(disabledEmailLink).toHaveClass("btn");
    expect(disabledEmailLink.tagName).toBe("SPAN");
    expect(
      within(actions).getByRole("button", { name: "이메일 복사" }),
    ).toBeDisabled();
    expect(within(panel).getByText(/^표시할 연락처가 없습니다\.$/)).toHaveAttribute(
      "role",
      "status",
    );
    expect(within(panel).getByText(/^복사할 연락처를 확인해 주세요\.$/)).toHaveAttribute(
      "role",
      "status",
    );
  });

  it.each([
    ["승인 email", contacts],
    ["빈 email", []],
  ] as const)(
    "%s은 actions에 send/copy 두 control만 두고 live status를 바로 다음 sibling으로 렌더링한다",
    (_state, inputContacts) => {
      const { container } = render(<ContactSection contacts={inputContacts} />);
      const panel = container.querySelector<HTMLElement>(
        "section#contact .contact",
      );
      const actions = panel?.querySelector<HTMLElement>(":scope > .actions");
      if (!panel || !actions) throw new Error("contact panel/actions가 필요합니다");

      expect(actions.children).toHaveLength(2);
      expect(
        [...actions.children].every((child) =>
          child.matches('a, button, [role="link"], [role="button"]'),
        ),
      ).toBe(true);
      expect(
        within(actions).getByRole("link", { name: "이메일 보내기" }),
      ).toBeInTheDocument();
      expect(
        within(actions).getByRole("button", { name: "이메일 복사" }),
      ).toBeInTheDocument();
      expect(actions.querySelector('[role="status"]')).toBeNull();

      const liveStatus = panel.querySelector<HTMLElement>(
        ':scope > .actions + p.live[role="status"]',
      );
      expect(liveStatus).not.toBeNull();
      expect(actions.nextElementSibling).toBe(liveStatus);
      expect(liveStatus).toHaveTextContent(
        /^복사할 연락처를 확인해 주세요\.$/,
      );
    },
  );

  it("기존 contact anchor와 h2 accessible-name 계약을 유지한다", () => {
    const { container } = render(<ContactSection contacts={contacts} />);
    const section = container.querySelector<HTMLElement>("section#contact");

    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(section).toHaveAttribute("aria-labelledby", "contact-title");
    expect(
      screen.getByRole("heading", { level: 2, name: "연락처" }),
    ).toHaveAttribute("id", "contact-title");
  });
});
