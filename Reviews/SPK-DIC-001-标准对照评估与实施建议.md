# SPK-DIC-001《单词词卡内容标准 v1.0》— 对照现状评估与实施建议

**状态：评审稿，等待你确认，本文档不改动任何代码或数据库。**
**方法：逐条对照桌面《SPK-DIC-001_SprakLab_Word_Card_Content_Standard_v1.0.docx》和当前真实的数据库结构（`learning_objects` / `word_forms` / `learning_object_translations` / `learning_object_collocations` / `learning_object_relationships`）及前端渲染代码（`app.js`），不是凭空对照，逐项都核实过现有字段/代码是否存在。**

---

## 一、总体判断

好消息先说：这份标准里大部分"数据架构原则"（第 11 节）已经是现实——公共词条与用户数据分离、母语解释走独立表、结构化字段不是从零开始。这次真正的缺口集中在三类：

1. **少数具体字段还没有地方存**（词频等级、使用场景标签、可数性、及物性等）——加列就能解决，成本低。
2. **前端还是"一份清单"，不是标准要求的"五层递进展示"**——现在 Grammatik/Exempel/Fraser/Relaterade ord 平铺展示，没有分层级、没有按词性拆成独立子组件。
3. **一个真正的架构冲突**：标准第 11 节明确要求"一个 lemma 可能具有多个词性或多个主要义项，系统应允许建立多个 entry/sense"，但我们上次做试点批次时发现数据库里其实有一条没写在任何文档里的 `UNIQUE(swedish)` 约束，**现在根本不允许同一个拼写建立第二条词条**（哪怕词性不同）。这个问题我上次已经提过，这次从标准文档的角度再次确认了它的重要性——不解决，标准里"一词多义项"这条永远落不了地。

---

## 二、基础字段对照（标准第 2 节）

| 标准字段 | 现状 | 结论 |
|---|---|---|
| Lemma | `learning_objects.swedish` | ✅ 已有 |
| Ordklass | `learning_objects.part_of_speech` | ✅ 已有，但枚举值是英文（noun/verb/...），标准建议的是瑞典语术语，纯前端展示层转换即可，不用动数据库 |
| 中文解释 | `learning_object_translations.meaning` | ✅ 已有 |
| Svensk definition | `learning_objects.swedish_explanation` | ✅ 已有（就是上次修正过命名的那个字段） |
| CEFR 等级 | `learning_objects.cefr_level` | ✅ 已有 |
| **词频等级**（frequency_rank / frequency_band） | ❌ 无对应字段 | **缺口**——建议加 `learning_objects.frequency_rank`（整数）+ `frequency_band`（文本，如 Top 500）。这次 Kelly 词表本身就带有频率数据，扩词库时可以顺手把这个字段填上，一举两得 |
| **使用场景**（spoken/written/formal/informal/everyday，可多选） | ❌ 无对应字段 | **缺口**——建议 `learning_objects.usage_registers`（jsonb 数组），标准要求"只在确有依据时标注"，不强制每词都填 |
| 发音（TTS + IPA） | TTS 播放已有（Shadowing/Speech Engine 共用逻辑）；`learning_objects.ipa` 字段已存在但目前基本是空的 | 🟡 结构已就绪，内容基本没填，扩词库时顺手补 |
| 例句（至少 2 个） | 现在只有 `example_sv`/`example_zh` 一对**单个**例句字段（`learning_object_examples` 表虽然 Phase 1 就建好了，但基本是空表，没人在用） | **缺口**——标准要求至少 2 个例句，现在结构上只支持 1 个。建议启用 `learning_object_examples` 表（已存在，加内容即可） |
| 固定搭配（3–5 个，可反链 Fraser/Uttryck） | `learning_object_collocations` 表已有，且已经设计了 `promoted_object_id` 字段专门做"升级为独立 Fraser/Uttryck 词条"的反向链接 | ✅ 结构完全就绪，只是 Fraser/Uttryck 现在还没有真正内容（这是另一个更大的模块，这次不涉及） |
| 同义词 / 反义词 | `learning_object_relationships`，`relationship_type` 支持 `synonym`/`antonym` | ✅ 已有 |
| Word Family（词族） | `learning_object_relationships` 的 `relationship_type = derived_from` 可以承载 | 🟡 结构上能力覆盖到了，但和"Related Words"（标准里是不同概念）现在共用同一张关系表、没有清楚区分对外展示逻辑，前端需要分开渲染这两类 |
| Related Words | 现有 `related_words` 文本字段 + `learning_object_relationships`(`related`) | ✅ 已有 |
| **Memory Tip** | `learning_object_translations.learning_tip` | ✅ 已有——这次 12 个试点词已经在用这个字段了 |
| Learning Status / My Notes / Save-Collection | `user_words` 表（status、notebook、book_names、personal_note） | ✅ 已有，且明确和公共词条数据分离，符合标准第 11 节的架构原则 |

---

## 三、词性专属字段对照（标准第 3–7 节）

### 名词（标准第 3 节）

| 标准字段 | 现状 |
|---|---|
| Genus / 4 种词形 / Deklinationsgrupp | ✅ `word_forms` 表已支持（`genus`/`singular_indefinite`/`singular_definite`/`plural_indefinite`/`plural_definite`/`declension_group`），这次 Grammatik 显示修复已经把这几个字段用起来了 |
| **Countability**（countable/uncountable/both） | ❌ 无对应字段，`word_forms` 的 `form_type` 枚举里没有这个 |
| Grammar Note（正向说明变化规律） | ❌ 现在没有单独字段承载这句话，容易和 Svensk förklaring 混在一起 |

