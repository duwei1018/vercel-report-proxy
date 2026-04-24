"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeToBeta } from "./actions";
import type { SubscribeResult } from "@/lib/beta";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="beta-submit" disabled={pending}>
      {pending ? "提交中…" : "订阅 Weekly Brief"}
    </button>
  );
}

function renderFeedback(state: SubscribeResult | null) {
  if (!state) return null;
  if (state.ok && state.status === "new") {
    return (
      <p className="beta-feedback beta-feedback-success" role="status">
        已分发到你的邮箱,请查收欢迎邮件。若几分钟内没看到,记得看一下垃圾邮件。
      </p>
    );
  }
  if (state.ok && state.status === "existing") {
    return (
      <p className="beta-feedback beta-feedback-success" role="status">
        这个邮箱已在订阅列表里。下期 Weekly Brief 到时会送达。
      </p>
    );
  }
  if (!state.ok) {
    return (
      <p className="beta-feedback beta-feedback-error" role="alert">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SubscribeForm() {
  const [state, action] = useActionState<SubscribeResult | null, FormData>(
    subscribeToBeta,
    null
  );

  return (
    <form className="beta-form" action={action} noValidate>
      <label htmlFor="beta-email" className="beta-label">
        邮箱
      </label>
      <input
        id="beta-email"
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        className="beta-input"
      />

      <label htmlFor="beta-watchlist" className="beta-label">
        想优先关注的公司(选填)
      </label>
      <textarea
        id="beta-watchlist"
        name="watchlist"
        placeholder="例如:小米、拼多多、腾讯;或业务特征关键词"
        rows={3}
        maxLength={500}
        className="beta-textarea"
      />

      <SubmitButton />
      {renderFeedback(state)}

      <p className="beta-form-note">
        我们只在 Weekly Brief 发送时使用这个邮箱。你随时可以点邮件底部的退订链接离开。
      </p>
    </form>
  );
}
