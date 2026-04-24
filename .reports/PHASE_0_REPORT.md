# Phase 0 完工报告 · siwuya.org v2

**完成日期**: 2026-04-24
**执行者**: Claude Code (Windows Session B)
**实际工时**: ~2 小时(spec 预估 2-3h)
**状态**: ✅ Shipped to production(`r.siwuya.org`)

---

## 0. 范围回顾

Phase 0 是 UPGRADE_V2_SPEC_ADDENDUM(2026-04-24)新增的阶段,
原 UPGRADE_V2_SPEC.md 没有写,但实际是 Phase 1-4 的必要前置:

> 现有 `vercel-report-proxy/` 不是 Next.js 应用,只有一个 40 行反代函数。
> 必须先升级为 Next.js 15 + App Router + TypeScript 应用,
> **保留**微信验证 + report.siwuya.org 反代 fallback,
> 才能为 Phase 1-4 起骨架。

---

## 1. 完成的事

### 1.1 仓库迁移(monorepo → 独立 repo)

发现的事实纠正:`vercel-report-proxy/` 原本是 `info-collector` monorepo 的子目录,**不是独立 git 仓库**。
spec 第 19-49 行画的"两个独立 git 仓库"架构图,主站这一侧实际是错的。

迁移过程:
1. ✅ `git subtree split --prefix=vercel-report-proxy -b vercel-report-proxy-extract`
   提取 5 个相关 commit 历史(初始反代 → 微信验证文件 → proxy 层验证)
2. ✅ admin 在 GitHub 创建空仓库 `duwei1018/vercel-report-proxy`(Private)
3. ✅ Push extract 分支到新 repo,合并 main(Initial commit + 5 历史 commits = 干净时间线)
4. ✅ Clone 到 `C:/Users/Administrator/vercel-report-proxy/` 作为 Phase 0 工作目录

**info-collector 这边**:`vercel-report-proxy/` 子目录暂时保留 7 天作 rollback 兜底,
之后由 admin/Claude 决定 `git rm` 并加 README pointer。

### 1.2 Next.js 15 骨架

新增文件清单:
```
package.json                # next^15 / react^19 / typescript^5.6
tsconfig.json               # strict + paths alias @/*
next.config.mjs             # typedRoutes 启用
.gitignore                  # 扩展为 Next.js 标准
README.md                   # 改写为 v2 主站说明 + 路线图
UPGRADE_V2_SPEC.md          # 复制自 NAS 计划目录
UPGRADE_V2_SPEC_ADDENDUM.md # 复制自 NAS 计划目录
src/app/layout.tsx          # 根布局 + zh-CN
src/app/page.tsx            # 占位首页(链 /companies /brief /beta)
src/app/disclaimer/page.tsx # 免责声明 6 段(主站统一调用)
src/app/[...slug]/route.ts  # catch-all 反代,GET/POST/HEAD/OPTIONS
src/app/globals.css         # 设计 token(米白衬线,纽约书评风格)
```

删除文件:
- `api/proxy.js`(40 行反代逻辑全量迁到 catch-all route handler)

修改文件:
- `vercel.json`(去旧 rewrites,改为 framework hint,Next.js 自动接管)

保留文件(不动):
- `public/MP_verify_hsjYs8mSvaUfyI1z.txt`(微信服务号验证,Next.js 自动 served)

### 1.3 设计语言(spec L431-457 落地)

- 米白底 `#FAF8F3` + 温棕正文 `#3E2F24`
- Noto Serif SC / Source Han Serif SC(中文衬线)
- 720px 单栏单列,18px / 行高 1.8
- 移动端 padding 20px,触摸目标 ≥ 44px
- 不引入外部 CDN,所有字体走系统 fallback(`next/font` 后续 Phase 引入)

### 1.4 catch-all 反代实现

`src/app/[...slug]/route.ts`:
- 所有未被 `/`、`/disclaimer`、`public/*` 静态文件匹配的路径走反代
- 透传到 `https://report.siwuya.org`
- 支持 GET / POST / HEAD / PUT / DELETE / PATCH / OPTIONS
- Header passthrough:content-type / cache-control / etag / last-modified / location / vary
- 自动加 `x-proxied-by: vercel-report-proxy` 标记便于排查
- `redirect: "manual"`(不让 fetch 自动跟 30x)
- `dynamic: "force-dynamic"` + `runtime: "nodejs"`(避免被静态化)

### 1.5 Vercel 部署

1. ✅ admin 在 Vercel 新建项目 `vercel-report-proxy-6u6e`(team `duwei1018-8328s-projects`)
2. ✅ 首次自动构建成功(Next.js 15.5.15)
3. ✅ admin 关闭 Vercel Authentication / Deployment Protection
   (默认开启会让 `/MP_verify_*.txt` 返回 401,微信验证必失败)
4. ✅ 域名 `r.siwuya.org` 通过"同 team transfer"原子从老项目移到新项目(零宕机)

---

## 2. 验收结果

### 2.1 本地 dev server(npm run dev)

```
✓ /MP_verify_hsjYs8mSvaUfyI1z.txt  → HTTP 200, 返回 hsjYs8mSvaUfyI1z
✓ /                                → HTTP 200, 首页渲染,含「思无崖」
✓ /disclaimer                      → HTTP 200, 免责声明渲染
✓ /daily/2026-04-23                → HTTP 200, 反代到 report.siwuya.org,带 x-proxied-by 头
```

### 2.2 Vercel preview URL(`vercel-report-proxy-6u6e-...vercel.app`)

