# 首页重设计（Home — Logged Out / Logged In）评审与实施方案

**日期**：2026-09-18
**状态**：草案 — 待 Rachel 逐项决策，未经批准不动代码
**背景**：Loading 页文案已按要求改为"Förbereder SpråkLab…"（`index.html:61`），设计本身未改动。接下来要按 Figma 的两版首页设计（`Home-Logged Out.png` / `Home-Logged In.png`，桌面截图，来自 Figma 链接 `d1TkEJsSu84R2pBBTetemE`）实现登录/未登录两套首页，并接入已登录用户的真实学习数据。这是一次结构性改动，按约定先出方案、你确认后再动代码。

---

## 1. 现状核对（改之前先看清楚现在是什么）

- **`homeView` 现在的真实结构**（`index.html:83-237`）：问候语 hero → 4 卡片成就区（连续天数/学过的词/阅读篇数/Shadowing 时长，`renderHomeAchievements`）→ 搜索框 → 一整套**内嵌**练习面板（`study-entry-grid` 4 张可滑动卡片 + 圆点指示器 + 拼写输入 + 测验开始/显示答案/复习判定按钮 + 完成态面板），全部直接写在 `homeView` 里，不是独立页面。
- **登录态判断逻辑已经存在，且时序天然合适**：`bootstrapApp()`（`app.js:12616` 起）在 `await refreshAuthState()`（`app.js:12651`）之后才会走到把 `document.body.dataset.appReady` 置为 `"ready"`、隐藏 splash 的分支。也就是说"先查登录态、查完再显示对应首页、Loading 只是过渡页"这个时序，代码结构上本来就支持，不需要额外加等待逻辑，只需要让 `homeView` 的渲染分两套、按 `state.auth.user` 是否存在来选。
- **底部 tabbar 已存在**（`index.html:1006-1036`）：Hemsida（房子图标）/ Bibliotek（书本图标）/ Profil（人形图标）三个 tab。Figma 里是 Start（房子）/ Utforska（地球图标）/ Profil，另外多了一个独立的悬浮圆形搜索按钮。
- **已登录三项统计的数据源已经现成可用**：`renderHomeAchievements`（`app.js:4281`）已经在算 `current_streak`（连续天数）、`state.words.filter(learned).length`（学过的词数）、Shadowing 累计时长（`validShadowingRecordings` 汇总 `audio_duration_ms`），分别对应 Figma 里 "67 Aktiva dagar / 356 Nya ord / 128 min Shadowing"。这部分基本是直接复用，不用新写查询。
- **配色 token 已有一套**（`styles.css:1-20`）：`--bg:#f5f5f7`、`--ink:#242827`、`--muted:#6a7171`、`--accent:#5f7b6e`（**暗鼠尾草绿**）。但 Figma 截图里 "Dagens ord" 卡片、进度条用的是**灰紫/浅茄紫**色系，装饰图形是裸粉/深炭灰圆形+芥末黄小圆点，跟现有的绿色 `--accent` 是两套不同的配色方向——这次要么新增一套首页专用的色彩 token，要么调整全局 accent，需要你决定（见第 3 节问题 6）。

## 2. Figma 两版设计内容拆解

两版共有的区块（自上而下）：Hero 问候语+口号 → **Djupläsning**（Skanna·Analysera 功能卡，含扫描按钮+装饰插画）→ **Dagens ord**（"Repetera ord"/"Lär dig nya ord" 两张可横滑卡片，各带进度条+"X av Y klara"）→ **Kom ihåg** → **Utforska mer**（"Läs en artikel"/"Vanliga fraser" 两张可横滑卡片，各带"Prova"按钮）→ 底部 tabbar + 悬浮搜索按钮。

| 区块 | Logged Out | Logged In |
|---|---|---|
| Hero | "Välkommen till SpråkLab"（非个性化） | "Hej, Rachel"（个性化） |
| 统计/引导区 | 无统计数字，改为"Spara dina framsteg" + 斜体文案"Logga in för att spara ord, texter och din studiehistorik." | "Dina framsteg" 三项内联统计：67🔥 Aktiva dagar / 356 Nya ord / 128 min Shadowing |
| Dagens ord 卡片 | 灰态视觉，"0 av 0 klara" / "0 av 10 klara" | 激活态视觉（浅紫底），"6 av 12 klara" / "8 av 10 klara" |
| Kom ihåg | 空状态文案"Här visas några ord du lärt dig tidigare."，无词条 | 3 个真实词条 chip："ursprungligen" "yttra" "väderlek" |
| Djupläsning / Utforska mer | 两版视觉内容相同（截图上看不出功能差异） | 同左 |

**两张截图本身的局限**（要如实说明，避免我自己脑补）：
- Logged Out 截图中间有一段悬浮 topbar（"SpråkLab" + "Logga in" 按钮）滚动时叠在 Djupläsning 卡片上，遮住了卡片标题文字——这应该只是截图时机导致的遮挡，不是设计本身要求遮挡。
- 两张图右边缘都被裁切：Utforska mer 第二张卡片（"Vanliga f[raser]"）只露出一半；Dagens ord/Utforska mer 右侧是否还有更多可横滑的卡片，截图上看不到。
- 没有 Dev Mode 标注，颜色/字号/间距都是我从截图肉眼估的，不是精确取值。

