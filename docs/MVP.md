# MVP — Jogo de adivinhar filme por clip rápido

> Documento de produto (pré-código). Premissa: mecânica estilo Movidle/Moviedle (cena correndo), **não** clone de Framed (frame estático). Mídia apenas de fontes que podemos usar legalmente.

**Status:** decisões de produto parcialmente fechadas (ver §12)  
**Nome comercial:** TBD (UI/mock: CineBlitz; repo: `movidle`)  
**Idioma UI (MVP):** PT-BR + EN  
**Plataforma MVP:** Web (PWA). Android/iOS depois da tração.  
**Áudio dos clips:** off (só SFX/música de UI depois)  
**Validação de chute:** server (Oracle Free, fase backend)  

### Duas builds (decisão fechada)

| Build | Catálogo | Destino |
|-------|----------|---------|
| **Pública** | Só PD / formalidade-fail / licenciado (`docs/CATALOGO-CANDIDATOS.md`) | Site/PWA que o público joga e (depois) paga features |
| **Creator (privada)** | Sem filtro de título — você monta os clips pra gravar vídeo | **Só você.** Não publicar, não vender, não mandar APK/link pra audiência |

Licença de studio/major ficou **fora do roadmap próximo** (cara + burocrática). Expansão de catálogo público = mais PD / casos claros, não “qualquer blockbuster”.

---

## 1. Problema e oportunidade

Jogos diários de cinema existem, mas o diferencial que o público do canal já validou é:

1. Cortinas / clima de cinema  
2. Countdown  
3. **Clip em movimento** (muito curto → vai alongando se errar)  
4. Chute do título  
5. Até N tentativas; senão, derrota do dia  

O jogo original sumiu; o canal já monetiza e tem histórico de vídeos jogando isso com boa recepção. O produto serve ao mesmo tempo como:

- conteúdo para membros / vídeos  
- produto freemium próprio (BR + internacional)

---

## 2. O que NÃO é o produto

| Evitar | Motivo |
|--------|--------|
| Framed-like (1 frame estático por tentativa) | Já saturado; mata o diferencial |
| Rip de blockbusters / catálogo comercial sem licença | Risco legal; inviabiliza loja + assinatura |
| Crypto no MVP | Complexidade e atrito sem ganho |
| Open source total no dia 1 | Pode vir depois (open core); não bloqueia MVP |
| Apps nativos no lançamento | Escopo; PWA primeiro |

---

## 3. Premissa legal de mídia (obrigatória)

**Pipeline só com obras que temos direito de usar**, por exemplo:

- filmes em domínio público  
- obras com licença Creative Commons compatível com uso comercial (se houver plano pago)  
- material licenciado / parceiro  
- (fase futura) produção própria / recriação — fora do MVP

Cada item do catálogo carrega metadados mínimos:

- `title`, `year`, `aliases` (nomes alternativos / traduções)  
- `license` + `source_url`  
- `clip_path` (arquivo que *nós* hospedamos, derivado da fonte permitida)  
- `attribution` (crédito obrigatório na UI quando a licença exigir)

**Regra de ouro:** se não houver licença clara no registro, o filme **não entra** no daily.

---

## 4. Loop de jogo (core)

Referência visual: sessão de vídeo do canal (clip curto + campo de guess), com atmosfera de cortina/cinema.

### 4.1 Daily (modo principal do MVP)

1. Tela com cortinas fechadas + botão **Play**  
2. Countdown **5 → 1**  
3. Cortinas abrem → reproduz o clip da tentativa atual  
4. Jogador digita o nome do filme (autocomplete só no catálogo conhecido do app, sem spoilar o do dia)  
5. Acerto → vitória + pontuação + tela de share  
6. Erro → sobe o nível de “revelação” (clip mais longo / mais trechos) até o máximo de tentativas  
7. Esgotou tentativas → derrota + revelar título (+ link/crédito da fonte)

### 4.2 Escala de tentativas (proposta inicial)

| Tentativa | Duração alvo do clip | Pontos se acertar nessa tentativa |
|-----------|----------------------|-----------------------------------|
| 1 | ~1,0 s | 100 |
| 2 | ~2,0 s | 50 |
| 3 | ~3,0 s | 25 |
| 4 | ~4,0 s | 15 |
| 5 | ~5,0 s | 10 |
| 6 | ~6,0 s | 5 |
| fail | — | 0 |

Números ajustáveis após playtest. Ideia: acerto cedo recompensa bastante (hook de ranking / streak).

**Implementação de mídia (MVP):** um único arquivo de vídeo “master” por puzzle (ex.: 6–8 s), e o client toca só o prefixo `0…duration[n]`. Assim o pipeline gera **um** asset por dia, não seis.

Áudio do filme: **off** (decisão fechada). SFX / musiquinha de UI podem entrar depois, sem trilha do filme.

### 4.3 Seed diário

- Um puzzle por dia por timezone (definir: `America/Sao_Paulo` no MVP; depois timezone do usuário).  
- Mesmo filme para todo mundo naquele dia (comparável no Discord/chat do canal).  
- Streak local (e depois na conta).

