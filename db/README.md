# Banco local (Postgres)

## Via pgAdmin (mais fácil agora)

1. Clique com botão direito em **Databases** → **Create** → **Database**  
   - Name: `cineblitz` → Save  
2. Selecione `cineblitz` → Tools → **Query Tool**  
3. Abra e execute `schema.sql` (F5)  
4. Abra e execute `seed.sql` (F5)  
5. Confira:

```sql
SELECT count(*) FROM movies;
SELECT m.title, d.puzzle_date
FROM daily_puzzles d
JOIN movies m ON m.id = d.movie_id;
```

Posters servidos pelo Vite em: `web/public/posters/1.jpg` … `47.jpg`

## Filmes `needs_review` (não usar em daily público)

- `7.jpg` Little Shop **1986** (não o PD 1960)  
- `19.jpg` Reefer Madness **musical 2005**  
- `46.jpg` King Kong 1933 (PD só em 2029)  
- `47.jpg` Bride of Frankenstein 1935  

Daily de teste de hoje: **Night of the Living Dead** (`1.jpg`).
