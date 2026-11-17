/**
 * Quem Sou Eu — catálogo v2
 * - 50 perguntas gerais (sempre disponíveis)
 * - nichos liberados só após SIM na pergunta-pai (unlock.any)
 * Nível 3 (investigação cruzada) fica pra depois.
 */

function unlockYes(...questionIds) {
  return {
    any: questionIds.map((questionId) => ({ questionId, answer: 'yes' })),
  }
}

export const WHOAMI_CATEGORIES_V2 = [
  { id: 'identity', label: 'Identidade', sort_order: 10 },
  { id: 'era', label: 'Época e origem', sort_order: 20 },
  { id: 'genre', label: 'Gênero', sort_order: 30 },
  { id: 'characters', label: 'Personagens', sort_order: 40 },
  { id: 'story', label: 'História', sort_order: 50 },
  { id: 'production', label: 'Curiosidades', sort_order: 60 },
  { id: 'niche_animation', label: 'Aprofundar · Animação', sort_order: 110 },
  { id: 'niche_horror', label: 'Aprofundar · Terror', sort_order: 120 },
  { id: 'niche_scifi', label: 'Aprofundar · Ficção científica', sort_order: 130 },
  { id: 'niche_action', label: 'Aprofundar · Ação', sort_order: 140 },
  { id: 'niche_comedy', label: 'Aprofundar · Comédia', sort_order: 150 },
  { id: 'niche_fantasy', label: 'Aprofundar · Fantasia e aventura', sort_order: 160 },
  { id: 'niche_thriller', label: 'Aprofundar · Suspense', sort_order: 170 },
  { id: 'niche_drama', label: 'Aprofundar · Drama', sort_order: 180 },
  { id: 'niche_romance', label: 'Aprofundar · Romance', sort_order: 190 },
  { id: 'niche_western', label: 'Aprofundar · Faroeste', sort_order: 200 },
  { id: 'niche_war', label: 'Aprofundar · Guerra e história', sort_order: 210 },
  { id: 'niche_musical', label: 'Aprofundar · Musical', sort_order: 220 },
  { id: 'niche_documentary', label: 'Aprofundar · Documentário', sort_order: 230 },
  { id: 'niche_family', label: 'Aprofundar · Infantil e família', sort_order: 240 },
]

