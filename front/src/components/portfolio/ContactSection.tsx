import { CopyContactButton } from "@/components/portfolio/CopyContactButton";
import { EmptyState } from "@/components/portfolio/EmptyState";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import type { Contact, PortfolioSectionVisual } from "@/lib/content/types";
import { DEFAULT_SECTION_VISUAL } from "@/lib/content/schema";

interface ContactSectionProps {
  readonly contacts: readonly Contact[];
  readonly editor?: PortfolioEditorBridge;
  readonly visual?: PortfolioSectionVisual;
}

/**
 * 승인된 이메일과 HTTPS 외부 프로필을 접근 가능한 연락처 목록으로 표시한다.
 */
export function ContactSection({
  contacts,
  editor,
  visual = DEFAULT_SECTION_VISUAL,
}: ContactSectionProps) {
  const emailContact = contacts.find(
    (contact) => contact.channel === "email",
  );
  const externalContacts = contacts.filter(
    (contact) => contact.channel !== "email",
  );

  return (
    <PortfolioSection
      id="contact"
      number="04"
      eyebrow="연락처"
      title="연락처"
      editor={editor}
      visual={visual}
    >
      <div className="contact">
        {emailContact ? (
          <code
            className="contact-value"
            {...createEditableTextProps(
              editor,
              `contacts:${emailContact.id}:value`,
            )}
          >
            {emailContact.value}
          </code>
        ) : (
          <code className="contact-value">[EMAIL]</code>
        )}

        {emailContact ? (
          <CopyContactButton
            sendHref={emailContact.url}
            value={emailContact.value}
          />
        ) : (
          <>
            <div className="actions">
              <span className="btn" role="link" aria-disabled="true">
                이메일 보내기
              </span>
              <button
                className="btn alt"
                type="button"
                aria-label="이메일 복사"
                disabled
              >
                이메일 복사
              </button>
            </div>
            <p
              className="live"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              복사할 연락처를 확인해 주세요.
            </p>
          </>
        )}

        {contacts.length === 0 ? (
          <EmptyState>표시할 연락처가 없습니다.</EmptyState>
        ) : null}

        {externalContacts.length > 0 ? (
          <ul className="channels" aria-label="연락처">
            {externalContacts.map((contact) => (
              <li className="channel" key={contact.id}>
                <strong
                  {...createEditableTextProps(
                    editor,
                    `contacts:${contact.id}:label`,
                  )}
                >
                  {contact.label}
                </strong>
                <a
                  className="contact-value"
                  href={contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${contact.label}: ${contact.value} (새 창)`}
                  {...createEditableTextProps(
                    editor,
                    `contacts:${contact.id}:value`,
                  )}
                >
                  {contact.value}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PortfolioSection>
  );
}
