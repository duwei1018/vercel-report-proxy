# Weekly Brief 源文件

每份 Brief 是一份独立的 Markdown 文件,loader 会自动扫描这个目录。

## 文件命名

```
YYYY-MM-DD-issue-NNN.md         # issue-001 / issue-012 / issue-000-preview
```

slug 就是 filename 去掉 `.md`。

## 忽略规则

- 以 `_` 或 `.` 开头的文件不会被发布(可用作草稿,如 `_draft-issue-002.md`)
- 非 `.md` 文件忽略

## Frontmatter 必填字段

```yaml
---
date: "2026-05-15"                # YYYY-MM-DD,字符串
issue_number: 1                   # 数字
title: "思无崖 Weekly Brief · 第 1 期"
summary: "本周 5 家公司综述: …"
companies_covered:                # 可选,slug 列表(跟 siwuya-data 对齐)
  - xiaomi
  - pinduoduo
preview: public                   # 可选,默认 public
author: "@siwuya"                 # 可选,默认 @siwuya
---
```

## 正文

标准 Markdown。在正文中直接写公司中文名,loader 会自动把首次出现的 `name_zh`(匹配 siwuya-data 档案库)替换成 `<a href="/company/{slug}">` 链接,不需要手写链接。

## 发送

```bash
# dry-run(只发给 TEST_EMAIL)
npm run send-brief -- 2026-05-15-issue-001

# 真发给所有订阅者(必须加 --live)
npm run send-brief -- --live 2026-05-15-issue-001
```

详见 `scripts/send-brief.ts` 的 header 注释。
