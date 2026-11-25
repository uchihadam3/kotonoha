/**
 * The journey: eleven places on the island of Kotonoha, each opened by the number of learned words
 * (leaves on the Great Tree). Every place teaches its own themes and ways of speaking.
 */

export interface RegionDef {
  id: string;
  name: string;
  jp: string;
  kana: string;
  /** learned words needed to enter */
  req: number;
  /** JLPT-style level label shown on the map */
  level: string;
  x: number;
  z: number;
  r: number;
  /** ground height of the flat area */
  y: number;
  themes: string[];
  /** speech registers taught by people here */
  registers: string[];
  music: string;
  amb: 'wind' | 'sea' | 'night' | 'city' | 'stream' | 'rain';
  desc: string;
  color: string;
}

export const REGIONS: RegionDef[] = [
  {
    id: 'praia', name: 'Praia do Amanhecer', jp: '朝日浜', kana: 'あさひはま', req: 0, level: '入門 · Começo',
    x: 20, z: 330, r: 42, y: 1.4, themes: ['saudacoes'], registers: ['polido', 'casual'], music: 'beach', amb: 'sea',
    desc: 'Onde a sua jornada começa. Kon, a raposa-espírito, ensina hiragana e os primeiros cumprimentos.', color: '#ffd59a',
  },
  {
    id: 'vila', name: 'Vila do Amanhecer', jp: '朝日村', kana: 'あさひむら', req: 0, level: 'N5',
    x: 0, z: 212, r: 62, y: 3, themes: ['saudacoes', 'numeros', 'familia', 'animais', 'natureza', 'casa', 'cores'], registers: ['polido', 'casual'], music: 'village', amb: 'stream',
    desc: 'Casinhas de madeira, arrozais e um lago de carpas. Família, números, natureza e a casa.', color: '#9be08a',
  },
  {
    id: 'comercio', name: 'Rua do Comércio', jp: '商店街', kana: 'しょうてんがい', req: 60, level: 'N5',
    x: 168, z: 160, r: 56, y: 3.5, themes: ['comida', 'compras', 'roupas', 'cores', 'onomatopeia'], registers: ['keigo', 'giria', 'casual'], music: 'market', amb: 'city',
    desc: 'Lanternas, barracas e lojinhas. Comida, compras, katakana, contadores, gírias e o keigo das lojas.', color: '#ffb26b',
  },
  {
    id: 'escola', name: 'Escola da Colina', jp: '丘の学校', kana: 'おかのがっこう', req: 200, level: 'N5',
    x: -165, z: 148, r: 56, y: 12, themes: ['escola', 'tempo', 'verbos', 'adjetivos', 'gramatica', 'corpo'], registers: ['polido', 'casual', 'anime'], music: 'school', amb: 'wind',
    desc: 'Uma escola entre cerejeiras. Verbos, adjetivos, gramática, o tempo, a forma polida e a casual.', color: '#f6b8cf',
  },
  {
    id: 'santuario', name: 'Santuário da Raposa', jp: '稲荷神社', kana: 'いなりじんじゃ', req: 450, level: 'N5 → N4',
    x: -30, z: 38, r: 56, y: 20, themes: ['sentimentos', 'adverbios', 'historia', 'arte', 'natureza'], registers: ['keigo', 'antigo', 'polido'], music: 'shrine', amb: 'wind',
    desc: 'Mil torii vermelhos sobem a colina até o santuário de Kon. Sentimentos, keigo e as palavras antigas.', color: '#ff6b5a',
  },
  {
    id: 'porto', name: 'Cidade do Porto', jp: '港町', kana: 'みなとまち', req: 900, level: 'N4',
    x: 272, z: 8, r: 66, y: 2, themes: ['cidade', 'viagem', 'trabalho', 'acoes', 'relacoes'], registers: ['polido', 'casual', 'keigo'], music: 'port', amb: 'sea',
    desc: 'Barcos, peixarias e o farol. Viagem, trabalho, direções, transporte e a vida na cidade.', color: '#7cc6ff',
  },
  {
    id: 'neon', name: 'Cidade Neon', jp: 'ネオン街', kana: 'ネオンがい', req: 1700, level: 'N3',
    x: 300, z: -205, r: 76, y: 4, themes: ['tecnologia', 'comunicacao', 'lazer', 'estado', 'adjetivos'], registers: ['giria', 'anime', 'casual', 'keigo'], music: 'city', amb: 'city',
    desc: 'Arranha-céus, letreiros de neon, otakus e escritórios. Tecnologia, mídia, gírias, anime e keigo de empresa.', color: '#ff5ad1',
  },
  {
    id: 'termas', name: 'Vila das Termas', jp: '温泉郷', kana: 'おんせんきょう', req: 3000, level: 'N3',
    x: -282, z: -48, r: 60, y: 24, themes: ['saude', 'relacoes', 'sentimentos', 'corpo', 'onomatopeia'], registers: ['kansai', 'casual', 'polido'], music: 'onsen', amb: 'stream',
    desc: 'Vapor entre as montanhas, ryokans e viajantes de Osaka. Saúde, relações, emoções e o dialeto de Kansai.', color: '#9fe3d0',
  },
  {
    id: 'castelo', name: 'Cidade do Castelo', jp: '城下町', kana: 'じょうかまち', req: 4500, level: 'N2',
    x: -192, z: -242, r: 70, y: 10, themes: ['sociedade', 'negocios', 'historia', 'trabalho'], registers: ['antigo', 'keigo', 'polido'], music: 'castle', amb: 'wind',
    desc: 'Um castelo branco sobre muralhas de pedra. Sociedade, política, negócios, história e a fala dos samurais.', color: '#e8e2d0',
  },
  {
    id: 'templo', name: 'Templo da Montanha', jp: '山寺', kana: 'やまでら', req: 6500, level: 'N2 → N1',
    x: 92, z: -312, r: 56, y: 40, themes: ['mente', 'ciencia', 'arte', 'expressoes', 'comunicacao'], registers: ['antigo', 'keigo'], music: 'temple', amb: 'wind',
    desc: 'Um pagode entre pinheiros e névoa. Ideias, ciência, arte, provérbios e expressões de quatro kanji.', color: '#c7b6ff',
  },
  {
    id: 'pico', name: 'Pico Sagrado', jp: '霊峰', kana: 'れいほう', req: 9000, level: 'N1',
    x: -20, z: -442, r: 52, y: 92, themes: ['mente', 'sociedade', 'expressoes', 'estado'], registers: ['antigo', 'keigo', 'giria', 'anime', 'kansai', 'polido', 'casual'], music: 'peak', amb: 'wind',
    desc: 'O topo do mundo, onde a Grande Árvore espera as dez mil folhas. Tudo o que você aprendeu, junto.', color: '#fff3c8',
  },
];

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/** road network (pairs of region ids, with optional waypoints) */
export const ROADS: { a: string; b: string; via?: [number, number][] }[] = [
  { a: 'praia', b: 'vila', via: [[12, 280]] },
  { a: 'vila', b: 'comercio', via: [[80, 196]] },
  { a: 'vila', b: 'escola', via: [[-80, 190]] },
  { a: 'vila', b: 'santuario', via: [[-10, 130]] },
  { a: 'comercio', b: 'porto', via: [[230, 100]] },
  { a: 'porto', b: 'neon', via: [[300, -90]] },
  { a: 'santuario', b: 'termas', via: [[-160, 0]] },
  { a: 'termas', b: 'castelo', via: [[-250, -150]] },
  { a: 'santuario', b: 'castelo', via: [[-110, -110]] },
  { a: 'neon', b: 'templo', via: [[200, -280]] },
  { a: 'castelo', b: 'templo', via: [[-50, -300]] },
  { a: 'templo', b: 'pico', via: [[40, -390]] },
];

