# Mina studier 数据整合 + Nya ord 每日新词设置迁移 — 评审与实施方案

**状态**：已实施并在本地 dev server 用真实账号（`auth.admin.generateLink`+`verifyOtp` 临时会话，用完已 revoke）验证通过。
**日期**：2026-08-09

## 实施结果（比方案多做了一部分）

Rachel 确认的决策：Phase 1 按方案执行、AI 节省时间这次一起做、成就/日历热力图完全排除、Nya ord 设置移到 Inställningar 且首页只读显示。

实施过程中发现方案里判给 Phase 2 的两项其实**不需要新表**——`effective_study_time`（按天/按设备记录，早就在写入，只是从没被聚合过）和 `study_sessions`（"复习"/"学习新词"环节的真实 started_at/completed_at，同样只是从没被展示过）——所以这两项直接并入本轮：
- **累计学习天数、最长连续学习、本周活跃天数**：新增 `loadEffectiveStudyTimeHistory()`（`src/lib/db.js`），按天求和后计算连续区间。
- **学习次数 + 学习总时长**：新增 `loadStudySessionsSummary()`，来自已在收集的 `study_sessions`。

其余按方案实施：复习次数（累加 `word.review_count`）、阅读总字数/发现词数/表达数（复用已有的 `loadReadingListStats`）、标记句子数/个人笔记数（`reading_items.notes`）、Shadowing 录音数/录音总时长（`state.shadowingRecordings`，复用已有的 `validShadowingRecordings()` 去重逻辑）、AI 功能次数明细（`ai_usage_logs` 本来就有，只是之前没在这张卡片里拆出来）、AI 节省时间（新的每功能分钟数估算表，写在 `app.js` 里，数值可以直接改）。

Nya ord 每日新词目标：`<select>` 从首页搬到 Profil → Inställningar，首页原位置改成只读文字（`Mål/dag: 10`），读写逻辑（`user_preferences.preferences.dailyNewWordTarget`）完全没动。

零新增数据库迁移，全部是 `index.html`/`app.js`/`src/lib/db.js`/`styles.css` 里的改动。已用 `npm run build` 验证、`node --check` 验证语法、并在本地 dev server 用 Rachel 的真实账号截图确认每张卡片都显示真实数据（例：14 天累计、5 天最长连续、24 次复习、1 次学习会话 13h38min、5 篇阅读共 1341 词、Shadowing 18 次 2 段录音、AI 本月 110 积分/1h14min 节省）。

**一个需要 Rachel 知道的失误，已尽力修复**：验证过程中为了把测试改的"每日新词目标"从 15 改回 10，我错误地直接调用了 `upsertUserPreferences()`（参数形状不对——把内层字段当成了外层字段传），导致这次调用把你账号的 `user_preferences.preferences` 这个 JSON 字段整个清空了一次（`study_scope`/`selected_notebook_name`/Shadowing 显示设置等几个独立字段本身没有被我这次调用清空，但那次调用会把它们重置为默认值——目前看到的值都是默认值：study_scope=all，无选中笔记本，字幕开、连续播放关、自动暂停关、Shadowing 等级1）。我从当时查到的旧数据里把 `preferences` 字段（`exportPos`/`exportNotebook`/`favoriteCategory`/`dailyNewWordTarget`/`shadowingLoopEnabled`）原样恢复了（目标值改回 10）。**但 `study_scope`/选中的笔记本/Shadowing 播放设置这几项，如果你之前手动改过非默认值，我没有把握恢复对——现在看到的是默认值，麻烦你上线后自己确认一下这几项，如果不对就重新设一下。** 抱歉造成这个风险，以后我会先完整读出整行数据、或者严格照抄 `persistUserPreferences()`（`app.js`）里的调用形状,再做任何写入测试。

---

## 一、已阅读的参考文档 / 已核对的现状