/** 50 gerais */
const GENERAL = [
  // Identidade 1–8
  { id: 'is_animation', category_id: 'identity', text: 'Sou uma animação?', sort_order: 10, rule: { type: 'format', value: 'animation' } },
  { id: 'is_live_action', category_id: 'identity', text: 'Sou um filme com atores reais?', sort_order: 20, rule: { type: 'format', value: 'live_action' } },
  { id: 'is_hybrid', category_id: 'identity', text: 'Misturo animação e live-action?', sort_order: 30, rule: { type: 'format', value: 'hybrid' } },
  { id: 'is_independent', category_id: 'identity', text: 'Sou uma produção independente?', sort_order: 40, rule: { type: 'bool', field: 'independent' } },
  { id: 'from_hollywood', category_id: 'identity', text: 'Sou uma produção de Hollywood?', sort_order: 50, rule: { type: 'region', aliases: ['eua', 'usa', 'us', 'united states', 'estados unidos', 'hollywood'] } },
  { id: 'is_adaptation', category_id: 'identity', text: 'Sou uma adaptação de outra obra?', sort_order: 60, rule: { type: 'bool', field: 'isAdaptation' } },
  { id: 'is_franchise', category_id: 'identity', text: 'Faço parte de uma franquia?', sort_order: 70, rule: { type: 'bool', field: 'franchise' } },
  { id: 'based_on_true', category_id: 'identity', text: 'Sou baseado em acontecimentos reais?', sort_order: 80, rule: { type: 'bool', field: 'basedOnTrueEvents' } },

  // Época 9–16
  { id: 'decade_pre_1970', category_id: 'era', text: 'Fui lançado antes de 1970?', sort_order: 10, rule: { type: 'year_range', min: 1888, max: 1969 } },
  { id: 'decade_70_89', category_id: 'era', text: 'Fui lançado entre 1970 e 1989?', sort_order: 20, rule: { type: 'year_range', min: 1970, max: 1989 } },
  { id: 'decade_90s', category_id: 'era', text: 'Fui lançado nos anos 90?', sort_order: 30, rule: { type: 'year_range', min: 1990, max: 1999 } },
  { id: 'decade_2000s', category_id: 'era', text: 'Fui lançado nos anos 2000?', sort_order: 40, rule: { type: 'year_range', min: 2000, max: 2009 } },
  { id: 'decade_2010s', category_id: 'era', text: 'Fui lançado nos anos 2010?', sort_order: 50, rule: { type: 'year_range', min: 2010, max: 2019 } },
  { id: 'decade_2020s', category_id: 'era', text: 'Fui lançado em 2020 ou depois?', sort_order: 60, rule: { type: 'year_gt', value: 2019 } },
  { id: 'from_usa', category_id: 'era', text: 'Sou uma produção americana?', sort_order: 70, rule: { type: 'region', aliases: ['eua', 'usa', 'us', 'united states', 'estados unidos'] } },
  { id: 'from_japan', category_id: 'era', text: 'Sou uma produção japonesa?', sort_order: 80, rule: { type: 'region', aliases: ['japão', 'japan', 'jp', 'japonesa'] } },

  // Gênero 17–26
  { id: 'tag_comedy', category_id: 'genre', text: 'Sou uma comédia?', sort_order: 10, rule: { type: 'tag', value: 'comedy' } },
  { id: 'tag_horror', category_id: 'genre', text: 'Sou um filme de terror?', sort_order: 20, rule: { type: 'tag', value: 'horror' } },
  { id: 'tag_drama', category_id: 'genre', text: 'Sou um drama?', sort_order: 30, rule: { type: 'tag', value: 'drama' } },
  { id: 'tag_action', category_id: 'genre', text: 'Sou um filme de ação?', sort_order: 40, rule: { type: 'tag', value: 'action' } },
  { id: 'tag_adventure', category_id: 'genre', text: 'Sou uma aventura?', sort_order: 50, rule: { type: 'tag', value: 'adventure' } },
  { id: 'tag_thriller', category_id: 'genre', text: 'Sou um suspense ou thriller?', sort_order: 60, rule: { type: 'tag', value: 'thriller' } },
  { id: 'tag_fantasy', category_id: 'genre', text: 'Sou uma fantasia?', sort_order: 70, rule: { type: 'tag', value: 'fantasy' } },
  { id: 'tag_scifi', category_id: 'genre', text: 'Sou uma ficção científica?', sort_order: 80, rule: { type: 'tag', value: 'scifi' } },
  { id: 'tag_romance', category_id: 'genre', text: 'Sou um romance?', sort_order: 90, rule: { type: 'tag', value: 'romance' } },
  { id: 'tag_western', category_id: 'genre', text: 'Sou um faroeste?', sort_order: 100, rule: { type: 'tag', value: 'western' } },
  { id: 'tag_kids', category_id: 'genre', text: 'Sou um filme voltado ao público infantil ou familiar?', sort_order: 110, rule: { type: 'tag', value: 'kids' } },

  // Personagens 27–36
  { id: 'prot_male', category_id: 'characters', text: 'Meu protagonista é homem?', sort_order: 10, rule: { type: 'bool_path', path: 'protagonist.male' } },
  { id: 'prot_female', category_id: 'characters', text: 'Minha protagonista é mulher?', sort_order: 20, rule: { type: 'bool_path', path: 'protagonist.female' } },
  { id: 'prot_young', category_id: 'characters', text: 'Meu protagonista é uma criança ou adolescente?', sort_order: 30, rule: { type: 'bool_path', path: 'protagonist.young' } },
  { id: 'prot_animal', category_id: 'characters', text: 'Meu protagonista é um animal?', sort_order: 40, rule: { type: 'bool_path', path: 'protagonist.animal' } },
  { id: 'prot_fantastical', category_id: 'characters', text: 'Meu protagonista é uma criatura fantástica?', sort_order: 50, rule: { type: 'bool_path', path: 'protagonist.fantastical' } },
  { id: 'prot_alien', category_id: 'characters', text: 'Meu protagonista é um extraterrestre?', sort_order: 60, rule: { type: 'bool_path', path: 'protagonist.alien' } },
  { id: 'prot_robot', category_id: 'characters', text: 'Meu protagonista é um robô?', sort_order: 70, rule: { type: 'species_includes', value: 'robot', aliases: ['robô', 'android'] } },
  { id: 'prot_multiple', category_id: 'characters', text: 'Tenho mais de um protagonista?', sort_order: 80, rule: { type: 'bool_path', path: 'protagonist.multiple' } },
  { id: 'has_antagonist', category_id: 'characters', text: 'Tenho um antagonista principal?', sort_order: 90, rule: { type: 'bool_path', path: 'antagonist.exists' } },
  { id: 'prot_powers', category_id: 'characters', text: 'Meu protagonista possui poderes ou habilidades sobrenaturais?', sort_order: 100, rule: { type: 'bool_path', path: 'protagonist.powers' } },

  // História 37–44
  { id: 'story_past', category_id: 'story', text: 'Minha história acontece no passado?', sort_order: 10, rule: { type: 'bool_path', path: 'story.inPast' } },
  { id: 'story_future', category_id: 'story', text: 'Minha história acontece no futuro?', sort_order: 20, rule: { type: 'bool_path', path: 'story.future' } },
  { id: 'story_space', category_id: 'story', text: 'Minha história acontece no espaço?', sort_order: 30, rule: { type: 'bool_path', path: 'story.inSpace' } },
  { id: 'story_city', category_id: 'story', text: 'Minha história se passa principalmente em uma cidade?', sort_order: 40, rule: { type: 'bool_path', path: 'story.inCity' } },
  { id: 'story_journey', category_id: 'story', text: 'Minha história envolve uma jornada ou viagem?', sort_order: 50, rule: { type: 'bool_path', path: 'story.journey' } },
  { id: 'story_investigation', category_id: 'story', text: 'Minha história envolve uma investigação?', sort_order: 60, rule: { type: 'bool_path', path: 'story.investigation' } },
  { id: 'story_survival', category_id: 'story', text: 'Minha história envolve sobrevivência?', sort_order: 70, rule: { type: 'bool_path', path: 'story.survival' } },
  { id: 'story_war', category_id: 'story', text: 'Minha história envolve uma guerra ou conflito armado?', sort_order: 80, rule: { type: 'bool_path', path: 'story.war' } },

  // Produção (Oscar separado: qualquer categoria × Melhor Filme)
  { id: 'prod_oscar', category_id: 'production', text: 'Ganhei pelo menos um Oscar (em qualquer categoria)?', sort_order: 10, rule: { type: 'bool_path', path: 'production.oscar' } },
  { id: 'prod_oscar_nom', category_id: 'production', text: 'Fui indicado ao Oscar (em qualquer categoria)?', sort_order: 20, rule: { type: 'bool_path', path: 'production.oscarNominated' } },
  { id: 'prod_oscar_bp_nom', category_id: 'production', text: 'Fui indicado ao Oscar de Melhor Filme?', sort_order: 25, rule: { type: 'bool_path', path: 'production.oscarBestPictureNom' } },
  { id: 'prod_oscar_bp', category_id: 'production', text: 'Ganhei o Oscar de Melhor Filme?', sort_order: 28, rule: { type: 'bool_path', path: 'production.oscarBestPicture' } },
  { id: 'based_on_book', category_id: 'production', text: 'Sou baseado em um livro?', sort_order: 30, rule: { type: 'bool', field: 'basedOnBook' } },
  { id: 'prod_from_comics', category_id: 'production', text: 'Sou baseado em uma história em quadrinhos?', sort_order: 40, rule: { type: 'bool_path', path: 'production.adaptedFromComics' } },
  { id: 'prod_from_game', category_id: 'production', text: 'Sou baseado em um videogame?', sort_order: 50, rule: { type: 'bool_path', path: 'production.adaptedFromGame' } },
  { id: 'prod_is_remake', category_id: 'production', text: 'Sou um remake de outro filme?', sort_order: 60, rule: { type: 'bool_path', path: 'production.isRemake' } },
].map((q) => ({ ...q, unlock: null, tier: 'general' }))

