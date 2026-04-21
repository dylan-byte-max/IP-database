import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const basePath = 'C:/Users/dylanynsu/WorkBuddy/20260416134728'

const reports = [
  {
    file: `${basePath}/开局地摊卖大力_研究报告.md`,
    data: {
      type: 'novel',
      name: '开局地摊卖大力',
      author: '弈青锋',
      platform: '番茄小说',
      yousuu_score: 3.7,
      adaptation_score: 3.4,
      genre_tags: ['都市高武', '系统流', '搞笑', '灵气复苏', '爽文'],
      ai_summary: '番茄平台生态下的头部爽文——轻松搞笑、零门槛、纯娱乐消遣，在"让人笑"这件事上做到了极致，但文学性和深度接近于零',
    }
  },
  {
    file: `${basePath}/急诊科开局看见疾病词条_研究报告.md`,
    data: {
      type: 'novel',
      name: '急诊科：开局看见疾病词条',
      author: '大明第一包工头',
      platform: '番茄小说',
      adaptation_score: 3.6,
      genre_tags: ['都市', '医疗', '系统流', '规培生', '无降智'],
      ai_summary: '开局质量不错的医疗系统爽文——词条给线索+医学推理+无降智的组合有差异化，天然单元剧结构极适合短剧改编',
    }
  },
  {
    file: `${basePath}/奥术神座_研究报告.md`,
    data: {
      type: 'novel',
      name: '奥术神座',
      author: '爱潜水的乌贼',
      platform: '起点中文网',
      douban_score: 7.8,
      yousuu_score: 8.4,
      adaptation_score: 3.6,
      genre_tags: ['玄幻', '西方奇幻', '科学入魔', 'DND', '种田'],
      ai_summary: '乌贼封神之路的奠基石——用"知识就是力量"征服硬核读者的西幻经典，设定创新是网文史级的，《诡秘之主》的精神前传',
    }
  },
  {
    file: `${basePath}/青山_研究报告.md`,
    data: {
      type: 'novel',
      name: '青山',
      author: '会说话的肘子',
      platform: '起点中文网',
      yousuu_score: 3.3,
      adaptation_score: 3.3,
      genre_tags: ['玄幻', '东方玄幻', '江湖', '文青向', '慢节奏'],
      ai_summary: '起点三大白金的风格转型实验——文笔进化了但剧情掌控力的老毛病没改，十万均订证明品牌号召力，但口碑撕裂说明转型不被所有读者买账',
    }
  },
]

for (const report of reports) {
  try {
    const rawMd = readFileSync(report.file, 'utf-8')
    const record = { ...report.data, raw_md: rawMd }

    // Check if already exists
    const { data: existing } = await supabase.from('ips').select('id').eq('name', record.name).eq('type', 'novel')
    
    if (existing && existing.length > 0) {
      const { data, error } = await supabase.from('ips').update(record).eq('id', existing[0].id).select()
      if (error) console.error(`UPDATE FAIL: ${record.name} - ${error.message}`)
      else console.log(`UPDATED: ${record.name} (id: ${data[0].id})`)
    } else {
      const { data, error } = await supabase.from('ips').insert([record]).select()
      if (error) console.error(`INSERT FAIL: ${record.name} - ${error.message}`)
      else console.log(`INSERTED: ${record.name} (id: ${data[0].id})`)
    }
  } catch (e) {
    console.error(`ERROR: ${report.data.name} - ${e.message}`)
  }
}

console.log('\nDone! 4 novels uploaded/updated.')
