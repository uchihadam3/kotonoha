# KOTONOHA — 言の葉

**A Jornada das Dez Mil Palavras.**

*Uma produção Uchihadam Production.*

KOTONOHA é um jogo 3D para aprender japonês **do zero à fluência**. Você chega de barco, ao amanhecer, a
uma ilha onde o **Grande Silêncio** apagou as palavras e as cores. Kon, uma raposa-espírito, mostra a
**Grande Árvore das Palavras** no alto do Pico Sagrado: ela perdeu as suas dez mil folhas. **Cada palavra
que você aprende e lembra vira uma folha de luz na árvore**, a cor volta ao mundo e novos lugares da ilha
se abrem. Com 10.000 folhas, a árvore floresce de novo.

> 「やまとうたは、人の心を種として、よろづの言の葉とぞなれりける」
> A poesia do Japão tem o coração humano como semente, e dele brotam as dez mil folhas das palavras.
> — Ki no Tsurayuki, *Kokin Wakashū* (905)

## Jogar

**No navegador:** abra **https://uchihadam3.github.io/kotonoha/** (computador, Android ou iPhone).

**Instalar (computador, Android e iPhone):** no menu do jogo escolha **Instalar o jogo**. No Chrome e no
Edge aparece o pedido de instalação; no iPhone e no iPad, pelo Safari, toque em Compartilhar e depois em
*Adicionar à Tela de Início*. Instalado, o KOTONOHA abre em tela cheia como um app, funciona sem internet e
**se atualiza sozinho**: cada envio para `main` publica uma versão nova e o jogo instalado a baixa na
próxima vez que for aberto com internet. O progresso nunca se perde numa atualização.

**Instaladores para Windows, Linux e macOS:** na página de
[Releases](https://github.com/uchihadam3/kotonoha/releases) (gerados automaticamente pelo GitHub Actions a
cada versão `v*`): `KOTONOHA-*-Instalador.exe`, a versão portátil `*-portatil.exe`, `.AppImage`, `.deb` e
`.dmg`.

**Offline, sem instalar nada:** baixe o arquivo [`jogar/KOTONOHA.html`](jogar/KOTONOHA.html) e abra com
dois cliques (Chrome, Edge ou Firefox recentes). O jogo inteiro está nesse único arquivo: código, música,
sons, fontes, as mais de 13 mil palavras, os 2.136 kanji e a ordem dos traços.

**Publicação:** o GitHub Pages precisa estar ligado uma vez (*Settings → Pages → Source: GitHub
Actions*). Depois disso, cada envio para `main` testa, gera e publica o jogo automaticamente.

🎧 Jogue com som: o jogo **fala japonês** (voz do próprio aparelho). Se o seu celular não tiver voz
japonesa, instale "Japonês" nas vozes de texto-para-fala do sistema. Em Chrome, Edge e Safari você também
pode **responder falando** pelo microfone.

## Como se aprende

- **Lições com os moradores:** cada pessoa da ilha ensina temas diferentes (a Vovó Haru, família e casa;
  o Kenta, números; o Sr. Tanaka, natureza e animais; a Professora Yamada, gramática e verbos…). Cada
  lição traz 8 palavras com **cartão completo**: kanji com furigana, romaji, tradução, nota de uso,
  registro, **frase de exemplo lida em voz alta**, **conjugações polido ↔ casual** automáticas e a
  **ordem dos traços** animada.
- **Memória espaçada (SRS):** a palavra nasce como 🌱 *semente*, vira *broto* e, revisada no tempo certo,
  vira 🍃 **folha** (aprendida) — depois 🌸 *flor* (memorizada) e ⭐ *fruto/estrela* (dominada). Palavras
  esquecidas murcham na árvore até você revisá-las.
- **Sombras do Silêncio:** quando há palavras para revisar, sombras aparecem pela ilha. Chegue perto e
  enfrente-as: cada resposta certa é uma **palavra-feitiço** (o kanji voa e acerta a sombra), com combo,
  cronômetro e tipos variados de pergunta (significado, ouvir, leitura do kanji, completar a frase, forma
  polida, **digitar em romaji** com conversão para kana ao vivo, e **falar**).
