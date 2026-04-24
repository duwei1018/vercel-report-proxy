# vercel-report-proxy → siwuya.org v2

思无崖主站 — 价值投资公司档案 + Weekly Brief + Beta 订阅

**部署目标**: `r.siwuya.org`(国内)/ `siwuya.org`(待接入)
**域名 fallback**: 未匹配的路径透传到 `https://report.siwuya.org`(Cloudflare hello worker,日报/收盘报告原始域名)

---

## 历史

本仓库 2026-04-24 从 [`info-collector/vercel-report-proxy/`](https://github.com/duwei1018/info-collector) 子目录通过 `git subtree split` 提取并独立化。
保留完整 5 commit 历史(初始反代 → 微信验证文件 → proxy 层验证)。

独立化原因:此目录已升级为思无崖主站,在架构上需要与 info-collector 数据采集仓库分离,
便于(1)主站独立 open source 路线 (2)spec 中的"两 repo 隔离"哲学落地 (3)清晰的 commit 历史。

---

## 技术栈

- **Next.js 15** + **React 19** + **App Router** + **TypeScript 5.6**
- **Vercel** 自动部署
- 计划接入 `siwuya-data` 公司档案仓库(Git submodule)

---

## 路线图

| Phase | 目标 | 状态 |
|---|---|---|
| **Phase 0** | Next.js 骨架 + 反代 fallback + 占位首页/免责声明 | ✅ 2026-04-24 |
| Phase 1 | siwuya-data submodule + YAML loader | ⏳ 待 siwuya-data Stage 2 完成 |
| Phase 2 | `/company/[slug]` + `/companies` 列表(前端过滤) | ⏳ |
| Phase 3 | `/beta` 订阅 landing + Vercel KV + Resend | ⏳ |
| Phase 4 | `/brief/` 存档 + 邮件 CLI | ⏳ |

详见 [`UPGRADE_V2_SPEC.md`](./UPGRADE_V2_SPEC.md) 与 [`UPGRADE_V2_SPEC_ADDENDUM.md`](./UPGRADE_V2_SPEC_ADDENDUM.md)。

**首发硬性 deadline**: 2026-05-15 19:00 Weekly Brief 第 1 期。

---

## 本地开发

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # next build
```

## 路由结构(Phase 0)

```
/                    → 占位首页(未来:思无崖主站门户)
/disclaimer          → 免责声明(主站统一调用)
/MP_verify_*.txt     → 微信服务号域名验证(public/ 静态文件)
/[...slug]           → 反代 fallback,透传到 report.siwuya.org
```

## 红线

- 此仓库**只读** `siwuya-data`(未来作为 submodule),永远不写入
- 不引入用户登录 / 评论 / 支付 / 实时 LLM(v2 范围)
- 不显示具体诚信评分(法律边界,只展示被追踪的承诺列表)

---

## License

私有(暂)。代码层未来可能开源,数据层(用户/订阅)永久不开源。
