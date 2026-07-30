/**
 * 尝试通过 Supabase 修改 type CHECK 约束（novel/anime → +comic）
 * service_role key 通常无法直接改 schema，此脚本用于探测可行性。
 * 若失败，需在 Supabase SQL Editor 手动执行 scripts/alter-add-comic-type.sql
 */
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}

// 探测：直接插一条 comic 记录，看约束是否已允许
console.log('=== Probe: can we insert type=comic? ===')
const probe = await fetch(`${url}/rest/v1/ips`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify([{ type: 'comic', name: '__probe_delete_me__' }]),
})

if (probe.ok) {
  const rows = await probe.json()
  console.log('RESULT: comic type ALREADY ALLOWED (constraint already updated)')
  // 清理探测数据
  await fetch(`${url}/rest/v1/ips?id=eq.${rows[0].id}`, { method: 'DELETE', headers })
  console.log('probe row cleaned up')
  console.log('CONSTRAINT_OK')
} else {
  const body = await probe.text()
  console.log('RESULT: comic type REJECTED')
  console.log('detail:', body.substring(0, 300))
  console.log('CONSTRAINT_NEEDS_MANUAL_SQL')
}