function niche(category_id, unlock, items) {
  return items.map((q, i) => ({
    ...q,
    category_id,
    sort_order: (i + 1) * 10,
    unlock,
    tier: 'niche',
  }))
}

const NICHE_ANIMATION = niche('niche_animation', unlockYes('is_animation'), [
  { id: 'anim_2d', text: 'Sou uma animação 2D?', rule: { type: 'bool_path', path: 'production.animation2d' } },
  { id: 'anim_3d', text: 'Sou uma animação 3D?', rule: { type: 'bool_path', path: 'production.animation3d' } },
  { id: 'anim_stop_motion', text: 'Utilizo a técnica de stop-motion?', rule: { type: 'bool_path', path: 'production.stopMotion' } },
  { id: 'anim_anime', text: 'Sou um anime japonês?', rule: { type: 'bool_path', path: 'production.anime' } },
  { id: 'anim_anthropomorphic', text: 'Meu protagonista é um animal antropomórfico?', rule: { type: 'bool_path', path: 'protagonist.anthropomorphic' } },
  { id: 'anim_fairy_tale', text: 'Minha história é baseada em um conto de fadas?', rule: { type: 'bool_path', path: 'story.fairyTale' } },
  { id: 'anim_musical', text: 'Sou um musical animado?', rule: { type: 'bool_path', path: 'production.animatedMusical' } },
  { id: 'anim_kids', text: 'Meu filme é voltado principalmente ao público infantil?', rule: { type: 'tag', value: 'kids' } },
  { id: 'anim_hand_drawn', text: 'Minha animação utiliza uma estética semelhante a desenhos feitos à mão?', rule: { type: 'bool_path', path: 'production.handDrawnLook' } },
  { id: 'anim_franchise', text: 'Faço parte de uma franquia de animação?', rule: { type: 'bool', field: 'franchise' } },
])

