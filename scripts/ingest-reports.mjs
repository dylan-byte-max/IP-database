/**
 * 自动入库：解析 reports-inbox/ 下的 MD 报告 → 写入 data/
 *
 * 流程：
 *   1. 扫描 reports-inbox/*.md
 *   2. 解析出结构化字段（类型、名称、作者、评分、标签等）
 *   3. 生成 UUID，写 data/reports/<id>.md
 *   4. 更新 data/ips-index.json（同名同类型则覆盖更新）
 *   5. 同步到 public/data/ 供 Vite 静态部署
 *   6. 删除 inbox 中已处理的文件
 *
 * 支持在 MD 开头用 HTML 注释显式指定类型与字段：
 *   <!-- type: comic -->
 *   <!-- author: 宫缘乾 -->
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync, copyFileSync, rmSync } from 'fs'
import { randomUUID } from 'crypto'
import { join } from 'path'

const INBOX = 'reports-inbox'
const DATA_DIR = 'data'
const REPORTS_DIR = join(DATA_DIR, 'reports')
const INDEX_FILE = join(DATA_DIR, 'ips-index.json')
const PUBLIC_DATA = join('public', 'data')

// ---------- 解析辅助 ----------
function clean(val) {
  if (!val) return ''
  return String(val).replace(/\*+/g, '').replace(/^《|》$/g, '').trim()
}

function parseMdReport(md) {
  const result = { genre_tags: [] }

  function getTableValue(label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
    const m = md.match(new RegExp(`\\|\\s*${esc}\\s*\\|\\s*(.+?)\\s*\\|`, 'mi'))
    return m ? clean(m[1]) : null
  }

  // 显式元数据注释优先：<!-- key: value -->
  const metaFields = ['type', 'name', 'author', 'platform', 'studio', 'director',
    'serial_status', 'source_type', 'source_name', 'production_tier', 'art_style', 'audience_target']
  for (const f of metaFields) {
    const m = md.match(new RegExp(`<!--\\s*${f}\\s*:\\s*(.+?)\\s*-->`, 'i'))
    if (m) result[f] = clean(m[1])
  }
  // 数值型元数据
  const numMetaFields = ['total_episodes', 'total_seasons', 'adaptation_score',
    'douban_score', 'bangumi_score', 'yousuu_score', 'qidian_score', 'bilibili_followers']
  for (const f of numMetaFields) {
    const m = md.match(new RegExp(`<!--\\s*${f}\\s*:\\s*([\\d.]+)\\s*-->`, 'i'))
    if (m) {
      const v = parseFloat(m[1])
      if (!isNaN(v)) result[f] = f.includes('score') ? v : parseInt(m[1])
    }
  }

  // ===== 类型判定 =====
  if (!result.type) {
    if (md.match(/漫画深度研究|漫画研究报告/)) result.type = 'comic'
    else if (md.match(/小说深度研究|小说研究报告/)) result.type = 'novel'
    else if (md.match(/动漫深度研究|动漫研究报告/)) result.type = 'anime'
    else {
      const novelM = ['作者档案', '优书网', '影视化改编潜力', '起点中文网', '番茄小说', '总字数']
      const animeM = ['制作团队', '播出平台', '各季详情', 'Bangumi', '追番人数', '制作水准']
      const comicM = ['快看漫画', '腾讯动漫', '连载平台', '漫画家', '人气值', '动态漫']
      const n = novelM.filter(x => md.includes(x)).length
      const a = animeM.filter(x => md.includes(x)).length
      const c = comicM.filter(x => md.includes(x)).length
      const max = Math.max(n, a, c)
      result.type = max === 0 ? 'novel' : c === max ? 'comic' : a === max ? 'anime' : 'novel'
    }
  }

  // ===== 名称 =====
  if (!result.name) {
    for (const p of [/^#\s+.*?《(.+?)》/m, /^#\s+.*?[《「](.+?)[》」]/m, /^#\s+(.+?)深度研究/m]) {
      const m = md.match(p)
      if (m) { result.name = clean(m[1]); break }
    }
  }

  // ===== 表格字段 =====
  const tableFields = {
    '作品全名': 'name', '中文名': 'name',
    '作者': 'author', '笔名': 'author', '漫画家': 'author',
    '平台': 'platform', '连载平台': 'platform',
    '动画制作': 'studio', '制作公司': 'studio',
    '导演': 'director', '监督': 'director',
    '总季数': 'total_seasons', '总集数': 'total_episodes', '话数': 'total_episodes',
    '制作水准': 'production_tier',
    '原著类型': 'source_type', '原著名称': 'source_name',
    '连载状态': 'serial_status', '状态': 'serial_status',
    '总字数': 'word_count',
    '画风': 'art_style', '受众定位': 'audience_target',
  }
  for (const [label, field] of Object.entries(tableFields)) {
    const val = getTableValue(label)
    if (!val) continue
    if (field === 'total_seasons' || field === 'total_episodes') {
      const n = parseInt(val)
      if (n && !result[field]) result[field] = n
    } else if (field === 'production_tier') {
      if (!result[field]) result[field] = val.replace(/级$/, '').trim()
    } else if (field === 'platform') {
      if (!result[field]) result[field] = val.replace(/[（(].*?[）)]/g, '').trim()
    } else if (!result[field]) {
      result[field] = val
    }
  }

  // ===== 评分 =====
  const scorePatterns = {
    douban_score: [/豆瓣[^|]*\|\s*\*?\*?([\d.]+)\s*[/／]/m, /豆瓣[^|]*\|\s*\*?\*?约?([\d.]+)/m, /豆瓣评分[：:]\s*\*?\*?([\d.]+)/m],
    bangumi_score: [/[Bb]angumi[^|]*\|\s*\*?\*?([\d.]+)/m],
    yousuu_score: [/优书网[^|]*\|\s*\*?\*?([\d.]+)/m],
    qidian_score: [/起点[^|]*评分[^|]*\|\s*\*?\*?([\d.]+)/m],
  }
  for (const [field, pats] of Object.entries(scorePatterns)) {
    for (const p of pats) {
      const m = md.match(p)
      if (m) {
        const v = parseFloat(m[1])
        if (v >= 0 && v <= 10) { result[field] = v; break }
      }
    }
  }
  for (const p of [/综合得分\s*\|\s*\*?\*?⭐?\s*([\d.]+)/m, /综合得分.*?([\d.]+)\s*[/／]\s*5/m, /改编潜力[^|]*\|\s*\*?\*?⭐?([\d.]+)/m]) {
    const m = md.match(p)
    if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 5) { result.adaptation_score = v; break } }
  }

  // ===== AI 摘要 =====
  // 优先显式注释 <!-- summary: xxx -->
  const summaryMeta = md.match(/<!--\s*summary\s*:\s*([\s\S]+?)\s*-->/i)
  if (summaryMeta) {
    result.ai_summary = clean(summaryMeta[1]).substring(0, 400)
  } else {
    for (const p of [
      // > **一句话定位**：xxx
      /\*\*一句话定位\*\*\s*[：:]\s*(.+?)(?:\n|$)/m,
      /一句话定位\s*[：:]\s*(.+?)(?:\n|$)/m,
      // | **整体定位** | **xxx** |  （标签自带 ** 包裹）
      /\|\s*\*{0,2}整体定位\*{0,2}\s*\|\s*\*{0,2}(.+?)\*{0,2}\s*\|/m,
      /整体定位\s*\|\s*\*{0,2}(.+?)\*{0,2}\s*\|/m,
    ]) {
      const m = md.match(p)
      if (m) { result.ai_summary = clean(m[1]).substring(0, 400); break }
    }
  }

  // ===== 标签 =====
  if (!result.genre_tags.length) {
    const tagsMeta = md.match(/<!--\s*tags\s*:\s*(.+?)\s*-->/i)
    if (tagsMeta) {
      result.genre_tags = tagsMeta[1].split(/[、,，]/).map(s => s.trim()).filter(Boolean)
    }
  }
  if (!result.genre_tags.length) {
    for (const label of ['题材', '标签', '类型']) {
      const val = getTableValue(label)
      if (val) {
        result.genre_tags = val.split(/[、,，·\/\s]+/).map(s => s.replace(/[{}\[\]]/g, '').trim())
          .filter(s => s && s.length < 12)
        if (result.genre_tags.length) break
      }
    }
  }

  // ===== 播出平台（动漫）=====
  const pm = md.match(/中国\s*\|\s*(.+?)\s*(\||$)/m)
  if (pm) {
    result.broadcast_platforms = pm[1].replace(/（.+?）/g, '').replace(/\(.+?\)/g, '')
      .split(/[/、,，]/).map(s => s.trim()).filter(Boolean)
  }

  return result
}

// ---------- 主流程 ----------
if (!existsSync(INBOX)) {
  console.log('no inbox directory, nothing to do')
  process.exit(0)
}

const files = readdirSync(INBOX).filter(f => f.toLowerCase().endsWith('.md'))
if (files.length === 0) {
  console.log('NO_NEW_REPORTS')
  process.exit(0)
}

mkdirSync(REPORTS_DIR, { recursive: true })
let index = existsSync(INDEX_FILE) ? JSON.parse(readFileSync(INDEX_FILE, 'utf-8')) : []

const processed = []
for (const file of files) {
  const path = join(INBOX, file)
  const md = readFileSync(path, 'utf-8')
  const parsed = parseMdReport(md)

  if (!parsed.name) {
    console.error(`[SKIP] ${file}: 无法解析作品名称，请在 MD 中加 <!-- name: 作品名 --> 或用「# 《作品名》...」标题`)
    continue
  }

  const now = new Date().toISOString()
  const existing = index.find(r => r.name === parsed.name && r.type === parsed.type)

  let id
  if (existing) {
    id = existing.id
    Object.assign(existing, parsed, { updated_at: now, has_report: true })
    console.log(`[UPDATE] ${parsed.name} (${parsed.type}) id=${id}`)
  } else {
    id = randomUUID()
    index.push({
      id,
      created_at: now,
      updated_at: now,
      genre_tags: [],
      broadcast_platforms: [],
      ...parsed,
      has_report: true,
    })
    console.log(`[NEW] ${parsed.name} (${parsed.type}) id=${id}`)
  }

  writeFileSync(join(REPORTS_DIR, `${id}.md`), md, 'utf-8')
  processed.push({ file, path, name: parsed.name, type: parsed.type })
}

if (processed.length === 0) {
  console.log('NO_VALID_REPORTS')
  process.exit(0)
}

// 写回索引
writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')

// 同步到 public/data 供静态部署
mkdirSync(PUBLIC_DATA, { recursive: true })
copyFileSync(INDEX_FILE, join(PUBLIC_DATA, 'ips-index.json'))
rmSync(join(PUBLIC_DATA, 'reports'), { recursive: true, force: true })
mkdirSync(join(PUBLIC_DATA, 'reports'), { recursive: true })
for (const f of readdirSync(REPORTS_DIR)) {
  copyFileSync(join(REPORTS_DIR, f), join(PUBLIC_DATA, 'reports', f))
}

// 清空 inbox 中已处理文件
for (const p of processed) unlinkSync(p.path)

console.log(`\n=== DONE: ${processed.length} report(s) ingested, index now has ${index.length} records ===`)
console.log('INGESTED:', processed.map(p => `${p.name}(${p.type})`).join(', '))
