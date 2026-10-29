# Fotos do elenco

Coloque aqui JPGs com o nome slugificado da pessoa, por exemplo:

- `george-a-romero.jpg`
- `duane-jones.jpg`
- `audrey-hepburn.jpg`

O front tenta `/cast/<slug>.jpg`. Se o arquivo não existir, usa um avatar gerado com o nome.

# Capas horizontais (banner)

No banco, coluna `poster_wide_path` (ex: `/posters/wide/night-of-the-living-dead.jpg`).
Se estiver preenchida, o modo Elenco/Casting usa ela; senão usa o pôster vertical (sem esticar — letterbox).
