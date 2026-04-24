# siwuya.org 主站 v2 升级 · Claude Code 执行规范

**文档版本**: 1.0
**创建日期**: 2026-04-24
**目标完成日期**: 2026-05-14(首发前一天)
**执行者**: Claude Code (Session B)
**产品负责人**: @siwuya
**当前代码库**: `vercel-report-proxy`(现有 Next.js on Vercel 项目)

---

## 本文档意图(Claude Code 必读)

### 升级目标

把现有的 `vercel-report-proxy`(一个简单的报告代理站)升级为 **siwuya.org v2** —— 一个承载价值投资社区订阅服务的主站。

**v2 的核心形态**:
- 3 个可分享的**公司页**(小米、拼多多、腾讯)
- **Beta 订阅 landing page**(收集邮箱)
- **Weekly Brief 存档页**(展示历期周报)
- 一个**邮件发送 CLI**(把周报发给订阅用户)

**v2 不包含**:用户登录、Stance(表态)系统、支付、评论、实时 AI 聊天、搜索框。

### 这是一次"扩展",不是"重写"

现有的 `vercel-report-proxy` 代码**保留不动**。本次升级是在它之上**新增路由和模块**。现有的报告代理功能继续工作。

### 两个仓库的关系

本次升级依赖另一个开源仓库 `siwuya-data`。那个仓库由 Claude Code Session A 独立完成。本仓库通过 Git submodule 引用它:

```
vercel-report-proxy/
├── src/
│   ├── app/                      # Next.js 路由(既有 + 新增)
│   ├── lib/                      # 既有库 + 新增模块
│   └── content/
│       ├── siwuya-data/          # ← Git submodule,只读引用开源仓库
│       └── briefs/               # ← 本仓库内,Weekly Brief 的 Markdown 存档
```

**关键纪律**:**本仓库只读 siwuya-data,永远不写入**。开源仓库的修改走它自己的 PR 流程,不走主站。

---

## 核心约束(MUST READ)

### ✅ 必须做的

- 所有新代码使用 TypeScript
- 所有用户可见文字中文默认,关键页面提供英文切换(可选)
- 移动端 375px 宽度可用(学员会用手机看)
- Lighthouse 性能分数 > 85
- 所有公司页和 Brief 页底部带 Disclaimer
- 所有 commit 遵循 Conventional Commits

### ❌ 不能做的

- 不要重写现有代码,只新增
- 不要引入数据库(本阶段用文件系统 + Vercel KV 或 Upstash)
- 不要引入以下重型依赖:Prisma、Drizzle、tRPC、Auth.js、NextAuth、Stripe
- 不要做用户登录功能
- 不要启用 v1 那个"验证"按钮的搜索框(明确不要)
- 不要在本次升级中集成 AI 聊天或动态 LLM 功能
- 不要修改 siwuya-data submodule 内容

---

## 阶段划分

```
Phase 1: 数据层与公司档案加载(预估 4-6 小时)
Phase 2: 公司页与路由(预估 4-6 小时)
Phase 3: Beta landing page 与邮箱收集(预估 2-3 小时)
Phase 4: Weekly Brief 存档页与邮件 CLI(预估 3-4 小时)
```

每个 Phase 结束时必须:
1. `git commit` 符合规范
2. 写 `.reports/PHASE_X_REPORT.md`
3. 向 @siwuya 报告并**等待确认后再进下一 Phase**

---

## Phase 1: 数据层与公司档案加载

### 前置条件
`siwuya-data` 仓库已完成 Stage 2(schema + 至少一份有效 YAML)。否则本 Phase 无法开始。

### 目标
建立从 `siwuya-data` 读取公司档案 YAML 的数据层,提供类型安全的 API 给页面层使用。

### 任务清单

#### 1.1 引入 siwuya-data submodule

```bash
git submodule add https://github.com/<user>/siwuya-data.git src/content/siwuya-data
```

