# 词条数据结构设计（草案）
## 母语支持 + 词形结构化 + Fraser / Uttryck

**状态：设计草案，等待确认，尚未改动任何数据库或代码。**

这份文档是"母语支持"和"词条内容改造（比较级/分词形式、Fraser、Uttryck、句子分离）"这三件事合并设计的结果——它们最终都要改同一张 `words` 表，所以合并成一次设计，避免来回折腾。

---

## 一、设计思路：所有可学习内容统一成一个"Learning Object"模型

现在的 `words` 表只能存"单词"，Fraser、Uttryck、句子如果硬塞进去，会互相打架。按你产品规范里已经定义好的 **Learning Object（学习对象）** 概念——单词、短语、表达、句子本质上是同一种东西的不同类型，应该共用一套身份、一套关系机制，而不是各建一套。

所以核心思路是：**一张主表存"这是什么"，配几张小表分别存"词形怎么变"、"不同母语怎么解释"、"和别的词条什么关系"。** 加新母语、加新词形类型、加 Fraser/Uttryck 的新分类，都是"加一行数据"，不需要"改表结构"。

---

## 二、具体表结构

### 1. `learning_objects`（主表，`words` 表的扩展/重命名，见下方决策点）

| 字段 | 说明 |
|---|---|
| `id` | 词条唯一身份（建议统一为 uuid，见"待确认"部分） |
| `object_type` | `word` / `phrase`（Fraser）/ `expression`（Uttryck）/ `sentence` |
| `target_language` | 目标语言，目前固定 `sv`（瑞典语），为未来多目标语言预留 |
| `headword` | 词条本身的文字（原 `swedish` 字段改名，因为以后不只存单词） |
| `pos` / `pos_detail` | 词性（只有 `word` 类型有意义） |
| `status` | `draft` / `ai_generated` / `human_reviewed` / `published` — 对应"AI 生成内容必须可审核、可追溯"的原则 |
| `source` | `human` / `ai` / `import` — 配合 `status` 做溯源 |
| `created_by` | 谁创建/审核的 |
| `created_at` / `updated_at` | — |
| `tags` | 通用扩展字段（jsonb，保留原设计） |

### 2. `word_forms`（词形变化，结构化，替代现在的一整段文本）

| 字段 | 说明 |
|---|---|
| `learning_object_id` | 关联主表，必须是 `word` 类型 |
| `form_type` | 形容词：`positive`/`comparative`/`superlative`；动词：`infinitive`/`imperative`/`present`/`preteritum`/`supinum`/`presens_particip`/`perfekt_particip`；名词：单复数/有无定冠词的四种形式 |
| `form_value` | 具体的词形文字 |

以后要给某个词性加一种目前没考虑到的词形，不用改表结构，加一行就行。

### 3. `learning_object_translations`（母语解释——这张表就是"母语支持层"的落地）

| 字段 | 说明 |
|---|---|
| `learning_object_id` | 关联主表 |
| `native_language` | `zh` / `en` / `es` … |
| `meaning` | 简短释义（原来 `chinese` 字段的角色） |
| `explanation` | 详细解释（原来那个命名错误的 `english` 字段该放的位置——以后不会再有"这个字段到底是不是英文"的困惑，因为字段名不再绑定某种具体语言） |
| `example_translation` | 例句的母语翻译 |
| `cultural_note` | 文化/使用提示——现在完全没地方放，母语支持层特有的内容 |

一个词条可以同时有中文、英文、西班牙语……好几行，加一种母语只是插入新行，不改表结构。这直接解决了"chinese/english 字段写死、加不动"的问题。

### 4. `learning_object_collocations`（固定搭配，带"是否已导出"的追溯）

| 字段 | 说明 |
|---|---|
| `learning_object_id` | 来源词条 |
| `phrase_text` | 搭配原文 |
| `category` | 对应 Fraser/Uttryck 分类之一，未导出前可以为空 |
| `promoted_object_id` | 如果这条搭配已经"导出"成了独立的 Fraser/Uttryck 词条，这里记录新词条的 id |

### 5. `learning_object_relationships`（通用关系表）

| 字段 | 说明 |
|---|---|
| `from_object_id` / `to_object_id` | — |
| `relationship_type` | `related` / `synonym` / `antonym` / `derived_from` 等 |

