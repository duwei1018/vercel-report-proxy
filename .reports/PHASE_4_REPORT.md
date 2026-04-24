# Phase 4 完工报告 · siwuya.org v2

**完成日期**: 2026-04-24
**执行者**: Claude Code (Windows Session B,接力 Phase 0+1+2+3 同 repo)
**实际工时**: ~50 min(spec 预估 3-4h)
**状态**: ✅ /brief 存档页 + /brief/[slug] 详情 + 公司名 autoLink + send-brief CLI 全 ship。本机 typecheck + build 9/9 routes + dev smoke 全过,包括真实 404 状态码 & autoLink 正确插入。

---

## 1. Phase 4 范围(spec L653-886)

> 实现 Weekly Brief 的展示(`/brief` 存档 + `/brief/[slug]` 详情)和发送(`scripts/send-brief.ts` CLI)两个子功能。

---

## 2. 完成的事

### 2.1 Brief 库(`src/lib/briefs/`)

```
types.ts         31 行  Brief / BriefSummary / BriefFrontmatter / LoadBriefResult
loader.ts       155 行  gray-matter + remark/remark-html + react cache + 2 公共 API
autoLink.ts      98 行  HTML-aware company 名首次出现替换成锚链接
emailTemplate.ts 82 行  inline-CSS HTML 邮件模板 + {UNSUBSCRIBE_URL} 占位符
index.ts          7 行  barrel exports
```

**Loader 公共 API**:
- `listAllBriefs()` — 扫目录 + 过滤 non-brief 文件 + 按日期倒序
- `loadBriefBySlug(slug)` — 读单份 md + 解析 + 渲染 HTML + autoLink enrich

**文件过滤策略**:
- 必须匹配 `/^\d{4}-\d{2}-.*\.md$/i` — 自动跳过 README.md / draft 草稿 / 非 .md
- 依然接受 `_draft-*` / `.local-*` 作为额外显式跳过信号
- schema 不合规的 md 写 server log 并跳过,不 crash 整个列表

### 2.2 Auto-link 策略(`autoLink.ts`)

spec L724-739 给的简单 regex 方案有隐患:直接替换会命中 HTML 属性值里的公司名(如 `<img alt="小米">`)以及已有锚内部的公司名(嵌套 `<a>` 违法)。

改用**HTML 分段遍历**:
1. 把 HTML 切成 `{kind: "tag" | "text"}` 序列
2. 只在 text 段做替换
3. 维护 `insideAnchor` 状态,anchor 内的 text 跳过
4. 每家公司最多替换一次(`done: Set<slug>`),防链接噪音
5. 所有 company summary 来自 `listAllCompanies({ includeExamples: true })`,包含 EXAMPLE

### 2.3 路由(`src/app/brief/`)

```
page.tsx              66 行  存档列表:按日期倒序,卡片式,含空态与样稿提示
[slug]/page.tsx       62 行  详情:eyebrow + title + summary + author + 正文 + CTA
[slug]/not-found.tsx  24 行  友好 404,引导回存档 + beta
```

详情页用 `dangerouslySetInnerHTML` 注入 `brief.contentHtml` — 来源是 admin-authored markdown + remark-html 默认 escape,XSS 风险 = admin 对自己 repo 的控制权。

### 2.4 发送 CLI(`scripts/send-brief.ts`,248 行)

**安全设计**:
- **默认 dry-run**,收件人只有 `TEST_EMAIL`(env,默认 `duwei@siwuya.org`)
- **`--live` 必须显式加**,否则不会真 fan-out
- **`--live` 模式必填 env**:`RESEND_API_KEY` + `KV_REST_API_URL` + `KV_REST_API_TOKEN` + `BETA_UNSUBSCRIBE_SECRET`,缺一 `process.exit(1)` 立即报错
- **KV 不可达**(env 到位但服务挂)时 `exit(4)`,绝不静默 fallback 到 console
- **订阅者 0 人**时 `exit(5)`,不做无意义 dry-run

