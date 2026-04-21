import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const rawMd = readFileSync('c:/Users/dylanynsu/WorkBuddy/20260420112622/武动乾坤_动漫研究报告.md', 'utf-8')

const record = {
  type: 'anime',
  name: '武动乾坤',
  studio: '幻维数码/大呈印象',
  director: '沈亦默、郑钧',
  broadcast_platforms: ['腾讯视频'],
  source_type: '网文改编',
  source_name: '武动乾坤',
  production_tier: 'S+/S',
  total_seasons: 5,
  total_episodes: 60,
  douban_score: 6.5,
  genre_tags: ['热血', '冒险', '奇幻', '玄幻', '3D'],
  ai_summary: '天蚕土豆宇宙中最被低估也最被摧残的一环——两次换CP导致品质过山车，S5幻维回归是最后翻身机会',
  raw_md: rawMd,
}

const { data, error } = await supabase.from('ips').insert([record]).select()
if (error) console.error('FAIL:', error.message)
else console.log('OK:', data[0].id)
