# Ordbok 词条字段规范（按词性）

基于你桌面文稿《词条设计草稿》整理定稿。这份规范是后续数据库迁移和界面改造的直接依据。

**通用字段（所有词性共有）：**

| 展示名 | 技术字段 | 存放位置 |
|---|---|---|
| Ord | `swedish` | `learning_objects.swedish` |
| Uttal | `ipa` | `learning_objects.ipa` |
| Ordklass | `pos` | `learning_objects.pos` |
| Nivå | `cefr_level` | `learning_objects.cefr_level`（A1/A2/B1/B2/C1/C2） |
| Betydelse | `meaning` | `learning_object_translations.meaning`（按母语分行） |
| Svensk förklaring | `swedish_explanation` | `learning_objects.swedish_explanation`（**注意**：这条内容本身是瑞典语写的、面向所有学习者通用的解释，不因母语不同而变化，所以放在主表，不放进按母语区分的 `learning_object_translations`——这也是这次顺手修正的那个历史命名 bug：原来错误命名为 `english` 的字段，内容其实一直是这种"瑞典语解释"，现在给它一个准确的名字和该待的位置） |
| Exempel | — | `learning_object_examples`（瑞典语原句）+ `learning_object_translations.example_translation`（母语翻译） |
| Synonymer / Motsatsord | — | `learning_object_relationships`（`relationship_type = synonym / antonym`） |
| Relaterade ord | — | `learning_object_relationships`（`relationship_type = related`） |
| Fraser / Uttryck | — | `learning_object_collocations`（未导出）或 `learning_object_relationships`（`derived_from`，已导出为独立词条） |
| Lärtips | `learning_tip` | `learning_object_translations.learning_tip`（母语撰写，因为是给学习者看的记忆提示） |

`Lärtips`（学习提示）是你草稿里新增的字段，之前的设计没有——已经补进去了，这是很好的补充，每条词条都可以有一句话的"怎么记住它"提示。

---

## 1. Substantiv（名词）

**Grammatik（结构化词形，存 `word_forms`，`form_type` 取值）：**

| form_type | 说明 | 示例（bok） |
|---|---|---|
| `genus` | en-ord / ett-ord | en-ord |
| `singular_indefinite` | 不定单数 | en bok |
| `singular_definite` | 定单数 | boken |
| `plural_indefinite` | 不定复数 | böcker |
| `plural_definite` | 定复数 | böckerna |
| `declension_group` | 变格类型（含"不规则变化"） | Oregelbunden böjning |

## 2. Verb（动词）

| form_type | 说明 | 示例（skriva） |
|---|---|---|
| `infinitive` | 不定式 | att skriva |
| `present` | 现在时 | skriver |
| `preteritum` | 过去时 | skrev |
| `supinum` | 上程式 | skrivit |
| `imperative` | 命令式 | skriv |
| `verb_group` | 动词分组（含"不规则动词"） | Grupp 4 – oregelbundet verb |
| `perfect_auxiliary` | 完成时助动词 | har |

**搭配细分（存 `learning_object_collocations`，`category` 区分）：** 动词类词条的固定搭配需要区分"常见结构"（`common_collocation`）和"常见介词搭配"（`prepositional_phrase`）——两者在瑞典语语法上意义不同（介词支配关系），保留这个区分，不合并成一类。

**词条关系：** 动词的现在分词（Presens particip）、完成分词（Perfekt particip）如果值得单独收录（见第 8、9 类），通过 `learning_object_relationships`（`relationship_type = derived_from`）关联回本词条，不作为本词条的 `word_forms`。

## 3. Adjektiv（形容词）

**基本变化（`word_forms`）：**

| form_type | 说明 |
|---|---|
| `base_form` | 原形（en-ord） |
| `neuter_form` | ett-ord 形式 |
| `plural_form` | 复数形式 |
| `definite_form` | 定形式 |

**比较级（单独一组 `form_type`，对应你草稿里独立的"Komparation"板块，不并入基本变化）：**

| form_type | 说明 |
|---|---|
| `comparative` | 比较级 |
| `superlative_indefinite` | 最高级（不定形式） |
| `superlative_definite` | 最高级（定形式） |

