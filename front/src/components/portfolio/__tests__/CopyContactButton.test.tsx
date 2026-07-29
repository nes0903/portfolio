import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyContactButton } from "@/components/portfolio/CopyContactButton";

interface ClipboardStub {
  readonly writeText: (value: string) => Promise<void>;
}

function setClipboard(clipboard: ClipboardStub | undefined): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
});

describe("CopyContactButton", () => {
  it("clipboard 처리 중 disabled/aria-busy와 성공 후 polite 완료 상태를 표시한다", async () => {
    let resolveClipboard: (() => void) | undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClipboard = resolve;
        }),
    );
    setClipboard({ writeText });
    vi.stubGlobal("isSecureContext", true);
    render(<CopyContactButton value="hello@example.com" />);

    const button = screen.getByRole("button", {
      name: "이메일 복사",
    });
    expect(button).toHaveTextContent(/^이메일 복사$/);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("복사할 연락처를 확인해 주세요.");

    fireEvent.click(button);
    expect(writeText).toHaveBeenCalledWith("hello@example.com");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("복사 중");
    expect(button).toHaveAccessibleName("복사 중");
    expect(status).toHaveTextContent("연락처를 복사하고 있습니다.");

    const resolvePendingClipboard = resolveClipboard;
    if (!resolvePendingClipboard) throw new Error("clipboard resolve가 필요합니다");
    await act(async () => resolvePendingClipboard());
    await waitFor(() => {
      expect(button).toHaveTextContent("복사 완료");
      expect(button).toHaveAccessibleName("복사 완료");
      expect(status).toHaveTextContent(/^표시된 연락처를 복사했습니다\.$/);
    });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("clipboard 실패를 button과 polite status에 표시한다", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    vi.stubGlobal("isSecureContext", true);
    render(<CopyContactButton value="hello@example.com" />);

    const button = screen.getByRole("button", {
      name: "이메일 복사",
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("복사 실패");
      expect(button).toHaveAccessibleName("복사 실패");
      expect(screen.getByRole("status")).toHaveTextContent(
        /^복사하지 못했습니다\. 연락처를 직접 선택해 주세요\.$/,
      );
    });
  });

  it("Clipboard API가 reject하면 execCommand fallback을 시도해 성공 처리한다", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    render(<CopyContactButton value="hello@example.com" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "이메일 복사",
      }),
    );

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(screen.getByRole("status")).toHaveTextContent(
        /^표시된 연락처를 복사했습니다\.$/,
      );
    });
  });

  it("textarea fallback 뒤 기존 trigger focus를 복원한다", async () => {
    setClipboard(undefined);
    const { container } = render(
      <CopyContactButton value="hello@example.com" />,
    );
    const button = screen.getByRole("button", {
      name: "이메일 복사",
    });
    const focusSink = document.createElement("input");
    container.append(focusSink);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        focusSink.focus();
        return true;
      }),
    });
    button.focus();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /^표시된 연락처를 복사했습니다\.$/,
      );
      expect(button).toHaveFocus();
    });
  });

  it("Clipboard API와 fallback이 모두 실패하면 직접 복사 방법을 안내한다", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
    });
    render(<CopyContactButton value="hello@example.com" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "이메일 복사",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /^복사하지 못했습니다\. 연락처를 직접 선택해 주세요\.$/,
      );
    });
  });

  it("Clipboard API가 없으면 execCommand fallback을 사용하고 임시 textarea를 제거한다", async () => {
    setClipboard(undefined);
    vi.stubGlobal("isSecureContext", false);
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    render(<CopyContactButton value="hello@example.com" />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "이메일 복사",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /^표시된 연락처를 복사했습니다\.$/,
      );
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("완료 상태를 2초 후 idle button/status로 되돌린다", async () => {
    vi.useFakeTimers();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    vi.stubGlobal("isSecureContext", true);
    render(<CopyContactButton value="hello@example.com" />);
    const button = screen.getByRole("button", {
      name: "이메일 복사",
    });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button).toHaveTextContent("복사 완료");

    act(() => vi.advanceTimersByTime(2_000));
    expect(button).toHaveTextContent("이메일 복사");
    expect(button).toHaveAccessibleName("이메일 복사");
    expect(screen.getByRole("status")).toHaveTextContent(
      "복사할 연락처를 확인해 주세요.",
    );
  });
});
