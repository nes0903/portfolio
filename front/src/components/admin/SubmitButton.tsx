"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  readonly children: string;
}

export function SubmitButton({ children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className="admin-button admin-button-primary" disabled={pending} type="submit">
      {pending ? "처리 중…" : children}
    </button>
  );
}