/** where the Great Tree stands (on the sacred peak) */
export const TREE_POS = { x: -20, z: -458 };

/** rank titles by learned words */
export const RANKS: { at: number; jp: string; kana: string; pt: string }[] = [
  { at: 0, jp: '旅人', kana: 'たびびと', pt: 'Viajante' },
  { at: 10, jp: '見習い', kana: 'みならい', pt: 'Aprendiz' },
  { at: 50, jp: '初心者', kana: 'しょしんしゃ', pt: 'Iniciante' },
  { at: 150, jp: '学生', kana: 'がくせい', pt: 'Estudante' },
  { at: 300, jp: '話し手', kana: 'はなして', pt: 'Falante' },
  { at: 600, jp: '語り部', kana: 'かたりべ', pt: 'Contador de histórias' },
  { at: 1000, jp: '言葉使い', kana: 'ことばづかい', pt: 'Mestre das palavras' },
  { at: 2000, jp: '文人', kana: 'ぶんじん', pt: 'Letrado' },
  { at: 3500, jp: '賢者', kana: 'けんじゃ', pt: 'Sábio' },
  { at: 5000, jp: '師範', kana: 'しはん', pt: 'Mestre' },
  { at: 7500, jp: '達人', kana: 'たつじん', pt: 'Grão-mestre' },
  { at: 10000, jp: '言霊使い', kana: 'ことだまつかい', pt: 'Senhor do Kotodama' },
];

export function rankFor(leaves: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (leaves >= x.at) r = x;
  return r;
}