---

## 5. Escopo do MVP (entra / não entra)

### Entra (MVP)

- Daily com 6 tentativas + pontuação  
- UI cortina + countdown + player de clip  
- Busca/chute por título (PT e EN nos aliases)  
- Resultado + botão compartilhar (texto estilo Wordle: grade de tentativas)  
- Catálogo inicial pequeno mas **jogável** (meta: ≥ 30 puzzles prontos antes do soft launch; daily agenda 14+ dias na frente)  
- Página de créditos / atribuição da fonte do dia  
- PWA instalável (mobile browser)  
- Soft paywall **preparado** (flag), mesmo se o pagamento real vier logo após o MVP

### Não entra (pós-MVP)

- Modo infinito  
- Desafio amigo (link/sala)  
- Conta cloud completa / leaderboard global  
- Curiosidade de cinema / modos extras  
- Assinatura processada (Stripe etc.) — pode ser “fase 1.1”  
- APK/AAB Android e iOS  
- Open source público  
- Admin UI sofisticada (no MVP: JSON/Markdown no repo ou planilha → script de build)

---

## 6. Freemium (direção de produto; pagamento pode ser 1.1)

| | Free | Paid (nome TBD) |
|--|------|-----------------|
| Daily | sim | sim |
| Histórico / stats | básico (local) | completo |
| Modo infinito | não | sim |
| Desafio amigo | não | sim |
| Cosméticos (cortina, tema) | 1 tema | vários |
| Streak freeze | não | sim (estilo Duolingo) |

Preço: detalhe (ex. R$ 9,90 BR / ~$2–3 internacional). Não bloqueia o desenho do MVP.

---

## 7. Pipeline de mídia (o diferencial operacional)

```
Fonte legal → download/arquivo master
    → corte + encode (clip 6–8s, H.264/WebM, sem áudio no MVP)
    → registro no catálogo (título, aliases, license, credits)
    → agendar no calendário daily
    → CDN / storage do app
```

### 7.1 Fontes candidatas (pesquisa contínua)

- Arquivos / coleções de domínio público (ex.: Internet Archive — validar caso a caso a **obra**, não só o upload)  
- Listas curadas de filmes PD (EUA: em geral obras pré-critério vigente; **não** assumir “velho = PD” em todo país)  
- CC com cláusula comercial se houver assinatura  

### 7.2 Papel humano no MVP

Você (ou editor) escolhe o filme do dia + o trecho “adivinhavel mas justo”.  
Script automatiza encode + entrada no catálogo.  
Meta de ritmo: **1 puzzle/dia** com folga de agenda (buffer 2 semanas).

### 7.3 Qualidade do puzzle

Bom clip:

- dá pra sentir gênero / época / set  
- não entrega o título em cartaz legível nos primeiros 1–2 s  
- nos 5–6 s fica “óbvio pra quem conhece”

---

## 8. Conteúdo & canal (flywheel)

- Daily ao vivo no produto → você grava reação / run para membros  
- Share image/text → tráfego orgânico  
- Link fixo na descrição / comunidade  
- Idioma: UI bilíngue desde o MVP ajuda retenção fora do BR sem mudar a mecânica

---

## 9. Arquitetura sugerida (alto nível, pré-código)

- **Front:** web app (SPA) + PWA  
- **Backend:** API em Oracle Free (validação de chute + daily seed); front não confia no título do dia  
- **Assets:** clips em storage/CDN; daily config (qual `puzzleId` no dia D)  
- **Fluxo de guess:** client envia texto normalizado → server compara aliases → responde hit/miss (+ se acabaram tentativas, revela título)  
- **Conta:** opcional após daily local funcionar  

Decisão técnica fina fica para o doc de implementação, depois deste.

---

## 10. Critérios de sucesso do MVP

Soft launch fechado (amigos / membros), ~2 semanas:

1. Pessoas voltam no dia seguinte (retenção D1/D7 qualitativa ok)  
2. Tempo médio de sessão > 1 daily (vontade de “mais um” — sinal para infinito pago)  
3. Você consegue publicar **14 dailies seguidos** sem furar o pipeline  
4. Zero claim óbvio de copyright no material publicado  
5. Pelo menos 1 vídeo de membros usando o produto ao vivo

---

## 11. Roadmap curto

| Fase | Entrega |
|------|---------|
| **0 — Doc** | Este MVP + nome + tom visual |
| **1 — Pipeline** | 30 clips legais + catálogo + script encode |
| **2 — Core web** | Cortina, countdown, play, guess, score, share |
| **3 — Soft launch** | PWA + daily + feedback canal |
| **1.1** | Conta + pagamento + infinito |
| **2.x** | Desafio amigo, stats, Android wrap |
| **3.x** | iOS, open core (opcional), mais modos |

---

## 12. Decisões (respostas do produto)

