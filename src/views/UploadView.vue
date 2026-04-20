<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const uploading = ref(false)
const uploadResult = ref(null)
const dragOver = ref(false)
const activeMode = ref('file') // file | manual
const fileContent = ref('')
const fileName = ref('')

// Manual form
const form = ref({
  type: 'anime',
  name: '',
  studio: '',
  director: '',
  author: '',
  platform: '',
  broadcast_platforms: '',
  source_type: '',
  source_name: '',
  douban_score: null,
  bangumi_score: null,
  yousuu_score: null,
  adaptation_score: null,
  production_tier: '',
  total_seasons: null,
  total_episodes: null,
  genre_tags: '',
  ai_summary: '',
  raw_md: '',
})

function handleDragOver(e) {
  e.preventDefault()
  dragOver.value = true
}
function handleDragLeave() { dragOver.value = false }

async function handleDrop(e) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) await processFile(file)
}

async function handleFileInput(e) {
  const file = e.target.files[0]
  if (file) await processFile(file)
}

async function processFile(file) {
  if (!file.name.endsWith('.md')) {
    uploadResult.value = { success: false, message: '请上传 .md 文件' }
    return
  }
  fileName.value = file.name
  const text = await file.text()
  fileContent.value = text
  // Auto-parse
  const parsed = parseMdReport(text)
  Object.assign(form.value, parsed)
  form.value.raw_md = text
  uploadResult.value = { success: true, message: `已解析：${parsed.name || file.name}`, parsed: true }
}