const NICHE_HORROR = niche('niche_horror', unlockYes('tag_horror'), [
  { id: 'horror_supernatural', text: 'Minha história envolve elementos sobrenaturais?', rule: { type: 'bool_path', path: 'story.supernaturalThreat' } },
  { id: 'horror_possession', text: 'Minha história envolve possessão demoníaca?', rule: { type: 'bool_path', path: 'story.possession' } },
  { id: 'horror_human_killer', text: 'Meu antagonista é um assassino humano?', rule: { type: 'bool_path', path: 'antagonist.humanKiller' } },
  { id: 'horror_slasher', text: 'Sou um slasher?', rule: { type: 'tag', value: 'slasher' } },
  { id: 'horror_haunted_house', text: 'Minha história envolve uma casa mal-assombrada?', rule: { type: 'bool_path', path: 'story.hauntedHouse' } },
  { id: 'horror_monster', text: 'Meu antagonista é uma criatura ou monstro?', rule: { type: 'bool_path', path: 'antagonist.monster' } },
  { id: 'horror_psychological', text: 'Meu terror é predominantemente psicológico?', rule: { type: 'tag', value: 'psychological_thriller' } },
  { id: 'horror_found_footage', text: 'Utilizo o formato found footage?', rule: { type: 'bool_path', path: 'production.foundFootage' } },
  { id: 'horror_zombies', text: 'Minha história envolve zumbis?', rule: { type: 'bool_path', path: 'story.zombies' } },
  { id: 'horror_body', text: 'Meu filme possui elementos de body horror?', rule: { type: 'bool_path', path: 'story.bodyHorror' } },
])

const NICHE_SCIFI = niche('niche_scifi', unlockYes('tag_scifi'), [
  { id: 'scifi_space_travel', text: 'Minha história envolve viagens espaciais?', rule: { type: 'bool_path', path: 'story.spaceTravel' } },
  { id: 'scifi_aliens', text: 'Minha história envolve extraterrestres?', rule: { type: 'bool_path', path: 'story.aliens' } },
  { id: 'scifi_ai', text: 'Minha história envolve inteligência artificial?', rule: { type: 'bool_path', path: 'story.ai' } },
  { id: 'scifi_time_travel', text: 'Minha história envolve viagens no tempo?', rule: { type: 'bool_path', path: 'story.timeTravel' } },
  { id: 'scifi_dystopia', text: 'Minha história acontece em uma sociedade distópica?', rule: { type: 'bool_path', path: 'story.dystopia' } },
  { id: 'scifi_apocalypse', text: 'Minha história acontece após um apocalipse?', rule: { type: 'bool_path', path: 'story.apocalypse' } },
  { id: 'scifi_robots', text: 'Minha história envolve robôs ou androides?', rule: { type: 'bool_path', path: 'story.robots' } },
  { id: 'scifi_experiments', text: 'Minha história envolve experimentos científicos?', rule: { type: 'bool_path', path: 'story.scienceExperiments' } },
  { id: 'scifi_vr', text: 'Minha história apresenta uma realidade virtual ou simulada?', rule: { type: 'bool_path', path: 'story.virtualReality' } },
  { id: 'scifi_first_contact', text: 'Minha história envolve contato com uma civilização extraterrestre?', rule: { type: 'bool_path', path: 'story.firstContact' } },
])