| Tema | Decisão | Status |
|------|---------|--------|
| Nome + domínio | Em aberto; placeholder CineBlitz / repo `movidle` | aberto |
| Tom visual | Cinema/cortina + hub tipo Gamedle (blocos Diário / Multi / Ilimitados); refs de mock já no projeto | fechado o suficiente p/ UI |
| Timezone do daily | `America/Sao_Paulo` (meia-noite de Brasília). Ver §12.1 | **fechado** |
| Validação de chute | **Server** (Oracle Free depois) | fechado |
| Áudio | Filme **mudo** no player; SFX/música de UI ok depois | fechado |
| Catálogo inicial | Triagem na §12.2 — completar fontes/links ainda | em progresso |
| Pagamento | Fase 1 vs 1.1 — depois | aberto |

### 12.1 O que é “timezone do daily”?

O daily precisa de um relógio único: **a que horas o mundo troca de puzzle?**

Exemplos:

- `America/Sao_Paulo` → todo dia à **00:00 de Brasília** muda o filme. No Japão isso é meio-dia; nos EUA à tarde/noite.  
- `UTC` → muda à 00:00 UTC (= 21:00 em Brasília no horário padrão).  

Se cada um usasse o fuso do celular, o “desafio #1692” do seu vídeo não bateria com o do inscrito em outro país (share/ranking quebram).

**Recomendação:** fixar `America/Sao_Paulo` no MVP (canal BR). Internacional continua jogando o mesmo daily; só o horário da virada que é o do Brasil.

### 12.2 Triagem da lista candidata (filtro prático EUA 95 anos / Out–2026)

Premissa usada na triagem: nos EUA, publicação até **1930** em geral já está em PD em 2026. **Isso não substitui advogado** e **PD nos EUA ≠ automaticamente PD no Brasil** (aqui costuma ser vida do autor + 70 anos). Para o MVP, só avançamos com títulos **claramente PD nos EUA** + cópia sem trilha/restauração nova problemática; revisão BR fica como risco consciente a monitorar.

#### Provável OK (EUA) — prioridade de pesquisa de arquivo

| # | Título | Ano | Nota |
|---|--------|-----|------|
| 1 | Nosferatu | 1922 | Clássico PD |
| 2 | Metropolis | 1927 | Preferir cópia PD; restorations/scores novas podem ser © |
| 3 | The Cabinet of Dr. Caligari | 1920 | OK |
| 4 | Un Chien Andalou | 1929 | OK EUA |
| 5 | The Kid | 1921 | OK |
| 6 | Häxan | 1922 | OK |
| 7 | The Man Who Laughs | 1928 | OK |
| 8 | Steamboat Willie | 1928 | PD EUA desde 2024; **cuidado com marca Mickey** (não usar o personagem fora do curto PD) |
| 9 | The Phantom of the Opera | 1925 | OK (versão muda) |
| 10 | A Trip to the Moon | 1902 | OK |
| 11 | The Dancing Pig | 1907 | OK (curta) |
| 12 | The Great Train Robbery | 1903 | OK |
| 24 | The Lost World | 1925 | OK se for a de 1925, não remakes |
| 23 | Night of the Living Dead | 1968 | Caso especial: PD nos EUA por falha de aviso © |
| 27 | A Page of Madness (狂った一頁) | 1926 | OK EUA |

#### Fora por enquanto (ainda protegidos ou ambíguos demais)

| # | Título | Por quê |
|---|--------|---------|
| 14–15 | À Meia-Noite… / Esta Noite Encarnarei… | 1967, Mojica; **não** PD (BR nem “até 1930”) |
| 16 | Bride of Frankenstein | 1935 → PD EUA ~2031 |
| 17 | The Ox-Bow Incident | 1943 → ~2039 |
| 18 | Gone with the Wind | 1939 → ~2035 + studio agressivo |
| 19 | Robin Hood (se for o famoso com Flynn, 1938) | Protegido. **Alternativa PD:** *Robin Hood* (1922, Fairbanks) |
| 20 | The Great Dictator | 1940 → ~2036 |
| 21 | The Mark of Zorro (1940) | Protegido. **Alternativa PD:** *The Mark of Zorro* (1920) |
| 22 | King Kong | 1933 → PD EUA **01/01/2029** |
| 26 | Freaks | 1932 → PD EUA **01/01/2028** |
| 13 | The Mouse Trap | Título ambíguo (qual filme?). Não usar até identificar ano/obra |
| 25 | Santa Claus Conquers the Martians | Muitos listam como PD; **só entra após confirmação** da cópia |

#### Sugestões para completar ~30 (mesma faixa segura)

Safety Last! (1923), Sherlock Jr. (1924), The General (1926), Battleship Potemkin (1925), Sunrise (1927), Faust (Murnau, 1926), The Golem (1920), Wings (1927), All Quiet on the Western Front (1930), Dr. Jekyll and Mr. Hyde (1920), Intolerance (1916), Speedy (1928).

Próximo passo de catálogo: para cada **Provável OK**, anotar `source_url` (Archive/Commons) + licença da **cópia** + aliases PT/EN.

---

## 13. Resumo em uma linha

**Daily de cinema com clip em movimento; build pública só com catálogo limpo; build creator privada pro canal; PWA primeiro; Framed fora de escopo; licença major fora do curto prazo.**