这是你这次特别要求补的部分——现在的数据库完全没有地方存这些，迁移后会有专门字段。

## 4. Adverb（副词）

| form_type | 说明 |
|---|---|
| `base_form` | 原形 |
| `comparative` | 比较级 |
| `superlative` | 最高级 |

副词的比较级结构比形容词简单（没有性/数/定形式的区分），用同一套 `form_type` 命名体系但只填这三行。

## 5. Preposition（介词）

介词不发生词形变化，不使用 `word_forms`。核心内容是"常见用法"和"常见搭配"，两者都存 `learning_object_collocations`：

- `category = common_usage`（如 på bordet / på jobbet）
- `category = verb_prepositional_phrase`（如 tänka på / vänta på，动词+介词的固定搭配）

## 6. Konjunktion（连词）

连词不发生词形变化。语法说明是解释性文字（不是"值"），存 `learning_object_translations.grammar_note`（按母语撰写，比如"连接主句和从句"这类说明），不拆成 `word_forms`。近义词条（如 därför att、då）存 `learning_object_relationships`（`relationship_type = related`）。

## 7. Personligt pronomen（人称代词）

| form_type | 说明 |
|---|---|
| `subject_form` | 主格 |
| `object_form` | 宾格 |
| `possessive_en` | 属有格（en-ord 形式，如 min） |
| `possessive_ett` | 属有格（ett-ord 形式，如 mitt） |
| `possessive_plural` | 属有格（复数形式，如 mina） |

同组代词（jag/du/han/hon…）互相之间存 `learning_object_relationships`（`relationship_type = related`）。

## 8. Presens particip（现在分词）／ 9. Perfekt particip（完成分词）

这两类**作为独立词条收录**（各自有自己的 `id`、`Uttal`、`Nivå`、`Betydelse`、`Exempel`），不是原动词词条下的一个"词形值"——这是你草稿里体现出来的一个重要设计，因为分词经常已经独立词化（比如 skriven"写好的"本身就是一个常用形容词），值得单独学习和搜索。

**与原动词的关系：** 通过 `learning_object_relationships`（`relationship_type = derived_from`，指向原动词）关联，对应你草稿里的"Ordbildning：Grundverb → Presens/Perfekt particip"。

**Presens particip 的 `word_forms`：**

| form_type | 说明 |
|---|---|
| `participle_form` | 分词本身的形式（通常不因性/数变化） |

**Perfekt particip 的 `word_forms`（像形容词一样变化）：**

| form_type | 说明 |
|---|---|
| `en_form` | en-ord 形式 |
| `ett_form` | ett-ord 形式 |
| `plural_form` | 复数形式 |
| `definite_form` | 定形式 |

**用法说明（"Som adjektiv"/"Som substantiv"/"I passiv betydelse"/"Som predikativ"这几类）：** 存 `learning_object_translations.grammar_note`，每种用法各自配一条 `learning_object_examples` 例句。

---

## 其他 POS：现有系统里有、但你的草稿没提到的类型

现有代码里还有 `pronoun`（泛指代词，草稿细化成了"人称代词"）、`phrase`（Fras）、`abbreviation`（Förkortning）、`other`（其他）。处理方式：

- **`phrase`** 这个 POS 值会被逐步淘汰——以后固定短语应该是独立的 Fraser 词条（`object_type = phrase`），不再是"单词词条里选了 Fras 词性"。现有标了 `phrase` 词性的词条，会在"分离句子/短语"那一步一并处理。
- **`abbreviation`（缩写）和泛指的 `pronoun`** 暂时保留原样，按最简单的结构处理（只有 Betydelse/Exempel，不需要复杂的 `word_forms`），不在这次特别设计，你觉得需要细化的话随时提出来。

---

## 落地后，词条编辑界面会长成什么样

用户添加/编辑单词时，选择词性后，表单会根据词性动态显示对应的结构化字段（比如选"形容词"就出现比较级三个格子，选"动词"就出现五个变位格子），而不是像现在这样只有一个大文本框让人自己按格式打字。这部分界面改造是下一步的工作，这次先把数据结构定下来。
