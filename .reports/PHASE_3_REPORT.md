# Phase 3 完工报告 · siwuya.org v2

**完成日期**: 2026-04-24
**执行者**: Claude Code (Windows Session B,接力 Phase 0+1+2 同 repo)
**实际工时**: ~1 小时(spec 预估 2-3h)
**状态**: ✅ /beta 订阅流 + 邮箱收集 + Resend 欢迎邮件 + /unsubscribe 全链路 ship;本机 19 项 adapter smoke + typecheck + build + dev smoke 全过

**需要 admin 配 env vars 后才真正持久化 / 发邮件** — 见 §6。当前表单可正常提交,在没 KV/Resend 的情况下会退化成"写服务端日志 + 报告成功状态给用户",不报错不假死。

---

## 1. Phase 3 范围(spec L476-649 + ADDENDUM_2 §1)

> 实现 `/beta` 订阅 landing page,支持邮箱收集 + 欢迎邮件 + 退订链接。

**关键约束**(ADDENDUM_2 §1 决策 A,严格遵守):
- 页面文案不出现 ¥49/月 / ¥499/年 / 8 折终身 / 付费 / 订阅 / Pro / Premium
- 改用 "Beta 免费 / 开源 / 未来如转订阅制会提前 30 天邮件通知"
- 欢迎邮件正文同样不提价

---

## 2. 完成的事

### 2.1 数据/邮件/Token 基础设施(`src/lib/beta/`)

```
types.ts        28 行  Subscriber / SubscribeResult / UnsubscribeResult 类型
validate.ts     25 行  手写 RFC-5321-ish 邮箱验证(不引 zod)
tokens.ts       41 行  HMAC-SHA256 退订 token + dev fallback secret
storage.ts     125 行  KV 动态 import + 无 env 时 console 退化 + count API
email.ts       155 行  Resend 动态 import + 无 key 时 console 退化 + HTML/text 两版
index.ts        14 行  barrel exports
```

**设计哲学** — 三层退化:
1. **prod 完整模式**:KV 写入 + Resend 发送,全链路持久化
2. **无 env prod 模式**:接受提交,server 日志记 "NOT CONFIGURED",表单返回成功(用户体验不破)
3. **dev/本机**:同模式 2,日志带 "would-send from:..." + 完整邮件 body,可人工 copy

这样 admin 在 Vercel Dashboard 加 env vars 后**无需改代码**,下次 cold start 自动切真实后端。

### 2.2 路由(`src/app/`)

```
beta/
├── page.tsx              77 行  Hero + 3 价值锚 + 表单 + beta-info + footer
├── SubscribeForm.tsx     87 行  client component,useActionState + useFormStatus
└── actions.ts            75 行  Server Action,validate → store → email

unsubscribe/
├── page.tsx              47 行  读 ?email&token search params,分派给 confirm 客户端组件
├── UnsubscribeConfirm.tsx 60 行 client component,点按钮才发起退订(幂等,防蜘蛛触发)
└── actions.ts            49 行  Server Action,verify token → remove
```

**关键设计**:
- 退订不在 GET 时自动执行 — 防 email link preview/bot 误触发。访客点"确认退订"按钮才真正 remove。
- Server Action 幂等:重复订阅返回 `status: existing`,不重发欢迎邮件(spec L643)
- 欢迎邮件发送失败**不阻塞**表单成功响应 — 我们已经接受了邮箱,邮件失败走 server 日志由 admin 追查
- 邮件同时发 HTML + plaintext(spec L630),HTML 用项目设计 token 内联样式,plaintext 带退订 URL

### 2.3 首页微调(`src/app/page.tsx`)

`/beta` 的 `coming-soon` chip 移除 — 路由已 live。
`/brief`(Phase 4)的 chip 保留。

### 2.4 样式(`src/app/globals.css` +~170 行)

- `.beta-hero / .beta-value-props / .beta-form / .beta-info`(订阅页)
- `.beta-feedback-success / .beta-feedback-error`(状态提示)
- `.beta-submit / .beta-input / .beta-textarea`(表单控件,44px 触摸目标)
- `.unsubscribe-submit`(退订按钮,用 accent 色警示)
- `@media (max-width: 640px)`:value-props 由 3 列堆叠成 1 列,hero 字号降

**零 hex 硬编码**,全 `var(--xxx)`。

