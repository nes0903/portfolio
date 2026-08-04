"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/admin/login/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  initialAdminFormState,
  type AdminFormState,
} from "@/lib/auth/form-state";

interface LoginFormProps {
  readonly initialMessage?: string;
}

export function LoginForm({ initialMessage = "" }: LoginFormProps) {
  const seededState: AdminFormState = initialMessage
    ? { message: initialMessage, status: "error" }
    : initialAdminFormState;
  const [state, formAction] = useActionState(loginAction, seededState);

  return (
    <form action={formAction} className="admin-login-form">
      <label className="admin-field">
        <span>이메일</span>
        <input
          autoComplete="username"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </label>

      <label className="admin-field">
        <span>비밀번호</span>
        <input
          autoComplete="current-password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>

      {state.message ? (
        <p className="admin-form-message" data-status={state.status} role="alert">
          {state.message}
        </p>
      ) : null}

      <SubmitButton>로그인</SubmitButton>
    </form>
  );
}