const NICHE_ACTION = niche('niche_action', unlockYes('tag_action'), [
  { id: 'action_spy', text: 'Meu protagonista é um agente secreto ou espião?', rule: { type: 'bool_path', path: 'protagonist.spy' } },
  { id: 'action_martial_arts', text: 'Minha história envolve artes marciais?', rule: { type: 'bool_path', path: 'story.martialArts' } },
  { id: 'action_superhero', text: 'Meu protagonista é um super-herói?', rule: { type: 'bool_path', path: 'protagonist.superhero' } },
  { id: 'action_rescue', text: 'Minha história envolve uma missão de resgate?', rule: { type: 'bool_path', path: 'story.rescue' } },
  { id: 'action_chase', text: 'Minha história envolve uma perseguição?', rule: { type: 'bool_path', path: 'story.chase' } },
  { id: 'action_revenge', text: 'Meu protagonista busca vingança?', rule: { type: 'bool_path', path: 'story.revenge' } },
  { id: 'action_crime_org', text: 'Minha história envolve uma organização criminosa?', rule: { type: 'bool_path', path: 'story.crimeOrg' } },
  { id: 'action_cop', text: 'Meu protagonista é um policial ou agente da lei?', rule: { type: 'bool_path', path: 'protagonist.lawEnforcement' } },
  { id: 'action_heist', text: 'Minha história envolve um assalto ou roubo elaborado?', rule: { type: 'bool_path', path: 'story.heist' } },
  { id: 'action_save_world', text: 'Meu protagonista precisa impedir uma ameaça de grandes proporções?', rule: { type: 'bool_path', path: 'story.saveWorld' } },
])

const NICHE_COMEDY = niche('niche_comedy', unlockYes('tag_comedy'), [
  { id: 'comedy_romantic', text: 'Sou uma comédia romântica?', rule: { type: 'genres_all', values: ['comedy', 'romance'] } },
  { id: 'comedy_parody', text: 'Sou uma paródia de outros filmes ou gêneros?', rule: { type: 'tag', value: 'parody' } },
  { id: 'comedy_dark', text: 'Sou uma comédia de humor negro?', rule: { type: 'bool_path', path: 'story.darkComedy' } },
  { id: 'comedy_absurd', text: 'Meu humor é baseado principalmente em situações absurdas?', rule: { type: 'bool_path', path: 'story.absurdComedy' } },
  { id: 'comedy_satire', text: 'Sou uma sátira social ou política?', rule: { type: 'bool_path', path: 'story.satire' } },
  { id: 'comedy_slapstick', text: 'Utilizo bastante humor físico ou pastelão?', rule: { type: 'bool_path', path: 'story.slapstick' } },
  { id: 'comedy_duo', text: 'Minha história envolve uma dupla de protagonistas cômicos?', rule: { type: 'bool_path', path: 'protagonist.comedyDuo' } },
  { id: 'comedy_teen', text: 'Sou uma comédia adolescente?', rule: { type: 'bool_path', path: 'story.teenComedy' } },
  { id: 'comedy_fantasy', text: 'Minha comédia envolve elementos de fantasia?', rule: { type: 'genres_all', values: ['comedy', 'fantasy'] } },
  { id: 'comedy_misunderstandings', text: 'Minha história gira em torno de confusões e mal-entendidos?', rule: { type: 'bool_path', path: 'story.misunderstandings' } },
])

const NICHE_FANTASY = niche(
  'niche_fantasy',
  unlockYes('tag_fantasy', 'tag_adventure'),
  [
    { id: 'fantasy_magic', text: 'Minha história envolve magia?', rule: { type: 'bool_path', path: 'story.magic' } },
    { id: 'fantasy_fictional_world', text: 'Minha história acontece em um mundo fictício?', rule: { type: 'bool_path', path: 'story.fantasyWorld' } },
    { id: 'fantasy_dragons', text: 'Existem dragões ou outras criaturas mitológicas?', rule: { type: 'bool_path', path: 'story.mythicalCreatures' } },
    { id: 'fantasy_prophecy', text: 'Minha história envolve uma profecia?', rule: { type: 'bool_path', path: 'story.prophecy' } },
    { id: 'fantasy_macguffin', text: 'Meu protagonista precisa destruir ou encontrar um objeto poderoso?', rule: { type: 'bool_path', path: 'story.powerfulObject' } },
    { id: 'fantasy_journey_places', text: 'Minha história envolve uma jornada por diferentes lugares?', rule: { type: 'bool_path', path: 'story.journey' } },
    { id: 'fantasy_kingdoms', text: 'Minha história apresenta reinos e monarquias?', rule: { type: 'bool_path', path: 'story.kingdom' } },
    { id: 'fantasy_special_destiny', text: 'Meu protagonista possui uma origem ou destino especial?', rule: { type: 'bool_path', path: 'protagonist.specialDestiny' } },
    { id: 'fantasy_mythology', text: 'Minha história é baseada em mitologias ou lendas?', rule: { type: 'bool_path', path: 'story.mythology' } },
    { id: 'fantasy_good_vs_evil', text: 'Minha história envolve uma batalha entre o bem e o mal?', rule: { type: 'bool_path', path: 'story.goodVsEvil' } },
  ],
)

