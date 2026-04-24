# Contract · /api/recent-docs

**版本**: v1
**生效**: 2026-04-24
**方向**: siwuya.org v2（consumer，Next.js on Vercel）← report.siwuya.org（producer，Cloudflare Worker）
**用途**: v2 门户冷启动期在首页 + 公司页 + 公司 404 页展示 info-collector 日报系统的最近文档

---

## 1. 为什么需要契约

主站 `vercel-report-proxy` 的首页、`/company/[slug]` 底部、`/company/unknown` not-found
页都依赖 `https://report.siwuya.org/api/recent-docs` 这个接口拉最近文档做冷启动期的
内容兜底。

这个 endpoint 过去没有正式 schema 文档——v2 的 `RecentDocs` 组件直接读字段名。
这种隐式合约在两个仓库各自演进时必然漂移（producer 改字段 → consumer 静默 null）。

本契约把它落纸，保证 v2 和 info-collector 侧升级时都能对齐，偏离要走 PR review。

---

## 2. Endpoint

```
GET https://report.siwuya.org/api/recent-docs
```

- Method: `GET`
- Auth: **none**（公开，CORS `Access-Control-Allow-Origin: *`）
- Rate limit: CF Worker 默认,无业务层限流
- Stability: **v1 stable**（breaking change 必须新建 `/api/recent-docs/v2`，不在现 endpoint 改 schema）

---

## 3. Query params（v1 全部可选，未定义则采 default）

```
?limit=<int>        默认 24，范围 [1, 50]
?types=<csv>        默认全部。合法值：news,announcement,research,social,commentary,event
```

未识别 params 必须被静默忽略（不报 400）。

---

## 4. Response schema（v1）

**HTTP 200** + `Content-Type: application/json; charset=utf-8`

```jsonc
{
  "version": 1,                          // int · schema 版本号
  "generated_at": "ISO 8601 UTC",        // string · 此刻生成（非 cache 时间）
  "count": 24,                           // int · docs.length
  "docs": [
    {
      "doc_type": "news",                // 必填 · enum ↓
      "doc_id": "ai-cn046a-75-ai-20260424",  // 必填 · 在 /doc/{doc_type}/{doc_id} 可解析
      "title": "谷歌披露75%新代码由AI生成",   // 必填 · 中文优先,允许英文
      "primary_entity": "AI算法",        // 可选 · 若多实体用第一个
      "published_at": "2026-04-24",      // 可选 · YYYY-MM-DD 或 ISO 8601
      "category": "",                    // 可选 · 留空=未分类
      "importance": ""                   // 可选 · "high"|"medium"|"low"|""
    }
  ]
}
```

**doc_type enum**（v1 冻结）：
- `news` — RSS / 官网抓取的新闻
- `announcement` — 交易所公告（巨潮 / HKEX / EDGAR）
- `research` — 研究报告 / 深度分析
- `social` — 社交观点（雪球 / Twitter / 微博）
- `commentary` — 思无崖原创评论
- `event` — 关联事件聚合

排序：`published_at` 倒序。同日按 `doc_id` 字典序。

---

## 5. Cache 语义

**Producer 侧**（CF Worker 设置）：
```
Cache-Control: public, max-age=60
```

**Consumer 侧**（v2 使用）：
- 当前实现是浏览器 client-side fetch（`RecentDocs.tsx`）
- 浏览器遵循 `max-age=60`，无额外 Next.js fetch cache
- 历史版本尝试过 `next: { revalidate: 900 }` server-side fetch，但 Vercel serverless
  IP 被 CF bot-challenge 拦下，已废弃（见下节）

---

## 6. 已知问题：Vercel → report.siwuya.org 的 bot challenge

Vercel 的无服务器函数出口 IP 被 Cloudflare 判为 bot，访问 `/daily/*`、`/api/recent-docs`
等端点会收到 "Just a moment..." 验证页而非 JSON。

**影响范围**：
- `[...slug]/route.ts` 反代的所有老 URL（/daily / /closing / /weekly 等）
- Server-side fetch `/api/recent-docs`

**当前缓解措施**：
1. `RecentDocs` 改为 client component，绕过 Vercel serverless
2. 反代层透传更多 browser-like headers（UA / Accept / Cookie / Sec-Fetch-* / Referer）
   + 转发 X-Forwarded-For 真实客户端 IP

**彻底修复（admin 必做）**：在 Cloudflare Dashboard 为 report.siwuya.org 设置 WAF 规则
允许 Vercel IP 段，或把 `/api/*` 路由排除出 Bot Fight Mode。

---

## 7. Error 语义

| 状态 | 含义 | Consumer 应 |
|---|---|---|
| 200 + docs:[] | producer 正常，但暂无文档 | 不渲染 section |
| 非 200 | producer 异常或 CF 挑战 | 不渲染 section（静默） |
| 200 + 非 JSON | 极端异常（CF 挑战页 HTML） | 解析失败 → 不渲染 section |
| timeout (> 10s) | 网络慢或 producer 挂 | 不渲染 section |

**consumer 必须把所有失败映射为"静默隐藏 widget"**，绝不让主站首页因此出错。

---

## 8. 版本演进纪律

- **不要在现 endpoint 改字段语义**。改字段 = 新版本（`/api/recent-docs/v2`）
- **新增字段允许**（consumer 未读的字段自动忽略）
- **删字段不允许**（除非等到所有已知 consumer 升级到新版本）
- producer 每次 deploy 前在 `report.siwuya.org` 跑契约测试：
  ```
  curl -s https://report.siwuya.org/api/recent-docs | jq '.version, .count, .docs[0] | keys'
  ```
  期望：`version: 1` + `keys: [doc_type, doc_id, title, ...]`

---

## 9. 已知 consumer 清单

- `vercel-report-proxy/src/app/RecentDocs.tsx`（首页 + 公司页 + 404 页）
- 未来的新 consumer 必须向本契约登记（在本文件追加）

---

## 10. 变更历史

| 日期 | 版本 | 变更 | PR |
|---|---|---|---|
| 2026-04-24 | v1 | 首次定契约；client-side fetch；CF bot challenge 归档 | — |
