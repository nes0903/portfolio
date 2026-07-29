"use client";

import { useEffect, useRef, useState } from "react";

interface CopyContactButtonProps {
  readonly sendHref?: string;
  readonly value: string;
}

type CopyState = "idle" | "pending" | "success" | "failure";

const BUTTON_TEXT: Readonly<Record<CopyState, string>> = {
  idle: "복사",
  pending: "복사 중",
  success: "복사 완료",
  failure: "복사 실패",
};

const STATUS_TEXT: Readonly<Record<CopyState, string>> = {
  idle: "복사할 연락처를 확인해 주세요.",
  pending: "연락처를 복사하고 있습니다.",
  success: "표시된 연락처를 복사했습니다.",
  failure: "복사하지 못했습니다. 연락처를 직접 선택해 주세요.",
};

/**
 * Clipboard API가 없는 환경에서 임시 textarea로 값을 복사한다.
 */
function copyWithTextarea(value: string): void {
  const previouslyFocusedElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.className = "sr-only";
  document.body.append(textarea);

  /**
   * execCommand가 성공 여부를 반환할 수 있도록 선택 영역을 명시한다.
   */
  try {
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    if (
      typeof document.execCommand !== "function" ||
      !document.execCommand("copy")
    ) {
      throw new Error("연락처를 복사하지 못했습니다.");
    }
  } finally {
    textarea.remove();
    previouslyFocusedElement?.focus({ preventScroll: true });
  }
}

/**
 * 표준 Clipboard API를 우선 사용하고 미지원 또는 거부 환경에서 fallback을 사용한다.
 */
async function copyContactValue(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      copyWithTextarea(value);
      return;
    }
  }

  copyWithTextarea(value);
}

/**
 * 이메일 연락처를 복사하고 처리 상태를 접근 가능한 live region으로 알린다.
 */
export function CopyContactButton({
  sendHref,
  value,
}: CopyContactButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<number | null>(null);

  /**
   * component가 사라질 때 예약된 상태 초기화를 정리한다.
   */
  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  /**
   * 사용자 click에서 복사를 실행하고 결과를 2초 동안 유지한다.
   */
  async function handleCopy(): Promise<void> {
    if (copyState === "pending") {
      return;
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    setCopyState("pending");

    try {
      await copyContactValue(value);
      setCopyState("success");
    } catch {
      setCopyState("failure");
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimerRef.current = null;
    }, 2_000);
  }

  const buttonText =
    copyState === "idle" ? `이메일 ${BUTTON_TEXT.idle}` : BUTTON_TEXT[copyState];
  const statusClassName = [
    "live",
    copyState === "success" ? "ok" : "",
    copyState === "failure" ? "error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const copyButton = (
    <button
      className="btn alt"
      type="button"
      aria-busy={copyState === "pending" ? true : undefined}
      disabled={copyState === "pending"}
      onClick={handleCopy}
    >
      {buttonText}
    </button>
  );
  const liveStatus = (
    <p
      className={statusClassName}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {STATUS_TEXT[copyState]}
    </p>
  );

  /**
   * contact panel에서는 두 control과 live status를 sibling 계약에 맞춰 배치한다.
   */
  if (sendHref) {
    return (
      <>
        <div className="actions">
          <a className="btn" href={sendHref}>
            이메일 보내기
          </a>
          {copyButton}
        </div>
        {liveStatus}
      </>
    );
  }

  return (
    <>
      {copyButton}
      {liveStatus}
    </>
  );
}
