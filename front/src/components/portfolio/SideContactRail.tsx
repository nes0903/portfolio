import {
  FormattedText,
  stripInlineFormatting,
} from "@/components/portfolio/FormattedText";
import {
  createEditableTextProps,
  type PortfolioEditorBridge,
} from "@/components/portfolio/editor-types";
import type { Contact } from "@/lib/content/types";

interface SideContactRailProps {
  readonly contacts: readonly Contact[];
  readonly editor?: PortfolioEditorBridge;
}

const CONTACT_CHANNELS: readonly Contact["channel"][] = [
  "email",
  "phone",
  "github",
  "linkedin",
  "blog",
  "website",
];

/**
 * 본문 section 대신 고정 side rail과 mobile 하단 bar에서 연락처를 표시한다.
 */
export function SideContactRail({
  contacts,
  editor,
}: SideContactRailProps) {
  return (
    <aside
      aria-label="연락처"
      className="side-contact-rail"
      data-editor-selected={
        editor?.selectedSection === "contact" ? "true" : undefined
      }
      id="contact"
      onClick={editor ? () => editor.onSelectSection("contact") : undefined}
      tabIndex={-1}
    >
      <strong className="side-contact-heading">CONTACT</strong>
      {contacts.length > 0 ? (
        <ul className="side-contact-list">
          {contacts.map((contact) => {
            const isEmail = contact.channel === "email";
            const isPhone = contact.channel === "phone";
            const isExternal = !isEmail && !isPhone;
            const accessibleLabel = `${stripInlineFormatting(contact.label)}: ${stripInlineFormatting(contact.value)}`;

            return (
              <li className="side-contact-item" key={contact.id}>
                <strong
                  className="side-contact-label"
                  {...createEditableTextProps(
                    editor,
                    `contacts:${contact.id}:label`,
                  )}
                >
                  <FormattedText text={contact.label} />
                </strong>
                {isEmail ? (
                  <span
                    className="side-contact-value"
                    {...createEditableTextProps(
                      editor,
                      `contacts:${contact.id}:value`,
                      { richText: false },
                    )}
                  >
                    {contact.value}
                  </span>
                ) : (
                  <a
                    aria-label={
                      isPhone
                        ? accessibleLabel
                        : `${accessibleLabel} (새 창)`
                    }
                    className="side-contact-value"
                    href={contact.url}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    target={isExternal ? "_blank" : undefined}
                    {...createEditableTextProps(
                      editor,
                      `contacts:${contact.id}:value`,
                      { richText: false },
                    )}
                  >
                    {contact.value}
                  </a>
                )}

                {editor ? (
                  <div className="side-contact-admin-controls">
                    <select
                      aria-label={`${stripInlineFormatting(contact.label)} 연락 채널`}
                      onChange={(event) =>
                        editor.onChangeContactStructure?.(
                          contact.id,
                          event.currentTarget.value as Contact["channel"],
                          contact.url,
                        )
                      }
                      value={contact.channel}
                    >
                      {CONTACT_CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                    {isExternal ? (
                      <input
                        aria-label={`${stripInlineFormatting(contact.label)} 연결 URL`}
                        onChange={(event) =>
                          editor.onChangeContactStructure?.(
                            contact.id,
                            contact.channel,
                            event.currentTarget.value,
                          )
                        }
                        type="url"
                        value={contact.url}
                      />
                    ) : null}
                    <button
                      aria-label={`${stripInlineFormatting(contact.label)} 연락처 삭제`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${stripInlineFormatting(contact.label)} 연락처를 삭제할까요?`,
                          )
                        ) {
                          editor.onDeleteItem?.("contact", contact.id);
                        }
                      }}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {editor ? (
        <button
          className="side-contact-add"
          onClick={() => editor.onAddItem?.("contact")}
          type="button"
        >
          + 연락처
        </button>
      ) : null}
    </aside>
  );
}
