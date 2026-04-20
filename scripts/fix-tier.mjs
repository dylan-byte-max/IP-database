import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

// 1. Add production_tier_note column
const { error: alterErr } = await supabase.rpc('exec_sql', {
  sql: "ALTER TABLE ips ADD COLUMN IF NOT EXISTS production_tier_note TEXT;"
})
// rpc might not work, try direct approach
if (alterErr) {
  console.log('Note: ALTER TABLE via rpc failed (expected if no exec_sql function). Please run this SQL in Supabase SQL Editor:')
  console.log('  ALTER TABLE ips ADD COLUMN IF NOT EXISTS production_tier_note TEXT;')
}

// 2. Update 完美世界's production tier note
const { data, error } = await supabase
  .from('ips')
  .update({ production_tier: 'A→S', ai_summary: '国创3D年番的制作标杆和商业标杆——年番+特别篇+剧场版三位一体运营，3000万在追用户，制作水准从A级逐季提升至接近S级' })
  .eq('name', '完美世界')
  .select()

if (error) console.error('Update failed:', error.message)
else console.log('Updated 完美世界 production_tier to A→S:', data[0]?.id)
