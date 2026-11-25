# KOTONOHA — conversation brief

KOTONOHA teaches Japanese to Brazilian Portuguese speakers inside a 3D world. Besides words, the player must
learn to hold real conversations **in every register and situation**: polite (です/ます), casual (タメ口),
keigo (honorific 尊敬語 / humble 謙譲語), youth & internet slang, anime role language, archaic/samurai
Japanese and Kansai dialect.

A conversation is a scene with one NPC. The NPC speaks; at each "you" step the player picks what to say
among 3 options: exactly ONE is right for the situation; the two wrong ones are plausible mistakes a
learner makes (wrong register for the person, wrong meaning, wrong set phrase, wrong particle, wrong
honorific direction) and each has a short explanation in Portuguese. This is where the game teaches *when*
to use each way of speaking, so the wrong options must be instructive, not silly.

## Format

One JSON file per conversation: `/home/user/kotonoha/src/data/convos/<id>.json`:

```json
{
  "id": "restaurante",
  "title": "No restaurante",
  "sub": "Pedir uma mesa, o prato e a conta",
  "reg": "keigo",
  "steps": [
    { "npc": ["いらっしゃいませ。何名様ですか。", "Bem-vindo. Quantas pessoas?"] },
    { "you": [
      { "jp": "二人です。", "pt": "Somos dois.", "ok": true, "reg": "polido" },
      { "jp": "二つです。", "pt": "(errado) Dois (objetos).", "ok": false, "why": "Para pessoas use o contador 人: 一人 (ひとり), 二人 (ふたり)." },
      { "jp": "二人だよ。", "pt": "Dois, tá?", "ok": false, "why": "Casual demais com um garçom: use です.", "reg": "casual" }
    ] },
    { "npc": ["...", "..."], "note": "optional one-line cultural tip in Portuguese shown by Kon" }
  ]
}
```

- `reg` of the conversation: the main register it trains (`polido`, `casual`, `keigo`, `giria`, `anime`, `antigo`, `kansai`).
- 5 to 7 "you" steps per conversation, alternating with NPC lines (start with the NPC). The NPC lines must
  make the story move (the scene has a beginning, a middle and an end).
- `npc`: `[japanese, portuguese]`. `you` options: `jp`, `pt` (Brazilian Portuguese translation; mark wrong
  ones with "(errado)" only when the Japanese itself is ungrammatical or misused), `ok`, optional `reg`
  (the register of that option when it matters), `why` (required for wrong options, ≤ 140 chars, in
  Portuguese, says what to use instead).
- `note` (optional, on NPC steps): one cultural or grammar tip (≤ 160 chars).
- Use `○○` where the player's name should appear (it is replaced by the player's name in katakana).
- Natural, correct, modern Japanese (unless the scene is archaic/anime/Kansai on purpose); simple enough for
  the level of the place (early places: N5/N4 vocabulary; later places can be N3–N1). Use kanji normally
  (the game generates readings), put a space between phrases only where natural Japanese would not —
  i.e. write normal Japanese without spaces.
- Every file must be valid JSON. Check each one with:
  `node -e "const c=require('/home/user/kotonoha/src/data/convos/ID.json');for(const s of c.steps){if(s.you&&s.you.filter(o=>o.ok).length!==1)throw new Error('step without exactly one right answer');for(const o of s.you||[])if(!o.ok&&!o.why)throw new Error('wrong option without why')}console.log('ok',c.id,c.steps.length)"`

Do not touch any other files. Reply with one line per file (id, steps) and nothing else.