**功能**:
- 加载 brief 并 build HTML 邮件(inline CSS,600px 宽)
- 每位订阅者生成独立的 HMAC 退订 URL → 替换 `{UNSUBSCRIBE_URL}` 占位符
- 10 封/批 + 1s sleep 避免 Resend free tier rate limit(2 req/s)
- 写完整发送 log 到 `src/content/send-logs/<slug>.log.json`

**CLI 语法**:
```bash
npm run send-brief -- <slug>                       # dry-run → TEST_EMAIL
npm run send-brief -- --live <slug>                # live → 全部 KV 订阅者
npm run send-brief -- <slug> --test foo@bar.com    # 覆盖 dry-run 收件人
npm run send-brief -- --help                       # 参数+env 说明
```

### 2.5 邮件模板(`emailTemplate.ts`)

- **inline CSS 全部**,`<head>` 里 `<style>` 会被 Gmail / 163 / QQ / 企业邮箱剥离
- **max-width 600px**,超过 600 的屏幕邮件客户端会居中留边
- **衬线字体 fallback 链**:`Noto Serif SC` → `Source Han Serif SC` → `Georgia` → `serif`,系统没装中文衬线也有兜底
- **`/company/{slug}` 相对链接自动改写成绝对**(rewriteCompanyLinks),邮件客户端打不开相对 URL
- **底部退订 placeholder** `{UNSUBSCRIBE_URL}` — 由 `scripts/send-brief.ts` 按用户替换(CLI 签 HMAC → URL → replace)

### 2.6 样例 Brief(`src/content/briefs/2026-04-24-issue-000-preview.md`)

- `issue_number: 0` 标记为"样稿",正式期从 1 开始
- 覆盖 `example-company`(Phase 2 的 EXAMPLE 档案)
- 展示 Brief 的三段式结构:事件 → 背景 → 追踪
- 正文中的"示例"两字会被 autoLink 替换成 `/company/example-company` 链接(实测 ✓)

### 2.7 其它

- `src/content/briefs/README.md` — admin 新增 brief 的 frontmatter + 命名规范 + 发送命令文档
- `src/app/page.tsx` — `/brief` 的 `coming-soon` chip 移除(最后一个)。首页 3 个路由链接全部 live
- `src/app/globals.css` — 新增 ~180 行 `.brief-*` 样式:列表卡片 + 详情排版 + 衬线 h2/blockquote/code/table + mobile 480px 调整
- `src/lib/beta/storage.ts` — 新增 `listAllSubscribers(): Subscriber[] | null`(null=KV 未配),send-brief 真 fan-out 的数据源

---

## 3. 验证

### 3.1 typecheck + build

```
$ npm run typecheck              ✅ 无输出
$ npm run build                  ✅ Compiled in 1.7s, 9/9 pages

Route (app)                          Size      First Load JS
┌ ○ /                                175 B     106 kB
├ ○ /_not-found                      993 B     103 kB
├ ƒ /[...slug]                       127 B     102 kB
├ ○ /beta                          1.29 kB     107 kB
├ ○ /brief                           175 B     106 kB    ← 新,prerender
├ ƒ /brief/[slug]                    175 B     106 kB    ← 新,SSR
├ ○ /companies                       591 B     106 kB
├ ƒ /company/[slug]                  162 B     106 kB
├ ○ /disclaimer                      175 B     106 kB
└ ƒ /unsubscribe                     971 B     107 kB
```

### 3.2 dev smoke(4 项)

```
GET /brief                                  HTTP 200 · 35 KB
  ✓ "Weekly Brief 存档" + "第 0 期" + "样稿" + "思无崖 Weekly Brief · 第 0 期" + "涵盖"

GET /brief/2026-04-24-issue-000-preview     HTTP 200 · 48 KB
  ✓ brief-eyebrow / brief-body / brief-company-link 类渲染
  ✓ "样稿" + "订阅 Weekly Brief" CTA
  ✓ autoLink: <a href="/company/example-company" class="brief-company-link">示例 (1 次首现,不重复)
  ✓ remark-html 渲染:2 个 <blockquote> + 4 个 <h2> + 1 个 <hr>

GET /brief/unknown                          HTTP 404 · 21 KB   ← 真 404(区别于 /company/[slug] 的 streaming 200)
  ✓ "没找到这期 Brief" not-found.tsx body

GET /                                       HTTP 200
  ✓ 3 个路由链接 /companies /brief /beta 全部无 coming-soon chip
```

