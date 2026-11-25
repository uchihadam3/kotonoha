# KOTONOHA — documento de design

*Uchihadam Production.* Um jogo 3D para aprender japonês do zero à fluência. **Cada palavra é uma folha.**

## A ideia

A ilha de Kotonoha vivia de palavras: cada palavra falada era uma folha viva da **Grande Árvore**
(言の葉の大樹). O **Grande Silêncio** fez as palavras serem esquecidas: as dez mil folhas caíram, as cores
se apagaram e uma névoa cinza fechou os caminhos. O jogador chega de uma terra distante, sem saber uma
palavra de japonês. Kon, a raposa-espírito guardiã da árvore, o guia.

O nome vem do prefácio do *Kokin Wakashū* (905): 「人の心を種として、よろづの言の葉とぞなれりける」 — o
coração é a semente e as palavras são **dez mil folhas** (よろづの言の葉). O objetivo do jogo é exatamente
esse: **10.000 palavras = 10.000 folhas**.

## O medidor é o mundo

1. **A Grande Árvore** no Pico Sagrado é visível de quase toda a ilha. Cada palavra aprendida acende uma
   folha (jade); memorizada vira flor (sakura); dominada vira dourada; vencida pelo tempo murcha (âmbar)
   até ser revisada. O HUD mostra o número de folhas, o título (旅人 → 言霊使い) e a próxima meta.
2. **A cor volta ao mundo**: cada lugar começa desbotado (tinta cinza) e ganha saturação conforme o
   jogador aprende (pós-processamento por região).
3. **Os caminhos se abrem**: a névoa do Silêncio em volta de cada lugar se dissolve quando o total de
   palavras chega ao requisito, com uma cena da câmera mostrando o lugar novo.
4. **Kon cresce**: ganha uma cauda a cada 1.250 palavras, até a raposa de nove caudas (九尾).

## O ciclo de aprendizado

- **Lição** (com um morador): 8 palavras novas com cartão completo → verificação no meio → prática com
  todas → resultado. As palavras viram 🌱 brotos.
- **Memória espaçada**: estágios 1–9 com intervalos de 1 min, 8 min, 4 h, 1, 3, 7, 16, 35 e 90 dias.
  Estágio 3 = folha (conta para sempre no medidor). Responder antes da hora não sobe de estágio (sem
  "decoreba" de última hora); errar desce um estágio.
- **Revisões viram aventura**: sombras do Silêncio surgem quando há palavras vencidas. Batalha = revisão
  com combo, cronômetro, corações e tipos de pergunta escolhidos pelo estágio da palavra (de "o que
  significa?" até digitar em romaji ou falar).
- **Imersão**: palavras flutuam sobre objetos, animais e placas; NPCs cumprimentam em japonês com
  tradução; as falas têm leitura e romaji gerados automaticamente.
- **Registros**: cada morador fala de um jeito (a vovó casual-gentil, a professora polida, a gyaru com
  gírias, o otaku com fala de anime, o fantasma de samurai com japonês antigo, a turista de Osaka com
  Kansai-ben, o sacerdote e a dona do ryokan com keigo). Conversas por situação e o exercício "como dizer
  isso para…" ensinam quando usar cada um.

## Progressão

| Palavras | Abre |
|---|---|
| 0 | Praia e Vila do Amanhecer (N5) |
| 60 | Rua do Comércio |
| 200 | Escola da Colina |
| 250 | palavras N4 |
| 450 | Santuário da Raposa |
| 800 | palavras N3 |
| 900 | Cidade do Porto |
| 1.700 | Cidade Neon |
| 2.400 | palavras N2 |
| 3.000 | Vila das Termas |
| 4.000 | palavras N1 |
| 4.500 | Cidade do Castelo |
| 6.500 | Templo da Montanha |
| 9.000 | Pico Sagrado |
| 10.000 | o coração da Grande Árvore (final) |

## Apresentação

- Abertura: toque para começar → **Uchihadam Production** (brasas, varredura de luz) → logo **KOTONOHA**
  (ensō pintado a pincel, folha de jade que floresce, selo vermelho 言の葉) → menu sobre a Grande Árvore à
  noite, em plena glória (a visão do objetivo).
- Prólogo: o poema do Kokinshū em caligrafia vertical → a árvore em flor → a vila viva ao entardecer → o
  Grande Silêncio (as folhas caem, a cor some) → o amanhecer na praia, o viajante chega de barco → Kon
  aparece e diz a primeira palavra: こんにちは. Uma única folha se acende na árvore distante.
- Arte: low-poly com tonalização toon, cores por vértice, céu com ciclo de dia e noite (os cumprimentos
  mudam: おはよう, こんにちは, こんばんは), água estilizada, cerejeiras com pétalas, vaga-lumes à noite,
  lanternas que acendem, bloom e névoa.
- Música: gerativa e "composta" (sementes fixas), em escalas japonesas (yō, in, hirajōshi, ryūkyū,
  iwato), com koto, shakuhachi, shinobue, taiko, shamisen e sinos; cada lugar tem a sua.