function parseMdReport(md) {
  const result = {}

  // Helper: clean markdown formatting from a value
  function clean(val) {
    if (!val) return ''
    return val.replace(/\*+/g, '').replace(/^《|》$/g, '').replace(/^[《]|[》]$/g, '').trim()
  }

  // Helper: extract a score (number) from a string like "**8.5**/10", "8.5/10", "约5.5-6.0", "8.5", "⭐3.4/5"
  function extractScore(str) {
    if (!str) return null
    const cleaned = str.replace(/\*+/g, '').replace(/⭐/g, '').trim()
    // Match patterns: "8.5/10", "8.5", "约5.5-6.0" (take first number), "3.4/5"
    const m = cleaned.match(/([\d.]+)/)
    return m ? parseFloat(m[1]) : null
  }

  // Helper: extract table cell value by row label (flexible matching)
  function getTableValue(label) {
    // Try multiple patterns for table matching
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')
    // Pattern 1: | label | value |
    const re1 = new RegExp(`\\|\\s*${escapedLabel}\\s*\\|\\s*(.+?)\\s*\\|`, 'm')
    const m1 = md.match(re1)
    if (m1) return clean(m1[1])
    // Pattern 2: | label | value | (with possible extra columns)
    const re2 = new RegExp(`\\|\\s*${escapedLabel}\\s*\\|\\s*(.+?)\\s*\\|`, 'mi')
    const m2 = md.match(re2)
    if (m2) return clean(m2[1])
    return null
  }

  // ===== Detect type =====
  // Novel reports have: 作者档案, 影视化改编潜力, 优书网, 起点
  // Anime reports have: 制作团队, 播出平台, 各季详情, Bangumi, 追番
  // Key: check novel-specific markers FIRST, since novel reports also contain 🎬 emoji in "影视化改编" section
  const novelMarkers = ['作者档案', '优书网', '影视化改编潜力', '改编适配性评分', '起点中文网']
  const animeMarkers = ['制作团队', '播出平台', '各季详情', 'Bangumi', '追番人数', '画风与制作']
  const novelScore = novelMarkers.filter(m => md.includes(m)).length
  const animeScore = animeMarkers.filter(m => md.includes(m)).length

  if (animeScore > novelScore) {
    result.type = 'anime'
  } else {
    result.type = 'novel'
  }

  // ===== Extract name from title =====
  // Try multiple title formats
  const titlePatterns = [
    /^#\s+.*?《(.+?)》/m,
    /^#\s+.*?[《「](.+?)[》」]/m,
    /^#\s+(.+?)深度研究/m,
  ]
  for (const p of titlePatterns) {
    const m = md.match(p)
    if (m) { result.name = clean(m[1]); break }
  }

  // ===== Extract table fields =====
  const tableFields = {
    '作品全名': 'name', '中文名': 'name',
    '作者': 'author', '笔名': 'author',
    '平台': 'platform',
    '动画制作': 'studio', '制作公司': 'studio',
    '导演': 'director', '导演/监督': 'director', '监督': 'director',
    '总季数': 'total_seasons', '总集数': 'total_episodes',
    '制作水准': 'production_tier',
    '原著类型': 'source_type', '原著名称': 'source_name',
    '类型': '_genre', '标签': '_tags',
    '状态': '_status',
    '总字数': '_wordcount',
  }

  for (const [label, field] of Object.entries(tableFields)) {
    const val = getTableValue(label)
    if (!val) continue

    if (field === 'total_seasons' || field === 'total_episodes') {
      result[field] = parseInt(val) || null
    } else if (field === 'production_tier') {
      result[field] = val.replace(/级$/, '').trim()
    } else if (field === 'name') {
      let n = val.replace(/^《|》$/g, '').replace(/^[《]|[》]$/g, '').trim()
      // Don't overwrite if already set from title and this is less clean
      if (!result.name || n.length < result.name.length) result.name = n
    } else if (field === '_tags') {
      // Extract genre tags from 标签 field
      if (!result.genre_tags || result.genre_tags.length === 0) {
        result.genre_tags = val.split(/[、,，·\s]+/).map(s => s.trim()).filter(s => s && s.length < 10)
      }
    } else if (field === '_genre') {
      // Use 类型 field as fallback for genre_tags
      if (!result.genre_tags || result.genre_tags.length === 0) {
        result.genre_tags = val.split(/[、,，·\s]+/).map(s => s.trim()).filter(s => s && s.length < 10)
      }
    } else if (field.startsWith('_')) {
      // skip internal fields
    } else {
      if (!result[field]) result[field] = val
    }
  }

  // ===== Extract scores (multiple strategies) =====

  // Douban score - try multiple patterns
  const doubanPatterns = [
    /豆瓣[^|]*\|\s*\*?\*?([\d.]+)\*?\*?\s*[/／]/m,        // | 豆瓣 | **8.5**/10 |
    /豆瓣[^|]*\|\s*\*?\*?([\d.]+)/m,                        // | 豆瓣 | 8.5 |
    /豆瓣[^|]*\|\s*约?([\d.]+)/m,                           // | 豆瓣 | 约5.5 |
    /豆瓣评分[：:]\s*\*?\*?([\d.]+)/m,                      // 豆瓣评分：8.5
    /豆瓣\s*[:：]?\s*\*?\*?([\d.]+)/m,                      // 豆瓣 8.5
  ]
  for (const p of doubanPatterns) {
    const m = md.match(p)
    if (m) { result.douban_score = parseFloat(m[1]); break }
  }

  // Bangumi score
  const bangumiPatterns = [
    /[Bb]angumi[^|]*\|\s*\*?\*?([\d.]+)/m,
    /[Bb]angumi\s*[:：]?\s*\*?\*?([\d.]+)/m,
  ]
  for (const p of bangumiPatterns) {
    const m = md.match(p)
    if (m) { result.bangumi_score = parseFloat(m[1]); break }
  }

  // Yousuu score
  const yousuuPatterns = [
    /优书网[^|]*\|\s*\*?\*?([\d.]+)/m,
    /优书网\s*[:：]?\s*\*?\*?([\d.]+)/m,
  ]
  for (const p of yousuuPatterns) {
    const m = md.match(p)
    if (m) { result.yousuu_score = parseFloat(m[1]); break }
  }

  // Adaptation score (综合得分)
  const adaptPatterns = [
    /综合得分\s*\|\s*\*?\*?⭐?\s*([\d.]+)/m,
    /综合得分.*?([\d.]+)\s*[/／]\s*5/m,
    /\*?\*?⭐?([\d.]+)[/／]5\*?\*?.*加权/m,
  ]
  for (const p of adaptPatterns) {
    const m = md.match(p)
    if (m) { result.adaptation_score = parseFloat(m[1]); break }
  }

  // ===== Extract AI summary (整体定位) =====
  const summaryPatterns = [
    /整体定位\s*\|\s*\*?\*?(.+?)\*?\*?\s*\|/m,
    /整体定位.*?\|\s*\*?\*?(.+?)\*?\*?\s*$/m,
    /\*\*整体定位\*\*\s*[|：:]\s*\*?\*?(.+?)(\*?\*?\s*\||$)/m,
  ]
  for (const p of summaryPatterns) {
    const m = md.match(p)
    if (m) {
      result.ai_summary = clean(m[1]).substring(0, 200)
      break
    }
  }

  // ===== Extract genre tags (multiple sources) =====
  if (!result.genre_tags || result.genre_tags.length === 0) {
    // Try "题材" row in tag table
    const tagMatch = md.match(/题材\s*\|\s*(.+?)\s*\|/m)
    if (tagMatch) {
      result.genre_tags = tagMatch[1].split(/[、,，·]/).map(s => s.replace(/[{}\[\]]/g, '').trim()).filter(s => s && s.length < 10)
    }
  }
  if (!result.genre_tags || result.genre_tags.length === 0) {
    // Try "标签" row in basic info table
    const labelMatch = md.match(/标签\s*\|\s*(.+?)\s*\|/m)
    if (labelMatch) {
      result.genre_tags = labelMatch[1].split(/[、,，·\s]+/).map(s => s.trim()).filter(s => s && s.length < 10)
    }
  }
  // Also try to add from "类型" field
  if (result.genre_tags && result.genre_tags.length > 0) {
    const typeMatch = md.match(/类型\s*\|\s*(.+?)\s*\|/m)
    if (typeMatch) {
      const typeVals = clean(typeMatch[1]).split(/[、,，·\s]+/).map(s => s.trim()).filter(s => s && s.length < 10)
      const existing = new Set(result.genre_tags)
      typeVals.forEach(t => { if (!existing.has(t)) result.genre_tags.push(t) })
    }
  }

  // ===== Extract broadcast platforms (anime) =====
  const platformSection = md.match(/中国\s*\|\s*(.+?)\s*(\||$)/m)
  if (platformSection) {
    const plats = platformSection[1]
      .replace(/（.+?）/g, '')
      .replace(/\(.+?\)/g, '')
      .split(/[/、,，]/)
      .map(s => s.trim())
      .filter(Boolean)
    result.broadcast_platforms = plats
  }

  // ===== Extract seasons data =====
  const seasonsRe = /\|\s*S(\d+)\s*\|\s*(.+?)\s*\|\s*(\d+)集?\s*\|\s*(.+?)\s*\|\s*([\d.]+)[/／]10.*?\|\s*([\d.]+)[/／]10/gm
  const seasons = []
  let sm
  while ((sm = seasonsRe.exec(md)) !== null) {
    seasons.push({
      season: parseInt(sm[1]),
      air_date: sm[2].trim(),
      episodes: parseInt(sm[3]),
      studio: sm[4].trim(),
      douban_score: parseFloat(sm[5]),
      bangumi_score: parseFloat(sm[6]),
    })
  }
  if (seasons.length) result.seasons = seasons

  return result
}