### 3.3 CLI 未做真实 send 测试

send-brief.ts 的两条路径均需真实 env:
- dry-run 需 `RESEND_API_KEY`
- --live 需 `RESEND_API_KEY` + KV 4 个 + `BETA_UNSUBSCRIBE_SECRET`

当前两项都没配,无法端到端跑。代码路径已通过 typecheck,逻辑靠 --help + dry-run 的 stderr 行为确认:缺 env 时立即 exit(1) + 明确错误信息。

**admin 配完 env 后真实测试路径**(详见 admin 接管清单):
```bash
# on a dev box with envs:
export RESEND_API_KEY=re_xxx
export TEST_EMAIL=duwei@siwuya.org
npm run send-brief -- 2026-04-24-issue-000-preview
# 预期:[DRY RUN] 思无崖 Weekly Brief · 第 0 期(样稿) 发到 duwei@siwuya.org

# 等 KV + secret 配完:
export KV_REST_API_URL=...
export KV_REST_API_TOKEN=...
export BETA_UNSUBSCRIBE_SECRET=...
npm run send-brief -- --live 2026-05-15-issue-001
```

---

## 4. 关键设计选择

### 4.1 为什么 autoLink 在 HTML 层而不在 Markdown 层?

Markdown 层替换需要解析 markdown AST,风险是替换掉代码块 / 表格单元格里的字面字符串。
在渲染后的 HTML 上做分段遍历可以精确识别 `<code>` / `<a>` 等"禁区",代码更简单也更鲁棒。

代价:轻微性能成本(每 brief 一次 HTML 切片),在几百份 brief 的量级完全不是瓶颈。

### 4.2 为什么每家公司只替换首次出现?

spec L734 建议"第一次出现",我采用这个策略的理由:
- 阅读体验:同一公司名连续三段都蓝色链接就是视觉噪声
- 避免 anchor-spam SEO penalty
- admin 仍可在后续段落手写 `[小米](/company/xiaomi)` 显式链接

### 4.3 为什么 send CLI 默认 dry-run?

价值投资研究场合,"误发 100 封未校对的邮件"对订阅者信任是不可逆的打击。
**加一个字符 `--live` 才真发**是职业纪律 ——Mailchimp 也是这种范式。
dry-run 成本低,admin 每期发前顺手跑一遍看截图,远超事后 apology 邮件的代价。

### 4.4 为什么用 react `cache()` 而不是 Next.js `unstable_cache`?

跟 Phase 1 同:brief 源文件在 build/deploy 时是快照,不会运行时变化。
react `cache()` 只在同一 request 周期内 memo,不需要 cross-request 或 revalidation。
零 Next.js-specific magic,测试友好。

### 4.5 为什么 email template 不用 MJML 或 react-email?

这两个库都是 30MB+ 依赖,并且会反过来要求 admin 学新 syntax 才能改模板。
手写 inline CSS 的 76 行 HTML 模板,admin 可以直接在 `emailTemplate.ts` 调色值 +
排版,跟调整 siwuya.org 本体样式是同一种认知负担。

如果未来 brief 要嵌复杂组件(图表 / 交互 chip),再引 react-email 不迟。

---

## 5. 与 spec 的偏离

| 项 | spec | 改 | 理由 |
|---|---|---|---|
| send CLI 安全栏 | spec 没强制 `--live` 显式标记 | 默认 dry-run,`--live` 必填 | 职业纪律,防误发 |
| 缺 env 行为 | spec 没说 | --live 缺 env 立即 exit(1),绝不 fall back | send 是不可逆副作用,绝不能静默降级 |
| autoLink 实现 | 简单 regex | HTML-aware 分段 + Set 去重 | 规避属性/嵌套 anchor 误命中 |
| brief 文件过滤 | 仅排除 `_` / `.` 前缀 | 必须 YYYY-MM- 前缀 | 避免 README.md 被误识别为 brief 触发 warning |
| 首期 Brief 内容 | spec L884 要求 @siwuya 写 | 只产出 issue_0 样稿占位 | 内容由 admin 写,Phase 4 shipped 的是 infrastructure |
| 邮件 rate limit | spec L798 "10 封/1s" | 采用 | 与 Resend free tier 2 req/s 对齐 |