/** the JLPT-style level a learner with N words roughly has */
export function levelFor(leaves: number): string {
  if (leaves >= 8000) return 'N1';
  if (leaves >= 5500) return 'N2';
  if (leaves >= 3000) return 'N3';
  if (leaves >= 1400) return 'N4';
  if (leaves >= 600) return 'N5';
  return 'Pré-N5';
}

/** word levels unlock with the number of learned words */
export const LEVEL_UNLOCK: Record<number, number> = { 5: 0, 4: 250, 3: 800, 2: 2400, 1: 4000 };

export const THEME_NAMES: Record<string, { pt: string; jp: string }> = {
  saudacoes: { pt: 'Cumprimentos e expressões', jp: '挨拶' },
  numeros: { pt: 'Números e contagem', jp: '数' },
  familia: { pt: 'Pessoas e família', jp: '家族' },
  animais: { pt: 'Animais', jp: '動物' },
  cores: { pt: 'Cores e formas', jp: '色' },
  natureza: { pt: 'Natureza e clima', jp: '自然' },
  comida: { pt: 'Comida e bebida', jp: '食べ物' },
  roupas: { pt: 'Roupas e aparência', jp: '服' },
  compras: { pt: 'Compras e lojas', jp: '買い物' },
  casa: { pt: 'Casa e objetos', jp: '家' },
  tempo: { pt: 'Tempo e calendário', jp: '時間' },
  escola: { pt: 'Escola e estudo', jp: '学校' },
  corpo: { pt: 'Corpo e saúde', jp: '体' },
  saude: { pt: 'Saúde e medicina', jp: '健康' },
  verbos: { pt: 'Verbos essenciais', jp: '動詞' },
  acoes: { pt: 'Ações e movimentos', jp: '動作' },
  adjetivos: { pt: 'Adjetivos', jp: '形容詞' },
  estado: { pt: 'Estados e mudanças', jp: '状態' },
  gramatica: { pt: 'Gramática e partículas', jp: '文法' },
  adverbios: { pt: 'Advérbios e direções', jp: '副詞' },
  sentimentos: { pt: 'Sentimentos', jp: '気持ち' },
  relacoes: { pt: 'Relações sociais', jp: '人間関係' },
  mente: { pt: 'Pensamento e ideias', jp: '考え' },
  comunicacao: { pt: 'Língua e comunicação', jp: '言葉' },
  cidade: { pt: 'Cidade e transporte', jp: '町' },
  viagem: { pt: 'Viagem e turismo', jp: '旅行' },
  trabalho: { pt: 'Trabalho e profissões', jp: '仕事' },
  negocios: { pt: 'Economia e negócios', jp: '経済' },
  sociedade: { pt: 'Sociedade e política', jp: '社会' },
  ciencia: { pt: 'Ciência', jp: '科学' },
  tecnologia: { pt: 'Tecnologia', jp: '技術' },
  arte: { pt: 'Arte e cultura', jp: '文化' },
  lazer: { pt: 'Esporte e lazer', jp: '趣味' },
  historia: { pt: 'História e tradição', jp: '歴史' },
  expressoes: { pt: 'Expressões e provérbios', jp: '慣用句' },
  onomatopeia: { pt: 'Onomatopeias', jp: '擬音語' },
  keigo: { pt: 'Keigo (honoríficos)', jp: '敬語' },
  casual: { pt: 'Fala casual', jp: 'タメ口' },
  giria: { pt: 'Gírias', jp: '若者言葉' },
  anime: { pt: 'Fala de anime', jp: 'アニメ語' },
  antigo: { pt: 'Japonês antigo', jp: '古語' },
  kansai: { pt: 'Dialeto de Kansai', jp: '関西弁' },
};

export const REGISTER_NAMES: Record<string, { pt: string; jp: string; desc: string }> = {
  polido: { pt: 'Polido', jp: '丁寧語', desc: 'です/ます: com desconhecidos, professores, no trabalho.' },
  casual: { pt: 'Casual', jp: 'タメ口', desc: 'Com amigos, família e crianças.' },
  giria: { pt: 'Gíria', jp: '若者言葉', desc: 'Jovens e internet. Só entre amigos.' },
  anime: { pt: 'Anime', jp: 'アニメ語', desc: 'Jeito de falar de personagens. Na vida real, cuidado!' },
  antigo: { pt: 'Antigo', jp: '古語', desc: 'Japonês clássico e de samurais.' },
  keigo: { pt: 'Keigo', jp: '敬語', desc: 'Honorífico e humilde: clientes, chefes, cerimônias.' },
  kansai: { pt: 'Kansai', jp: '関西弁', desc: 'Dialeto de Osaka, Kyoto e Kobe.' },
};