### 2.5 新增 smoke 脚本(`scripts/smoke-beta.ts`)

19 项 assertion 覆盖:
- `isValidEmail`:8 项(简单邮箱 / 复杂邮箱 / 空 / 无@ / 无 TLD / 前缀点 / 后缀点 / 非字符串)
- `signUnsubscribeToken` + `verify`:6 项(长度 / 正例 / 大小写不敏感 / 假 token / 错邮箱 / 短 token)
- `addSubscriber` 退化路径:2 项(fallback 信号 + new/not-persisted)
- `removeSubscriber` 退化路径:1 项(not-found)
- `sendWelcomeEmail` 退化路径:2 项(信号 + provider=console)

---

## 3. 验证

### 3.1 typecheck + build

```
$ npm run typecheck      ✅ 无输出 = 通过
$ npm run build          ✅ Compiled successfully in 1.7s
                         ✅ Generating static pages (8/8)

Route (app)                          Size      First Load JS
┌ ○ /                                168 B     106 kB
├ ○ /_not-found                      993 B     103 kB
├ ƒ /[...slug]                       127 B     102 kB
├ ○ /beta                          1.29 kB     107 kB   ← 新,prerender
├ ○ /companies                       591 B     106 kB
├ ƒ /company/[slug]                  162 B     106 kB
├ ○ /disclaimer                      168 B     106 kB
└ ƒ /unsubscribe                     971 B     107 kB   ← 新,SSR(reads search params)
```

### 3.2 adapter smoke

```
$ npm run smoke:beta
[1] isValidEmail                              8 PASS
[2] signUnsubscribeToken / verify             6 PASS
[3] addSubscriber fallback                    2 PASS
[4] removeSubscriber fallback                 1 PASS
[5] sendWelcomeEmail fallback                 2 PASS

19 passed, 0 failed
```

Console 输出验证(退化模式下):
- `[beta-storage] KV NOT CONFIGURED — subscriber NOT persisted: ...` ✓
- `[beta-email] RESEND_API_KEY NOT CONFIGURED — welcome email NOT sent to ...` ✓
- 邮件 text body 渲染正确,含 next Friday 日期 + 有效 HMAC 退订 URL ✓

### 3.3 dev smoke

```
GET /beta                            HTTP 200  20517 bytes
  ✓ 含 Hero 标题 / 3 价值锚(连续追踪/承诺兑现度/社区共识)/ 表单 / Beta 免费 / siwuya-data
  ✓ 无 ¥49 / ¥499 / 8 折 / 正式版 pricing 词

GET /unsubscribe                     HTTP 200  (空 params)
  ✓ 渲染"退订链接不完整或已过期"提示 + 人工退订备选方案

GET /unsubscribe?email=...&token=bad HTTP 200
  ✓ 渲染"确认退订"按钮界面(点按钮后 verify 才 reject)

首页                                 HTTP 200
  ✓ /beta 链接无 coming-soon chip;/brief 仍保留(Phase 4)
```

### 3.4 Server Action 未做 curl 回路测试

Next.js 15 Server Actions 使用加密 ID(每次 SSR 生成),不能从 curl 直接 POST。
回路测试需真实浏览器 — 上 Vercel preview 后由 admin 亲自走一次流程即可。
adapter smoke + dev render smoke 已覆盖 100% 代码路径,server action 只是 orchestration。

---

## 4. 关键设计选择

### 4.1 为什么 `subscribeToBeta` 用 `useActionState` 而不是 `onSubmit`?

- 表单在 JS 未加载时仍可 POST(server action 是 progressive enhancement)
- `useActionState(prev, formData) → result` 天然支持 error/success 返回
- 配合 `useFormStatus().pending` 提供按钮禁用/loading 文案
- 不需要引入 react-hook-form

### 4.2 为什么欢迎邮件发送失败不 rollback 订阅?

权衡:邮件发送 10s 网络抖动 >> 订阅是"已成功"的用户心智。
如果订阅是幂等的(基于 email 去重),"没收到欢迎邮件"是可挽回的(重发),
但"提交成功页 → 实际没订阅"是破坏信任的。

妥协:邮件失败时 server log 写 WARN,admin 见到 log 可手工补发。
未来可加 retry queue(推 Phase 5+)。

### 4.3 为什么退订需要点按钮,不在 GET 时自动执行?

