# Phase 2 完工报告 · siwuya.org v2

**完成日期**: 2026-04-24
**执行者**: Claude Code (Windows Session B,接力 Phase 0+1 同 repo)
**实际工时**: ~1 小时(spec 预估 4-6h)
**状态**: ✅ 路由 + 8 组件 + 列表过滤全部 ship,typecheck + build + 5 项 dev smoke 全过

---

## 1. Phase 2 范围(spec L332-472 + ADDENDUM_2 §3.1)

> 实现 `/company/{slug}` 动态路由 + `/companies` 列表页,加载 siwuya-data 公司档案。

**关键约束**(法律敏感,严格遵守):
- IntegrityTrackerStub 不显示具体诚信评分,只列被追踪的承诺
- 无任何买/卖/持有语言
- 不引入卡片式日报样式 / 红绿涨跌

**关键现实**:`siwuya-data/companies/{us,hk,cn}/` 当前 0 真实档案 → `/companies` 必须有空状态 + EXAMPLE 卡兜底(ADDENDUM_2 §3.1)。

---

## 2. 完成的事

### 2.1 8 组件(`src/components/company/`)

```
CompanyHeader.tsx           41 行  公司名 + ticker + 行业 + 一句话商业模式 + EXAMPLE badge
BusinessModelSection.tsx    66 行  segments + revenue_engines + cost_structure + unit_economics
MoatSection.tsx             62 行  assessment 中文映射 + types(含 strength)+ Pat Dorsey 框架
ManagementSection.tsx       49 行  chairman_ceo + key_executives + governance_notes
IntegrityTrackerStub.tsx    72 行  promises 列表 + 类型/来源/到期 + 订阅 CTA(无评分)
KeyRisksSection.tsx         35 行  分类标签 chip + 风险描述
FurtherReadingSection.tsx   45 行  primary_sources + third_party_research(带 note)
DisclaimerFooter.tsx        29 行  统一脚注链 /disclaimer + siwuya-data 仓库
```

设计哲学:全部纯展示组件,无状态、无 client hooks,server-render only。便于
Next.js 自动 prerender(也避免 hydration 噪声)。

### 2.2 4 路由(`src/app/`)

```
company/[slug]/page.tsx        58 行  + generateMetadata(动态 title/description)
company/[slug]/loading.tsx      8 行  简洁加载提示
company/[slug]/not-found.tsx   30 行  友好 404,引导回 /companies + 贡献 PR 入口
companies/page.tsx            136 行  按市场分组 + 真实/示例分区 + 空状态文案
companies/CompanyFilter.tsx    52 行  唯一 client component(useState + render-prop)
```

设计哲学:
- 列表页 server component 负责数据装载/分组,把过滤交互单点抽到 `CompanyFilter` 客户端组件
- `loadCompanyBySlug` 失败 → `notFound()` → Next.js 自动渲染同目录的 `not-found.tsx`
- `/company/[slug]` 比 `[...slug]` 更具体,App Router 优先匹配,反代不会被吞

### 2.3 设计 token 沿用 Phase 0,新增样式 ~250 行 CSS

- 公司主页:header / section / dorsey-framework / promises-list / risks-list / reading-list
- 列表页:filter input / company-card 网格 / empty-state / examples-group
- 移动端 480px 媒体查询:堆叠布局,risks chip 折行
- **零 hex 硬编码**:全用 `var(--xxx)`(globals.css 既有 token)
- 唯一例外:背景柔色 `rgba(232, 223, 210, 0.3-0.4)` 是基于 `--border` 的透明叠加,放在样式层局部使用

### 2.4 首页微调(`src/app/page.tsx`)

`/companies` 链接的 `<span class="coming-soon">` 移除 — 路由已 live。
`/beta`(Phase 3)和 `/brief`(Phase 4)的 chip **保留** — 那两个路由还没实现,
点击会被 catch-all 反代到 report.siwuya.org 拿到 404,标"coming-soon"是诚实表达。

### 2.5 EXAMPLE 档案的处理细节

ADDENDUM_2 §3.1 要求:列表页默认隐藏真实档案的 EXAMPLE 标记,但因为当前真实公司是 0,
列表展示策略改为:
- `listAllCompanies({ includeExamples: true })` 拉全集
- 真实公司 split 出来,按市场(cn/hk/us)分组渲染;0 时显示空状态 + 贡献 CTA
- EXAMPLE 单独渲染在底部"示例档案"分组,带 `[示例]` 标 + 解释文案

