/**
 * 数据校验：统计库内记录数与类型分布
 * 用于在本地网络无法直连 Supabase 时，借 GitHub Actions 确认数据完整性
 */
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

const res = await fetch(`${url}/rest/v1/ips?select=type,name,created_at`, { headers })
if (!res.ok) {
  console.error('Query failed:', res.status, await res.text())
  process.exit(1)
}

const rows = await res.json()
const byType = {}
rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1 })

console.log('=== TOTAL RECORDS:', rows.length, '===')
console.log('BY TYPE:', JSON.stringify(byType))
console.log('LATEST 8:', rows
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  .slice(0, 8)
  .map(r => `${r.name}(${r.type})`)
  .join(' | '))
