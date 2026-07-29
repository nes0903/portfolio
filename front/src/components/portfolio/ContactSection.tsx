import { CopyContactButton } from "@/components/portfolio/CopyContactButton";
import { EmptyState } from "@/components/portfolio/EmptyState";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import type { Contact } from "@/lib/content/types";

interface ContactSectionProps {
  readonly contacts: readonly Contact[];
}

/**
 * 승인된 이메일과 HTTPS 외부 프로필을 접근 가능한 연락처 목록으로 표시한다.
 */
export function ContactSection({ contacts }: ContactSectionProps) {
  const emailContact = contacts.find(
    (contact) => contact.channel === "email",
  );
  const externalContacts = contacts.filter(
    (contact) => contact.channel !== "email",
  );

  return (
    <PortfolioSection
      id="contact"
      number="05"
      eyebrow="연락처"
      title="연락처"
    >
      <div className="contact">
        {emailContact ? (
          <code className="contact-value">{emailContact.value}</code>
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
                <strong>{contact.label}</strong>
                <a
                  className="contact-value"
                  href={contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${contact.label}: ${contact.value} (새 창)`}
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
