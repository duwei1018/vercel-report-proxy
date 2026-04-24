"use client";

import { useState, useTransition } from "react";
import { confirmUnsubscribe, type UnsubscribeActionResult } from "./actions";

export function UnsubscribeConfirm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<UnsubscribeActionResult | null>(null);

  function handleClick() {
    start(async () => {
      const r = await confirmUnsubscribe(email, token);
      setResult(r);
    });
  }

  if (result) {
    return (
      <p
        className={
          result.ok
            ? "beta-feedback beta-feedback-success"
            : "beta-feedback beta-feedback-error"
        }
        role={result.ok ? "status" : "alert"}
      >
        {result.message}
      </p>
    );
  }

  return (
    <>
      <p>
        你将从 Weekly Brief 订阅列表中移除:
        <br />
        <strong className="unsubscribe-email">{email}</strong>
      </p>
      <button
        type="button"
        className="beta-submit unsubscribe-submit"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "处理中…" : "确认退订"}
      </button>
      <p className="beta-form-note">
        退订后你不会再收到任何邮件。如果后续想回来,随时可以从{" "}
        <a href="/beta">/beta</a> 重新订阅。
      </p>
    </>
  );
}