**注意**:如果 siwuya-data 仓库尚未 public,先用 private submodule 配置(需在 Vercel 设置 GitHub App 授权访问)。

如果 submodule 方式在 Vercel 部署时遇到问题,**降级方案**:
- 改为手动 copy 关键文件到 `src/content/siwuya-data-snapshot/`
- 写一个 `scripts/sync-siwuya-data.sh` 用于未来手动同步
- 在部署文档中记录这个降级

Submodule 尝试失败时立即向 @siwuya 报告,不要自己纠结。

#### 1.2 新增目录结构

```
src/
├── lib/
│   └── siwuya-data/              # 新增
│       ├── loader.ts              # 读取 YAML + schema 校验
│       ├── types.ts               # 从 schema 派生的 TypeScript 类型
│       ├── cache.ts               # React cache / Next.js cache wrapper
│       └── index.ts               # 统一导出
│
└── content/
    ├── siwuya-data/               # Git submodule
    └── briefs/                    # Phase 4 用
```

#### 1.3 依赖安装

```bash
npm install js-yaml ajv
npm install -D @types/js-yaml
```

**不要安装**:zod、class-validator、io-ts。用 ajv 做运行时校验,TypeScript 做编译时类型检查,不需要第三方类型库。

#### 1.4 types.ts 手写 TypeScript 类型

根据 siwuya-data 的 `companies/_schema/company.schema.json` 手写对应类型。

推荐做法:先手写,等 Phase 1 完成后再考虑用 `json-schema-to-typescript` 自动生成(作为 CI 步骤,不在 runtime 执行)。

初始手写版本:

```typescript
export interface CompanyArchive {
  meta: {
    schema_version: string;
    last_reviewed: string;
    reviewer: string;
    data_freshness_note: string;
  };
  identity: {
    primary_ticker: string;
    aliases: string[];
    name_zh: string;
    name_zh_full?: string;
    name_en: string;
    slug: string;
    exchange: string;
    listing_date: string;
    fiscal_year_end: string;
    reporting_currency: string;
    hq_country: string;
    hq_city: string;
    website: string;
    ir_website?: string;
  };
  classification: {
    gics_sector: string;
    gics_industry_group: string;
    primary_business_zh: string;
    business_one_liner_zh: string;
    business_one_liner_en: string;
  };
  segments: Array<{
    name: string;
    revenue_share_fy2024?: number;
    margin_profile?: string;
    note?: string;
  }>;
  business_model: {
    revenue_engines: string[];
    cost_structure_notes: string;
    unit_economics_highlights: string[];
  };
  moat: {
    assessment: string;
    types: Array<{
      type: string;
      strength: string;
      reasoning_zh: string;
    }>;
    pat_dorsey_framework: Record<string, string>;
  };
  management: {
    chairman_ceo: {
      name_zh: string;
      name_en: string;
      tenure_since: string;
      background_brief: string;
    };
    key_executives: Array<{
      name_zh: string;
      role: string;
    }>;
    governance_notes: string;
  };
  integrity_tracking: {
    tracked_promises: Array<{
      id: string;
      promise_zh: string;
      source: string;
      verification_type: string;
    }>;
    scoring_data_location: string;
  };
  key_risks: Array<{
    category: string;
    risk_zh: string;
  }>;
  further_reading: {
    primary_sources: Array<{ title: string; url: string }>;
    third_party_research: Array<{ title: string; url: string; note?: string }>;
  };
  disclaimer: string;
}

export interface CompanySummary {
  slug: string;
  name_zh: string;
  ticker: string;
  sector: string;
  one_liner_zh: string;
  market: 'us' | 'hk' | 'cn';
}
```

#### 1.5 loader.ts 实现要求

