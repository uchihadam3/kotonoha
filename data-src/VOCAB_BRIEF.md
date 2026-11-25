# KOTONOHA — vocabulary brief (read fully before writing)

KOTONOHA is a 3D game that teaches Japanese **from absolute zero to fluency** to **Brazilian Portuguese**
speakers. Every word the player learns becomes a glowing leaf on a Great Tree. Words are shown on word
cards: written form, kana reading, romaji (generated automatically from the kana), the Portuguese meaning,
the speech register, a short usage note, and an example sentence. A Japanese voice (browser TTS) reads the
word (`w`) and the example (`ex.jp`) aloud. The **order** of entries in each file is the curriculum: the game
cuts each theme into lessons of 8 words in file order, so put the most essential, most frequent, most useful
words first and the rarer ones last.

Accuracy matters more than quantity: a learner will memorise exactly what you write. Use natural, modern,
standard Japanese (unless the theme is about a special register), correct kanji (jōyō where possible), the
way a native writes it today. Family-friendly content only (no sexual words, no slurs; mild rudeness is fine
in the anime/slang registers if the note explains it).

## Output

One JSON file per theme: `data-src/vocab/<theme>.json` (inside `/home/user/kotonoha`). The file is a JSON
array of entries, UTF-8, no comments, no trailing commas. Write it with your file-writing tool (you may write
it in parts and then join them, but the final file must be a single valid JSON array).

## Entry fields

```json
{
  "w": "猫",
  "r": "ねこ",
  "pt": "gato",
  "n": 5,
  "pos": "n",
  "ex": { "jp": "猫が好きです。", "r": "ねこ が すき です。", "pt": "Eu gosto de gatos." }
}
```

