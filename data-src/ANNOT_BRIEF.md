# KOTONOHA — annotation brief (read fully before writing)

KOTONOHA is a 3D game that takes **Brazilian Portuguese** speakers from zero to fluent Japanese (10 000+
words, all 2 136 jōyō kanji). You are annotating a batch of real Japanese words (from the JLPT lists and
JMdict frequency lists) so they can be taught in the game. Each word becomes a word card: written form,
kana reading, automatic romaji, **Portuguese meaning**, theme (which lesson/NPC teaches it), and one
**example sentence** read aloud by a Japanese voice.

A learner will memorise exactly what you write, so be precise and natural. You are an expert Japanese
teacher who is a native-level speaker of Brazilian Portuguese.

## Input

`data-src/annot/in-XX.jsonl` (inside `/home/user/kotonoha`): one JSON object per line:

```json
{"i":"j2145","w":"取り上げる","r":"とりあげる","n":3,"pos":"v1","en":"to pick up; to adopt (a proposal), to take up (a topic)"}
```

`w` written form, `r` reading, `n` JLPT level (5 easy … 1 hard), `pos` part of speech guessed from JMdict,
`en` English glosses from JMdict (only a hint: the JLPT list meant the most common sense).

## Output

`data-src/annot/out-XX.jsonl` (same XX): exactly one line per input line, same order, same `i`:

```json
{"i":"j2145","pt":"pegar (do chão); levantar (um assunto); confiscar","t":"acoes","ex":["先生は私の意見を取り上げてくれた。","O professor levou minha opinião em consideração."]}
```

| key | required | rule |
|---|---|---|
| `i` | yes | copied from the input |
| `pt` | yes | Portuguese (Brazil) meaning: concise, lowercase (except proper nouns), the most common sense first, at most 3 senses separated by `; `. Verbs in the infinitive, adjectives in masculine singular, nouns without articles. Add a short clarifier in parentheses when the bare word would be ambiguous (`banco (instituição)`). |
| `t` | yes | theme id from the list below (the one a learner would expect to find it in) |
| `ex` | yes | `[japanese, portuguese]`: ONE short natural example sentence (ideally 8–25 characters) using the word in its most common sense, written the way a native writes it (kanji as natives use them), with simpler vocabulary than the word itself whenever possible; and a natural Brazilian translation. Suffixes/prefixes: show them attached to a word. Avoid names of real people/brands. |
| `pos` | only to fix | correct part of speech if the input one is wrong, using: `n` `vs` (noun that takes する) `pn` `pron` `num` `ctr` `suf` `pref` `prt` `conj` `int` `exp` `adv` `adj-i` `adj-ix` `adj-na` `adj-no` `adj-pn` `cop` `aux` `v1` `v5u` `v5k` `v5k-s` `v5g` `v5s` `v5t` `v5n` `v5b` `v5m` `v5r` `v5r-i` `v5aru` `vk` `vs-i`. Verb classes must be exact (they drive automatic conjugation). |
| `w` / `r` | only to fix | if the written form is not how a native normally writes the word today (e.g. a kana word given in rare kanji, or vice versa), give the normal spelling in `w` (and `r` if the reading was wrong). `r` must be kana only. |
| `reg` | optional | register when not neutral: `polido`, `casual`, `giria`, `anime`, `antigo`, `keigo`, `kansai` |
| `note` | optional | ≤ 140 characters of Portuguese, only when genuinely useful (nuance vs a similar word, formal/written only, counter usage, false friend…) |
| `skip` | optional | `true` only if the entry is broken or a duplicate of another line in the same batch; still include `i`. |

Write the output with your file-writing tool. You may write it in several parts (`out-XX.part1.jsonl`, …) and
join them with `cat` into `out-XX.jsonl`, then delete the parts. Every line must be valid JSON.

## Themes (`t`)

| id | covers |
|---|---|
| `saudacoes` | greetings, set phrases, interjections, polite formulas |
| `numeros` | numbers, counters, quantities, units, measurement |
| `familia` | people, family, ages, generic human roles |
| `animais` | animals, insects, fish (as creatures) |
| `cores` | colours, shapes, patterns |
| `natureza` | nature, plants, weather, geography, landscape, environment |
| `comida` | food, drink, cooking, tastes, tableware, restaurants' food |
| `roupas` | clothes, accessories, appearance, fashion, cosmetics |
| `compras` | shopping, shops, prices, buying and selling, money in daily life |
| `casa` | home, furniture, household objects, chores, daily routine items |
| `tempo` | time, dates, calendar, seasons, frequency, periods |
| `escola` | school, study, exams, education, academic life |
| `corpo` | body parts, physical states, basic health |
| `saude` | medicine, illness, hospital, treatment (advanced health) |
| `verbos` | very common everyday verbs (mostly N5–N4) |
| `acoes` | other verbs: actions, movement, handling things, general activity |
| `adjetivos` | general descriptive adjectives and qualities |
| `estado` | states, changes, conditions, degrees, increase/decrease, abstract qualities |
| `gramatica` | particles, pronouns, demonstratives, question words, auxiliaries, grammatical words |
| `adverbios` | adverbs, conjunctions, connectors, positions and directions |
| `sentimentos` | feelings, emotions, personality, attitudes |
| `relacoes` | social relations, love, friendship, manners, social life, conflict |
| `mente` | thinking, ideas, opinions, knowledge, abstract concepts, logic |
| `comunicacao` | language, speaking, writing, reading, books, news, media, mail, phone |
| `cidade` | town, buildings, places, transport, traffic, roads |
| `viagem` | travel, tourism, hotels, airports, sightseeing, luggage |
| `trabalho` | jobs, professions, company life, office, career |
| `negocios` | economy, business, finance, trade, industry, taxes |
| `sociedade` | society, politics, government, law, crime, military, international relations |
| `ciencia` | science, mathematics, technology concepts, research, chemistry, physics, space |
| `tecnologia` | machines, computers, internet, electronics, tools, vehicles' mechanics |
| `arte` | art, music, literature, culture, entertainment, traditional arts |
| `lazer` | sports, games, hobbies, leisure, festivals |
| `historia` | history, religion, shrines/temples, traditions, war in history, old customs |
| `expressoes` | idioms, proverbs, four-character compounds (四字熟語), set literary expressions |
| `onomatopeia` | sound-symbolic words (擬音語・擬態語: どきどき, ぺらぺら, きらきら…) |

## Quality checklist (check every line)

- The Portuguese is what a Brazilian would actually say (`ônibus`, `celular`, `banheiro`, `geladeira`, not
  Portugal Portuguese), and it matches the JLPT-intended sense.
- The example really uses this exact word (conjugated forms are fine), in its main sense, and the Japanese
  is natural, correct and simple. The translation matches the example.
- Every line has `i`, `pt`, `t`, `ex`. Same number of lines as the input.

Validate with (run from `/home/user/kotonoha`):

```bash
node tools/validate-annot.mjs XX
```

Fix everything it reports. Do not touch other batches. Reply in at most 3 lines: the batch, the number of
lines written, and anything you were unsure about.
