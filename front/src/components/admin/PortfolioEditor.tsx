"use client";

import { useActionState, useState } from "react";

import { savePortfolioAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { initialAdminFormState } from "@/lib/auth/form-state";
import { normalizePortfolioContentForSave } from "@/lib/content/admin-form";
import type { PortfolioDocumentContent } from "@/lib/content/model";

interface PortfolioEditorProps {
  readonly initialContent: PortfolioDocumentContent;
}

interface FieldProps {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly type?: "text" | "month" | "url" | "email";
  readonly value: string;
}

function Field({ label, onChange, placeholder, type = "text", value }: FieldProps) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

interface TextAreaFieldProps extends Omit<FieldProps, "type"> {
  readonly rows?: number;
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: TextAreaFieldProps) {
  return (
    <label className="admin-field admin-field-wide">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function createContentId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function splitLines(value: string): string[] | undefined {
  const items = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PortfolioEditor({ initialContent }: PortfolioEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [state, formAction] = useActionState(
    savePortfolioAction,
    initialAdminFormState,
  );
  const normalizedContent = normalizePortfolioContentForSave(content);

  return (
    <form
      action={formAction}
      className="admin-editor"
      onReset={(event) => event.preventDefault()}
    >
      <input
        name="content"
        type="hidden"
        value={JSON.stringify(normalizedContent)}
      />

      <section className="admin-edit-section">
        <div className="admin-section-heading">
          <div>
            <span>01</span>
            <h2>소개</h2>
          </div>
        </div>
        <div className="admin-field-grid">
          <Field
            label="제목"
            onChange={(title) =>
              setContent((current) => ({
                ...current,
                introduce: { ...current.introduce, title },
              }))
            }
            value={content.introduce.title}
          />
          <TextAreaField
            label="소개 문구"
            onChange={(value) =>
              setContent((current) => ({
                ...current,
                introduce: { ...current.introduce, content: value },
              }))
            }
            rows={5}
            value={content.introduce.content}
          />
        </div>
      </section>

      <section className="admin-edit-section">
        <div className="admin-section-heading">
          <div>
            <span>02</span>
            <h2>기술</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                skills: [
                  ...current.skills,
                  {
                    category: "Language",
                    id: createContentId("skill"),
                    name: "새 기술",
                    order: current.skills.length,
                  },
                ],
              }))
            }
            type="button"
          >
            기술 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.skills.map((skill, index) => (
            <fieldset className="admin-item" key={skill.id}>
              <legend>기술 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="이름"
                  onChange={(name) =>
                    setContent((current) => ({
                      ...current,
                      skills: current.skills.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name } : item,
                      ),
                    }))
                  }
                  value={skill.name}
                />
                <Field
                  label="분류"
                  onChange={(category) =>
                    setContent((current) => ({
                      ...current,
                      skills: current.skills.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, category } : item,
                      ),
                    }))
                  }
                  value={skill.category}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    skills: current.skills.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="admin-edit-section">
        <div className="admin-section-heading">
          <div>
            <span>03</span>
            <h2>경력</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                careers: [
                  ...current.careers,
                  {
                    company: "새 회사",
                    endDate: null,
                    id: createContentId("career"),
                    order: current.careers.length,
                    role: "직무",
                    startDate: new Date().toISOString().slice(0, 7),
                  },
                ],
              }))
            }
            type="button"
          >
            경력 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.careers.map((career, index) => (
            <fieldset className="admin-item" key={career.id}>
              <legend>경력 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="회사"
                  onChange={(company) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, company } : item,
                      ),
                    }))
                  }
                  value={career.company}
                />
                <Field
                  label="직무"
                  onChange={(role) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, role } : item,
                      ),
                    }))
                  }
                  value={career.role}
                />
                <Field
                  label="시작 월"
                  onChange={(startDate) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, startDate } : item,
                      ),
                    }))
                  }
                  type="month"
                  value={career.startDate}
                />
                <Field
                  label="종료 월 (재직 중이면 비움)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, endDate: value || null } : item,
                      ),
                    }))
                  }
                  type="month"
                  value={career.endDate ?? ""}
                />
                <TextAreaField
                  label="요약"
                  onChange={(summary) =>
                    setContent((current) => ({
                      ...current,
                      careers: current.careers.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, summary: summary || undefined }
                          : item,
                      ),
                    }))
                  }
                  value={career.summary ?? ""}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    careers: current.careers.filter((_, itemIndex) => itemIndex !== index),
                    careerWorks: current.careerWorks.filter(
                      (work) => work.careerId !== career.id,
                    ),
                  }))
                }
                type="button"
              >
                경력과 연결 작업 삭제
              </button>
            </fieldset>
          ))}
        </div>

        <div className="admin-subsection-heading">
          <h3>경력 상세 작업</h3>
          <button
            className="admin-button"
            disabled={content.careers.length === 0}
            onClick={() => {
              const careerId = content.careers[0]?.id;
              if (!careerId) return;
              setContent((current) => ({
                ...current,
                careerWorks: [
                  ...current.careerWorks,
                  {
                    careerId,
                    description: "작업 설명",
                    id: createContentId("work"),
                    order: current.careerWorks.filter((work) => work.careerId === careerId)
                      .length,
                    title: "새 작업",
                  },
                ],
              }));
            }}
            type="button"
          >
            작업 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.careerWorks.map((work, index) => (
            <fieldset className="admin-item" key={work.id}>
              <legend>작업 {index + 1}</legend>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>소속 경력</span>
                  <select
                    onChange={(event) => {
                      const careerId = event.target.value;
                      setContent((current) => ({
                        ...current,
                        careerWorks: current.careerWorks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, careerId } : item,
                        ),
                      }));
                    }}
                    value={work.careerId}
                  >
                    {content.careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.company} — {career.role}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="작업명"
                  onChange={(title) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    }))
                  }
                  value={work.title}
                />
                <TextAreaField
                  label="설명"
                  onChange={(description) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description } : item,
                      ),
                    }))
                  }
                  value={work.description}
                />
                <TextAreaField
                  label="성과 (한 줄에 하나)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, achievements: splitLines(value) }
                          : item,
                      ),
                    }))
                  }
                  value={work.achievements?.join("\n") ?? ""}
                />
                <TextAreaField
                  label="기술 (한 줄에 하나)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      careerWorks: current.careerWorks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, technologies: splitLines(value) }
                          : item,
                      ),
                    }))
                  }
                  value={work.technologies?.join("\n") ?? ""}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    careerWorks: current.careerWorks.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="admin-edit-section">
        <div className="admin-section-heading">
          <div>
            <span>04</span>
            <h2>사이드 프로젝트</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                sideProjects: [
                  ...current.sideProjects,
                  {
                    description: "프로젝트 설명",
                    id: createContentId("project"),
                    links: {},
                    name: "새 프로젝트",
                    order: current.sideProjects.length,
                    role: "담당 역할",
                    skills: [],
                  },
                ],
              }))
            }
            type="button"
          >
            프로젝트 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.sideProjects.map((project, index) => (
            <fieldset className="admin-item" key={project.id}>
              <legend>프로젝트 {index + 1}</legend>
              <div className="admin-field-grid">
                <Field
                  label="이름"
                  onChange={(name) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name } : item,
                      ),
                    }))
                  }
                  value={project.name}
                />
                <Field
                  label="역할"
                  onChange={(role) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, role } : item,
                      ),
                    }))
                  }
                  value={project.role}
                />
                <TextAreaField
                  label="설명"
                  onChange={(description) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description } : item,
                      ),
                    }))
                  }
                  value={project.description}
                />
                <Field
                  label="기술 (쉼표로 구분)"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, skills: splitCommaSeparated(value) }
                          : item,
                      ),
                    }))
                  }
                  value={project.skills.join(", ")}
                />
                <Field
                  label="저장소 URL"
                  onChange={(repository) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              links: { ...item.links, repository: repository || undefined },
                            }
                          : item,
                      ),
                    }))
                  }
                  type="url"
                  value={project.links.repository ?? ""}
                />
                <Field
                  label="데모 URL"
                  onChange={(demo) =>
                    setContent((current) => ({
                      ...current,
                      sideProjects: current.sideProjects.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, links: { ...item.links, demo: demo || undefined } }
                          : item,
                      ),
                    }))
                  }
                  type="url"
                  value={project.links.demo ?? ""}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    sideProjects: current.sideProjects.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="admin-edit-section">
        <div className="admin-section-heading">
          <div>
            <span>05</span>
            <h2>연락처</h2>
          </div>
          <button
            className="admin-button"
            onClick={() =>
              setContent((current) => ({
                ...current,
                contacts: [
                  ...current.contacts,
                  {
                    channel: "website",
                    id: createContentId("contact"),
                    label: "Website",
                    order: current.contacts.length,
                    url: "https://example.com",
                    value: "example.com",
                  },
                ],
              }))
            }
            type="button"
          >
            연락처 추가
          </button>
        </div>
        <div className="admin-item-list">
          {content.contacts.map((contact, index) => (
            <fieldset className="admin-item" key={contact.id}>
              <legend>연락처 {index + 1}</legend>
              <div className="admin-field-grid">
                <label className="admin-field">
                  <span>채널</span>
                  <select
                    onChange={(event) => {
                      const channel = event.target.value as typeof contact.channel;
                      setContent((current) => ({
                        ...current,
                        contacts: current.contacts.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, channel } : item,
                        ),
                      }));
                    }}
                    value={contact.channel}
                  >
                    <option value="email">email</option>
                    <option value="github">github</option>
                    <option value="linkedin">linkedin</option>
                    <option value="blog">blog</option>
                    <option value="website">website</option>
                  </select>
                </label>
                <Field
                  label="표시명"
                  onChange={(label) =>
                    setContent((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label } : item,
                      ),
                    }))
                  }
                  value={contact.label}
                />
                <Field
                  label="표시 값"
                  onChange={(value) =>
                    setContent((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value } : item,
                      ),
                    }))
                  }
                  value={contact.value}
                />
                <Field
                  label="연결 URL"
                  onChange={(url) =>
                    setContent((current) => ({
                      ...current,
                      contacts: current.contacts.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, url } : item,
                      ),
                    }))
                  }
                  value={contact.url}
                />
              </div>
              <button
                className="admin-remove-button"
                onClick={() =>
                  setContent((current) => ({
                    ...current,
                    contacts: current.contacts.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
                type="button"
              >
                삭제
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="admin-save-bar">
        {state.message ? (
          <p className="admin-form-message" data-status={state.status} role="status">
            {state.message}
          </p>
        ) : (
          <p>저장하면 공개 포트폴리오에 즉시 반영됩니다.</p>
        )}
        <SubmitButton>변경사항 저장</SubmitButton>
      </div>
    </form>
  );
}
