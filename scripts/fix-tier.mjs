import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

// Fix: 完美世界 production_tier should be S+ (福煦 is S+ rated)
const { data, error } = await supabase
  .from('ips')
  .update({ production_tier: 'S+' })
  .eq('name', '完美世界')
  .select()

if (error) console.error('FAIL:', error.message)
else console.log('Updated 完美世界 production_tier to S+ (福煦影视 industry rating):', data[0]?.id)