- **Palavras no mundo:** objetos, animais e placas têm palavras flutuando. Chegue perto e examine.
- **32 conversas de verdade:** loja de conveniência, restaurante, mercado, loja de roupas, floricultura,
  farmácia e médico, pedir direções e achados e perdidos com o policial, comprar passagem, check-in no
  ryokan, termas, cerimônia do chá, entrevista de emprego, reunião, chegar atrasado no trabalho, os
  vizinhos novos, aula e clube da escola, amigos, otaku de anime, live de streamer, fã de idol,
  entrevista de rua na TV, santuário e omikuji, monge zen, político em keigo, pescador, o fantasma
  samurai e a tia de Osaka em dialeto de Kansai — escolhendo a fala certa, com explicação quando o
  registro está errado.
- **Os registros do japonês:** polido (です/ます), casual (タメ口), **keigo** honorífico e humilde,
  **gírias** e internet, **fala de anime** (役割語), **japonês antigo** de samurai e dos clássicos, e o
  **dialeto de Kansai**. Uma tabela compara como cada registro diz a mesma coisa, e um exercício treina
  "como dizer isso para um professor? para um amigo? como um samurai?".
- **Minijogos:** vaga-lumes de kana (hiragana e katakana com mnemônicos), karuta, dojô de kanji, omikuji
  diário com a palavra do dia, dojô de digitação, fliperama do ouvido, balcão de sushi (pedidos com
  números e contadores) e descanso nas termas (ouvir e repetir frases).

## O mundo

Onze lugares, abertos pela quantidade de palavras aprendidas (uma névoa cinza bloqueia os caminhos até lá):

| Lugar | Abre com | Nível | O que se aprende |
|---|---|---|---|
| 朝日浜 Praia do Amanhecer | 0 | Começo | kana, primeiros cumprimentos |
| 朝日村 Vila do Amanhecer | 0 | N5 | família, números, natureza, animais, casa, cores |
| 商店街 Rua do Comércio | 60 | N5 | comida, compras, contadores, roupas, gírias, keigo de loja |
| 丘の学校 Escola da Colina | 200 | N5 | escola, tempo, verbos, adjetivos, gramática, polido × casual, anime |
| 稲荷神社 Santuário da Raposa | 450 | N5 → N4 | sentimentos, advérbios, keigo, história, japonês antigo, kanji |
| 港町 Cidade do Porto | 900 | N4 | cidade, viagem, trabalho, direções, relações |
| ネオン街 Cidade Neon | 1.700 | N3 | tecnologia, mídia, lazer, gírias, anime, keigo de empresa |
| 温泉郷 Vila das Termas | 3.000 | N3 | saúde, relações, emoções, onomatopeias, Kansai |
| 城下町 Cidade do Castelo | 4.500 | N2 | sociedade, política, negócios, história, fala de samurai |
| 山寺 Templo da Montanha | 6.500 | N2 → N1 | ideias, ciência, arte, provérbios, 四字熟語 |
| 霊峰 Pico Sagrado | 9.000 | N1 | tudo junto; o coração da Grande Árvore (final aos 10.000) |

As palavras de nível mais alto também se abrem com o total aprendido: **N4 com 250, N3 com 800, N2 com
2.400 e N1 com 4.000 palavras**. Os títulos vão de 旅人 *Viajante* a 言霊使い *Senhor do Kotodama*.

**O final:** com 10.000 folhas, fale com a Kotonoha-hime no coração da Grande Árvore. A árvore floresce
inteira, a câmera voa sobre a ilha colorida, a Kon espera no píer onde tudo começou e os créditos mostram
a sua jornada. Depois ainda dá para buscar o **Domínio Total 完全制覇**: todos os 2.136 kanji, as 32
conversas, os 10 selos das Grandes Sombras e todos os kana (o progresso fica no Livro → Estatísticas).