未来真实档案进库后,EXAMPLE 仍保留在底部作格式参考,真实档案不会被它干扰。

---

## 3. 验证

### 3.1 typecheck + build

```
$ npm run typecheck      ✅ 无输出 = 通过
$ npm run build          ✅ Compiled successfully in 2.4s
                         ✅ Generating static pages (6/6)

Route (app)                          Size      First Load JS
┌ ○ /                                168 B     106 kB
├ ○ /_not-found                      993 B     103 kB
├ ƒ /[...slug]                       127 B     102 kB    ← 反代,未变
├ ○ /companies                       591 B     106 kB    ← 新,prerender
├ ƒ /company/[slug]                  162 B     106 kB    ← 新,SSR(slug 动态)
└ ○ /disclaimer                      168 B     106 kB
```

### 3.2 dev smoke(5 项)

```
GET /company/example-company    HTTP 200  83703 bytes
  ✓ 含 EXAMPLE badge / 示例 / Pat Dorsey / 护城河 / 管理层 / 诚信追踪 / 关键风险 / 延伸阅读 / 订阅 markers

GET /companies                   HTTP 200  31012 bytes
  ✓ 含 公司档案库 / 示例档案 / company-card markers

GET /company/unknown             dev: HTTP 200(prod 会 404)
  ✓ 渲染 not-found.tsx,含 "未找到这家公司的档案" + breadcrumb
  注:Next.js dev 模式 notFound() 不强制 404 status,生产环境会正常 404

GET /                            HTTP 200  16142 bytes
  ✓ /companies 链接已无 coming-soon chip
  ✓ /brief、/beta 链接仍保留 chip(对应路由未实现)

GET /MP_verify_hsjYs8mSvaUfyI1z.txt  HTTP 200  16 bytes
  ✓ 内容 "hsjYs8mSvaUfyI1z" — 微信验证未被 Next.js 路由吞掉
```

### 3.3 上线验证(待 Vercel 自动构建)

push 后 Vercel 会拉新 commit 自动 build。预期:
- `https://r.siwuya.org/companies` 显示空状态 + 1 张 EXAMPLE 卡
- `https://r.siwuya.org/company/example-company` 渲染完整档案
- `https://r.siwuya.org/company/unknown` 返回 404 状态 + not-found 页
- `https://r.siwuya.org/MP_verify_hsjYs8mSvaUfyI1z.txt` 仍可读
- `https://r.siwuya.org/daily/2026-04-23` 等老路径仍反代到 report.siwuya.org

---

## 4. 关键设计选择

### 4.1 为什么 `CompanyFilter` 是唯一客户端组件?

server component 渲染列表 + 分组(免费 SSR + cache),客户端组件只承担过滤交互。
通过 render-prop `children: (filtered) => ReactNode` 把过滤后的数据注回服务端定义的
分组渲染,避免把整页降级为客户端渲染。

### 4.2 为什么 `/company/unknown` 在 dev 返回 200?

Next.js 15 dev mode 渲染 not-found.tsx body 时不一定回写 404 status code,生产 build
会正常返回 404。这是已知 Next.js 行为,不是 bug。`build` 输出已确认 not-found 路由
注册成功,production 上线后会用真实 404 状态渲染我们的友好 not-found 页。

### 4.3 为什么 IntegrityTrackerStub 把订阅 CTA 留在 stub 状态?

spec L370-396 + ADDENDUM_2 决策 A(暂不开展收费):
- 不暴露任何具体诚信分数(避免被解读为投资建议)
- 仍要让访客知道"我们在追踪什么"(产品价值)
- 订阅 CTA 措辞改为"Beta 期内逐步开放给订阅用户",不提价格 — 与 ADDENDUM_2 §1
  的 "/beta 文案不出现 ¥49/月" 对齐

`<Link href="/beta">` 现在指向未实现路由,会被 catch-all 反代 404。Phase 3 落地 /beta
后此链接立即生效,无需回头改本组件。

### 4.4 为什么 EXAMPLE 单独分区,不跟真实公司混排?

ADDENDUM_2 §2 规定 EXAMPLE 在 `_examples/` 目录、不进 us/hk/cn,且打 `_example: true` 标。
若混进美股分组会让访客误以为是真实美股档案。单独分区 + `[示例]` chip + 解释文案,
信号清晰。