| key | required | meaning |
|---|---|---|
| `w` | yes | the word as natives normally write it. Use kanji when that is the normal spelling (猫, 食べる, 学校), kana when the word is normally written in kana (ありがとう, とても, もう, りんご is fine as りんご), katakana for loanwords (コーヒー). For phrases, the whole phrase (よろしくお願いします). Suffix/grammar items may start with `～` (e.g. `～じゃん`). |
| `r` | yes | the full reading **in kana only**: hiragana for native/Sino-Japanese words, katakana for katakana words (`"r": "コーヒー"`). No spaces, no romaji, no `～`. For `～じゃん` write `"r": "じゃん"`. |
| `pt` | yes | Portuguese (Brazil) meaning. Concise, lowercase (except proper nouns), up to 3 senses separated by `; `. Verbs in the infinitive (`comer`), adjectives in masculine singular (`grande`), phrases with the natural Brazilian equivalent (`muito obrigado`, `bom dia`). For particles, the function: `partícula de objeto direto`. |
| `n` | yes | JLPT-style level 5 (easiest, N5) … 1 (hardest, N1). Slang/anime/archaic words: use the level whose learner would meet them (most are 3–2). |
| `pos` | yes | part of speech, one of: `n` noun · `pn` proper noun · `pron` pronoun · `num` number · `ctr` counter · `suf` suffix · `pref` prefix · `prt` particle · `conj` conjunction · `int` interjection · `exp` expression/phrase · `adv` adverb · `adj-i` い-adjective · `adj-ix` いい/よい · `adj-na` な-adjective · `adj-no` の-adjective · `adj-pn` pre-noun adjectival (この, 大きな) · `cop` copula (だ, です) · `aux` auxiliary (ます, ～たい) · verbs: `v1` ichidan (食べる, 見る), `v5u` `v5k` `v5g` `v5s` `v5t` `v5n` `v5b` `v5m` `v5r` godan by ending (買う=v5u, 書く=v5k, 泳ぐ=v5g, 話す=v5s, 待つ=v5t, 死ぬ=v5n, 遊ぶ=v5b, 読む=v5m, 帰る=v5r), `v5k-s` 行く, `v5r-i` ある, `v5aru` いらっしゃる/おっしゃる/くださる/なさる/ござる, `vk` 来る, `vs-i` する itself and compound verbs written with する (勉強する), `vs` a noun that takes する written WITHOUT する (勉強 — prefer plain nouns for these). The verb class is used to conjugate automatically (ます, て, ない, た forms), so it must be exact (帰る/入る/走る/知る/切る/要る are godan `v5r`; 見る/着る/起きる/借りる are ichidan `v1`). |
| `reg` | when not neutral | speech register: `polido` (teineigo: です/ます style, polite set phrases), `casual` (タメ口 with friends/family), `giria` (youth/internet slang), `anime` (role language and phrasing typical of anime/manga, often unnatural in real life), `antigo` (classical/archaic/samurai/historical Japanese), `keigo` (honorific 尊敬語 or humble 謙譲語 language), `kansai` (Kansai dialect). Leave it out for neutral words. |
| `note` | required when `reg` is set; optional otherwise | a short note in Portuguese (≤ 160 characters) about **who says it and when**, or a tricky point (`Lê-se "wa" quando é partícula.`, `Forma humilde: usada para falar das próprias ações com clientes ou superiores.`, `Fala de garotos em anime; na vida real soa arrogante.`). |
| `ex` | for about half of the entries (always for the first 40% of each file) | example sentence: `jp` written naturally (kanji as natives use them, simple grammar at or below the word's level, mostly N5–N4 vocabulary), `r` the complete reading in kana **with a space between every word and particle** (Genki style: `わたし は がくせい です。`; punctuation 。、！？ glued to the previous word; numbers spelled in kana), `pt` a natural Brazilian translation. |
| `ro` | only when needed | romaji override, lowercase. Romaji is generated from `r`, so only add `ro` when that would be wrong because the kana is not read as written — mainly the particles inside fixed phrases: `こんにちは` → `"ro": "konnichiwa"`, `こんばんは` → `"ro": "konbanwa"`, `では` → `"ro": "dewa"`. |

## Validate before you finish

From `/home/user/kotonoha` run:

```bash
node tools/validate-vocab.mjs data-src/vocab/<theme>.json
```

Fix every error. Then read the preview to check readings and meanings word by word:

```bash
PREVIEW=1 node tools/validate-vocab.mjs data-src/vocab/<theme>.json
```

Do not touch files of other themes. When done, reply with one line per file (`theme: N words, M examples`)
plus any entries you were unsure about. Keep the reply short.

## Themes and who owns them

Each theme belongs to one writer. Stay inside your own themes; if a word clearly belongs to another theme,
leave it to that writer (cross-theme duplicates are removed automatically later, keeping the owner's copy).
Target sizes are approximate: quality first.

**Writer A**
- `saudacoes` (~55) — greetings and set expressions, in polite AND casual versions where both exist (おはようございます [polido] / おはよう [casual], ありがとうございます / ありがとう, さようなら, じゃあね?→casual list is writer F, but greeting pairs live HERE), すみません, ごめんなさい, いただきます, ごちそうさまでした, はい, いいえ, はじめまして, よろしくお願いします, おやすみなさい, いってきます, いってらっしゃい, ただいま, おかえりなさい, おめでとうございます, どうぞ, どうも, 大丈夫, 頑張って, お元気ですか, etc.
- `numeros` (~40) — 0–10, 百, 千, 万, 半, native counting ひとつ…とお, いくつ, 一番, 番, 何 (なん), number words needed to count to 10 000.
- `familia` (~50) — people and family, with the humble/plain vs respectful pairs (父 / お父さん, 母 / お母さん, 兄 / お兄さん …), 人, 男, 女, 子ども, 友達, 家族, 赤ちゃん, 大人, 名前, みんな, 自分, 夫, 妻, 両親, 兄弟, 祖父/おじいさん, 祖母/おばあさん, 彼氏, 恋人…
- `animais` (~40) — animals (犬, 猫, 鳥, 魚, 馬, 牛, 豚, 猿, 熊, 狐, 狸, 兎, 鼠, 虎, 竜, 蛇, 亀, 蛙, 虫, 蝶, 鯉, 金魚, 鹿, 象, パンダ, ペンギン, キリン, イルカ, 鯨, 鶏, 烏, 動物, ペット …).
- `cores` (~25) — colours and shapes, including the colour adjectives (赤い, 青い, 白い, 黒い, 黄色い, 茶色い) and nouns (赤, 青, 緑, 紫, 灰色, 金色, 銀色, 水色, ピンク, オレンジ, 丸, 三角, 四角, 星形?…).

**Writer B**
- `natureza` (~60) — nature and weather: 空, 太陽, 月, 星, 雲, 雨, 雪, 風, 天気, 晴れ, 曇り, 嵐, 雷, 虹, 山, 川, 海, 湖, 池, 島, 森, 林, 木, 花, 桜, 草, 葉, 石, 岩, 砂, 土, 火, 水, 光, 影, 自然, 世界, 地球, 空気, 波, 滝, 田んぼ, 竹, 紅葉, 霧, 台風, 地震, 夕日 … (seasons belong to `tempo`).
- `comida` (~90) — food, drinks, Japanese dishes, fruit, vegetables, seasonings, tableware (箸, 皿, 茶碗, コップ) AND the taste adjectives (おいしい, まずい, 甘い, 辛い, 苦い, すっぱい, しょっぱい) and food verbs are writer D's except these: none. 魚 belongs to `animais`; 水 to `natureza`.
- `roupas` (~30) — clothes and accessories AND the Japanese wearing verbs (着る, 履く, 穿く, 被る, 掛ける, 脱ぐ, 締める), 着物, 浴衣, 制服, 靴, 帽子, 眼鏡, 傘, かばん …
- `compras` (~45) — shops and money: 店, 店員, 客, お金, 円, 値段, いくら, ください, いらっしゃいませ (reg keigo), 買う, 売る, 払う, レジ, 財布, 現金, お釣り, 袋, 割引, セール, スーパー, コンビニ, デパート, 市場, 八百屋, 魚屋, 肉屋, パン屋, 本屋, 花屋, 薬屋, and the counters 個, 枚, 本, 匹, 冊, 台, 杯, 人 (にん), 回, 階 (pos `ctr`, note explaining what each counts).

**Writer C**
- `casa` (~65) — home and everyday objects: 家, うち, 部屋, 台所, トイレ, お風呂, 玄関, 窓, ドア, 壁, 床, 屋根, 庭, 階段, テーブル, 机, 椅子, ベッド, 布団, 畳, 冷蔵庫, テレビ, 電話, スマホ, パソコン, 時計, 電気, 鍵, 新聞, 手紙, 写真, 鏡, 箱, 紙, ゴミ, 石鹸, タオル, 歯ブラシ, 掃除, 洗濯, 料理 …
- `tempo` (~70) — time and calendar: 時間, 今, 今日, 明日, 昨日, 毎日, 朝, 昼, 夜, 晩, 夕方, 午前, 午後, 週, 今週, 来週, 先週, 今月, 来月, 先月, 今年, 来年, 去年, all seven weekdays (日曜日 …), 一月 … 十二月 (all twelve), 春, 夏, 秋, 冬, 季節, 誕生日, 休み, 週末, 今朝, 今晩, 最近, 昔, 将来, 未来, ～時, ～分, 半 is writer A's.
- `escola` (~45) — school and study: 学校, 先生, 学生, 生徒, 教室, 授業, 宿題, 試験, テスト, 勉強, 練習, 質問, 答え, 問題, 意味, 言葉, 日本語, 英語, ポルトガル語, 漢字, ひらがな, カタカナ, 本, ノート, 鉛筆, 消しゴム, 辞書, 黒板, 図書館, 大学, 高校, 先輩, 後輩, 部活 …
- `corpo` (~45) — body and health: 体, 頭, 顔, 目, 耳, 鼻, 口, 歯, 首, 肩, 手, 指, 腕, 足, 背中, お腹, 胸, 髪, 声, 病気, 病院, 医者, 薬, 風邪, 熱, 痛い, 怪我, 血 …

**Writer D**
- `verbos` (~130) — the essential verbs, most frequent first: する, 来る, 行く, ある, いる, 見る, 食べる, 飲む, 言う, 話す, 聞く, 読む, 書く, 分かる, 思う, 知る, 帰る, 起きる, 寝る, 待つ, 会う, 作る, 使う, 持つ, 入る, 出る, 始まる, 終わる, 教える, 習う, 覚える, 忘れる, 歩く, 走る, 泳ぐ, 遊ぶ, 働く, 休む, 住む, 開ける, 閉める, あげる, もらう, くれる … EXCLUDING: wearing verbs (roupas), 買う/売る/払う (compras), emotion verbs 怒る/泣く/笑う/驚く (sentimentos), honorific/humble verbs (keigo). No noun+する compounds.
- `adjetivos` (~90) — い/な adjectives: 大きい, 小さい, 新しい, 古い, 高い, 安い, 低い, 長い, 短い, 多い, 少ない, 早い, 速い, 遅い, 近い, 遠い, 暑い, 寒い, 暖かい, 涼しい, 冷たい, 熱い, 明るい, 暗い, 強い, 弱い, 重い, 軽い, 広い, 狭い, いい, 悪い, 楽しい, 面白い, つまらない, 難しい, 易しい, 簡単, 忙しい, 暇, 好き, 嫌い, 上手, 下手, きれい, 静か, にぎやか, 有名, 親切, 便利, 大切, 同じ, 特別, 危ない, 若い, かわいい, かっこいい, すごい, 美しい … EXCLUDING colours (cores), tastes (comida), 痛い (corpo), emotion adjectives 嬉しい/悲しい/寂しい/怖い/恥ずかしい (sentimentos).

**Writer E**
- `gramatica` (~55) — particles (は [ro "wa", note], が, を [note: lê-se "o"], に, で, へ [ro "e"], と, も, の, か, よ, ね, から, まで, より), copula です/だ, pronouns 私, 私たち, あなた, 彼, 彼女, 僕 (reg casual, note), 俺 (reg casual, note), 私 わたくし (reg keigo), demonstratives これ/それ/あれ/どれ, この/その/あの/どの, ここ/そこ/あそこ/どこ, こちら/そちら/あちら/どちら, question words 何, 誰, いつ, どうして, なぜ, どう, どんな.
- `adverbios` (~55) — adverbs, conjunctions and positions: とても, すごく, 少し, ちょっと, たくさん, よく, もう, まだ, また, すぐ, ゆっくり, 一緒に, 全部, いつも, 時々, たまに, 全然, 絶対, 多分, きっと, やっぱり, 本当に, もっと, あまり, ずっと, 特に, 後で, 初めて, だから, でも, しかし, そして, それから, じゃあ, 上, 下, 中, 外, 前, 後ろ, 右, 左, 横, 隣, 間, 東, 西, 南, 北, 近く, 向こう …
- `sentimentos` (~45) — feelings and personality: 気持ち, 心, 愛, 恋, 幸せ, 嬉しい, 悲しい, 寂しい, 怖い, 恥ずかしい, 怒る, 泣く, 笑う, 驚く, 心配, 安心, 夢, 希望, 元気, 優しい, 厳しい, 真面目, 頑固, 素直, 勇気, 自信, 感謝, 緊張, 退屈 …
- `cidade` (~65) — town, places, transport, countries: 町, 村, 市, 国, 日本, ブラジル, 道, 橋, 駅, 電車, 地下鉄, 新幹線, バス, タクシー, 車, 自転車, 飛行機, 空港, 船, 港, 切符, 地図, 信号, 交差点, 角, 銀行, 郵便局, 警察, 交番, ホテル, 旅館, レストラン, 喫茶店, 公園, 神社, お寺, 城, 美術館, 映画館, 会社, 仕事, 建物, 入口, 出口, 旅行, 外国, 外国人 …

**Writer F** (registers — every entry has `reg` and `note`)
- `keigo` (~40) — いらっしゃる, おっしゃる, 召し上がる, ご覧になる, なさる, くださる, 申す, 申し上げる, 参る, いたす, いただく, 伺う, 拝見する, 存じる, おる, 差し上げる, ございます, でございます, かしこまりました, 承知しました, 少々お待ちください, 恐れ入ります, 失礼いたします, お疲れ様です, お世話になっております, よろしくお願いいたします, おかげさまで, お邪魔します, 申し訳ございません, いかがですか, ～様, お/ご (prefixes) … (いらっしゃいませ is writer B's.) Notes must say whether it is 尊敬語 (exalta o outro) or 謙譲語 (rebaixa a si mesmo) and the plain verb it replaces.
- `casual` (~35) — タメ口: うん, ううん, じゃあね, またね, バイバイ, ～じゃん, ～ちゃう, ～てる, ～んだ, そっか, いいよ, だめ, ほんと?, やった, あれ?, えっ, まあ, ちょっと待って, ～なきゃ, ～って, ～かな, ～よね, ～の? … each note says the polite equivalent.
- `giria` (~40) — modern youth and internet slang: マジ, ヤバい, ウケる, エモい, 草, ぴえん, それな, 推し, ガチ, キモい, ダサい, イケメン, 神, リア充, ドタキャン, パクる, ググる, ディスる, ワンチャン, 了解/りょ, あざす, ムカつく, うざい, 映える, 陰キャ, 陽キャ, ぼっち, 尊い, ぶっちゃけ, ハマる, 微妙, 半端ない, ノリ, ドンマイ, オワコン, 爆笑 … notes explain meaning nuance and when it is too informal.
- `anime` (~45) — role language and anime staples: 俺様, 貴様, てめえ, お前, 我, わし, あたし, ～だぜ, ～ぞ, ～のだ, ～じゃ, ～ですわ, ～っす, ～にゃ, お兄ちゃん, お姉ちゃん, ～ちゃん, ～くん, 師匠, 仲間, 絆, 約束, 運命, 必殺技, 覚悟, 修行, 魔法, 勇者, 魔王, 敵, 勝負, 守る, 信じる, 諦める, 行くぞ, 覚悟しろ, なんだと, まさか, ちくしょう, やれやれ, 任せろ, ドキドキ, ワクワク, ツンデレ … notes say which character archetype talks like this and whether it sounds natural in real life.
- `antigo` (~45) — classical/archaic/samurai Japanese: 拙者, 某, 殿, 姫, 侍, 武士, 忍者, 刀, 将軍, 大名, かたじけない, 御免, でござる, 候, 天晴れ, いざ, 汝, そなた, おぬし, ～なり, ～けり, ～ぬ, いと, をかし, あはれ, いにしえ, 誠, 左様, 然り, 否, 御意, 嗚呼, 一期一会, 侘び寂び … notes explain era/usage and the modern equivalent.
- `kansai` (~20) — Kansai dialect: おおきに, あかん, ほんま, なんでやねん, めっちゃ, ～へん, ～や, ちゃう, せや, あほ, しんどい, なんぼ, ええ, かまへん, ほな, まいど … notes give the standard-Japanese equivalent.
- Writer F also writes `data-src/vocab-extra/registros.json` (NOT validated by the script; just valid JSON): ~30 everyday concepts and how each register says them, e.g.
  `{ "pt": "obrigado", "f": { "keigo": {"w":"誠にありがとうございます","r":"まことにありがとうございます"}, "polido": {"w":"ありがとうございます","r":"ありがとうございます"}, "casual": {"w":"ありがとう","r":"ありがとう"}, "giria": {"w":"あざっす","r":"あざっす"}, "anime": {"w":"礼を言うぜ","r":"れいをいうぜ"}, "antigo": {"w":"かたじけない","r":"かたじけない"}, "kansai": {"w":"おおきに","r":"おおきに"} }, "note": "…" }`.
  Concepts: eu, você, obrigado, desculpa, olá, tchau, sim, não, o quê?, sério?, delicioso, legal/incrível, comer, ir, vir, dizer, ver, saber, ser/estar (です/だ/でござる…), amigo, muito, idiota, vamos!, espere, entendi, não sei, por favor, bom dia, estou com fome, que fofo. Leave a register out of `f` when it has no real form for that concept. Every `r` is kana only.
