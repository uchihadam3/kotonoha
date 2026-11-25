/** Kana inventory for lessons, the kana chart and the fireflies game. */
import { GOJUON, DAKUTEN, YOON, toKatakana, toRomaji } from './kana';

export interface KanaItem {
  ch: string;
  ro: string;
  set: 'hira' | 'kata';
  group: 'basic' | 'dakuten' | 'yoon';
  row: number;
}

function build(): KanaItem[] {
  const out: KanaItem[] = [];
  const add = (h: string, group: KanaItem['group'], row: number) => {
    out.push({ ch: h, ro: toRomaji(h), set: 'hira', group, row });
  };
  GOJUON.forEach((r, i) => r.forEach((c) => c && add(c, 'basic', i)));
  DAKUTEN.forEach((r, i) => r.forEach((c) => c && add(c, 'dakuten', i)));
  YOON.forEach((r, i) => r.forEach((c) => add(c, 'yoon', i)));
  const kata = out.map((k) => ({ ...k, ch: toKatakana(k.ch), set: 'kata' as const }));
  return [...out, ...kata];
}

export const KANA = build();
export const HIRAGANA = KANA.filter((k) => k.set === 'hira');
export const KATAKANA = KANA.filter((k) => k.set === 'kata');

/** mnemonic hints for the 46 basic hiragana (Portuguese) */
export const MNEMO: Record<string, string> = {
  あ: 'a: uma Antena com um laço', い: 'i: duas enguias lado a lado', う: 'u: alguém com dor de barriga gritando "Uuu"', え: 'e: um pássaro Exótico dançando', お: 'o: um jogador de golfe com a bola (O)',
  か: 'ka: alguém dizendo "Ka-ching" com a espada', き: 'ki: uma chave (Key)', く: 'ku: o bico de um pássaro (cuco)', け: 'ke: um barril de Keg', こ: 'ko: duas minhocas (ko-ko)',
  さ: 'sa: um rosto de Samurai', し: 'shi: um anzol de pesca (She-fishing)', す: 'su: um balanço (swing)', せ: 'se: uma boca dizendo "Say!"', そ: 'so: uma costura em zigue-zague (sew)',
  た: 'ta: as letras t e a juntas', ち: 'chi: uma líder de torcida (Cheerleader)', つ: 'tsu: uma onda de Tsunami', て: 'te: um Telescópio', と: 'to: um dedão do pé (toe) com prego',
  な: 'na: uma freira rezando (nun)', に: 'ni: um joelho (knee)', ぬ: 'nu: macarrão (noodles) com garfo', ね: 'ne: um gato (neko) com rabo enrolado', の: 'no: um sinal de proibido (No!)',
  は: 'ha: alguém rindo "Ha-ha"', ひ: 'hi: um sorriso que ri "hihi"', ふ: 'fu: o Monte Fuji', へ: 'he: uma montanha suave', ほ: 'ho: um espantalho com "Ho ho ho"',
  ま: 'ma: uma Mamãe com tranças', み: 'mi: o número 21 ("Me" tem 21)', む: 'mu: uma vaca mugindo "Muu"', め: 'me: um olho (Me = olho)', も: 'mo: um anzol com mais (more) iscas',
  や: 'ya: um Iaque com chifres', ゆ: 'yu: um peixe (U-fish)', よ: 'yo: um ioiô', ら: 'ra: um coelho (rabbit) sentado', り: 'ri: um rio (river) com dois braços',
  る: 'ru: um laço que dá a volta (loop)', れ: 're: alguém dançando (re-dance)', ろ: 'ro: uma estrada (road) que não se fecha', わ: 'wa: uma cachoeira (water)', を: 'wo/o: alguém engasgando "wo!"', ん: 'n: a letra n em cursiva',
};

export function kanaRomajiList(set: 'hira' | 'kata' | 'both' = 'hira', groups: KanaItem['group'][] = ['basic']) {
  return KANA.filter((k) => (set === 'both' || k.set === set) && groups.includes(k.group)).map((k) => ({ ch: k.ch, ro: k.ro }));
}
