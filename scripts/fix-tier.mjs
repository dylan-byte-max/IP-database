import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const { data, error } = await supabase
  .from('ips')
  .update({ douban_score: 6.3 })
  .eq('name', '大主宰')
  .select()

if (error) console.error('FAIL:', error.message)
else console.log('Updated:', data[0]?.name, 'douban_score -> 6.3')
