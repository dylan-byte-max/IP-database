import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const rawMd = readFileSync('c:/Users/dylanynsu/WorkBuddy/20260420112622/完美世界_动漫研究报告.md', 'utf-8')

const record = {
  type: 'anime',
  name: '完美世界',
  studio: '福煦影视',
  director: '汪成果、张帅',
  broadcast_platforms: ['腾讯视频'],
  source_type: '网文改编',
  source_name: '完美世界',
  production_tier: 'A',
  total_seasons: 6,
  total_episodes: 286,
  douban_score: 8.1,
  genre_tags: ['热血', '冒险', '奇幻', '玄幻', '3D'],
  ai_summary: '国创3D年番的制作标杆和商业标杆——年番+特别篇+剧场版三位一体运营，3000万在追用户，一流打戏三流文戏',
  raw_md: rawMd,
}

const { data, error } = await supabase.from('ips').insert([record]).select()
if (error) console.error('FAIL:', error.message)
else console.log('OK:', data[0].id)