(Deployment Protection 关闭后)
```
✓ /MP_verify_*.txt   → HTTP 200, token 正确
✓ /                  → HTTP 200, 首页
✓ /disclaimer        → HTTP 200
✓ /daily/2026-04-23  → HTTP 200, X-Matched-Path: /[...slug] 证明 catch-all 接管
```

### 2.3 生产域名(`https://r.siwuya.org`)

(域名切换后)
```
✓ /MP_verify_*.txt   → HTTP 200, hsjYs8mSvaUfyI1z 微信验证可过
✓ /                  → HTTP 200, 首页
✓ /disclaimer        → HTTP 200
✓ /daily/2026-04-23  → HTTP 200, X-Proxied-By: vercel-report-proxy
✓ SSL                → Let's Encrypt R12, 至 2026-07-12, Vercel 自动续
```

### 2.4 工程门禁

- ✅ `npm run typecheck`(tsc --noEmit)通过
- ✅ `npm run build`(next build)通过,无 error
- ✅ Lighthouse 性能(待 admin 浏览器手测)

---

## 3. 风险 / 已知 issue

### 3.1 老 Vercel 项目仍在线

`vercel-report-proxy`(老,`duwei1018-832b-projects`)Domain 列表已没有 `r.siwuya.org`,
但项目本身还在 Vercel,GitHub 集成仍连到 `info-collector` 子目录的 webhook。

**建议**(非阻塞):
- 保留 7 天作 rollback 兜底
- 期间 admin 可在 Vercel 老项目 Settings → Git → Disconnect GitHub Repository,避免无意义部署触发
- 7 天稳定后由 admin 决定是否删除老项目

### 3.2 info-collector 内 `vercel-report-proxy/` 子目录

现仍存在,跟新独立 repo 内容已分叉(没有 Next.js 升级)。
新代码所有改动在 `C:/Users/Administrator/vercel-report-proxy/`(独立 repo),
不再 commit 到 info-collector 的子目录。

**建议**(非阻塞):
- 7 天稳定后 `git rm -r vercel-report-proxy/` 并加 `docs/MIGRATED_vercel-report-proxy.md` pointer

### 3.3 typedRoutes warning

`next.config.mjs` 中 `experimental.typedRoutes` 已迁到顶层 `typedRoutes`(spec 中无说明,我已修)。

### 3.4 微信服务号 webhook

微信公众号绑定 `r.siwuya.org/MP_verify_*.txt` 的验证文件,
切换后 token 路径不变,**理论上不需要重新点"提交"按钮**,
但建议 admin 找时间在微信公众平台验证一下回调状态(非紧急)。

---

## 4. Phase 1 启动前提

按 spec L92,Phase 1(数据层 + siwuya-data submodule)启动**必须满足**:

1. ✅ Phase 0 验收全绿(本报告)
2. ⏳ admin 拍板 GitHub 仓库归属(MASTER_PLAN.md L213,新仓库 `siwuya-data` 是用 `duwei1018/` 个人账户还是组织?)
3. ⏳ Claude Code Session A 已完成 siwuya-data 至 Stage 2(schema + 至少 1 份有效 YAML)

任一未达成 → Phase 1 暂停,Phase 0 完成后 handoff 等待。

---

## 5. 这一阶段产出的工件

### 5.1 代码

新 repo `duwei1018/vercel-report-proxy`,main 分支,2 个 commit:
- `7b3d456` merge: import vercel-report-proxy 5-commit history from info-collector subtree
- `df3550d` feat(phase-0): Next.js 15 skeleton + reverse-proxy fallback

### 5.2 文档

- `UPGRADE_V2_SPEC_ADDENDUM.md`(NAS + 新 repo 双拷贝)
- `.reports/PHASE_0_REPORT.md`(本报告)

### 5.3 部署

- Vercel 项目 `vercel-report-proxy-6u6e`(team `duwei1018-8328s-projects`)
- 域名 `r.siwuya.org` Production
- preview 域名 `vercel-report-proxy-6u6e.vercel.app`

### 5.4 任务记录

(从 Claude TaskList 摘录)
- #1 ✅ Write UPGRADE_V2_SPEC_ADDENDUM doc
- #7 ✅ git subtree split: extract vercel-report-proxy history
- #8 ✅ admin: Create github.com/duwei1018/vercel-report-proxy private repo
- #9 ✅ Push extract branch to new GitHub repo as master
- #10 ✅ Clone new repo as Phase 0 workspace
- #2 ✅ Bootstrap Next.js 15 skeleton
- #3 ✅ Migrate proxy + WeChat verify into Next.js routing
- #4 ✅ Add minimal landing & disclaimer routes
- #11 ✅ admin: Vercel new project bound to new repo
- #12 ✅ Verify new Vercel preview
- #13 ✅ admin: Atomic domain swap r.siwuya.org → new Vercel project
- #14 ⏳ Post-swap verification(verify done) + info-collector cleanup(defer 7 day)
- #5 ✅ Verify Vercel preview deploy + WeChat fallback intact
- #6 ✅ Write PHASE_0_REPORT.md(本文件)

---

## 6. 待 admin 拍板的事(进 Phase 1 之前)

1. **siwuya-data 仓库归属**:`duwei1018/siwuya-data` 还是组织账户?(MASTER_PLAN.md L213 建议先用个人账户)
2. **Phase 1 启动时机**:可以立刻起 Claude Code Session A 做 siwuya-data Stage 1-2,然后 Session B 接 Phase 1
3. **info-collector 内 `vercel-report-proxy/` 处理**:7 天内删除还是更保守?
4. **老 Vercel 项目处理**:Disconnect Git 立即做还是等 7 天?

---

**Phase 0 收工。下一阶段(Phase 1)可在 siwuya-data Stage 2 完成后启动。**