async function uploadToSupabase() {
  uploading.value = true
  uploadResult.value = null

  const data = { ...form.value }
  // Parse comma-separated tags
  if (typeof data.genre_tags === 'string') {
    data.genre_tags = data.genre_tags.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
  }
  // Parse broadcast platforms
  if (typeof data.broadcast_platforms === 'string') {
    data.broadcast_platforms = data.broadcast_platforms.split(/[/、,，]/).map(s => s.trim()).filter(Boolean)
  }
  // Clean empty strings to null
  for (const k of Object.keys(data)) {
    if (data[k] === '') data[k] = null
  }

  const { data: inserted, error } = await supabase.from('ips').insert([data]).select()

  uploading.value = false
  if (error) {
    uploadResult.value = { success: false, message: `上传失败：${error.message}` }
  } else {
    uploadResult.value = { success: true, message: `✅ 「${data.name}」已成功录入！` }
    setTimeout(() => router.push(`/ip/${inserted[0].id}`), 1500)
  }
}

function resetForm() {
  form.value = {
    type: 'anime', name: '', studio: '', director: '', author: '', platform: '',
    broadcast_platforms: '', source_type: '', source_name: '',
    douban_score: null, bangumi_score: null, yousuu_score: null, adaptation_score: null,
    production_tier: '', total_seasons: null, total_episodes: null,
    genre_tags: '', ai_summary: '', raw_md: '',
  }
  fileContent.value = ''
  fileName.value = ''
  uploadResult.value = null
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-white mb-2">📤 上传 IP 研究报告</h1>
    <p class="text-gray-400 text-sm mb-6">上传 MD 文件自动解析，或手动填写关键信息</p>

    <!-- Mode Toggle -->
    <div class="flex bg-[#1a1a3a] rounded-lg p-0.5 mb-6 w-fit">
      <button @click="activeMode = 'file'"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all"
        :class="activeMode === 'file' ? 'bg-purple-500/30 text-purple-200' : 'text-gray-400 hover:text-white'">
        📄 上传 MD 文件
      </button>
      <button @click="activeMode = 'manual'"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all"
        :class="activeMode === 'manual' ? 'bg-purple-500/30 text-purple-200' : 'text-gray-400 hover:text-white'">
        ✏️ 手动填写
      </button>
    </div>

    <!-- File Upload Mode -->
    <div v-if="activeMode === 'file'" class="space-y-4">
      <!-- Drop zone -->
      <div @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop"
        class="border-2 border-dashed rounded-xl p-10 text-center transition-all"
        :class="dragOver ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 hover:border-white/20'">
        <div class="text-4xl mb-3">{{ fileName ? '✅' : '📄' }}</div>
        <p v-if="fileName" class="text-white font-medium mb-1">{{ fileName }}</p>
        <p class="text-gray-400 text-sm mb-3">
          {{ fileName ? '文件已解析，可查看下方信息后提交' : '拖拽 .md 文件到此处，或点击下方按钮' }}
        </p>
        <label v-if="!fileName"
          class="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium cursor-pointer transition-colors">
          选择文件
          <input type="file" accept=".md" class="hidden" @change="handleFileInput" />
        </label>
        <button v-else @click="resetForm"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors">
          重新选择
        </button>
      </div>

      <!-- Parsed preview -->
      <div v-if="form.name && fileContent" class="bg-[#14142a] border border-white/5 rounded-xl p-5">
        <h3 class="text-sm font-medium text-gray-400 mb-3">📋 解析结果预览</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-500">类型：</span><span class="text-white">{{ form.type === 'novel' ? '📖 小说' : '🎬 动漫' }}</span></div>
          <div><span class="text-gray-500">名称：</span><span class="text-white font-medium">{{ form.name }}</span></div>
          <div v-if="form.studio"><span class="text-gray-500">制作公司：</span><span class="text-gray-200">{{ form.studio }}</span></div>
          <div v-if="form.author"><span class="text-gray-500">作者：</span><span class="text-gray-200">{{ form.author }}</span></div>
          <div v-if="form.douban_score"><span class="text-gray-500">豆瓣：</span><span class="text-green-300">{{ form.douban_score }}</span></div>
          <div v-if="form.bangumi_score"><span class="text-gray-500">Bangumi：</span><span class="text-blue-300">{{ form.bangumi_score }}</span></div>
          <div v-if="form.production_tier"><span class="text-gray-500">制作水准：</span><span class="text-yellow-300">{{ form.production_tier }}级</span></div>
          <div v-if="form.ai_summary" class="col-span-2"><span class="text-gray-500">定位：</span><span class="text-gray-200">{{ form.ai_summary }}</span></div>
        </div>
      </div>
    </div>

    <!-- Manual Mode -->
    <div v-if="activeMode === 'manual'" class="space-y-4">
      <div class="bg-[#14142a] border border-white/5 rounded-xl p-5 space-y-4">
        <!-- Type -->
        <div class="flex gap-3">
          <button @click="form.type = 'anime'"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
            :class="form.type === 'anime' ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-white/5 text-gray-400'">
            🎬 动漫
          </button>
          <button @click="form.type = 'novel'"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
            :class="form.type === 'novel' ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-white/5 text-gray-400'">
            📖 小说
          </button>
        </div>

        <!-- Name -->
        <div>
          <label class="block text-sm text-gray-400 mb-1">作品名称 *</label>
          <input v-model="form.name" type="text" placeholder="如：鬼灭之刃 / 诡秘之主"
            class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
        </div>

        <!-- Anime-specific fields -->
        <template v-if="form.type === 'anime'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">制作公司</label>
              <input v-model="form.studio" type="text" placeholder="如：ufotable"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">导演</label>
              <input v-model="form.director" type="text" placeholder="如：外崎春雄"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">播出平台（/ 分隔）</label>
              <input v-model="form.broadcast_platforms" type="text" placeholder="如：B站 / 腾讯视频"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">制作水准</label>
              <select v-model="form.production_tier"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-gray-300 focus:outline-none">
                <option value="">选择</option>
                <option value="S">S级</option>
                <option value="A">A级</option>
                <option value="B">B级</option>
                <option value="C">C级</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">原著类型</label>
              <input v-model="form.source_type" type="text" placeholder="如：漫画改编 / 原创动画"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">原著名称</label>
              <input v-model="form.source_name" type="text"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">总季数</label>
              <input v-model.number="form.total_seasons" type="number"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">总集数</label>
              <input v-model.number="form.total_episodes" type="number"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
        </template>

        <!-- Novel-specific fields -->
        <template v-if="form.type === 'novel'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-400 mb-1">作者</label>
              <input v-model="form.author" type="text"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">平台</label>
              <input v-model="form.platform" type="text" placeholder="如：起点中文网"
                class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
        </template>

        <!-- Scores -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-gray-400 mb-1">豆瓣评分</label>
            <input v-model.number="form.douban_score" type="number" step="0.1" min="0" max="10"
              class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
          </div>
          <div v-if="form.type === 'anime'">
            <label class="block text-sm text-gray-400 mb-1">Bangumi</label>
            <input v-model.number="form.bangumi_score" type="number" step="0.1" min="0" max="10"
              class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
          </div>
          <div v-else>
            <label class="block text-sm text-gray-400 mb-1">优书网</label>
            <input v-model.number="form.yousuu_score" type="number" step="0.1" min="0" max="10"
              class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
          </div>
          <div v-if="form.type === 'novel'">
            <label class="block text-sm text-gray-400 mb-1">改编潜力（/5）</label>
            <input v-model.number="form.adaptation_score" type="number" step="0.1" min="0" max="5"
              class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50" />
          </div>
        </div>

        <!-- Tags & Summary -->
        <div>
          <label class="block text-sm text-gray-400 mb-1">标签（顿号分隔）</label>
          <input v-model="form.genre_tags" type="text" placeholder="如：热血、冒险、奇幻"
            class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">AI 一句话定位</label>
          <input v-model="form.ai_summary" type="text" placeholder="如：S级制作的王道少年热血番"
            class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">完整 MD 报告（可选，粘贴全文）</label>
          <textarea v-model="form.raw_md" rows="6" placeholder="粘贴 MD 报告全文..."
            class="w-full px-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 font-mono"></textarea>
        </div>
      </div>
    </div>

    <!-- Submit -->
    <div class="mt-6 flex items-center gap-4">
      <button @click="uploadToSupabase" :disabled="uploading || !form.name"
        class="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors">
        {{ uploading ? '上传中...' : '🚀 提交到数据库' }}
      </button>
      <button @click="resetForm"
        class="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors">
        重置
      </button>
    </div>

    <!-- Result Message -->
    <div v-if="uploadResult && !uploadResult.parsed" class="mt-4 px-4 py-3 rounded-lg text-sm"
      :class="uploadResult.success ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'">
      {{ uploadResult.message }}
    </div>
  </div>
</template>