原来的 `related_words` 字段、以及 Fraser/Uttryck 和来源单词的关联，都走这张表。

---

## 三、Fraser 和 Uttryck 具体怎么落地

两者都只是 `learning_objects` 里 `object_type = phrase` 或 `expression` 的记录，新增一个 `category` 字段：

- **Fraser**：`fixed_phrase` / `verb_phrase` / `prepositional_phrase` / `common_collocation` / `common_phrase`
- **Uttryck**：`idiom` / `everyday_expression` / `colloquial_expression` / `sentence_pattern` / `native_expression`

**"一键导出"具体做什么（原单词词条完全不动，只是多建一条关联记录）：**

1. 在 `learning_objects` 新建一条记录（内容 = 这个搭配/表达，类型 = phrase 或 expression，分类 = 你选的那一个）
2. 在 `learning_object_translations` 里带过去已经写好的母语释义（可以再编辑）
3. 在 `learning_object_relationships` 里建一条"来源于"关系，指回原单词
4. 在 `learning_object_collocations` 里把 `promoted_object_id` 填上，标记"已导出"
5. 原单词详情页照常能看到这条搭配；同时它现在也能在 Fraser/Uttryck 模块里被独立搜索、独立复习

---

## 四、现有词库里的句子/短语怎么分离（低风险方案）

**不是删除重建，是"就地改类型"：**

1. 写脚本扫描现有词库数据，用启发式规则（词条包含多个空格、以句号问号感叹号结尾、pos 已经标了 phrase 但结构像整句等）找出疑似句子/短语的条目
2. 生成一份"待复核清单"给你人工看一遍，**不自动判定**，避免误伤
3. 确认后，把这些条目的 `object_type` 从 `word` 改成 `phrase` 或 `sentence`——**id 不变**，所以即使已经有用户收藏或标记过这些条目，他们的收藏关系不受任何影响，这条记录只是"变身"成了 Fraser（或未来的 Sentence 类型）
4. 词典（Ordbok）的查询逻辑以后只显示 `object_type = word` 的条目，这些条目会自然从词典搜索结果里消失，转而出现在 Fraser 模块里

这个方案的关键点是：**用户已有的数据完全不受影响，因为身份（id）从头到尾没变过**，只是这条记录"是什么类型"被修正了。

---

## 五、多母语支持怎么用这套结构

- `learning_object_translations` 表就是母语支持层本身——加一种新母语，只是插入新行，不用改表结构
- 用户设置（`user_preferences` 表）需要新增"我的母语"字段，前端根据这个字段去查对应语言的那一行
- **界面外壳文案**（按钮、菜单这些"壳"跟着母语切换）是另一套机制，不在这张表里，属于前端的多语言文案包，我会单独出一份方案，不和词条数据混在一起

---

## 六、这次设计还没定下来、需要你确认的点

1. **`id` 的类型**：建议统一为 uuid（现在是 text，且之前审计发现和别的表的外键类型对不上，是个已知 bug）——顺手一起修，你同意吗？
2. **`words` 表要不要改名为 `learning_objects`？**
   - **方案 A（推荐）**：改名，更准确地反映"这张表以后存的不只是单词"，长痛不如短痛，现在改比以后改成本低。
   - **方案 B**：保留 `words` 这个名字，只加 `object_type` 字段。改动更小，但以后每个新接手的人都要记住"这张表其实存了短语和句子"这个隐藏知识，容易造成混淆（之前审计里发现的好几个坑，比如 `english` 字段名不对，都是这种"没改名字导致后人误解"的模式）。
   - 需要你来定。
3. **例句要不要拆成独立表**（更规范，但迁移成本更高），还是先放在主表的一个 jsonb 数组字段里顶一阵子（成本低，以后确认这套结构好用了再拆）？我倾向于先用 jsonb，符合"先验证、别过度设计"的原则。

---

## 七、这次会不会动代码或数据库

**不会。** 这仍然是设计稿。等你确认上面第六部分的几个决策点之后，我会分别拆成三个小计划再跟你确认，不会一次性全改：

1. Supabase 迁移脚本（新建表、迁移现有数据）
2. 词库里句子/短语的清洗与分离脚本
3. `app.js` 里读写词条相关函数的改造计划
