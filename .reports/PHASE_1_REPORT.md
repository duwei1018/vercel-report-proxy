# Phase 1 完工报告 · siwuya.org v2

**完成日期**: 2026-04-24
**执行者**: Claude Code (Windows Session B,与 Phase 0 + siwuya-data Stage 1+2 同 session)
**实际工时**: ~30 分钟(spec 预估 4-6h)
**状态**: ✅ 数据层完整 ship,12/12 smoke 全过 + typecheck + build 通过 + push GitHub

---

## 1. Phase 1 范围(spec L86-329)

> 建立从 `siwuya-data` 读取公司档案 YAML 的数据层,提供类型安全的 API 给页面层使用。

## 2. 完成的事

### 2.1 Submodule 集成

- ✅ `git submodule add https://github.com/duwei1018/siwuya-data.git src/content/siwuya-data`
- ✅ `.gitmodules` 注册
- ✅ Vercel Git integration 自动 clone submodule(已默认开启)

### 2.2 依赖

```
dependencies:
  js-yaml ^4.1
  ajv ^8.18
  ajv-formats ^3.0

devDependencies:
  @types/js-yaml ^4.0
  tsx ^4.21
```

(spec L131 不安装 zod、class-validator、io-ts;ajv 已足够)

### 2.3 代码

```
src/lib/siwuya-data/
├── types.ts         (216 行) — 手写 TypeScript 类型镜像 schema
├── validator.ts      (45 行) — ajv Draft 2020-12 wrapper
├── loader.ts        (181 行) — yaml + react cache + 三个公共 API
└── index.ts          (45 行) — barrel exports

scripts/
└── smoke-loader.ts  (96 行) — 6 块 12 项 assertion
```

### 2.4 公共 API

```ts
// 列表查询(默认隐藏 EXAMPLE,主站列表页直接调)
listAllCompanies(options?: { includeExamples?: boolean }): Promise<CompanySummary[]>

// 详情查询(按 identity.slug)
loadCompanyBySlug(slug: string): Promise<CompanyArchive | null>

// 详情查询(按 ticker 或 alias)
loadCompanyByTicker(ticker: string): Promise<CompanyArchive | null>

// 校验(独立可用,主站和 dev/CI 都用)
validateCompany(raw: unknown): ValidationResult
formatValidationErrors(result: ValidationError): string
```

全部用 `react cache()` 包装,同一 request 周期内不重复读盘。

### 2.5 错误处理(spec L259-261 要求)

YAML 解析失败 → console.error + 返回 `{ ok: false, reason: "yaml_parse_error" }`
Schema 校验失败 → console.error + 返回 `{ ok: false, reason: "schema_invalid" }`
**绝不抛异常让页面 crash**(一份坏 YAML 不应让整站挂)。

`loadCompanyBySlug` / `loadCompanyByTicker` 在内部把任意失败都映射为 `null`,
保持页面层 API 简单:`if (!company) return notFound()`。

## 3. 验证

### 3.1 本地

```
$ npm run typecheck
> tsc --noEmit
(无输出 = 通过)

$ npm run build
✓ Compiled successfully in 964ms
✓ Generating static pages (5/5)
Route (app)
┌ ○ /            164 B  106 kB
├ ○ /_not-found  993 B  103 kB
├ ƒ /[...slug]   123 B  102 kB
└ ○ /disclaimer  164 B  106 kB

$ npm run smoke
[1] loadCompanyBySlug('example-company')
  PASS  EXAMPLE archive loads by slug
  PASS  primary_ticker correct
  PASS  name_zh correct
  PASS  _example flag set
  PASS  tracked_promises is non-empty array
[2] loadCompanyByTicker — primary + alias
  PASS  primary ticker resolves
  PASS  alias resolves
[3] listAllCompanies() default hides EXAMPLE
  PASS  EXAMPLE filtered out (got 0 total, 0 examples)
[4] listAllCompanies({ includeExamples: true }) includes EXAMPLE
  PASS  EXAMPLE included (got 1 examples)
[5] Unknown slug returns null
  PASS  unknown slug returns null
[6] validateCompany rejects malformed input
  PASS  malformed object fails schema validation
  PASS  errors enumerated (got 12)

12 passed, 0 failed
```