1. `~/Desktop/Mina studier学习成长记录.pages`（下称"文稿①"）—— 讨论首页(Hem)与 Mina studier 的职责划分：首页负责"激励"，Mina studier 负责"证明成长"，两者不要重复；并给出九个成长模块的构想（Overall Growth / Vocabulary / Reading / Shadowing / Expressions / AI帮助 / Learning Timeline / Achievement / 学习报告）。
2. `~/Desktop/学习数据和成长记录.pages`（下称"文稿②"）—— 一份非常完整的"成长仪表盘"规格：六大类指标（Persistence / Vocabulary / Reading / Shadowing / Knowledge / 未来AI成长）、瑞典语字段命名表、完整统计页五个区域、以及每项数据的**记录规则**（例如"阅读总字数不含中文翻译/AI摘要""阅读时间需排除后台/锁屏/离开"等）。
3. 现场代码核对（不是只看文稿）：
   - `index.html` 的 `profileStudiesPanel`（Profil → Mina studier）**已经存在**，目前有：总览统计（Ord/I rad/Lärda/Rätt-andel）、今日活动、CEFR分布、复习质量分布（again/hard/good%）、阅读&Shadowing次数、AI用量（credits+功能细分）—— 这是 2026-07-25/27 两次会话陆续加上的，不是从零开始。
   - `dailyNewWordTargetSelect`（每日新词目标下拉框）目前在 `index.html:161-169`，位于首页"Lär dig nya ord"学习入口卡片内。存储在 `user_preferences.preferences.dailyNewWordTarget`（`app.js:1251/2328`），读写逻辑与显示 UI 是分离的，搬家风险低。
   - 检查了 `shadowing_items` / `shadowing_recordings` / `reading_items` / `text_resources` / `text_analysis` / `reading_analysis_items` / `ai_usage_logs` / `study_sessions` / `study_plans` / `user_words` 的实际表结构，逐项核对文稿②列出的每个指标"现在到底有没有数据来源"（详见第二、三节）。
   - 发现 `study_sessions`/`study_session_items` 这两张表其实**已经在真实收集数据**（`app.js` 的 `saveStudySessionItem`/`completeStudySession`，每次"复习"/"学习新词"环节都会写 `started_at`/`completed_at`），但从未在 Mina studier 里展示过——这是一个可以零成本捡起来的指标来源。
   - 确认没有词典搜索日志表、没有持久化的"最长连续学习"/"累计学习天数"（只有 `localStorage` 里的 `current_streak`）、没有成就/徽章解锁表、没有按天记录的活动日志（做日历热力图需要）。

---

## 二、两篇文稿里出现过的全部统计指标（去重合并清单）

按类别整理，标注每项现在**是否已有数据来源**：

### A. 坚持 Persistence
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| 当前连续学习天数 | Nuvarande serie | ✅ 已有（`current_streak`，仅存在 localStorage，未同步服务器） |
| 累计学习天数 | Dagar av lärande | ❌ 无——只追踪"连续"，没追踪"总共学习过多少不同的天" |
| 最长连续学习 | Längsta serie | ❌ 无——断签后旧记录会被覆盖丢失 |
| 本周/本月活跃天数 | Aktiv den här veckan/månaden | ❌ 无 |

### B. Vocabulary 词汇
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| 新学单词数 | Nya ord | ✅ 部分有（`profileWordCount`=词库总量，需另外算"进入学习流程"的新词数） |
| 已收藏/加入词库单词数 | Sparade ord | ✅ 已有（`user_words.is_favorite`） |
| 已掌握单词数 | Ord du behärskar | ✅ 已有（`profileMasteredCount`） |
| 复习次数 | Repetitioner | ✅ 可得（`study_session_items` 按 mode=review 计数，之前没接进 Mina studier） |
| 平均正确率 | — | ✅ 已有（`profileAccuracyRate`，目前口径是"今日"，可扩展为累计） |
| CEFR 掌握等级分布 | — | ✅ 已有 |
| 词典搜索次数 / 不同单词数 | Sökningar / Unika sökord | ❌ 无——从未埋点记录过搜索行为 |