```typescript
// src/lib/siwuya-data/loader.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import { cache } from 'react';
import type { CompanyArchive, CompanySummary } from './types';

const DATA_ROOT = path.join(process.cwd(), 'src/content/siwuya-data');

// 用 React cache 确保同一请求周期内不重复读盘
export const loadCompanyBySlug = cache(
  async (slug: string): Promise<CompanyArchive | null> => {
    // 1. 遍历 companies/{us,hk,cn}/*.yaml
    // 2. 找到 identity.slug === slug 的那份
    // 3. 用 ajv 校验 schema
    // 4. 返回 CompanyArchive 或 null
    // 5. schema 校验失败时记录 error log 但返回 null(不 crash 页面)
  }
);

export const listAllCompanies = cache(
  async (): Promise<CompanySummary[]> => {
    // 遍历所有市场目录,返回简略清单
  }
);

export const loadCompanyByTicker = cache(
  async (ticker: string): Promise<CompanyArchive | null> => {
    // 支持 aliases 查询
  }
);
```

**关键要求**:
- 使用 `react cache()`(Next.js 15 的 React 19 原生 cache)
- YAML 解析失败时必须给出明确错误(文件路径 + 行号)
- Schema 校验失败必须记录 log,不要 silently fail

#### 1.6 校验工具

`src/lib/siwuya-data/validator.ts`:包装 ajv,提供 `validateCompany(yaml: unknown): ValidationResult`。

同时写一个开发时脚本 `scripts/validate-all-companies.ts`,可以在 `npm run validate:companies` 跑。

#### 1.7 单元测试

```typescript
// src/lib/siwuya-data/__tests__/loader.test.ts

describe('siwuya-data loader', () => {
  it('loads Xiaomi by slug', async () => {
    const company = await loadCompanyBySlug('xiaomi');
    expect(company?.identity.primary_ticker).toBe('01810.HK');
  });
  
  it('returns null for unknown slug', async () => {
    expect(await loadCompanyBySlug('non-existent')).toBeNull();
  });
  
  it('supports ticker alias lookup', async () => {
    const company = await loadCompanyByTicker('1810.HK');
    expect(company?.identity.slug).toBe('xiaomi');
  });
  
  it('lists all companies', async () => {
    const companies = await listAllCompanies();
    expect(companies.length).toBeGreaterThan(0);
    expect(companies[0]).toHaveProperty('slug');
  });
});
```

使用 Vitest 或 Jest(根据项目既有测试框架)。

#### 1.8 Phase 1 验收

向 @siwuya 报告并演示:
- [ ] `npm run dev` 启动无报错
- [ ] Submodule 成功引入(或降级方案已实施并文档化)
- [ ] `listAllCompanies()` 能返回所有已提交的公司
- [ ] `loadCompanyBySlug('xiaomi')` 能返回完整结构
- [ ] 单元测试通过
- [ ] 类型定义完整,`tsc --noEmit` 通过
- [ ] Vercel 预览部署成功(推到分支,确认 Vercel CI 通过)

**停下来等待 @siwuya 确认后再进 Phase 2。**

---

## Phase 2: 公司页与路由

### 目标
实现 `/company/{slug}` 动态路由,展示从 siwuya-data 加载的公司档案。

### 任务清单

#### 2.1 路由结构

```
src/app/
├── (既有的路由保持不变)
├── company/
│   └── [slug]/
│       ├── page.tsx              # 公司主页
│       ├── loading.tsx           # 加载态
│       └── not-found.tsx         # 404 页
├── companies/
│   └── page.tsx                  # 公司列表页
└── beta/                         # Phase 3
```

#### 2.2 公司页组件划分

在 `src/components/company/` 下创建**纯展示**组件(不含状态):

```
CompanyHeader.tsx             # 公司名 + ticker + 行业 + 一句话商业模式
BusinessModelSection.tsx      # 业务模型、分部、收入引擎
MoatSection.tsx               # 护城河评估 + Pat Dorsey 框架
ManagementSection.tsx         # 管理层
IntegrityTrackerStub.tsx      # 承诺追踪(占位,不显示实时评分)
KeyRisksSection.tsx           # 风险清单
FurtherReadingSection.tsx    # 延伸阅读
DisclaimerFooter.tsx          # 免责声明
```

