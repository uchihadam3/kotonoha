/**
 * Situational conversations. The NPC speaks; at "you" steps the player picks what to say. Wrong options
 * explain why (wrong meaning or wrong register for the situation).
 */

export interface ConvoChoice {
  jp: string;
  pt: string;
  ok: boolean;
  why?: string;
  reg?: string;
}
export interface ConvoStep {
  npc?: [string, string];
  you?: ConvoChoice[];
  note?: string;
}
export interface Convo {
  id: string;
  title: string;
  sub: string;
  reg: string;
  steps: ConvoStep[];
}

export const CONVOS: Convo[] = [
  {
    id: 'konbini', title: 'Na loja de conveniência', sub: 'Comprar um onigiri e responder ao atendente', reg: 'keigo',
    steps: [
      { npc: ['いらっしゃいませ。', 'Bem-vindo.'], note: 'No Japão o cliente não precisa responder a いらっしゃいませ; um leve aceno basta.' },
      { you: [
        { jp: 'これ、お願いします。', pt: 'Isto, por favor.', ok: true, reg: 'polido' },
        { jp: 'これ、くれ。', pt: 'Me dá isso.', ok: false, why: 'くれ é rude demais com um atendente. Use お願いします ou ください.', reg: 'casual' },
        { jp: 'いただきます。', pt: 'Vou comer! (antes da refeição)', ok: false, why: 'いただきます se diz antes de comer, não ao pagar.' },
      ] },
      { npc: ['温めますか？', 'Quer que esquente?'] },
      { you: [
        { jp: 'はい、お願いします。', pt: 'Sim, por favor.', ok: true, reg: 'polido' },
        { jp: 'はい、温めます。', pt: 'Sim, eu vou esquentar.', ok: false, why: '温めます significa "eu esquento". Para pedir, diga お願いします.' },
        { jp: 'おかえりなさい。', pt: 'Bem-vindo de volta.', ok: false, why: 'おかえりなさい é para quem chega em casa.' },
      ] },
      { npc: ['袋は ご利用ですか？', 'Vai usar sacola?'] },
      { you: [
        { jp: 'いいえ、大丈夫です。', pt: 'Não, está tudo bem (não precisa).', ok: true, reg: 'polido' },
        { jp: 'いいえ、大丈夫じゃないです。', pt: 'Não, não estou bem.', ok: false, why: '大丈夫です = "não precisa, obrigado". 大丈夫じゃない = "não estou bem".' },
        { jp: 'はい、袋です。', pt: 'Sim, é uma sacola.', ok: false, why: 'Para aceitar: はい、お願いします.' },
      ] },
      { npc: ['二百五十円で ございます。', 'São 250 ienes (keigo: でございます = です).'] },
      { you: [
        { jp: 'はい、どうぞ。', pt: 'Aqui está.', ok: true, reg: 'polido' },
        { jp: 'いくらですか？', pt: 'Quanto custa?', ok: false, why: 'Ele acabou de dizer o preço: 250円 (にひゃくごじゅうえん).' },
        { jp: 'ごちそうさまでした。', pt: 'Obrigado pela refeição.', ok: false, why: 'ごちそうさま se diz depois de comer.' },
      ] },
      { npc: ['ありがとうございました。またお越しくださいませ。', 'Muito obrigado. Volte sempre.'] },
    ],
  },
  {
    id: 'direcoes', title: 'Pedindo direções', sub: 'Perguntar onde fica a estação ao policial', reg: 'polido',
    steps: [
      { npc: ['こんにちは。どうしましたか？', 'Boa tarde. O que houve?'] },
      { you: [
        { jp: 'すみません、駅は どこですか。', pt: 'Com licença, onde fica a estação?', ok: true, reg: 'polido' },
        { jp: 'おい、駅 どこ？', pt: 'Ei, cadê a estação?', ok: false, why: 'Com um policial (desconhecido), use a forma polida: すみません + ですか.', reg: 'casual' },
        { jp: '駅が 好きです。', pt: 'Eu gosto da estação.', ok: false, why: 'Isso não é uma pergunta de direção.' },
      ] },
      { npc: ['この 道を まっすぐ 行って、二つ目の 角を 右に 曲がって ください。', 'Siga reto por esta rua e vire à direita na segunda esquina.'] },
      { you: [
        { jp: '二つ目の 角を 右ですね。', pt: 'Na segunda esquina, à direita, né?', ok: true, reg: 'polido' },
        { jp: '一つ目の 角を 左ですね。', pt: 'Na primeira esquina, à esquerda, né?', ok: false, why: '二つ目 = segunda; 右 = direita.' },
        { jp: 'まっすぐ 帰ります。', pt: 'Vou direto para casa.', ok: false, why: '帰ります = voltar para casa.' },
      ] },
      { npc: ['はい、そうです。歩いて 五分ぐらいですよ。', 'Isso mesmo. Uns cinco minutos a pé.'] },
      { you: [
        { jp: 'ありがとうございます。', pt: 'Muito obrigado.', ok: true, reg: 'polido' },
        { jp: 'サンキュー！', pt: 'Valeu!', ok: false, why: 'Gíria. Com um policial, agradeça com ありがとうございます.', reg: 'giria' },
        { jp: 'ごめんなさい。', pt: 'Desculpe.', ok: false, why: 'Para agradecer: ありがとうございます.' },
      ] },
      { npc: ['気を つけて。', 'Vá com cuidado.'] },
    ],
  },
  {
    id: 'viagem', title: 'Comprando passagem', sub: 'Uma passagem de balsa para a Cidade Neon', reg: 'keigo',
    steps: [
      { npc: ['いらっしゃいませ。どちらまで いらっしゃいますか。', 'Bem-vindo. Para onde o senhor vai? (いらっしゃる = ir, honorífico)'] },
      { you: [
        { jp: 'ネオン街まで、大人 一枚 お願いします。', pt: 'Até a Cidade Neon, uma de adulto, por favor.', ok: true, reg: 'polido' },
        { jp: 'ネオン街から 来ました。', pt: 'Vim da Cidade Neon.', ok: false, why: 'まで = até; から = de/desde.' },
        { jp: '一枚 いらっしゃいます。', pt: '(errado) Uma "vai".', ok: false, why: 'いらっしゃる é honorífico para as ações do OUTRO. Peça: 一枚 お願いします.' },
      ] },
      { npc: ['片道ですか、往復ですか。', 'Só ida ou ida e volta?'] },
      { you: [
        { jp: '往復で お願いします。', pt: 'Ida e volta, por favor.', ok: true, reg: 'polido' },
        { jp: '片道は 美味しいです。', pt: 'A ida é gostosa.', ok: false, why: '片道 = só ida; 往復 = ida e volta.' },
        { jp: 'はい。', pt: 'Sim.', ok: false, why: 'Era uma escolha entre duas opções: responda 片道 ou 往復.' },
      ] },
      { npc: ['往復で 三千円で ございます。次の 船は 十時 半に 出ます。', 'Ida e volta, 3.000 ienes. O próximo barco sai às 10h30.'] },
      { you: [
        { jp: '十時半ですね。わかりました。', pt: 'Às 10h30, certo. Entendi.', ok: true, reg: 'polido' },
        { jp: '十一時ですね。', pt: 'Às 11h, né?', ok: false, why: '十時半 = 10h30 (半 = meia).' },
        { jp: '三十円ですね。', pt: '30 ienes, né?', ok: false, why: '三千円 = 3.000 ienes (千 = mil).' },
      ] },
    ],
  },
  {
    id: 'trabalho', title: 'Primeiro dia no escritório', sub: 'Apresentar-se aos colegas com keigo', reg: 'keigo',
    steps: [
      { npc: ['はじめまして。小林と 申します。', 'Muito prazer. Meu nome é Kobayashi. (申します = humilde de 言います)'] },
      { you: [
        { jp: 'はじめまして。ブラジルから 参りました。どうぞ よろしく お願いいたします。', pt: 'Muito prazer. Vim do Brasil. Conto com a sua colaboração.', ok: true, reg: 'keigo' },
        { jp: 'よっ、よろしく！', pt: 'E aí, prazer!', ok: false, why: 'No trabalho, com colegas novos, use keigo: 参りました / よろしくお願いいたします.', reg: 'casual' },
        { jp: 'ブラジルから いらっしゃいました。', pt: '(errado) Eu "me dignei" a vir do Brasil.', ok: false, why: 'いらっしゃる exalta o outro; para si mesmo use o humilde 参りました.' },
      ] },
      { npc: ['こちらこそ、よろしく お願いします。お昼は もう 召し上がりましたか。', 'Igualmente. Você já almoçou? (召し上がる = comer, honorífico)'] },
      { you: [
        { jp: 'いいえ、まだ いただいて いません。', pt: 'Não, ainda não comi.', ok: true, reg: 'keigo' },
        { jp: 'はい、召し上がりました。', pt: '(errado) Sim, eu "me dignei" a comer.', ok: false, why: 'Para as suas ações use o humilde いただく, nunca 召し上がる.' },
        { jp: 'お昼は 晩です。', pt: 'O almoço é à noite.', ok: false, why: 'お昼 = almoço/meio-dia.' },
      ] },
      { npc: ['じゃあ、一緒に 行きましょうか。', 'Então, vamos juntos?'] },
      { you: [
        { jp: 'はい、ぜひ。', pt: 'Sim, com certeza!', ok: true, reg: 'polido' },
        { jp: 'お先に 失礼します。', pt: 'Com licença, vou indo antes.', ok: false, why: 'お先に失礼します se diz ao sair do trabalho antes dos outros.' },
        { jp: 'お疲れ様でした。', pt: 'Bom trabalho (despedida).', ok: false, why: 'お疲れ様でした é para o fim do expediente.' },
      ] },
    ],
  },
  {
    id: 'medico', title: 'No consultório', sub: 'Explicar os sintomas ao médico', reg: 'polido',
    steps: [
      { npc: ['今日は どうしましたか。', 'O que houve hoje?'] },
      { you: [
        { jp: '昨日から 頭が 痛いんです。', pt: 'Estou com dor de cabeça desde ontem.', ok: true, reg: 'polido' },
        { jp: '頭が いいです。', pt: 'Sou inteligente (cabeça boa).', ok: false, why: '頭がいい = ser inteligente! Dor = 痛い (いたい).' },
        { jp: '明日 頭が 痛いです。', pt: 'Amanhã estou com dor de cabeça.', ok: false, why: '明日 = amanhã; 昨日から = desde ontem.' },
      ] },
      { npc: ['熱は ありますか。', 'Está com febre?'] },
      { you: [
        { jp: '少し あります。三十七度五分です。', pt: 'Um pouco. 37,5 graus.', ok: true, reg: 'polido' },
        { jp: '熱い お茶が 好きです。', pt: 'Gosto de chá quente.', ok: false, why: '熱 (ねつ) = febre; 熱い (あつい) = quente.' },
        { jp: 'はい、薬です。', pt: 'Sim, é remédio.', ok: false, why: 'Diga se tem febre: 少しあります / ありません.' },
      ] },
      { npc: ['風邪ですね。この 薬を 一日 三回、食後に 飲んで ください。', 'É um resfriado. Tome este remédio 3 vezes ao dia, depois das refeições.'] },
      { you: [
        { jp: 'わかりました。ありがとうございます。', pt: 'Entendi. Muito obrigado.', ok: true, reg: 'polido' },
        { jp: '薬を 食べます。', pt: 'Vou comer o remédio.', ok: false, why: 'Remédio se "bebe" em japonês: 薬を飲む.' },
        { jp: 'お大事に。', pt: 'Melhoras.', ok: false, why: 'お大事に é o que o MÉDICO diz ao paciente.' },
      ] },
      { npc: ['お大事に。', 'Melhoras.'] },
    ],
  },
  {
    id: 'ryokan', title: 'Chegando ao ryokan', sub: 'Check-in numa pousada tradicional', reg: 'keigo',
    steps: [
      { npc: ['ようこそ お越しくださいました。ご予約の お名前を いただけますか。', 'Seja bem-vindo. Poderia me dizer o nome da reserva?'] },
      { you: [
        { jp: '予約した ○○です。', pt: 'Sou ○○, tenho reserva.', ok: true, reg: 'polido' },
        { jp: 'お名前は 何ですか。', pt: 'Qual é o seu nome?', ok: false, why: 'Ela perguntou o SEU nome; não devolva a pergunta.' },
        { jp: '予約しません。', pt: 'Não vou reservar.', ok: false, why: 'Diga o seu nome: ○○です.' },
      ] },
      { npc: ['お待ちしておりました。お夕食は 何時に なさいますか。', 'Estávamos esperando. A que horas deseja o jantar?'] },
      { you: [
        { jp: '七時に お願いします。', pt: 'Às sete, por favor.', ok: true, reg: 'polido' },
        { jp: '七時に なさいます。', pt: '(errado) Eu "me digno" às sete.', ok: false, why: 'なさる é honorífico para o outro. Responda 七時にお願いします.' },
        { jp: '朝ご飯を 食べました。', pt: 'Comi o café da manhã.', ok: false, why: 'Ela perguntou o horário do jantar (夕食).' },
      ] },
      { npc: ['かしこまりました。温泉は 夜 十一時まで ご利用いただけます。', 'Entendido. As termas podem ser usadas até as 23h.'] },
      { you: [
        { jp: 'ありがとうございます。楽しみです！', pt: 'Muito obrigado. Estou ansioso!', ok: true, reg: 'polido' },
        { jp: 'めっちゃ ええやん！', pt: 'Que demais! (Kansai)', ok: false, why: 'Dialeto de Kansai bem informal: com a dona do ryokan prefira o polido.', reg: 'kansai' },
        { jp: '十一時から ですね。', pt: 'A partir das 23h, né?', ok: false, why: 'まで = até; から = a partir de.' },
      ] },
    ],
  },
  {
    id: 'entrevista', title: 'Entrevista de emprego', sub: 'Responder com keigo numa entrevista', reg: 'keigo',
    steps: [
      { npc: ['本日は お越しいただき、ありがとうございます。どうぞ おかけください。', 'Obrigado por vir hoje. Por favor, sente-se.'] },
      { you: [
        { jp: '失礼いたします。', pt: 'Com licença (ao sentar).', ok: true, reg: 'keigo' },
        { jp: 'どうも〜。', pt: 'Valeu~.', ok: false, why: 'Informal demais numa entrevista. Diga 失礼いたします ao sentar.', reg: 'casual' },
        { jp: 'いただきます。', pt: 'Vou comer!', ok: false, why: 'いただきます é antes de comer.' },
      ] },
      { npc: ['では、自己紹介を お願いします。', 'Então, por favor, apresente-se.'] },
      { you: [
        { jp: 'ブラジル出身の ○○と 申します。日本語を 三年 勉強して おります。', pt: 'Sou ○○, do Brasil. Estudo japonês há três anos.', ok: true, reg: 'keigo' },
        { jp: '俺は ○○だ。よろしくな。', pt: 'Eu sou ○○. Prazer, hein.', ok: false, why: '俺 e だ são casuais/masculinos. Numa entrevista: 私 + と申します.', reg: 'casual' },
        { jp: '○○と おっしゃいます。', pt: '(errado) Eu "me digno" a chamar ○○.', ok: false, why: 'おっしゃる é honorífico (para o outro). Para você: 申します.' },
      ] },
      { npc: ['なぜ 弊社を 志望されたのですか。', 'Por que escolheu a nossa empresa?'] },
      { you: [
        { jp: '御社の 技術に 興味が あるからです。', pt: 'Porque me interesso pela tecnologia da sua empresa.', ok: true, reg: 'keigo' },
        { jp: '弊社が 好きだからです。', pt: '(errado) Porque gosto da "nossa humilde empresa".', ok: false, why: '弊社 = a NOSSA empresa (humilde). A empresa do outro é 御社 (おんしゃ).' },
        { jp: 'お金が ほしいっす。', pt: 'Quero grana.', ok: false, why: 'っす é gíria; e a resposta seria mal vista.', reg: 'giria' },
      ] },
      { npc: ['本日は ありがとうございました。結果は 後日 ご連絡いたします。', 'Obrigado por hoje. Informaremos o resultado em outro dia.'] },
    ],
  },
  {
    id: 'reuniao', title: 'Reunião com cliente', sub: 'Keigo de negócios ao telefone', reg: 'keigo',
    steps: [
      { npc: ['はい、林商事でございます。', 'Alô, aqui é a Hayashi Comércio (でございます).'] },
      { you: [
        { jp: 'いつも お世話に なっております。言の葉社の ○○です。', pt: 'Agradeço sempre a atenção. Aqui é ○○, da Kotonoha.', ok: true, reg: 'keigo' },
        { jp: 'もしもし、林さん いる？', pt: 'Alô, o Hayashi tá aí?', ok: false, why: 'Casual demais com cliente. Comece com いつもお世話になっております.', reg: 'casual' },
        { jp: 'おはよう！', pt: 'Bom dia! (casual)', ok: false, why: 'Com clientes use keigo.', reg: 'casual' },
      ] },
      { npc: ['いつも お世話に なっております。', 'Nós é que agradecemos.'] },
      { you: [
        { jp: '恐れ入りますが、林部長は いらっしゃいますか。', pt: 'Desculpe incomodar, o gerente Hayashi está?', ok: true, reg: 'keigo' },
        { jp: '林部長は おりますか。', pt: '(errado) O gerente Hayashi "humildemente" está?', ok: false, why: 'おる é humilde (para o seu lado). Para o cliente: いらっしゃいますか.' },
        { jp: '林部長は 元気？', pt: 'O gerente Hayashi tá bem?', ok: false, why: 'Informal demais.', reg: 'casual' },
      ] },
      { npc: ['申し訳ございません。林は ただいま 席を 外して おります。', 'Sinto muito. Hayashi não está na mesa agora.'], note: 'Note: ao falar do próprio chefe para alguém de fora, a empresa usa só 林 (sem 部長, sem さん): humildade do grupo.' },
      { you: [
        { jp: 'では、また 後ほど お電話いたします。', pt: 'Então ligarei novamente mais tarde.', ok: true, reg: 'keigo' },
        { jp: 'じゃ、また 電話するね。', pt: 'Então eu ligo de novo, tá?', ok: false, why: 'Casual: use お電話いたします.', reg: 'casual' },
        { jp: 'お電話 なさいます。', pt: '(errado) Eu "me dignarei" a ligar.', ok: false, why: 'なさる é honorífico; para você use いたします.' },
      ] },
    ],
  },
];

// more conversations written as JSON (src/data/convos/*.json)
const extra: Record<string, { default: Convo }> = (import.meta as unknown as { glob?: unknown }).glob
  ? (import.meta.glob('./convos/*.json', { eager: true }) as Record<string, { default: Convo }>)
  : {};
for (const m of Object.values(extra)) if (m.default?.id && !CONVOS.some((c) => c.id === m.default.id)) CONVOS.push(m.default);

export const CONVO_BY_ID: Record<string, Convo> = Object.fromEntries(CONVOS.map((c) => [c.id, c]));
