import crypto from 'node:crypto'
import { query } from './db.js'

/**
 * Sorteia um item do pool sem repetir até esgotar.
 * @param {object} opts
 * @param {'classic'|'cast'|'character'} opts.mode
 * @param {string} opts.dateStr YYYY-MM-DD
 * @param {() => Promise<string[]>} opts.listEligible — ids uuid elegíveis
 * @param {string[]} [opts.excludeIds] — evitar no mesmo dia (ex.: clássico ≠ elenco)
 * @returns {Promise<string|null>} item_id
 */
export async function drawWithoutReplacement({
  mode,
  dateStr,
  listEligible,
  excludeIds = [],
}) {
  const eligible = await listEligible()
  if (!eligible.length) return null

  const { rows: usedRows } = await query(
    `SELECT item_id::text AS id FROM daily_pool_used WHERE mode = $1`,
    [mode],
  )
  const used = new Set(usedRows.map((r) => r.id))
  let unused = eligible.filter((id) => !used.has(id))

  // Esgotou → reinicia o ciclo (lista “usados” zera pra esse modo)
  if (unused.length === 0) {
    await query(`DELETE FROM daily_pool_used WHERE mode = $1`, [mode])
    unused = [...eligible]
  }

  const exclude = new Set(excludeIds.filter(Boolean).map(String))
  let pool = unused.filter((id) => !exclude.has(id))
  // Se o filtro do dia esvaziar, permite coincidência
  if (pool.length === 0) pool = unused

  const pick = pool[crypto.randomInt(pool.length)]

  await query(
    `INSERT INTO daily_pool_used (mode, item_id, used_on)
     VALUES ($1, $2::uuid, $3::date)
     ON CONFLICT (mode, item_id) DO UPDATE SET used_on = EXCLUDED.used_on`,
    [mode, pick, dateStr],
  )

  return pick
}

/** Reset manual pro lançamento (dezembro). */
export async function resetDailyPools(modes = ['classic', 'cast', 'character']) {
  await query(`DELETE FROM daily_pool_used WHERE mode = ANY($1::text[])`, [
    modes,
  ])
}
