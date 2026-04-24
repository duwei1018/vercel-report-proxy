"use server";

import { removeSubscriber, verifyUnsubscribeToken } from "@/lib/beta";

export interface UnsubscribeActionResult {
  ok: boolean;
  status: "removed" | "not_found" | "invalid_token" | "error";
  message: string;
}

export async function confirmUnsubscribe(
  email: string,
  token: string
): Promise<UnsubscribeActionResult> {
  if (!email || !token) {
    return {
      ok: false,
      status: "invalid_token",
      message: "退订链接不完整或已过期。",
    };
  }
  if (!verifyUnsubscribeToken(email, token)) {
    return {
      ok: false,
      status: "invalid_token",
      message: "退订链接验证失败,请在最近一封邮件中重新点退订。",
    };
  }
  try {
    const result = await removeSubscriber(email);
    if (result.status === "removed") {
      return {
        ok: true,
        status: "removed",
        message: `${email} 已从订阅列表移除。`,
      };
    }
    return {
      ok: true,
      status: "not_found",
      message: `${email} 不在订阅列表里(或已退订)。`,
    };
  } catch (err) {
    console.error("[unsubscribe] error:", err);
    return {
      ok: false,
      status: "error",
      message: "系统临时有点问题,稍后再试一下。",
    };
  }
}
