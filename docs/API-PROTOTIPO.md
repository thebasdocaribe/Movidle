# Protótipo API + Postgres (imagens → depois clips)

Estratégia OK: **mesmo registro de filme**; agora `poster_url` / arquivo de imagem; depois só preenche `clip_url`. Front já testa daily, guess, pontos.

## Pontuação (emular já)

| Take | Duração clip (prod) | Pontos se acertar |
|------|---------------------|-------------------|
| 1–4  | 1s                  | 100 / 50 / 25 / 15 |
| 5–6  | 2s                  | 10 / 5 |
| Desistir / fail | —            | 0 |

Pular pro take 6 e acertar = **5 pts** (take 6).

## Schema mínimo

```sql
create table movies (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,          -- canônico EN ou original
  title_pt      text,                   -- exibição / aceitar chute
  year          int,
  aliases       text[] not null default '{}', -- "Nosferatu", "Nosferatu o Vampiro"...
  license       text not null,          -- 'public_domain' | etc
  source_url    text,
  attribution   text,
  poster_path   text not null,          -- /media/posters/nosferatu.jpg  (protótipo)
  clip_path     text,                   -- null por enquanto
  created_at    timestamptz default now()
);

create table daily_puzzles (
  puzzle_date   date primary key,       -- America/Sao_Paulo calendar day
  movie_id      uuid not null references movies(id)
);
```

## Endpoints mínimos

1. `GET /api/daily?date=YYYY-MM-DD`  
   → `{ puzzleId, takeDurations: [1,1,1,1,2,2], media: { type: 'image', url }, attribution }`  
   **Sem** título (anti-spoiler).

2. `POST /api/guess`  
   body: `{ puzzleId, attempt: 1..6, guess: string }`  
   → `{ correct: boolean, points?: number, title?: string, posterUrl?: string }`  
   Só devolve `title` se `correct` ou se `attempt === 6` / desistiu.

3. `POST /api/give-up`  
   body: `{ puzzleId }`  
   → `{ points: 0, title, posterUrl }`

Normalizar chute no server: trim, lower, sem acento; match em `title`, `title_pt`, `aliases`.

## O que você prepara agora

1. Postgres local (ou Oracle Free depois — mesmo schema).  
2. Pasta com ~30 posters PD (nome arquivo estável).  
3. Seed SQL: 1 row `movies` por filme + 1 `daily_puzzles` pro dia de teste.

Quando o banco + seed existirem, ligamos o front nesses 3 endpoints.
