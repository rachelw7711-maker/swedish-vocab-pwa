# 瑞典语单词本 PWA

一个手机端优先的瑞典语单词学习 PWA，界面为简体中文，正式学习数据保存在 Supabase。

## 功能

- 搜索瑞典语、中文释义、例句和分类
- 搜索词性、英文解释、变形和固定搭配
- 添加、编辑、删除单词
- 标注词性，支持动词、名词、形容词、副词等
- 保存中英双语解释、词形变化、日常例句和固定搭配
- 创建多个单词本
- 一键导入 SFI、SVA grundläggande 和 SVA gymnasienivå 常用词库
- 单词本导出 PDF / A4 打印
- 学习历史记录，支持按词性和操作筛选
- 历史记录导出 PDF / A4 打印
- 收藏单词
- 标记掌握 / 重学
- 今日抽查练习
- 瑞典语朗读，使用系统语音能力
- Service Worker 离线缓存应用静态资源
- Supabase 是 words / user_words / notebooks / study history / study plans / Shadowing 的唯一正式数据源
- 内置字典搜索，未加入词库的内置词也可查看逐项解释并加入词库

## 本地运行

```bash
cd ~/Desktop/swedish-vocab-pwa
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173/
```

## 使用 ChatGPT 生成词条

需要设置 OpenAI API key，并使用内置 Node 服务启动：

```bash
cd ~/Desktop/swedish-vocab-pwa
OPENAI_API_KEY=你的_key node server.mjs
```

然后访问：

```text
http://localhost:4174/
```

`AI-generera ordkort` 会调用本地 `/api/generate-word`，由服务器请求 OpenAI Responses API，返回结构化词条。不要把 API key 写进前端文件。

在手机上使用时，可以把电脑和手机放在同一网络下，再用电脑局域网 IP 访问；安装为 PWA 时请使用浏览器的“添加到主屏幕”。

## Supabase 云同步

前端 Supabase 配置只允许来自构建环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

如果缺少任一变量，前端会报错，不会回退到旧项目或浏览器本地配置。

数据库表结构见 `supabase/schema.sql`。