#### 2.3 IntegrityTrackerStub 的关键设计(必读)

这是法律和商业上最敏感的组件。**v2 阶段不显示实时评分**,只显示被追踪的承诺列表。

```tsx
<section>
  <h2>📍 诚信追踪</h2>
  <p>
    我们正在追踪这家公司的 {promises.length} 条管理层承诺。
  </p>
  
  <div className="promises-list">
    {promises.map(p => (
      <PromiseItem key={p.id} promise={p} />
    ))}
  </div>
  
  <div className="subscription-cta">
    <p>⚠️ 实时承诺状态与诚信评分是订阅用户独享内容。</p>
    <a href="/beta">订阅 Weekly Brief 解锁完整追踪 →</a>
  </div>
</section>
```

**战略意义**(Claude Code 不必理解,但必须严格遵守):
- 不显示具体评分 → 法律风险可控
- 引导订阅 → 商业闭环
- 展示被追踪数量和清单 → 证明产品有价值

#### 2.4 `/companies` 列表页

按市场(hk/us/cn)分组展示。每条显示:
- 中文名 + ticker
- 一句话商业模式(business_one_liner_zh)
- 行业
- 最近更新日期
- 链接到详情页

顶部有简单搜索(仅按 name_zh 和 ticker 过滤,无后端,纯前端)。

#### 2.5 首页 `/` 的最小升级

**不要大改首页**。如果现有首页是 proxy 服务的主页,就在其上方或下方添加一个"主站入口"区域:

```
[既有的 report proxy UI]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
思无崖 siwuya
一个基于连续追踪的价值投资研究合作者

• 浏览公司档案 → /companies
• 历期 Weekly Brief → /brief
• 订阅 Beta → /beta
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

或者如果 @siwuya 希望首页全面改为思无崖主页,询问后再做决定,不要擅自大改。

#### 2.6 样式要求

**设计语言**:
- 气质:纽约书评 / Stratechery / Plough 的温和衬线风格
- 不要:彭博式数据密集 / 雪球式炫酷 / 科技初创式渐变

**色彩**:
- 主背景:米白 `#FAF8F3`(或接近的温色)
- 正文:温棕 `#3E2F24`
- 链接:`#7A5C42`,hover 加深
- 强调(警示/红点):`#C9513B`
- 禁用大色块和鲜艳色

**字体**:
- 中文正文:Noto Serif SC / Source Han Serif SC
- 英文/数字:Fraunces 或 Lora
- Fallback:`serif` 系统字体
- 通过 Next.js `next/font` 加载,不要用外部 CDN

**排版**:
- 正文 18px,行高 1.8
- 段落间距 1.2em
- 内容区最大宽度 720px,居中
- 移动端 padding 20px

**移动端**:
- 375px 宽度下完全可用
- 所有触摸目标 ≥ 44px
- 不要横向滚动

#### 2.7 验收标准

- [ ] `http://localhost:3000/company/xiaomi` 完整渲染
- [ ] `http://localhost:3000/company/pinduoduo` 完整渲染
- [ ] `http://localhost:3000/company/tencent` 完整渲染
- [ ] `http://localhost:3000/companies` 列表页正常
- [ ] `/company/unknown` 返回 404 页
- [ ] 移动端 375px 下所有页面可读
- [ ] Lighthouse 性能 > 85、可访问性 > 90
- [ ] 每页底部都有 Disclaimer
- [ ] Vercel 预览部署成功

向 @siwuya 提交 Vercel 预览链接 + 3 个公司页的桌面与移动端截图。

**停下来等待确认后再进 Phase 3。**

---

## Phase 3: Beta landing page 与邮箱收集

### 目标
实现 `/beta` 订阅 landing page,支持邮箱收集。

### 任务清单

#### 3.1 存储方案选型

