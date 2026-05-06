/**
 * Supabase Keep-Alive Script
 * 
 * 每天定时执行，向 Supabase 发送数据库请求，防止免费项目因 7 天不活跃被暂停。
 * 使用原生 fetch（Node 18+内置），无需任何额外依赖。
 */

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
}

async function keepAlive() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Starting keep-alive ping...`)
  let success = 0

  // Method 1: Query ips table via REST API
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/ips?select=id,title&limit=1`, { headers })
    if (res.ok) {
      const data = await res.json()
      console.log(`  [OK] ips query success, got ${data.length} row(s)`)
      success++
    } else {
      console.error(`  [FAIL] ips query: ${res.status} ${res.statusText}`)
    }
  } catch (e) {
    console.error('  [FAIL] ips query exception:', e.message)
  }

  // Method 2: Check auth health
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { 'apikey': supabaseKey }
    })
    if (res.ok) {
      console.log('  [OK] Auth service healthy')
      success++
    } else {
      console.error(`  [FAIL] Auth health: ${res.status} ${res.statusText}`)
    }
  } catch (e) {
    console.error('  [FAIL] Auth health exception:', e.message)
  }

  // Method 3: List storage buckets
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers })
    if (res.ok) {
      const data = await res.json()
      console.log(`  [OK] Storage API responding, ${data.length} bucket(s)`)
      success++
    } else {
      console.error(`  [FAIL] Storage API: ${res.status} ${res.statusText}`)
    }
  } catch (e) {
    console.error('  [FAIL] Storage API exception:', e.message)
  }

  console.log(`[${new Date().toISOString()}] Keep-alive complete. ${success}/3 checks passed.`)

  if (success === 0) {
    process.exit(1)
  }
}

keepAlive()