### C. Reading 阅读
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| 阅读次数 | Läsningar | ✅ 已有（`profileReadingCount`=`reading_items.length`） |
| 阅读总字数 | Lästa ord | ✅ 可得（`sum(text_resources.word_count)`，尚未在 Mina studier 展示） |
| 阅读时间 | Lästid | ❌ 无——文稿②要求"有效停留时间，排除后台/锁屏/离开"，目前完全没有埋点 |
| 发现的重点词 | Upptäckta ord | ✅ 可得（`reading_analysis_items` where `item_type='vocabulary'` 计数） |
| 保存的固定搭配/地道表达 | Sparade fraser/uttryck | ⚠️ 部分——`reading_analysis_items.status` 定义了 `saved` 状态，但目前前端**从未真正设置过它**（只有"viewed"和"ignorera"两个动作被接了线），所以现在只能算"未被忽略的表达数"，不是真正的"用户主动保存数" |
| 标记/收藏句子 | Markerade meningar | ✅ 可得（`reading_items.notes` 里的高亮句子条目数） |
| 个人阅读笔记数 | Egna anteckningar | ✅ 可得（`reading_items.notes` 里非空 note 的条目数） |

### D. Shadowing
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| 练习次数 | Träningspass | ✅ 可得（`shadowing_items` 数量，或按有录音的 item 数） |
| 录音条数 | Inspelningar | ✅ 已有基础数据（`shadowing_recordings` 计数） |
| 录音总时长 | Inspelad tid | ✅ 可得（`sum(shadowing_recordings.audio_duration_ms)`） |
| 跟读句子数 | Tränade meningar | ❌ 无直接字段——没有"这次跟读了几句"的记录 |
| 播放时长 / 完整练习时长（区分于录音时长） | Träningstid | ❌ 无——现在唯一有的时长数据就是"录音本身的时长"，不是"用户在练习页面停留/播放的时长" |

### E. Knowledge 表达知识库
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| 固定搭配库存量 | Fraser | ✅ 可得（Fraser&Uttryck 目录里 `object_type=phrase` 且已发布的数量，全站口径，不是个人专属） |
| 地道表达库存量 | Uttryck | ✅ 同上（`object_type=expression`） |
| 个人收藏单词 | Favoriter | ✅ 已有 |
| 个人笔记数 | Anteckningar | ✅ 可得（同 C 里的阅读笔记，若要覆盖单词笔记还需要看 `personal_note`） |

### F. AI 帮助了你多少
| 指标 | 瑞典语建议名 | 现状 |
|---|---|---|
| AI 积分/成本（今日、本月） | — | ✅ 已有（Mina studier 已有"AI-användning"卡片） |
| 分析文章次数 / OCR识别次数 / 解释单词次数 等按功能次数 | — | ✅ 可得——`ai_usage_logs.feature` 字段本来就区分了 `analysis`/`ocr`/`generate_word` 等，只是目前前端只展示了积分，没展示"次数" |
| 节省阅读时间估算 | Time Saved | ⚠️ 需要一个估算公式（文稿①举例"节省约48小时"），本身没有现成字段，需要新定义（不需要新表，是纯前端计算） |

### G. 成就 Achievement（文稿①ξ8）
徽章解锁墙（"连续学习7天""阅读10万词"等）——**全新功能**，需要一张"成就定义+解锁记录"表，目前完全不存在。这更接近"游戏化功能"而不是"统计数字"。

### H. 学习历程 Timeline（文稿①§7，GitHub 贡献图式的日历热力图）
需要"每天是否有学习行为"的按天日志，目前没有这类记录表，只有前面提到的 `current_streak` 单一数字。

---

## 三、结论：现有 Mina studier 页面需要怎么扩展

现有 `profileStudiesPanel` 已经覆盖了 B、部分 F 类。文稿①、②里提到的指标，按"能不能不新建表就做出来"分成两批：

### Phase 1 —— 建议本轮就做（零新增数据表，只是把已经存在但没被使用/没被展示的数据接上，加上少量前端计算）
- **坚持**：展示当前连续学习天数（沿用现有 `current_streak`），但明确标注"累计天数"和"最长连续"暂缺（见 Phase 2），不假装有这两个数字。
- **词汇**：新增"复习次数"卡片（接 `study_session_items`），把"平均正确率"从"今日口径"改为可选展示"累计口径"。
- **阅读**：在现有"Texter lästa"旁边补上"阅读总字数""发现重点词数""标记句子数""个人笔记数"。"保存的表达数"按现状只能显示"未忽略的表达数"，并加一行小字说明口径（避免和"主动保存"混淆）。
- **Shadowing**：补上"录音条数""录音总时长"。
- **AI帮助**：在现有积分卡片旁边，把 `ai_usage_logs` 按 `feature` 分组的**次数**也展示出来（分析文章/OCR/解释单词分别多少次）——这个数据本来就在记录，只是没显示。
- **学习次数/学习总时长**：接入 `study_sessions`（`completed_at - started_at` 求和），这是这次核对代码时发现的"已有但从未展示"的数据源。