const NICHE_THRILLER = niche('niche_thriller', unlockYes('tag_thriller'), [
  { id: 'thriller_crime_invest', text: 'Minha história envolve uma investigação criminal?', rule: { type: 'bool_path', path: 'story.investigation' } },
  { id: 'thriller_detective', text: 'Meu protagonista é um detetive ou investigador?', rule: { type: 'bool_path', path: 'protagonist.detective' } },
  { id: 'thriller_serial_killer', text: 'Minha história envolve um serial killer?', rule: { type: 'bool_path', path: 'story.serialKiller' } },
  { id: 'thriller_identity', text: 'O protagonista está tentando descobrir a identidade de alguém?', rule: { type: 'bool_path', path: 'story.identityMystery' } },
  { id: 'thriller_twist', text: 'Minha história possui uma grande reviravolta?', rule: { type: 'bool_path', path: 'story.bigTwist' } },
  { id: 'thriller_hunted', text: 'Meu protagonista está sendo perseguido?', rule: { type: 'bool_path', path: 'story.hunted' } },
  { id: 'thriller_conspiracy', text: 'Minha história envolve conspirações?', rule: { type: 'bool_path', path: 'story.conspiracy' } },
  { id: 'thriller_mystery', text: 'Grande parte da história acontece em torno de um mistério?', rule: { type: 'bool_path', path: 'story.centralMystery' } },
  { id: 'thriller_solve_crime', text: 'Minha história envolve um crime que precisa ser solucionado?', rule: { type: 'bool_path', path: 'story.crime' } },
  { id: 'thriller_trust', text: 'Meu protagonista não pode confiar nas pessoas ao seu redor?', rule: { type: 'bool_path', path: 'story.trustIssues' } },
])

const NICHE_DRAMA = niche('niche_drama', unlockYes('tag_drama'), [
  { id: 'drama_real_person', text: 'Minha história é baseada na vida de uma pessoa real?', rule: { type: 'bool_path', path: 'protagonist.basedOnRealPerson' } },
  { id: 'drama_family_issues', text: 'Minha história envolve problemas familiares?', rule: { type: 'bool_path', path: 'story.familyIssues' } },
  { id: 'drama_inequality', text: 'Minha história aborda desigualdade social?', rule: { type: 'bool_path', path: 'story.socialInequality' } },
  { id: 'drama_family_conflict', text: 'Minha história envolve um relacionamento familiar complicado?', rule: { type: 'bool_path', path: 'story.familyConflict' } },
  { id: 'drama_addiction', text: 'Meu protagonista enfrenta algum tipo de vício?', rule: { type: 'bool_path', path: 'protagonist.addiction' } },
  { id: 'drama_personal_tragedy', text: 'Minha história envolve uma tragédia pessoal?', rule: { type: 'bool_path', path: 'story.personalTragedy' } },
  { id: 'drama_prison', text: 'Minha história acontece em uma prisão?', rule: { type: 'bool_path', path: 'story.prison' } },
  { id: 'drama_discrimination', text: 'Minha história envolve preconceito ou discriminação?', rule: { type: 'bool_path', path: 'story.discrimination' } },
  { id: 'drama_psychological', text: 'Minha história é centrada em conflitos psicológicos?', rule: { type: 'bool_path', path: 'story.psychologicalConflict' } },
  { id: 'drama_political', text: 'Minha história aborda questões políticas ou sociais?', rule: { type: 'bool_path', path: 'story.politicalSocial' } },
])

const NICHE_ROMANCE = niche('niche_romance', unlockYes('tag_romance'), [
  { id: 'romance_couple', text: 'Minha história acompanha um casal como protagonistas?', rule: { type: 'bool_path', path: 'story.coupleLeads' } },
  { id: 'romance_forbidden', text: 'Meu romance é proibido?', rule: { type: 'bool_path', path: 'story.forbiddenLove' } },
  { id: 'romance_impossible', text: 'Minha história envolve um amor impossível?', rule: { type: 'bool_path', path: 'story.impossibleLove' } },
  { id: 'romance_historical', text: 'Meu romance acontece em uma época histórica?', rule: { type: 'bool_path', path: 'story.historicalEra' } },
  { id: 'romance_triangle', text: 'Minha história envolve um triângulo amoroso?', rule: { type: 'bool_path', path: 'story.loveTriangle' } },
  { id: 'romance_separation', text: 'O casal protagonista enfrenta uma separação?', rule: { type: 'bool_path', path: 'story.coupleSeparation' } },
  { id: 'romance_class', text: 'Minha história apresenta um romance entre pessoas de classes sociais diferentes?', rule: { type: 'bool_path', path: 'story.classDifferenceRomance' } },
  { id: 'romance_love_at_first', text: 'Minha história envolve um amor à primeira vista?', rule: { type: 'bool_path', path: 'story.loveAtFirstSight' } },
])