如果后续实现中发现某处因裁切/遮挡对不上，我会再回来问你要更完整的截图或 Dev Mode 标注，不会自己猜测补全。

## 3. 需要你决策的问题（这是最关键的部分，直接决定改动量级）

1. **"Dagens ord" 卡片点击后，练习流程去哪儿？** 现有代码里，"听单词→看解释→查详情→拼写→判定"整套练习 UI 是直接内嵌在 `homeView` 里的（不是独立页面）。Figma 新首页只展示"卡片+进度条"，没有显示练习界面本身。三种可能，工作量差异很大：
   - (a) 点击卡片后，原有练习 UI 仍在首页内展开——Figma 截图只是"收起态"，练习流程本身不用大改，只改卡片外观；
   - (b) 点击卡片跳转到一个新的独立页面/view，练习 UI 整体搬家；
   - (c) 保留现状功能不变，只是这次先只做"外观贴近 Figma"，练习入口逻辑之后再单独讨论。
   **这一条不确定，后面所有实施步骤的范围都无法定，麻烦先回答这条。**

2. **"Kom ihåg" 的 3 个词具体是什么统计口径？** 现有代码没有现成对应"Kom ihåg"语义的查询。是"最近学会的词"、"今天复习过的词"，还是"SRS 里即将到期要复习的词"？

3. **"Utforska mer" 两张卡片分别跳去哪、内容怎么来？** "Läs en artikel" 是跳转到 Läsning / 起步阅读素材库？"Vanliga fraser" 是跳转到 Fraser & Uttryck？卡片上那句引用（"'ta det lugnt'"）是固定示例文案，还是要动态抽一条真实的 Fraser/Uttryck 词条展示？

4. **未登录态下，"Skanna"（Djupläsning）、"Repetera ord"/"Lär dig nya ord" 这几个卡片能不能点？** 点击后是直接弹登录框，还是允许游客先体验一次再引导登录？这也关系到你之前定的"游客触发 AI 调用要不要算成本"的产品原则（见 [[spraklab-future-readiness]] 里 free/paid 分层的方向）。

5. **底部 tabbar 这次要不要一起改？** Figma 把"Bibliotek"（书本图标）改成了"Utforska"（地球图标），并新增一个独立悬浮搜索按钮。这次范围只做首页内容，还是连 tabbar 图标/文案/新搜索按钮一起做？如果一起做，现有首页内嵌的搜索框（`#searchInput`/`#searchBtn`）要不要挪到那个新悬浮按钮里？

6. **配色方向：新首页专用 token，还是调整全局 `--accent`？** 现有全局强调色是暗绿（`#5f7b6e`），Figma 截图是灰紫/裸粉+炭灰+芥末黄。倾向于"新增一套首页专用色彩 token，不动其他页面的绿色系"，但请确认——如果你希望整个 app 的强调色都换成 Figma 这个方向，那是范围更大的改动。

7. **"Nya ord: 356" 这个数字的口径**：我倾向理解为跟现有 `achievementWordsLearned`（`state.words.filter(word => word.learned).length`，即累计学过的词总数）是同一个意思，直接复用即可。请确认这个理解对不对，还是另有所指（比如"最近新学的、还没进入长期记忆的词"）。

## 4. 建议的实施顺序（等你逐条拍板后再启动）

1. 先做**确定不涉及架构变化**的部分：Hero 问候语文案切换（未登录/已登录两套文案）、统计区从"4 卡片"改为"3 项内联数字"、Djupläsning/Utforska mer 卡片的静态外观。
2. 再做**依赖你上面决策**的部分：Dagens ord 卡片点击后的练习入口方式（问题 1）、Kom ihåg 数据接入（问题 2）、Utforska mer 跳转与文案来源（问题 3）、未登录态可点性（问题 4）。
3. tabbar 改动（问题 5）视你的范围决定是否本轮一起做。
4. 新配色 token（问题 6）从两张 PNG 精确取色后落地，不影响现有绿色系页面。
5. 本地 `npm run build` + dev server 验证后，按 [[spraklab-workflow-preferences]] 里 2026-08-09 的教训执行：commit → push 到 `origin/main` → 同步 bump `index.html`/`app.js`/`styles.css`/`sw.js`/`scripts/build.mjs` 的缓存版本号 → curl 生产环境确认新版本已生效，再报"完成"。

---

## 待你回答的问题清单

1. Dagens ord 卡片点击后练习流程去哪儿（本首页内展开 / 跳转新页面 / 本轮先不动练习入口只改外观）？
2. Kom ihåg 的 3 个词，统计口径是什么？
3. Utforska mer 两张卡片各自跳转到哪、"Vanliga fraser"卡片上的引用文案是固定示例还是动态词条？
4. 未登录态下 Djupläsning/Dagens ord 卡片能不能点，点了之后什么行为？
5. 这次要不要一起改底部 tabbar（图标/文案/新增悬浮搜索按钮）？
6. 新首页的灰紫/裸粉/芥末黄配色，是新增专用 token 还是要换掉全局绿色 accent？
7. "Nya ord: 356" 是否就是现有 `achievementWordsLearned` 的口径？