按优先级尝试:

**首选:Vercel KV**
```bash
# 在 Vercel Dashboard 启用 KV,拷贝环境变量
npm install @vercel/kv
```
存储格式:
- Key: `beta:subscriber:{email}`
- Value: `{ email, subscribedAt, watchlistCompanies?, source? }`
- 辅助集合:`beta:all_subscribers` (Set)

**次选:Upstash Redis**(如果 Vercel KV 不可用)
- 免费 tier 10000 commands/day,足够 beta 期间用

**最后方案**:如果两者都无法快速配置,**暂时存为 JSON 文件**`.data/subscribers.json`(加入 .gitignore),并在文档中明确标记"临时方案,需要在 Phase 4 前升级"。

选定方案后在 PR 描述和 `.reports/PHASE_3_REPORT.md` 里说明。

#### 3.2 邮件发送选型

**使用 Resend**。
```bash
npm install resend
```

环境变量:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`(例如 `brief@siwuya.org`,需先验证域名)

如果域名验证需要时间,可以先用 Resend 提供的默认发件人(onboarding@resend.dev),但 Phase 4 前必须切换到自己的域名。

#### 3.3 `/beta` 页面内容

```tsx
<main>
  {/* Hero */}
  <section className="hero">
    <h1>思无崖 · 价值投资研究合作者</h1>
    <p className="subtitle">
      每周五 19:00 · 你关注公司的本周综述,送到你的邮箱
    </p>
  </section>

  {/* 3 个价值锚 */}
  <section className="value-props">
    <div>
      <h3>连续追踪</h3>
      <p>基于 3 年连续追踪的事件关联与因果图谱</p>
    </div>
    <div>
      <h3>承诺兑现度</h3>
      <p>管理层公开承诺的结构化追踪与兑现记录</p>
    </div>
    <div>
      <h3>社区共识</h3>
      <p>社区判断与市场共识的分歧,时间里被验证</p>
    </div>
  </section>

  {/* 订阅表单 */}
  <SubscribeForm />

  {/* Beta 说明 */}
  <section className="beta-info">
    <ul>
      <li>Beta 期间免费</li>
      <li>正式版 ¥49/月 或 ¥499/年</li>
      <li>Beta 用户享正式版 8 折终身优惠</li>
    </ul>
  </section>

  {/* 底部链接 */}
  <footer>
    <p>
      开源数据仓库:
      <a href="https://github.com/<user>/siwuya-data" target="_blank">
        siwuya-data on GitHub
      </a>
    </p>
    <p><Link href="/disclaimer">免责声明</Link></p>
  </footer>
</main>
```

#### 3.4 SubscribeForm 实现

使用 Next.js Server Actions:

```tsx
// src/app/beta/actions.ts
'use server';

import { z } from 'zod';
// 注意:这里用 zod 做表单校验是合理的,不与我们"不引入 zod"冲突
// 我们不用 zod 做 schema,只用 zod 做表单验证;或者也可以用 ajv 或手写

// 如果不想引入 zod,用原生实现即可

export async function subscribeToBeta(formData: FormData) {
  const email = formData.get('email') as string;
  const watchlist = formData.get('watchlist') as string;
  
  // 1. 校验邮箱格式
  // 2. 写入 KV(或其他存储)
  // 3. 通过 Resend 发送欢迎邮件
  // 4. 返回 { success, message }
}
```

UI 要求:
- 成功状态:显示"已收到,请查收确认邮件"
- 失败状态:友好提示(重复邮箱、格式错误等)
- 提交中:按钮 disabled + loading 状态

#### 3.5 欢迎邮件模板

发送内容:

```
主题:思无崖 Beta · 欢迎加入

{如果用户填了名字就用名字,否则用 "朋友"}你好:

感谢你订阅思无崖 Beta。

下一期 Weekly Brief 将于 [下一个周五的日期] 19:00 发送到这个邮箱。

在那之前你可以:

• 浏览开源的公司档案库
  https://github.com/<user>/siwuya-data

• 查看 3 份完整公司档案
  https://siwuya.org/companies

• 阅读我们的诚信评分方法论
  https://github.com/<user>/siwuya-data/blob/main/integrity_framework/METHODOLOGY.md

如果你希望我们优先追踪某家公司,或有任何反馈,直接回复这封邮件。

— 思无崖
@siwuya
```

用 HTML 和纯文本两个版本发送(兼容性)。

#### 3.6 退订链接

每封邮件底部必须有退订链接:`https://siwuya.org/unsubscribe?token={hash}`

本 Phase 至少实现退订页面骨架,点击后调用 action 从存储中删除或标记为 unsubscribed。

#### 3.7 Phase 3 验收

- [ ] `/beta` 桌面和移动端正常
- [ ] 邮箱提交成功写入存储
- [ ] 欢迎邮件能发出(自测邮箱)
- [ ] 重复订阅有合理处理(不报错,但也不重复发邮件)
- [ ] 退订页面可用
- [ ] Vercel 预览部署成功,production 环境变量配置完成

向 @siwuya 提交 Vercel 链接,请他用自己邮箱完整走一遍流程。

**停下来等待确认后再进 Phase 4。**

---

## Phase 4: Weekly Brief 存档页与邮件 CLI

### 目标
实现 Weekly Brief 的**展示**和**发送**两个子功能。

### 任务清单

#### 4.1 Brief 的文件格式

每份 Brief 是一份 Markdown 文件,放在 `src/content/briefs/`:

```
src/content/briefs/
├── 2026-05-15-issue-001.md
├── 2026-05-22-issue-002.md
└── ...
```

文件 frontmatter:

```yaml
---
date: 2026-05-15
issue_number: 1
title: "思无崖 Weekly Brief · 第 1 期"
summary: "本周 8 家公司综述: ..."
companies_covered:
  - xiaomi
  - pinduoduo
  - tencent
  # ...
preview: public           # public | subscribers_only
author: "@siwuya"
---
```

`preview: public` 表示存档页可公开浏览,`subscribers_only` 表示要订阅才能看(预留给未来)。本阶段所有 Brief 都设为 `public`。

#### 4.2 Brief 加载模块

`src/lib/briefs/loader.ts`:

```typescript
export async function listAllBriefs(): Promise<BriefSummary[]> {
  // 扫描 src/content/briefs/,解析 frontmatter
  // 按日期倒序返回
}

export async function loadBriefBySlug(slug: string): Promise<Brief | null> {
  // slug 格式:2026-05-15-issue-001
}
```

使用 `gray-matter` 解析 frontmatter,`remark` + `remark-html` 或 `next-mdx-remote` 渲染内容。

```bash
npm install gray-matter remark remark-html
```

#### 4.3 存档页 `/brief/`

列表页:按时间倒序,每期一卡片,显示期号、日期、标题、summary、涵盖公司 badges。

详情页 `/brief/[slug]`:
- 顶部:期号 + 日期 + 作者署名
- 正文:渲染 Markdown(支持链接、列表、引用、表格)
- 所有公司名自动链接到 `/company/{slug}`(如果在 siwuya-data 里能找到)
- 底部:订阅 CTA + Disclaimer

#### 4.4 自动链接化实现

写一个 remark plugin 或 post-process:扫描渲染后的 HTML,把出现的公司 name_zh 替换成链接。

简单实现:

```typescript
async function enrichBriefHtml(html: string): Promise<string> {
  const companies = await listAllCompanies();
  for (const c of companies) {
    // 替换第一次出现的公司名为链接
    const regex = new RegExp(`(?<![<>])(${c.name_zh})(?![<>])`);
    html = html.replace(regex, 
      `<a href="/company/${c.slug}" class="company-link">$1</a>`);
  }
  return html;
}
```

#### 4.5 邮件发送 CLI