---

## 6. 红线遵守自查

- ✅ send-brief 默认 dry-run,群发唯一触发 = `--live` 显式标记
- ✅ dry-run 默认收件人 `TEST_EMAIL`,fallback `duwei@siwuya.org`(合规)
- ✅ email template 底部必含 `{UNSUBSCRIBE_URL}` 占位符,CLI 必须替换才能发
- ✅ brief 正文文案由 admin 作者,Claude 只产出 infrastructure + 样稿
- ✅ 未引 react-email / MJML / zod
- ✅ 未硬绑 Resend — `sendOne` 可以换 SES/Mailgun 实现
- ✅ 未碰 siwuya-data submodule
- ✅ 未碰 Vercel 老项目

---

## 7. Admin 接管事项(真上线需做)

**如果 Phase 3 的三项 env 已经配完**(`RESEND_API_KEY` / KV / `BETA_UNSUBSCRIBE_SECRET`),
Phase 4 不需要额外 admin 配置。首期 Brief 发送流程:

```bash
# 1. admin 写好首期 Brief 到 src/content/briefs/2026-05-15-issue-001.md
#    frontmatter 必填 4 字段 + 正文
git add src/content/briefs/2026-05-15-issue-001.md && git commit && git push
# → Vercel 自动构建,/brief/2026-05-15-issue-001 在几分钟内可访问

# 2. dry-run 到 admin 邮箱
npm run send-brief -- 2026-05-15-issue-001
# 检查邮件在 Gmail / 163 / QQ 渲染正常

# 3. live fan-out
npm run send-brief -- --live 2026-05-15-issue-001
# src/content/send-logs/2026-05-15-issue-001.log.json 记录成功/失败明细

# 4. admin 验证
#    - 查 log,看 failed 数量,如失败 > 5% 追查原因
#    - 自己邮箱收到后点底部退订链接,确认退订流 E2E 可用
```

Phase 4 发送建议在 admin 本机跑 CLI,不走 Vercel。理由:
- 生产 Vercel 部署不适合做长时间 fan-out(serverless 有 60s 超时)
- admin 本机有完整 env + 可观察的终端输出
- 紧急中断(Ctrl-C)比 CI 友好

---

## 8. 工件

新增(11 文件):
- `.reports/PHASE_4_REPORT.md`(本文件)
- `src/lib/briefs/{types,loader,autoLink,emailTemplate,index}.ts`(5)
- `src/app/brief/page.tsx`(1)
- `src/app/brief/[slug]/{page,not-found}.tsx`(2)
- `src/content/briefs/2026-04-24-issue-000-preview.md`(样稿)
- `src/content/briefs/README.md`(admin 贡献指南)
- `scripts/send-brief.ts`(CLI)

修改(4):
- `src/app/page.tsx`(去 /brief coming-soon chip)
- `src/app/globals.css`(+~180 行 brief 样式)
- `src/lib/beta/storage.ts`(+`listAllSubscribers` + `smembers` 到 KVClient 接口)
- `src/lib/beta/index.ts`(export `listAllSubscribers`)
- `package.json`(+ gray-matter / remark / remark-html + `send-brief` script)
- `package-lock.json`

---

## 9. v2 范围收尾

Phase 4 结束 = **v2 代码全部 shipped**。剩余全部是**数据层面**的事:

- admin 配 3 项 env(覆盖 Phase 3 的 KV + Resend + secret)
- admin 写首期 Weekly Brief(2026-05-15)
- admin dry-run 验收 + live fan-out
- 可选:Resend 验证 siwuya.org 域名(切 brief@siwuya.org 发件人)

所有这些工作不需要再写代码。详见同 session 产出的**统一接管清单**:
`D:/SynologyDrive/行业研究/info-collector output/工作日志/2026-04-24_思无崖v2_admin接管清单.md`

---

**Phase 4 收工。v2 代码 100% ship。等 admin 配 env + 写首期 Brief 即可上线。**
