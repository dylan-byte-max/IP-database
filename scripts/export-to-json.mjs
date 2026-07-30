/**
 * 导出全部 ips 数据为 JSON，用于迁移到 Git 仓库
 * 通过 GitHub Actions 运行（本地网络可能无法直连 Supabase）
 */
import { writeFileSync, mkdirSync } from 'fs'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

// 分页拉取全量数据（避免默认 1000 行限制）
let all = []
const pageSize = 200
for (let offset = 0; ; offset += pageSize) {
  const res = await fetch(`${url}/rest/v1/ips?select=*&order=created_at.asc&limit=${pageSize}&offset=${offset}`, { headers })
  if (!res.ok) {
    console.error('Query failed:', res.status, await res.text())
    process.exit(1)
  }
  const rows = await res.json()
  all = all.concat(rows)
  if (rows.length < pageSize) break
}

console.log('=== FETCHED:', all.length, 'records ===')

// 体积分析
const totalBytes = Buffer.byteLength(JSON.stringify(all), 'utf-8')
const rawMdBytes = all.reduce((s, r) => s + Buffer.byteLength(r.raw_md || '', 'utf-8'), 0)
const byType = {}
all.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1 })

console.log('BY TYPE:', JSON.stringify(byType))
console.log('TOTAL SIZE:', (totalBytes / 1024 / 1024).toFixed(2), 'MB')
console.log('raw_md SIZE:', (rawMdBytes / 1024 / 1024).toFixed(2), 'MB', `(${(rawMdBytes / totalBytes * 100).toFixed(1)}% of total)`)
console.log('AVG raw_md:', (rawMdBytes / all.length / 1024).toFixed(1), 'KB per record')

const withMd = all.filter(r => r.raw_md).length
console.log('records with raw_md:', withMd, '/', all.length)

// 最大的几条
const largest = [...all]
  .sort((a, b) => (b.raw_md?.length || 0) - (a.raw_md?.length || 0))
  .slice(0, 5)
  .map(r => `${r.name}: ${((r.raw_md?.length || 0) / 1024).toFixed(0)}KB`)
console.log('LARGEST 5:', largest.join(' | '))

// 写出导出文件
mkdirSync('export', { recursive: true })

// 方案A：单个大文件（含全文）
writeFileSync('export/ips-full.json', JSON.stringify(all, null, 2), 'utf-8')

// 方案B：索引 + 每条报告单独文件（推荐，前端首屏只加载索引）
const index = all.map(({ raw_md, ...rest }) => ({ ...rest, has_report: !!raw_md }))
writeFileSync('export/ips-index.json', JSON.stringify(index, null, 2), 'utf-8')
const indexBytes = Buffer.byteLength(JSON.stringify(index), 'utf-8')
console.log('INDEX SIZE (no raw_md):', (indexBytes / 1024).toFixed(0), 'KB')

mkdirSync('export/reports', { recursive: true })
let reportCount = 0
for (const r of all) {
  if (!r.raw_md) continue
  writeFileSync(`export/reports/${r.id}.md`, r.raw_md, 'utf-8')
  reportCount++
}
console.log('wrote', reportCount, 'report files')
console.log('EXPORT_DONE')