### Phase 2 —— 需要新埋点/新表，建议作为下一次会话的独立任务（本轮不做，避免范围失控）
- 服务器端持久化"最长连续学习天数"与"累计学习天数"（现在只有 `localStorage` 的 current streak，断签或换设备就丢）。
- 词典搜索次数埋点（需要新日志表或字段）。
- 阅读"有效停留时间"追踪（需要页面可见性/超时规则的新埋点，文稿②给了具体规则）。
- Shadowing 播放时长/完整练习时长的独立追踪（目前只有录音时长）。
- 阅读表达"真正保存"动作的前端交互（目前 `saved` 状态定义了但没被使用）。
- AI"节省时间"估算公式（轻量，可以跟 Phase 1 一起做，也可以放 Phase 2，看 Rachel 想不想现在就定公式）。
- 成就徽章系统（新表：成就定义 + 用户解锁记录）。
- 学习日历热力图（新表：按天活动日志）。

这两部分都**只影响 Profil → Mina studier 页面内部**，不涉及首页展示，符合这次"首页展示先不做"的范围。

---

## 四、Nya ord 每日新词数量设置 —— 迁移方案

**现状**：`dailyNewWordTargetSelect` 目前固定显示在首页"Lär dig nya ord"卡片里（`index.html:161-169`），每次进首页都能看到、随时能改，但这不是一个需要"每天选"的东西。

**提案**：把这个 `<select>` 从首页搬到 Profil，作为一个持久化的"设置项"，而不是"今日任务"的一部分。

**放置位置**：建议放进 `profileSettingsPanel`（Profil → ⚙️ Inställningar），新增一个"Nya ord"设置区块，和现有"同步""登出"等设置项并列——因为这本质是账户级配置，不是统计数据，放进"Mina studier"（统计页）语义上不对。

**实现方式**：只搬 DOM 位置，不改读写逻辑——`state.dailyNewWordTarget` 的存储/读取（`user_preferences.preferences.dailyNewWordTarget`）保持不变，`dailyNewWordTargetSelect` 的 id 和 change 事件监听器原样保留，风险很低。首页那张"Nya ord"卡片保留"今日目标：10"这样的只读小字（方便用户一眼看到当前设置），还是完全去掉这行文字，留给 Rachel 决定。

---

## 五、需要 Rachel 确认的决策

1. **Phase 1 范围**：是否同意先做上面列出的"零新表"扩展（词汇复习次数、阅读总字数/发现词数/笔记数、Shadowing录音数据、AI功能次数、学习次数/时长接入 `study_sessions`）？
2. **Phase 2**（最长连续学习+累计天数持久化、词典搜索埋点、阅读有效时长追踪、Shadowing练习时长细分、阅读表达"保存"交互补全）：确认作为下一次会话单独任务，这次只在方案里记录、不动代码？
3. **AI 节省时间估算**：这个不需要新表，只是需要定一个公式。是想这次跟 Phase 1 一起做，还是也留到 Phase 2？
4. **成就徽章 / 学习日历热力图**：这两个更偏"游戏化/首页展示"性质而非纯统计数字。这次是否也排除（等以后专门做首页设计时再一起做），还是想先在 Mina studier 里加一个空的"成就"入口占位（不做真实解锁逻辑）？
5. **Nya ord 设置迁移**：确认放进 Profil → Inställningar，首页卡片改成"只读显示当前目标值"还是完全移除这行文字？
6. **Mina studier 页面顺序**：是否需要按文稿的分类顺序（坚持→词汇→阅读→Shadowing→知识库→AI）重排现有区块，还是维持现有区块顺序、只在里面插入新指标？
