import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

// Fix platform names: remove parenthetical suffixes like （首发）(首发)
const { data, error } = await supabase.from('ips').select('id, name, platform')
if (error) { console.error(error); process.exit(1) }

for (const row of data) {
  if (!row.platform) continue
  const cleaned = row.platform.replace(/[（(].*?[）)]/g, '').trim()
  if (cleaned !== row.platform) {
    const { error: updateErr } = await supabase.from('ips').update({ platform: cleaned }).eq('id', row.id)
    if (updateErr) console.error(`FAIL ${row.name}: ${updateErr.message}`)
    else console.log(`FIXED: "${row.name}" platform: "${row.platform}" -> "${cleaned}"`)
  }
}
console.log('Done!')