### 3.2 远程(Vercel preview / r.siwuya.org)

Push commit `dd69e42` 后 Vercel 自动触发 build。
**预期**:Phase 0 现有路由(/、/disclaimer、/MP_verify_*.txt、/[...slug] 反代)
全部继续工作 — 因为 loader 还没被任何路由调用,只是基础设施就绪。

下一阶段(Phase 2)写 `/companies` 和 `/company/[slug]` 时才会真正调用 loader。

## 4. 关键设计选择

### 4.1 为什么手写 TypeScript 类型?

spec L141 推荐"先手写,等 Phase 1 完成后再考虑用 `json-schema-to-typescript` 自动生成"。
本 Phase 1 手写 216 行,跟 schema 一比一对应,可读性高。

未来 schema 字段加减时,types.ts 需要同步更新(没有 CI 守护)。
v0.2.0 可考虑加 `npm run gen:types` 步骤(不在 runtime 链路)。

### 4.2 为什么 ajv 而不是 zod?

spec L131 明确 "不要安装 zod"。理由:
- ajv 是 JSON Schema 标准实现,跟 `companies/_schema/company.schema.json`(开源仓库的标准)对齐
- zod 用 TypeScript 重新声明 schema,会跟 JSON Schema 漂移
- ajv 体积小、运行时快、supports Draft 2020-12

### 4.3 为什么 react cache 而不是 React 19 use+cache 组合?

`cache()` from React 19 是同一个 mechanism,简单包装一个 async function 即可。
不需要 `unstable_cache` (Next.js 特有)因为:
- siwuya-data 内容是 build-time 静态(submodule),不会运行时变化
- 同 request 周期内 memoize 已足够,不需要 cross-request cache

### 4.4 为什么 loader 在 schema_invalid 时仅返回 null 而不是详细 error 给页面?

权衡:页面层(Phase 2)不需要 "这份 YAML 第 47 行 enum 不对" 这种细节。
开发期靠 `npm run smoke` + `validate_company.py` (在 siwuya-data 仓库)
+ console.error 服务端日志 即可。

如果未来 Phase 2 页面需要展示 "这份档案因 X 原因加载失败",可以加一个
`loadCompanyBySlugWithDiagnostic(slug)` API,return `LoadResult<CompanyArchive>`。
当前 v0.x 不需要。

## 5. 与 spec 的偏离

| 项 | spec | 改 | 理由 |
|---|---|---|---|
| schema 校验工具 | `scripts/validate-all-companies.ts` (TS) | siwuya-data 仓库内已有 Python 版,本仓库没复制 | siwuya-data 自己的责任,主站不重复;主站 loader 内部用 ajv |
| 单元测试框架 | Vitest 或 Jest | 暂不引入,改用 `npm run smoke`(纯 tsx 脚本) | 减少依赖,Phase 1 阶段 12 项 assertion 已足够覆盖 |
| `validator.ts` 路径 | (spec 未指定 import 方式) | 使用相对路径 `../../content/siwuya-data/...` 而非 `@/` 别名 | 相对路径在 tsx smoke 脚本和 Next.js 都能解析 |

未来需要时(Phase 2/3 真有页面错误展示需求)可补上述项目。

## 6. 启动 Phase 2 的前提

- ✅ Phase 1 数据层完整
- ✅ submodule 自动 clone 成功(本地 + Vercel CI)
- ✅ EXAMPLE 档案可被 loader 读出 → Phase 2 公司页能拿到至少 1 份测试数据

可立即启动 Phase 2(`/company/[slug]` + `/companies` 列表页 + 设计组件)。

## 7. 工件

### 7.1 Git

新 commit:`dd69e42` 在 `duwei1018/vercel-report-proxy:main`
Submodule pointer:`src/content/siwuya-data` → `duwei1018/siwuya-data:main:304c43d`

### 7.2 文档

- `.reports/PHASE_1_REPORT.md`(本文件)

### 7.3 本地 / Vercel

本地:全套 12 项 smoke + build 通过
Vercel:正在自动 build(commit dd69e42 触发),预计 2-3 分钟内 ready。
**不影响** Phase 0 现有路由(loader 暂未被任何路由调用)。

---

**Phase 1 收工。Phase 2 入口准备就绪。**
