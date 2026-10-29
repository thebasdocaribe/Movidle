/**
 * CineBlitz — gera clips multi-take a partir do Internet Archive (ffmpeg).
 *
 * Cada filme vira 1 MP4 concatenando 6 cenas de 1s (momentos diferentes).
 * No jogo: tentativa N toca os primeiros N segundos (= N takes).
 *
 * Uso:
 *   node scripts/build-clips.mjs
 *   node scripts/build-clips.mjs night-of-the-living-dead
 *   node scripts/build-clips.mjs --force
 */
import { spawn } from 'node:child_process'
import {
  readFile,
  writeFile,
  mkdir,
  access,
  unlink,
  rm,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(__dirname, 'clips', 'manifest.json')
const OUT_DIR = path.join(ROOT, 'web', 'public', 'clips')
const TAKE_COUNT = 6

function run(cmd, args, { quiet } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: quiet ? 'ignore' : 'inherit',
      shell: false,
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} saiu com código ${code}`))
    })
  })
}

async function resolveSourceUrl(entry) {
  if (entry.sourceUrl) return entry.sourceUrl

  const metaUrl = `https://archive.org/metadata/${encodeURIComponent(entry.archiveId)}`
  const res = await fetch(metaUrl)
  if (!res.ok) throw new Error(`Metadata Archive.org falhou: ${res.status}`)
  const meta = await res.json()
  const files = meta.files || []

  let file = null
  if (entry.preferredFile) {
    file = files.find((f) => f.name === entry.preferredFile)
  }
  if (!file) {
    const candidates = files.filter(
      (f) =>
        /\.mp4$/i.test(f.name) &&
        !/trailer/i.test(f.name) &&
        Number(f.size || 0) > 5_000_000,
    )
    candidates.sort((a, b) => Number(a.size) - Number(b.size))
    file = candidates[0]
  }
  if (!file) throw new Error(`Nenhum MP4 bom em ${entry.archiveId}`)

  return `https://archive.org/download/${entry.archiveId}/${encodeURIComponent(file.name)}`
}

function takeStarts(entry) {
  if (Array.isArray(entry.takes) && entry.takes.length > 0) {
    return entry.takes.map(Number).slice(0, TAKE_COUNT)
  }
  const start = Number(entry.startSec ?? 60)
  const gap = Number(entry.takeGapSec ?? 300)
  return Array.from({ length: TAKE_COUNT }, (_, i) => start + i * gap)
}

async function extractTake(sourceUrl, startSec, durationSec, outPath) {
  // frames fixos ≈ 1s @ 30fps — cortes limpos, menos “vazar” pro take seguinte
  const frames = Math.max(1, Math.round(durationSec * 30))
  await run(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(startSec),
      '-i',
      sourceUrl,
      '-frames:v',
      String(frames),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      outPath,
    ],
    { quiet: true },
  )
}

async function buildClip(entry, { force }) {
  const outName = `${entry.slug}.mp4`
  const outPath = path.join(OUT_DIR, outName)
  const takeDur = Number(entry.takeDurationSec ?? 1)
  const starts = takeStarts(entry)

  if (starts.length < TAKE_COUNT) {
    throw new Error(
      `${entry.slug}: precisa de ${TAKE_COUNT} takes no manifest (tem ${starts.length})`,
    )
  }

  if (!force) {
    try {
      await access(outPath)
      console.log(`✓ já existe: ${outName} (use --force pra refazer)`)
      return `/clips/${outName}`
    } catch {
      /* generate */
    }
  } else {
    try {
      await unlink(outPath)
    } catch {
      /* ok */
    }
  }

  const sourceUrl = await resolveSourceUrl(entry)
  const tmpDir = path.join(
    os.tmpdir(),
    `cineblitz-${entry.slug}-${Date.now()}`,
  )
  await mkdir(tmpDir, { recursive: true })

  console.log(`→ ${entry.title}`)
  console.log(`  fonte: ${sourceUrl}`)
  console.log(`  takes @ ${starts.join(', ')}s (cada ${takeDur}s)`)

  try {
    const parts = []
    for (let i = 0; i < TAKE_COUNT; i++) {
      const part = path.join(tmpDir, `take-${i + 1}.mp4`)
      process.stdout.write(`  cortando take ${i + 1}/${TAKE_COUNT}…\r`)
      await extractTake(sourceUrl, starts[i], takeDur, part)
      parts.push(part)
    }
    console.log(`  cortando take ${TAKE_COUNT}/${TAKE_COUNT}… ok`)

    const listFile = path.join(tmpDir, 'list.txt')
    const listBody = parts
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n')
    await writeFile(listFile, listBody, 'utf8')

    await run('ffmpeg', [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listFile,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outPath,
    ])

    console.log(`✓ gerado: web/public/clips/${outName}`)
    return `/clips/${outName}`
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const only = args.find((a) => !a.startsWith('--'))

  const raw = await readFile(MANIFEST, 'utf8')
  let entries = JSON.parse(raw)
  if (only) entries = entries.filter((e) => e.slug === only)
  if (entries.length === 0) {
    console.error('Nada no manifest pra processar.')
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })
  const results = []
  for (const entry of entries) {
    const clipPath = await buildClip(entry, { force })
    results.push({ slug: entry.slug, title: entry.title, clipPath })
  }

  console.log('\nPronto.')
  for (const r of results) {
    console.log(
      `  UPDATE movies SET clip_path = '${r.clipPath}' WHERE title = '${r.title.replace(/'/g, "''")}';`,
    )
  }

  // Aplica no Postgres se server/.env existir (opcional)
  try {
    const { default: dotenv } = await import('dotenv')
    dotenv.config({ path: path.join(ROOT, 'server', '.env') })
    const { Client } = await import('pg')
    const client = new Client({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'cineblitz',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
    })
    await client.connect()
    for (const r of results) {
      const res = await client.query(
        `UPDATE movies SET clip_path = $1 WHERE title = $2 RETURNING title`,
        [r.clipPath, r.title],
      )
      if (res.rowCount) console.log(`  DB ok: ${r.title}`)
      else console.warn(`  DB miss (título?): ${r.title}`)
    }
    await client.end()
  } catch (err) {
    console.warn('  (DB update pulado:', err.message, ')')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
