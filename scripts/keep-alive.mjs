/**
 * Supabase Keep-Alive Script
 * 
 * 每天定时执行，向 Supabase 发送数据库请求，防止免费项目因 7 天不活跃被暂停。
 * 通过 GitHub Actions 调度运行。
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function keepAlive() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Starting keep-alive ping...`)

  // Method 1: Query the ip_works table (your main table)
  try {
    const { data, error } = await supabase
      .from('ip_works')
      .select('id, title')
      .limit(1)

    if (error) {
      console.error('  [FAIL] ip_works query error:', error.message)
    } else {
      console.log(`  [OK] ip_works query success, got ${data?.length || 0} row(s)`)
    }
  } catch (e) {
    console.error('  [FAIL] ip_works query exception:', e.message)
  }

  // Method 2: Check auth service
  try {
    const { error } = await supabase.auth.getSession()
    if (error) {
      console.error('  [FAIL] Auth check error:', error.message)
    } else {
      console.log('  [OK] Auth service responding')
    }
  } catch (e) {
    console.error('  [FAIL] Auth check exception:', e.message)
  }

  // Method 3: Storage API check
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      console.error('  [FAIL] Storage API error:', error.message)
    } else {
      console.log(`  [OK] Storage API responding, ${data?.length || 0} bucket(s)`)
    }
  } catch (e) {
    console.error('  [FAIL] Storage API exception:', e.message)
  }

  console.log(`[${new Date().toISOString()}] Keep-alive complete.`)
}

keepAlive()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Keep-alive failed:', err)
    process.exit(1)
  })
