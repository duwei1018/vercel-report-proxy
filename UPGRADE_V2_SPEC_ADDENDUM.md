# UPGRADE_V2_SPEC · Addendum 1 · Phase 0 + 范围确认

**文档版本**: 1.0
**创建日期**: 2026-04-24
**创建者**: Claude Code (Windows Session B)
**关联文档**: `MASTER_PLAN.md` / `UPGRADE_V2_SPEC.md` / `SIWUYA_DATA_BOOTSTRAP.md`
**适用对象**: Claude Code Session B(主站升级)

---

## 这份文档的位置

UPGRADE_V2_SPEC.md 是 2026-04-24 上午定稿的执行规范。当晚 @siwuya 在第一次会话里追加了三个问题:

1. 是否要做"搜索框→公司主页"
2. 公司主页设计基线
3. 是否使用现有框架、需要哪些升级

经一轮工程评估后产生本 addendum,作为 spec 的**补丁层**(不修改原 spec,但优先级更高)。

---

## 1. 决策记录

### Q1 — 搜索功能

**决策:按 spec 原计划(B 方案)**

- v2 **不做**全站搜索框
- `/companies` 列表页内提供纯前端按 `name_zh` + `ticker` 过滤(spec L408 原文)
- 任何形式的全站搜索(包括 Cmd+K 直达框、按公司名/行业搜索)**推 v3**

### Q2 — 公司主页设计基线

**决策:按 spec L431-457 原文设计语言**

- 不照搬 info-collector 日报/收盘报告样式(卡片式 / 红绿涨跌 / Lede+Metrics 都不要)
- 公司主页是 **standalone 价值投资档案页**,新设计:
  - 米白底 `#FAF8F3` + 温棕正文 `#3E2F24`
  - Noto Serif SC / Source Han Serif SC(中文)+ Fraunces / Lora(英文)
  - 720px 单栏单列,18px / 行高 1.8
  - 气质:纽约书评 / Stratechery / Plough 衬线风格
- 不做"叙事头图"(原本我建议加,但用户未授权,推 v3)

### Q3 — 框架升级清单 + 必须性

**决策:必做项全做,可选项推 v3**

工程现状真相(spec L27-28 有误认知,纠正如下):

> 当前 `vercel-report-proxy/` 不是 Next.js 应用。它只有:
> - `package.json`(5 行,零依赖,只有 `name` + `type: module`)
> - `api/proxy.js`(40 行反代函数,转发所有请求到 `report.siwuya.org`)
> - `public/MP_verify_hsjYs8mSvaUfyI1z.txt`(微信服务号验证文件)
> - `vercel.json`(rewrite 规则)
>
> spec 说"是一次扩展不是重写、现有代码保留不动"在事实层面有误。v2 在工程上**等于从零起一个 Next.js 项目**,然后把 40 行反代搬进新骨架的 fallback 路径。

升级项分级如下:

| # | 项 | 必须? | 长期价值 | 决策 |
|---|---|---|---|---|
| 1 | Next.js 15 + App Router 骨架 | **必须** | 高 | **做** Phase 0 |
| 2 | TypeScript | **必须** | 高 | **做** Phase 0 |
| 3 | Git submodule 引 siwuya-data | **必须** | 高 | **做** Phase 1 |
| 4 | 保留微信验证 + 反代 fallback | **必须** | 关键 | **做** Phase 0 |
| 5 | js-yaml + ajv 数据层 | **必须** | 中 | **做** Phase 1 |
| 6 | Vercel KV(订阅者) | Phase 3 才用 | 中 | **做** Phase 3 |
| 7 | Resend(邮件) | Phase 4 才用 | 中 | **做** Phase 4 |
| 8 | Cmd+K 全站搜索 | 可选 | 高 | **推 v3** |
| 9 | 公司主页"叙事头图" | 可选 | 中 | **推 v3** |
| 10 | i18n 中英切换 | 可选 | 中 | **推 v3** |
| 11 | 图表(承诺时间线 / 股价小图) | 可选 | 中-高 | **推 v3** |
| 12 | MDX 支持(Brief 嵌组件) | 可选 | 中 | **推 v3**,Brief 用纯 Markdown |

