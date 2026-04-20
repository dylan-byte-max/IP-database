import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://ckynqqqyrjhoxoqttvjo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreW5xcXF5cmpob3hvcXR0dmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODQwMTksImV4cCI6MjA5MjI2MDAxOX0.uGHUpLx6xgbw_EmtkZVqys5hAKcuBmN9silScfKAQi4'
)

const reports = [
  {
    file: 'C:/Users/dylanynsu/WorkBuddy/20260416134728/玄鉴仙族_研究报告.md',
    data: {
      type: 'novel',
      name: '玄鉴仙族',
      author: '季越人',
      platform: '起点中文网',
      douban_score: 8.5,
      yousuu_score: 6.6,
      adaptation_score: 3.4,
      genre_tags: ['仙侠', '群像', '家族修仙', '传承', '古典仙侠'],
      ai_summary: '修仙文领域的《百年孤独》——文学性和设定创新是核心竞争力，但爽感不足和后期质量下滑拉低了整体评价',
    }
  },
  {
    file: 'C:/Users/dylanynsu/WorkBuddy/20260416134728/仙王的日常生活_研究报告.md',
    data: {
      type: 'novel',
      name: '仙王的日常生活',
      author: '枯玄',
      platform: '起点中文网',
      douban_score: 5.5,
      yousuu_score: 2.4,
      adaptation_score: 3.9,
      genre_tags: ['都市', '轻小说', '无敌流', '校园', '搞笑', '二次元'],
      ai_summary: '原著平庸但动画改编成功的教科书级案例——5季动画B站追番1125万，证明IP视觉化潜力比原著文字品质更重要',
    }
  },
  {
    file: 'C:/Users/dylanynsu/WorkBuddy/20260416134728/宿命之环_研究报告.md',
    data: {
      type: 'novel',
      name: '宿命之环',
      author: '爱潜水的乌贼',
      platform: '起点中文网',
      douban_score: 7.2,
      yousuu_score: 5.7,
      adaptation_score: 3.5,
      genre_tags: ['玄幻', '克苏鲁', '蒸汽朋克', '奇幻', '西方奇幻'],
      ai_summary: '《诡秘之主》光环下的续作，商业成绩顶级但口碑远不及前作。价值在于完善诡秘世界宇宙而非独立作品品质',
    }
  },
  {
    file: 'C:/Users/dylanynsu/WorkBuddy/20260416134728/廓晋_研究报告.md',
    data: {
      type: 'novel',
      name: '廓晋',
      author: '榴弹怕水',
      platform: '起点中文网',
      yousuu_score: 8.0,
      adaptation_score: 3.4,
      genre_tags: ['历史', '穿越', '东晋', '北伐', '权谋', '流民'],
      ai_summary: '白金大神凭借《绍宋》口碑all-in东晋题材，首订38793破历史分类纪录，开局数据炸裂',
    }
  }
]

for (const report of reports) {
  try {
    const rawMd = readFileSync(report.file, 'utf-8')
    const record = { ...report.data, raw_md: rawMd }

    const { data, error } = await supabase.from('ips').insert([record]).select()

    if (error) {
      console.error(`FAIL: ${report.data.name} - ${error.message}`)
    } else {
      console.log(`OK: ${report.data.name} (id: ${data[0].id})`)
    }
  } catch (e) {
    console.error(`ERROR: ${report.data.name} - ${e.message}`)
  }
}

console.log('\nDone!')