### 动词（标准第 4 节）

| 标准字段 | 现状 |
|---|---|
| Infinitiv / Presens / Preteritum / Supinum / Imperativ / Verbgrupp | ✅ `word_forms` 已支持 |
| **Transitivitet**（transitiv/intransitiv/both） | ❌ 无对应字段 |
| **Partikelverb / Reflexivt**（关联独立词条） | 🟡 概念上可以用 `learning_object_relationships` 表示，但 `relationship_type` 目前只允许 `related/synonym/antonym/derived_from` 四种，没有专门的类型区分"小品词动词"和"反身用法" |
| **Passiv -s** | ❌ 无对应字段 |
| Presens particip / Perfekt particip 反向链接 | ✅ 可用 `derived_from` |

### 形容词（标准第 5 节）

| 标准字段 | 现状 |
|---|---|
| 基本形式 + 比较级 + 两种最高级 | ✅ `word_forms` 已支持 |
| **Comparison Type**（regular/irregular/non-comparable） | ❌ 无对应字段——这个其实挺重要，标准明确说"用于决定显示逻辑"，没有这个字段前端就没法判断"这个形容词该不该显示比较级输入框" |

### Presens particip / Perfekt particip 独立词卡（标准第 6–7 节）

这是标准里**要求最明确、现状差距也最大**的一块：

- ✅ 好消息：`WORD_FORM_GROUPS_BY_POS` 里 `presens_particip`/`perfekt_particip` 已经是独立的 `pos` 值，`word_forms` 也已经有专属字段组（`base_verb`/`participle_form`；`base_verb`/`en_form`/`ett_form`/`plural_form`）——这个骨架其实已经按标准的方向搭了。
- ❌ 缺口：标准要求的 **Function Tags**（adjektivisk / substantiverad / adverbiell 等）和 **Meaning Note**（说明"正在进行"或"动作结果状态"的义项）现在都没有字段承载。
- ❌ Perfekt particip 的 **Degree Forms**（如果已形容词化且可比较）现在也没地方存。

---

## 四、前端展示层级（标准第 10 节：五层递进）

标准要求的五层：核心信息 → 语法变化 → 真实使用 → 扩展学习 → 个人学习。

**现状**：`app.js` 里的词条详情视图（`createWordCard` 的 `isStudyDetailMode` 分支）是**一份平铺列表**——Ordklass、Kinesisk betydelse、Svensk förklaring、Grammatik、Exempel、Fraser、Relaterade ord 依次往下排，没有分层级、没有"按需展开"的交互、也没有标准要求的按词性加载专属子组件（`NounMorphology`/`VerbMorphology`/`AdjectiveMorphology`/`PresentParticipleMorphology`/`PerfectParticipleMorphology`）这种组件化架构。

这次 Grammatik 显示修复（改成结构化多行 + genus 挪到标题旁）是往这个方向迈的第一步，但离标准要求的完整"WordCard 容器 + 按词性子组件"还有距离——这是一次前端架构改造，工作量比单纯加字段大得多，建议单独排期，不要和"扩词库"这次混在一起做。

---

## 五、需要你决定的问题

1. **一词多义项的架构冲突**：标准要求同一个拼写可以有多个词条（不同词性/不同主要义项），但数据库里存在一条未文档化的 `UNIQUE(swedish)` 约束，现在完全不允许。这个我上次已经提过、还没有你的答复——这次从标准文档的角度看，这条约束不解决，标准本身有一部分就无法真正落地。你是否同意放开这条约束（改成允许同拼写+不同词性并存，就像 `vara` 名词和 `vara` 动词那样）？
2. **哪些缺口字段现在就加，哪些先放着**：词频等级、使用场景标签、可数性、及物性、比较级类型这几个都是"加列不难，但要不要现在做"的问题。我的建议是**词频等级和使用场景**这两个优先加（因为正好卡在这次扩词库的时间点上，Kelly 词表本身带频率数据，现在不顺手加，以后要单独跑一次批量回填），其余几个（可数性、及物性、比较级类型、Passiv -s、分词的 Function Tags/Meaning Note）可以留到真正开始批量生成新词条内容时再定，不差这一轮。
3. **前端五层展示架构** 和 **Fraser/Uttryck 模块本身** 都是比较大的独立工程，建议按你之前的节奏，各自单独立项，不要和这次的词库扩充、Grammatik 修复揉在一起。

---

## 六、如果按"先稳字段、再扩前端"排序，建议的落地顺序

1. **本次可以顺手做**（配合扩词库一起）：`frequency_rank`/`frequency_band`/`usage_registers` 三个字段加到 `learning_objects`；扩词库时一并填上 Kelly 提供的频率数据。
2. **需要你先决定**：`UNIQUE(swedish)` 约束去留——这决定了后续要不要支持真正的多义项词条。
3. **下一轮再做**：Countability / Transitivitet / Comparison Type / Passiv -s / 分词 Function Tags & Meaning Note 这几个专属字段，`learning_object_relationships` 增加 `particle_verb`/`reflexive` 关系类型。
4. **独立立项**：前端五层递进展示 + 按词性拆分的 WordCard 子组件架构。
5. **更远期**：Fraser / Uttryck 真正建立独立内容（结构早就绪，内容目前是空的）。

---

**这份文档到此为止，没有改动任何代码或数据库。等你看完并回复第五节的问题后，我再把要动的部分拆成具体计划分别确认。**