### 新增工作流约定

- **每个 Phase 完成给一次工程反馈**(原 spec 已要求,在此再次确认)
- 反馈包含:工时实际 vs 预估、产出列表、依赖列表、Vercel preview URL、风险/未决事项、下一 Phase 启动前提
- Phase 完成后 **等待 admin 拍板** 再启下一个;如某 Phase 工程上不切实际,给清楚的"做不了的原因 + v3 接管建议",**不强行通过**

---

## 2. 新增 Phase 0(spec 漏写)

### 目标

把现有 `vercel-report-proxy/`(40 行反代函数)改造为 Next.js 15 + App Router + TypeScript 应用,**保留**微信验证 + report.siwuya.org 反代 fallback,为 Phase 1-4 做骨架准备。

### 前置条件

无。Phase 0 不依赖 siwuya-data 仓库,可立即开始。

### 任务清单

#### 0.1 Next.js 15 骨架

```bash
# 在 vercel-report-proxy/ 根目录
npm install next@latest react@latest react-dom@latest typescript @types/node @types/react
```

新建结构:
```
vercel-report-proxy/
├── package.json              # 升级:加 next/react/typescript
├── tsconfig.json             # 新建
├── next.config.ts            # 新建
├── .eslintrc.json            # 新建(Next.js 默认)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 根布局(米白底 + 衬线字体)
│   │   ├── page.tsx          # 首页占位(链 /companies /beta /brief)
│   │   ├── disclaimer/
│   │   │   └── page.tsx      # 共用免责声明
│   │   └── globals.css       # 设计 token(色值/字体/排版)
│   └── lib/
│       └── proxy.ts          # 反代逻辑(从 api/proxy.js 迁移并 typed)
├── api/                      # 旧目录,Phase 0 期间保留兜底
│   └── proxy.js
├── public/
│   └── MP_verify_hsjYs8mSvaUfyI1z.txt  # 不动
└── vercel.json               # 改写:微信验证 > Next.js 路由 > 反代 fallback
```

#### 0.2 vercel.json 路由优先级

```json
{
  "rewrites": [
    { "source": "/MP_verify_hsjYs8mSvaUfyI1z.txt", "destination": "/MP_verify_hsjYs8mSvaUfyI1z.txt" }
  ]
}
```

Next.js 应用的 `/`、`/disclaimer`、`/companies`、`/company/*`、`/beta`、`/brief/*` 由 App Router 接管。

未匹配的 path 通过 Next.js middleware 或 catch-all `[...slug]/page.tsx` 反代到 `https://report.siwuya.org/<path>`,保持现有日报/收盘报告分发 URL 不变。

#### 0.3 微信验证保护

`public/MP_verify_hsjYs8mSvaUfyI1z.txt` 必须始终能被原样取到,**不能被 Next.js 路由吞掉**。Vercel 默认会优先服务 `public/` 静态文件,但要在 preview 部署上**实测一次**:

```bash
curl https://<preview-url>/MP_verify_hsjYs8mSvaUfyI1z.txt
# 期望返回:hsjYs8mSvaUfyI1z
```

#### 0.4 设计 token 初始化

在 `src/app/globals.css` 落 spec L431-457 的设计语言:

```css
:root {
  --bg: #FAF8F3;
  --text: #3E2F24;
  --link: #7A5C42;
  --link-hover: #5C4332;
  --accent: #C9513B;
  --max-width: 720px;
  --font-zh: 'Noto Serif SC', 'Source Han Serif SC', serif;
  --font-en: 'Fraunces', 'Lora', Georgia, serif;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-zh);
  font-size: 18px;
  line-height: 1.8;
}

main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 40px 20px;
}
```

字体通过 `next/font` 加载,不引外部 CDN(spec L443-444)。

#### 0.5 占位页内容