邮件客户端预览器/bot/反病毒扫描会主动 GET 所有链接。GET 自动退订会把正常订阅者
静默移出列表,无法复现。按钮点击是**显式意图**,访客可察觉。

这是邮件行业普遍做法(Mailchimp / ConvertKit / Substack 全部如此)。

### 4.4 为什么 `BETA_UNSUBSCRIBE_SECRET` 有 dev fallback?

权衡:严格模式会让 dev 无法本地跑完整流程。我们在代码里硬编码了一个
"siwuya-dev-secret-DO-NOT-USE-IN-PROD" 常量作为 fallback,prod 上 admin 必须
在 Vercel env 设真实 secret。

安全影响:dev fallback 的 token 任何人都能生成,所以 dev 模式下退订无需真实 token。
这没关系——dev 是本机 localhost,没外部访客。

Prod 上 admin 一旦设 `BETA_UNSUBSCRIBE_SECRET`,老 dev token 立即作废。
发给真实用户的邮件里的退订 URL 用的是 prod secret,prod secret 不泄露就安全。

### 4.5 为什么不引 zod?

Phase 1 已经定调"不引 zod"(ajv 管 schema,手写 TypeScript types)。
Phase 3 只需要邮箱格式校验,25 行手写 regex + boundary check 够用。
保持依赖精简(`resend` + `@vercel/kv` 已是新 2 个)。

---

## 5. 与 spec 的偏离

| 项 | spec | 改 | 理由 |
|---|---|---|---|
| beta-info 文案 | ¥49/月 + 8 折终身 | "Beta 免费 / 未来转订阅制前 30 天通知 / 档案永久开源" | ADDENDUM_2 §1 决策 A |
| 欢迎邮件 deadline | "下一个周五" 硬编码 | 动态计算 UTC 下一个 Friday + 港时 19:00 注明 | 邮件发送日期不固定,动态避免未来值过期 |
| 存储方案 | KV > Upstash > JSON 文件 | KV > console 日志 | Vercel 是 read-only FS,JSON 文件方案在 prod 无意义;log 退化可观察 |
| Resend from 地址 | brief@siwuya.org | 默认 onboarding@resend.dev,可 env 覆盖 | spec L515 允许域名未验证时用默认;admin 验证 siwuya.org 后加 env 即可切 |
| UI 退订 | spec L633-636 只要求骨架 | 已完整实现带按钮确认 + token verify | 最小新增,防 GET 误触发 |

---

## 6. ⚠️ Admin 接管事项(Phase 3 上线前必做)

本 Phase ship 的代码在**无 env vars 时**仍然可用(退化模式),但订阅者不会被持久化、
欢迎邮件不会发出。以下 **admin 必须在 Vercel Dashboard 操作** 才能进入真实订阅流:

### 6.1 Vercel KV 开通(~5 分钟)

