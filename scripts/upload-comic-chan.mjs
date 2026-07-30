import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const reportPath = 'C:/Users/dylanynsu/WorkBuddy/2026-07-30-14-46-05/蝉女_漫画研究报告.md'
const rawMd = readFileSync(reportPath, 'utf-8')

const record = {
  type: 'comic',
  name: '蝉女',
  author: '宫缘乾',
  platform: '快看漫画',
  serial_status: '连载中（330话+）',
  source_type: '漫画（衍生动态漫/真人剧《玫瑰丛生》）',
  total_episodes: 330,
  douban_score: null,
  adaptation_score: 4.2,
  genre_tags: ['都市情感', '悬疑', '成人向', '亲密关系', '鉴情师', '国漫', '快看'],
  ai_summary: '快看现象级情感悬疑漫画（人气237亿+），以"鉴情师"独创职业切口解剖信任与谎言，走通漫画→动态漫→真人剧《玫瑰丛生》全链路且真人剧2026腾讯视频破亿，是国产成人向情感漫画IP化的标杆样本。',
}

// upsert：同名同类型则更新，否则新增
const { data: existing } = await supabase.from('ips').select('id').eq('name', record.name).eq('type', 'comic')
let id
if (existing && existing.length > 0) {
  const { data, error } = await supabase.from('ips').update({ ...record, raw_md: rawMd }).eq('id', existing[0].id).select()
  if (error) { console.error('UPDATE FAIL:', error.message); process.exit(1) }
  id = data[0].id
  console.log('UPDATED:', record.name, '(id:', id, ')')
} else {
  const { data, error } = await supabase.from('ips').insert([{ ...record, raw_md: rawMd }]).select()
  if (error) { console.error('INSERT FAIL:', error.message); process.exit(1) }
  id = data[0].id
  console.log('INSERTED:', record.name, '(id:', id, ')')
}
console.log('DONE: 蝉女 entered IP DB as comic, raw_md', rawMd.length, 'chars')