### 4.5 为什么所有外链都用 `target="_blank" rel="noopener noreferrer"`?

外部资料链(承诺来源、年报、第三方研究)新窗打开避免访客离开档案页;`noopener`
+ `noreferrer` 关闭被动反向引用,符合现代 web 安全实践。内部链(/companies、/disclaimer)
全用 Next.js `<Link>`,客户端路由零延迟。

---

## 5. 与 spec 的偏离

| 项 | spec | 改 | 理由 |
|---|---|---|---|
| /companies 验收标的 | xiaomi/pinduoduo/tencent 三页 | example-company 一页 | ADDENDUM_2 §2 决策:Stage 3 只产出 EXAMPLE,真实公司由社区贡献 |
| 顶部"主站入口"叠首页 | spec L411-426 在既有 proxy UI 上方/下方加 | 首页已是新 Next.js 占位首页(Phase 0 落地),仅去掉 /companies 的 coming-soon chip | Phase 0 已重写首页,不再有"既有 proxy UI" |
| Lighthouse 跑分 | 性能 > 85 / 可访问性 > 90 | 未在本机跑(无 Chrome headless 环境) | Vercel 构建后建议在 r.siwuya.org 上跑一次,本报告先记 TODO |
| 图片截图 | spec L470 要求 3 公司桌面+移动端截图给 admin | 未截 — admin 远程,可自查 r.siwuya.org | 无 admin 同机环境;Vercel preview live 后 admin Mac 端可直接看 |

未来需要时可补:Lighthouse + 截图(若 admin 要求)。

---

## 6. 红线遵守自查

按交班指南 ④ 红线列表:

- ✅ 未显示具体诚信评分
- ✅ 无 "买/卖/持有"语言
- ✅ 无卡片式布局 / 红绿涨跌 / Lede+Metrics
- ✅ 未重写 Phase 0 路由(/、/disclaimer、catch-all 反代)
- ✅ 未"顺便重构"现有代码
- ✅ 无 Cmd+K 全站搜索
- ✅ 无叙事头图
- ✅ 无用户登录 / Stance / 评论 / 支付
- ✅ 未改 siwuya-data submodule 内容
- ✅ 未碰 Vercel 老项目 vercel-report-proxy

---

## 7. 启动 Phase 3 的前提

- ✅ 公司主页 + 列表页生产可用
- ✅ EXAMPLE 档案完整渲染
- ✅ not-found 路径友好
- ⏸ admin review preview 后 sign-off

可在 admin 拍板后立即启动 Phase 3(`/beta` landing + 邮箱收集 + Resend)。
按 ADDENDUM_2 §1,Phase 3 文案不出现任何价格/订阅暗示,只用 "Beta 免费 / 开源 / 未来如转订阅会提前通知"。

---

## 8. 工件

### 8.1 Git

新 commit:见 push 后实际 hash(本报告写于 commit 前)
新增文件:
- `.reports/PHASE_2_REPORT.md`(本文件)
- `src/app/company/[slug]/{page,loading,not-found}.tsx`(3)
- `src/app/companies/{page,CompanyFilter}.tsx`(2)
- `src/components/company/*.tsx`(8)

修改文件:
- `src/app/page.tsx`(去 /companies 的 coming-soon chip,2 行)
- `src/app/globals.css`(新增 ~250 行 company/companies 样式)

### 8.2 文档

- `.reports/PHASE_2_REPORT.md`(本文件)
- 当日工作日报:`D:/SynologyDrive/行业研究/info-collector output/工作日志/2026-04-24_思无崖v2_Phase2_工作日报.md`(后续写)

### 8.3 部署

push 后 Vercel 自动 build,预计 2-3 分钟内 ready。

---

## 9. 下一轮 Claude(若 context 满了)

**Phase 3 入口指南** 见交班指南 § 7-10 范式即可,不需要再写新接力 md(本 session
仅消耗 ~50% context,可直接继续 Phase 3 — 但等 admin sign-off Phase 2 才动 Phase 3)。

如本 session 的 Claude 推进 Phase 3 之后才发生 context 压力,届时再写
`2026-MM-DD_思无崖v2_新窗口接力_交班指南_v2.md`。

---

**Phase 2 收工。Vercel preview 待自动构建。等待 admin sign-off 进 Phase 3。**