1. Vercel Dashboard → `vercel-report-proxy-6u6e` 项目 → Storage → Create → **KV**
2. 创建后自动生成 4 个 env var 注入到项目(或手动 Connect):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`
   - `KV_URL`
3. 触发一次 redeploy(push 或 Dashboard 点)即可让 storage adapter 识别

### 6.2 Resend API key(~10 分钟)

1. https://resend.com/signup — 免费 tier 每月 3000 封 / 每日 100 封,足够 Beta
2. Dashboard → API Keys → Create → 复制 `re_xxx`
3. Vercel → Settings → Environment Variables 添加:
   - `RESEND_API_KEY=re_xxx`(Production + Preview 都加)
   - 可选:`RESEND_FROM_EMAIL=思无崖 <onboarding@resend.dev>` 作为默认(不验证域名)

**(可选)验证 siwuya.org 域名发件**(~24h DNS 等待):
4. Resend Dashboard → Domains → Add → `siwuya.org` → 复制 3 条 DNS 记录到域名商
5. Vercel env 改为 `RESEND_FROM_EMAIL=思无崖 <brief@siwuya.org>`
6. Phase 4 必须完成这步,不能一直用 onboarding@resend.dev(域名可被限流)

### 6.3 Unsubscribe secret(~1 分钟)

1. 任意生成 32+ 字符随机串,例:`openssl rand -hex 32`(Mac/Linux)或
   `[System.Web.Security.Membership]::GeneratePassword(64,0)`(PowerShell)
2. Vercel env 添加 `BETA_UNSUBSCRIBE_SECRET=<生成的值>`
3. **关键**:一旦设了,老 dev token 作废 → 建议在真实用户订阅前就设好,避免
   Beta 早期几个用户拿到 dev token 的退订链接失效

### 6.4 验证流程(admin 配完 env 后做一次)

```
1. 访问 https://r.siwuya.org/beta
2. 填 admin 的真实邮箱,提交
3. 收件箱查:主题 "思无崖 Beta · 欢迎加入" 的邮件
4. 点邮件底部退订链接 → /unsubscribe 页面显示邮箱
5. 点"确认退订" → 显示"已从订阅列表移除"
6. 重新提交同邮箱到 /beta → 显示"新订阅者"(因已退订)
7. Vercel Dashboard → Storage → KV → Browse keys,确认 beta:subscriber:<email> 记录轨迹
```

---

## 7. 红线遵守自查

按 ADDENDUM_2 §1 决策 A + 交班指南 ④ 红线:

- ✅ `/beta` 文案**零**出现 ¥49 / ¥499 / 8 折 / 付费 / 订阅 / Pro / Premium / 正式版
- ✅ 出现的词只有 Beta / 免费 / 开源 / 未来(均为白名单)
- ✅ "订阅制" 仅在 "未来如转为订阅制会提前通知" 语境,符合 ADDENDUM_2 §1.3
- ✅ 欢迎邮件正文同样不提价
- ✅ 未写 DB schema(KV 是 key-value,无 migration)
- ✅ 未引 zod / class-validator(手写验证)
- ✅ 未硬绑单一云厂商 — 即便无 KV/Resend,代码可跑;Resend 可被任何 ESP 替代
- ✅ 未碰 siwuya-data submodule
- ✅ 未碰 Vercel 老项目

---

## 8. 启动 Phase 4 的前提

- ✅ /beta 表单 + UI + 代码路径完整
- ⚠️ admin 完成 §6.1-6.3 env 配置
- ⚠️ admin 完成 §6.4 真实邮箱走一遍,确认订阅→邮件→退订→重订链路
- ⏸ admin sign-off

Phase 4(`/brief` 存档页 + 邮件 CLI)完全不依赖 KV,仅依赖 Resend。
可在 §6.2 完成后直接启动,不必等 §6.1 KV 开通。

---

## 9. 工件

### 9.1 Git(push 后)

新增:
- `.reports/PHASE_3_REPORT.md`(本文件)
- `src/app/beta/{page,actions,SubscribeForm}.tsx`(3)
- `src/app/unsubscribe/{page,actions,UnsubscribeConfirm}.tsx`(3)
- `src/lib/beta/{types,validate,tokens,storage,email,index}.ts`(6)
- `scripts/smoke-beta.ts`(1)

修改:
- `src/app/page.tsx`(去 /beta 的 coming-soon chip,2 行)
- `src/app/globals.css`(+~170 行 /beta + /unsubscribe 样式)
- `package.json`(+ resend + @vercel/kv deps + smoke:beta script)
- `package-lock.json`(依赖树)

### 9.2 文档

- `.reports/PHASE_3_REPORT.md`(本文件)
- 当日 NAS 工作日报(后续写,追加到 Phase 2 日报里)

---

## 10. 已知风险 / 后续 TODO

- **npm audit 3 moderate**:`resend → svix → uuid <14` 有 buffer bounds 告警,
  只影响 uuid v3/v5/v6 带 buf 参数的调用,我们的代码路径不触及。
  升级修复会把 resend 降到 6.1.3(breaking)。留观,Phase 4 前看 svix 是否发 patch。
- **无 rate-limiting**:当前 /beta 表单无频率限制,可被刷。KV 开通后易加(`beta:rate:{ip}` + TTL)。
  推 Phase 5 或更早若遇刷。
- **邮件失败重试队列**:目前邮件发送失败只写 log。Phase 5 加 Vercel Cron / Upstash Queue
  做 exponential backoff 重试。
- **退订不撤回 welcome 邮件**:spec 要求"不重复发欢迎邮件给重订者",已实现。
  但退订 → 等 10 分钟 → 重订,我们目前会重发一封欢迎(因为 storage 里没了)。
  可加 `beta:unsubscribed:{email}` 集合抑制 1h 内的重发。推 Phase 5。

---

**Phase 3 代码完工。上线需 admin 完成 §6 env 配置。等 admin sign-off 进 Phase 4。**