`scripts/send-brief.ts`:

```typescript
// 用法: npm run send-brief -- 2026-05-15-issue-001
// 或:    npm run send-brief -- --dry-run 2026-05-15-issue-001

import { Resend } from 'resend';

async function main() {
  const args = parseArgs(process.argv);
  const briefSlug = args.slug;
  const dryRun = args.dryRun;
  
  // 1. 加载 Brief Markdown
  const brief = await loadBriefBySlug(briefSlug);
  if (!brief) throw new Error(`Brief not found: ${briefSlug}`);
  
  // 2. 渲染 HTML 邮件模板
  const emailHtml = renderEmailTemplate(brief);
  
  // 3. 加载订阅者列表
  const subscribers = await getAllActiveSubscribers();
  console.log(`Preparing to send to ${subscribers.length} subscribers`);
  
  if (dryRun) {
    // 发给 @siwuya 自己做测试
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.TEST_EMAIL!,
      subject: `[DRY RUN] ${brief.title}`,
      html: emailHtml,
    });
    return;
  }
  
  // 4. 分批发送(每批 10 封,间隔 1 秒避免 rate limit)
  const batches = chunk(subscribers, 10);
  const results = { success: [], failed: [] };
  
  for (const batch of batches) {
    await Promise.all(batch.map(async sub => {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: sub.email,
          subject: brief.title,
          html: emailHtml.replace('{UNSUBSCRIBE_URL}', 
            `https://siwuya.org/unsubscribe?token=${sub.unsubToken}`),
        });
        results.success.push(sub.email);
      } catch (err) {
        results.failed.push({ email: sub.email, error: err });
      }
    }));
    await sleep(1000);
  }
  
  // 5. 写发送日志
  await writeSendLog(briefSlug, results);
  
  console.log(`✓ Sent ${results.success.length}, ✗ Failed ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log('Failed:', results.failed);
  }
}
```

#### 4.6 HTML 邮件模板

`src/lib/briefs/email-template.ts`:

**关键要求**:
- 纯 HTML + 内联 CSS(不引用外部样式表)
- 最大宽度 600px
- 兼容 Gmail / Outlook / 163 / QQ / 企业邮箱
- 所有公司名链接到 `https://siwuya.org/company/{slug}`(引流核心)
- 底部有退订链接占位符 `{UNSUBSCRIBE_URL}`
- 米白色底 + 衬线字体的调性

模板骨架:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
</head>
<body style="background: #FAF8F3; color: #3E2F24; font-family: 'Noto Serif SC', serif; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 24px;">
    
    <!-- Header -->
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="font-size: 14px; color: #888;">思无崖 · 第 {{issue_number}} 期 · {{date}}</div>
      <h1 style="font-size: 28px; margin: 10px 0 0;">{{title}}</h1>
    </div>
    
    <!-- Body -->
    <div style="font-size: 16px; line-height: 1.8;">
      {{content_html}}
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #ddd; margin-top: 40px; padding-top: 20px; font-size: 14px; color: #888;">
      <p>本邮件来自思无崖 · siwuya.org</p>
      <p>如不想继续收到,可<a href="{UNSUBSCRIBE_URL}">退订</a>。</p>
      <p><a href="https://siwuya.org/disclaimer">免责声明</a></p>
    </div>
    
  </div>
</body>
</html>
```

#### 4.7 发送日志

`src/content/send-logs/2026-05-15-issue-001.log.json`:

```json
{
  "brief_slug": "2026-05-15-issue-001",
  "sent_at": "2026-05-15T19:00:00+08:00",
  "total_subscribers": 42,
  "successful_count": 40,
  "failed_count": 2,
  "failed_emails": [
    { "email": "xxx@example.com", "error": "domain bounce" }
  ]
}
```

#### 4.8 Phase 4 验收

- [ ] `/brief/` 列表页显示所有 Brief
- [ ] `/brief/[slug]` 详情页正常渲染
- [ ] 公司名自动链接化工作正常
- [ ] `npm run send-brief -- --dry-run <slug>` 能发测试邮件到 @siwuya 的邮箱
- [ ] 邮件在 Gmail / 163 / QQ 三个客户端正常渲染(提供截图)
- [ ] 发送日志正确写入
- [ ] Vercel 预览部署成功

**最终演习**:@siwuya 创建一份真实的测试 Brief Markdown,Claude Code 把它渲染出来并发给 @siwuya + 3 位测试用户。

**停下来等待最终确认。**

---

## 全局纪律(Claude Code 必读)

### 每个 Phase 结束必做

1. Git commit:`feat(phase-N): <what was done>`
2. 写 `.reports/PHASE_N_REPORT.md`
3. 推到 Vercel preview 分支,提供预览链接
4. 向 @siwuya 报告,**等待确认**

### 遇到以下情况必须停下来问 @siwuya

- Submodule 在 Vercel 部署失败
- 存储方案(Vercel KV / Upstash)配置出问题
- Resend 域名验证时间过长
- 现有 proxy 代码与新路由冲突
- 预估工时超规范 50%
- 任何法律/文案敏感判断

### 绝对不要做的事

- ❌ 不要"顺便"重构现有 proxy 代码
- ❌ 不要修改 siwuya-data submodule 的内容
- ❌ 不要引入用户登录、评论、Stance 等功能
- ❌ 不要启用 v1 的"验证"按钮搜索框
- ❌ 不要在 Brief 页面嵌入实时股价/数据(引入延迟与合规风险)
- ❌ 不要把付费墙做出来(Phase 1-4 不做支付)

### 关于"顺便优化"的诱惑

Claude Code 可能会在工作中发现现有代码有若干可以改进的点(例如 proxy 代码的某个 hack)。**一律不要修**。把这些发现记在 `.reports/POSTPHASE_BACKLOG.md`,Phase 4 完成后交给 @siwuya。

**理由**:5/15 19:00 是硬性 deadline,任何"顺便"都在消耗 buffer,且可能引入 regression。

---

## 时间预算

| Phase | 预估 | 最晚完成 |
|---|---|---|
| Phase 1 | 4-6h | 4/29 |
| Phase 2 | 4-6h | 5/3 |
| Phase 3 | 2-3h | 5/12 |
| Phase 4 | 3-4h | 5/13 |
| 联调 + Vercel 生产部署 | 2-4h | 5/14 |
| **首发** | — | **5/15 19:00** |

UCLA 出差期间(5/5-5/8)**暂停**所有工程任务。

---

## 最终验收标准

@siwuya 将在 5/14 或 5/15 晨做以下端到端测试:

1. **访问公司页**
   - 打开 `https://siwuya.org/company/xiaomi`
   - 用手机截图发给朋友,朋友 30 秒内能理解这是什么
   - 所有核心信息可见,Disclaimer 存在

2. **订阅 Beta**
   - 用手机打开 `/beta`
   - 输入邮箱,提交
   - 2 分钟内收到欢迎邮件
   - 邮件中所有链接可点击且跳转正确

3. **浏览 Brief 存档**
   - 打开 `/brief/`
   - 点击任一期,详情页正常
   - 公司名已自动链接化

4. **发送 Brief**
   - 运行 `npm run send-brief -- --dry-run 2026-05-15-issue-001`
   - Resend dashboard 能看到发送记录
   - @siwuya 的邮箱收到
   - 退订链接可用

四项全通过,v2 升级完成。

---

## 最终提醒

这次升级的 **唯一硬性 deadline** 是 **2026-05-15 19:00 Weekly Brief 首期发送**。

所有技术决策、功能取舍,都以"能不能按时发出第一期"为最高优先级。

当你在某个问题上犹豫是否"多做一点"时,回到这条线:**能按时发出、且内容不丢脸,就是成功**。

祝执行顺利。