O jogo **salva sozinho** a cada 30 segundos, ao fim de cada atividade e quando o app é fechado, em 3
espaços. Em **Carregar**, cada jornada pode ser exportada como código ou arquivo e importada em outro
aparelho.

### Controles

| Ação | Teclado e mouse | Toque | Controle |
|---|---|---|---|
| Andar / correr | WASD ou setas / Shift | joystick (lado esquerdo) | analógico esquerdo / gatilho |
| Câmera | arrastar o mouse, roda = zoom | arrastar à direita, pinça | analógico direito |
| Falar, examinar, agir | E | botão ✋ | A |
| Pular | Espaço | botão pular | X |
| Livro das palavras | Tab | botão 📖 | Y |
| Mapa | M | botão 🗺 | Select |
| Pausa | Esc | botão ☰ | Start |
| Responder | 1–4, Enter, digitar | tocar | — |

## Dados de japonês

- **13.000+ palavras**: ~1.450 curadas por tema com notas de registro e exemplos, mais as listas JLPT
  N5–N1 e palavras frequentes de jornais e do dia a dia (JMdict), todas com significado em português do
  Brasil, tema, nível, classe gramatical (para a conjugação automática) e frase de exemplo.
- **2.136 kanji jōyō** com leituras on/kun, significado em português, série escolar, nível JLPT e palavras
  de exemplo; **ordem dos traços** de todos os kanji e kana.

## Desenvolvimento

```bash
npm install
```

```bash
npm run dev
```

Depois abra o endereço que aparecer (normalmente `http://localhost:5173`).

```bash
npm test
```

```bash
npm run build
```

O build gera `dist/index.html`, um arquivo único com tudo dentro. Os arquivos de `public/` e o `sw.js`
tornam a versão publicada instalável e autoatualizável. `npm run offline` gera o build e atualiza a cópia
offline em `jogar/KOTONOHA.html`. `npm run desktop` abre a versão de computador (Electron) e `npm run dist`
gera os instaladores localmente.

Para regenerar os dados a partir das fontes (`data-src/`): `node tools/build-data.mjs` (palavras, kanji,
traços), `node tools/build-readings.mjs` (leituras de todas as falas) e `npm run fonts` (recorta as fontes
japonesas só com os caracteres usados).

- `src/world/`: a ilha (terreno, água, céu com dia e noite, vegetação), a arquitetura japonesa, as 11
  regiões, os personagens com rostos de anime e a Kon, e a Grande Árvore com 10.000 folhas.
- `src/game/`: o jogo: jogador e câmera, moradores, lições, revisões, batalhas, minijogos, conversas,
  história, cutscene de abertura.
- `src/lang/`: kana e romaji, o "teclado" romaji→kana, conjugação, memória espaçada e gerador de perguntas.
- `src/audio/`: música japonesa gerativa (koto, shakuhachi, shinobue, taiko, shamisen, sinos) e efeitos,
  100% sintetizados com Web Audio, e a voz japonesa (síntese e reconhecimento de fala).
- `src/ui/`: interface, logo, HUD, cartão de palavra, livro, mapa.
- `data-src/`, `tools/`: as fontes dos dados e os scripts que geram `src/data/`.

Feito com Three.js, Web Audio e TypeScript.

## Créditos dos dados

- **KANJIDIC2** e **JMdict** © Electronic Dictionary Research and Development Group (EDRDG), licença
  [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html).
- **KanjiVG** (ordem dos traços) © Ulrich Apel, licença CC BY-SA 3.0.
- **Listas JLPT** de Jonathan Waller (tanos.co.uk) via *open-anki-jlpt-decks* (MIT).
- Fontes: Zen Maru Gothic, Klee One, Yuji Syuku, Shippori Mincho B1 e Marcellus (SIL Open Font License).

Os arquivos de dados derivados (`src/data/words.json`, `kanji.json`, `strokes.json`) seguem a licença
CC BY-SA das fontes acima.

---

© 2026 Uchihadam Production. Mundo, personagens, história, música e arte são originais.