const NICHE_WESTERN = niche('niche_western', unlockYes('tag_western'), [
  { id: 'western_old_west', text: 'Minha história acontece no Velho Oeste americano?', rule: { type: 'bool_path', path: 'story.oldWest' } },
  { id: 'western_gunslinger', text: 'Meu protagonista é um pistoleiro?', rule: { type: 'bool_path', path: 'protagonist.gunslinger' } },
  { id: 'western_land', text: 'Minha história envolve disputas por terras?', rule: { type: 'bool_path', path: 'story.landDispute' } },
  { id: 'western_sheriff', text: 'Minha história envolve xerifes e foras da lei?', rule: { type: 'bool_path', path: 'story.sheriffOutlaws' } },
  { id: 'western_bounty', text: 'Meu protagonista é um caçador de recompensas?', rule: { type: 'bool_path', path: 'protagonist.bountyHunter' } },
  { id: 'western_indigenous', text: 'Minha história envolve conflitos entre colonizadores e povos indígenas?', rule: { type: 'bool_path', path: 'story.indigenousConflict' } },
  { id: 'western_duel', text: 'Minha história apresenta duelos de armas?', rule: { type: 'bool_path', path: 'story.gunDuel' } },
  { id: 'western_spaghetti', text: 'Sou um faroeste spaghetti?', rule: { type: 'tag', value: 'spaghetti_western' } },
])

const NICHE_WAR = niche('niche_war', unlockYes('story_war'), [
  { id: 'war_ww2', text: 'Minha história acontece durante a Segunda Guerra Mundial?', rule: { type: 'bool_path', path: 'story.ww2' } },
  { id: 'war_ww1', text: 'Minha história acontece durante a Primeira Guerra Mundial?', rule: { type: 'bool_path', path: 'story.ww1' } },
  { id: 'war_real_battle', text: 'Minha história é baseada em uma batalha real?', rule: { type: 'bool_path', path: 'story.realBattle' } },
  { id: 'war_soldier', text: 'Meu protagonista é um soldado?', rule: { type: 'bool_path', path: 'protagonist.soldier' } },
  { id: 'war_military_group', text: 'Minha história acompanha um grupo de militares?', rule: { type: 'bool_path', path: 'story.militaryGroup' } },
  { id: 'war_holocaust', text: 'Minha história envolve o Holocausto?', rule: { type: 'bool_path', path: 'story.holocaust' } },
  { id: 'war_revolution', text: 'Minha história acontece durante uma revolução?', rule: { type: 'bool_path', path: 'story.revolution' } },
  { id: 'war_historical_figure', text: 'Minha história retrata uma figura histórica conhecida?', rule: { type: 'bool_path', path: 'story.historicalFigure' } },
  { id: 'war_antiquity', text: 'Minha história acontece durante a Antiguidade?', rule: { type: 'bool_path', path: 'story.antiquity' } },
  { id: 'war_cold_war', text: 'Minha história aborda a Guerra Fria?', rule: { type: 'bool_path', path: 'story.coldWar' } },
])

/** Musical: sem pergunta-pai nas 50 gerais — libera via animação musical ou franquia animada. */
const NICHE_MUSICAL = niche(
  'niche_musical',
  unlockYes('anim_musical', 'anim_franchise'),
  [
    { id: 'musical_singing', text: 'Meus personagens cantam durante a história?', rule: { type: 'bool_path', path: 'story.charactersSing' } },
    { id: 'musical_dancing', text: 'Meus personagens dançam em números musicais?', rule: { type: 'bool_path', path: 'story.musicalNumbers' } },
    { id: 'musical_music_world', text: 'Minha história acontece no mundo da música?', rule: { type: 'bool_path', path: 'story.musicIndustry' } },
    { id: 'musical_singer', text: 'Meu protagonista é um cantor ou músico?', rule: { type: 'bool_path', path: 'protagonist.musician' } },
    { id: 'musical_from_theatre', text: 'Sou baseado em um musical teatral?', rule: { type: 'bool_path', path: 'production.basedOnPlay' } },
    { id: 'musical_original_songs', text: 'Minha trilha sonora é composta principalmente por músicas originais?', rule: { type: 'bool_path', path: 'production.originalSongs' } },
    { id: 'musical_band', text: 'Minha história envolve uma banda ou grupo musical?', rule: { type: 'bool_path', path: 'story.band' } },
    { id: 'musical_animated', text: 'Sou um musical animado?', rule: { type: 'bool_path', path: 'production.animatedMusical' } },
  ],
)