**`src/app/page.tsx`**(首页):
```
思无崖 siwuya
一个基于连续追踪的价值投资研究合作者

→ 浏览公司档案 (/companies) [v2 Phase 2 上线]
→ 历期 Weekly Brief (/brief) [v2 Phase 4 上线]
→ 订阅 Beta (/beta) [v2 Phase 3 上线]

[Disclaimer footer]
```

**`src/app/disclaimer/page.tsx`**(免责声明):
- 引用 siwuya-data/DISCLAIMER.md 内容(Phase 1 之前先手写一份骨架)
- 主站统一调用,公司页/Brief 页 footer 都链到这里

#### 0.6 验收标准

- [ ] `npm run dev` 本地启动无报错
- [ ] `npm run build` 通过
- [ ] `tsc --noEmit` 通过
- [ ] 微信验证文件本地 + preview 都能取到
- [ ] 占位首页渲染、链接正常
- [ ] `/disclaimer` 渲染
- [ ] 未匹配 path(如 `/daily/2026-04-23`)反代到 report.siwuya.org 正常返回原日报
- [ ] Vercel preview 部署成功,URL 提交给 admin

#### 0.7 工时预估

2-3 小时(含 Vercel preview 验证)。

### Phase 0 → Phase 1 的依赖

Phase 1 启动**必须满足**:

1. ✅ Phase 0 验收全部通过
2. ✅ admin 拍板 GitHub 仓库归属(MASTER_PLAN.md L213)
3. ✅ Claude Code Session A 已完成 siwuya-data 至 Stage 2(schema + 至少 1 份有效 YAML)

任一未达成 → Phase 1 暂停,Phase 0 完成后写 handoff 等待。

---

## 3. 推 v3 的项目清单(本次明确不做)

| 功能 | 推迟原因 | 重启条件 |
|---|---|---|
| Cmd+K 全站搜索 | 用户拍板按 spec 原计划走 | 公司档案数 ≥ 30 时优先级最高 |
| 公司主页"叙事头图"(承诺时间线视觉化) | 用户未授权 | 与图表(#11)一并做 |
| i18n 中英双语 | UCLA 学员当面沟通可补 | 海外订阅渠道(Telegram)反馈强烈时 |
| 图表(承诺时间线 + 股价小图) | 数据源对接复杂、5/15 deadline 紧 | Phase 4 完成、首期 Brief 发完后 |
| MDX 支持(Brief 嵌组件) | 纯 Markdown 已够 v2 | 当 Brief 需要嵌动态承诺卡时 |
| 用户登录 / Stance / 评论 / 支付 | spec L29 明确禁止 | v3+ 会员体系上线时 |

---

## 4. v2 最终范围(确认锁定)

```
Phase 0: Next.js 骨架化 + 反代 fallback           [本 addendum 新增,2-3h]
Phase 1: 数据层 + siwuya-data submodule           [spec 原文,4-6h]
Phase 2: 公司页 + /companies 列表(含前端过滤)     [spec 原文,4-6h]
Phase 3: /beta + 邮箱收集 + Resend                [spec 原文,2-3h]
Phase 4: /brief 存档 + 邮件 CLI                    [spec 原文,3-4h]
─────────────────────────────────────────────
联调 + 生产部署                                     [spec 原文,2-4h]
首发 deadline: 2026-05-15 19:00 Weekly Brief 第 1 期
```

总工时:**17-26 小时**(spec 原 15-23h + Phase 0 新增 2-3h)。

UCLA 出差(5/5-5/8)期间暂停。

---

## 5. 跨文档优先级

如本 addendum 与 UPGRADE_V2_SPEC.md 冲突,以本 addendum 为准。

后续如再有澄清/扩展,新建 `UPGRADE_V2_SPEC_ADDENDUM_<n>.md`,不改本文件、不改原 spec。

---

**addendum 结束。**

下一步动作:Claude Code Session B 开始执行 Phase 0,完成后写 `.reports/PHASE_0_REPORT.md` 并向 @siwuya 反馈。
