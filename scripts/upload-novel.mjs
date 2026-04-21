import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const rawMd = readFileSync('C:/Users/dylanynsu/WorkBuddy/20260416134728/夜的命名术_研究报告.md', 'utf-8')

const record = {
  type: 'novel',
  name: '夜的命名术',
  author: '会说话的肘子',
  platform: '起点中文网',
  douban_score: 7.4,
  yousuu_score: 3.2,
  adaptation_score: 4.0,
  genre_tags: ['都市', '异术超能', '赛博朋克', '双世界穿越', '骑士组织'],
  ai_summary: '肘子三部曲中最有野心的一部——赛博朋克设定开创新方向，前2/3是巅峰时刻，但"肘子通病"（开局惊艳→后期崩盘）依然无解',
  raw_md: rawMd,
}

const { data: existing } = await supabase.from('ips').select('id').eq('name', record.name).eq('type', 'novel')
if (existing && existing.length > 0) {
  const { data, error } = await supabase.from('ips').update(record).eq('id', existing[0].id).select()
  if (error) console.error('UPDATE FAIL:', error.message)
  else console.log('UPDATED:', record.name, '(id:', data[0].id, ')')
} else {
  const { data, error } = await supabase.from('ips').insert([record]).select()
  if (error) console.error('INSERT FAIL:', error.message)
  else console.log('INSERTED:', record.name, '(id:', data[0].id, ')')
}