const NICHE_DOC = niche('niche_documentary', unlockYes('based_on_true'), [
  { id: 'doc_real_people', text: 'Minha história acompanha pessoas reais?', rule: { type: 'bool_path', path: 'production.realPeople' } },
  { id: 'doc_interviews', text: 'Sou baseado principalmente em entrevistas?', rule: { type: 'bool_path', path: 'production.interviews' } },
  { id: 'doc_environment', text: 'Abordo questões ambientais ou da natureza?', rule: { type: 'bool_path', path: 'story.environment' } },
  { id: 'doc_historical_event', text: 'Minha história envolve um acontecimento histórico real?', rule: { type: 'bool_path', path: 'story.historicalEvent' } },
  { id: 'doc_investigative', text: 'Sou um documentário investigativo?', rule: { type: 'bool_path', path: 'production.investigativeDoc' } },
  { id: 'doc_one_person', text: 'Acompanho a vida de uma pessoa específica?', rule: { type: 'bool_path', path: 'production.biographyDoc' } },
  { id: 'doc_music', text: 'Sou um documentário sobre música ou artistas?', rule: { type: 'bool_path', path: 'production.musicDoc' } },
  { id: 'doc_archive', text: 'Utilizo imagens de arquivo como parte importante da narrativa?', rule: { type: 'bool_path', path: 'production.archiveFootage' } },
])

const NICHE_FAMILY = niche(
  'niche_family',
  // Só após confirmar público infantil/familiar — não liberar por adolescente em terror
  unlockYes('tag_kids', 'anim_kids'),
  [
    { id: 'family_child_lead', text: 'Meu protagonista é uma criança?', rule: { type: 'bool_path', path: 'protagonist.child' } },
    { id: 'family_family_leads', text: 'Minha história é protagonizada por uma família?', rule: { type: 'bool_path', path: 'story.familyLeads' } },
    { id: 'family_talking_animals', text: 'Minha história envolve animais que falam?', rule: { type: 'bool_path', path: 'story.talkingAnimals' } },
    { id: 'family_moral', text: 'Minha história possui uma lição moral explícita?', rule: { type: 'bool_path', path: 'story.moralLesson' } },
    { id: 'family_fairy_tale', text: 'Minha história é baseada em um conto infantil?', rule: { type: 'bool_path', path: 'story.fairyTale' } },
    { id: 'family_absent_parents', text: 'Meu protagonista precisa lidar com a ausência dos pais?', rule: { type: 'bool_path', path: 'story.absentParents' } },
    { id: 'family_creature_friend', text: 'Minha história envolve amizade entre uma criança e uma criatura?', rule: { type: 'bool_path', path: 'story.childCreatureFriendship' } },
    { id: 'family_whole_family', text: 'Sou um filme pensado para ser assistido por toda a família?', rule: { type: 'tag', value: 'kids' } },
  ],
)

export const WHOAMI_QUESTIONS_V2 = [
  ...GENERAL,
  ...NICHE_ANIMATION,
  ...NICHE_HORROR,
  ...NICHE_SCIFI,
  ...NICHE_ACTION,
  ...NICHE_COMEDY,
  ...NICHE_FANTASY,
  ...NICHE_THRILLER,
  ...NICHE_DRAMA,
  ...NICHE_ROMANCE,
  ...NICHE_WESTERN,
  ...NICHE_WAR,
  ...NICHE_MUSICAL,
  ...NICHE_DOC,
  ...NICHE_FAMILY,
]

/** Resposta do histórico libera a pergunta? */
export function isWhoamiQuestionUnlocked(question, answerById) {
  const unlock = question?.unlock
  if (!unlock || !Array.isArray(unlock.any) || unlock.any.length === 0) {
    return true
  }
  return unlock.any.some((cond) => {
    const got = answerById?.get?.(cond.questionId) ?? answerById?.[cond.questionId]
    return got === (cond.answer || 'yes')
  })
}
