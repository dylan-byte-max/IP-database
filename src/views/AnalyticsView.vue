<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const ipList = ref([])
const loading = ref(true)
const activeSection = ref('overview') // overview | novel | anime

onMounted(async () => {
  const { data } = await supabase.from('ips').select('*').order('created_at', { ascending: false })
  if (data) ipList.value = data
  loading.value = false
  await nextTick()
  renderCharts()
})

watch(activeSection, async () => {
  await nextTick()
  renderCharts()
})

// ===== Filtered lists =====
const novels = computed(() => ipList.value.filter(i => i.type === 'novel'))
const animes = computed(() => ipList.value.filter(i => i.type === 'anime'))

// ===== Generic helpers =====
function buildGroupMap(items, getKey, extra) {
  const map = {}
  items.forEach(ip => {
    const keys = getKey(ip)
    ;(Array.isArray(keys) ? keys : [keys]).filter(Boolean).forEach(k => {
      if (!map[k]) map[k] = { name: k, projects: [], totalScore: 0, scoreCount: 0, genres: {} }
      map[k].projects.push(ip)
      if (ip.douban_score) { map[k].totalScore += ip.douban_score; map[k].scoreCount++ }
      ip.genre_tags?.forEach(g => { map[k].genres[g] = (map[k].genres[g] || 0) + 1 })
    })
  })
  return Object.values(map).map(g => ({
    ...g,
    avgScore: g.scoreCount ? (g.totalScore / g.scoreCount).toFixed(1) : null,
    topGenres: Object.entries(g.genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
  })).sort((a, b) => b.projects.length - a.projects.length)
}

// ===== Novel Analytics =====
const novelPlatforms = computed(() => buildGroupMap(novels.value, ip => ip.platform))
const novelGenres = computed(() => buildGroupMap(novels.value, ip => ip.genre_tags || []))
const novelTopRated = computed(() => [...novels.value].filter(i => i.douban_score).sort((a, b) => b.douban_score - a.douban_score).slice(0, 10))

// ===== Anime Analytics =====
const animeStudios = computed(() => buildGroupMap(animes.value, ip => ip.studio))
const animePlatforms = computed(() => buildGroupMap(animes.value, ip => ip.broadcast_platforms || []))
const animeGenres = computed(() => buildGroupMap(animes.value, ip => ip.genre_tags || []))
const animeTopRated = computed(() => [...animes.value].filter(i => i.douban_score).sort((a, b) => b.douban_score - a.douban_score).slice(0, 10))

// ===== Overview =====
const overview = computed(() => {
  const scores = ipList.value.filter(i => i.douban_score).map(i => i.douban_score)
  return {
    total: ipList.value.length,
    novels: novels.value.length,
    animes: animes.value.length,
    avgScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-',
    topRated: [...ipList.value].filter(i => i.douban_score).sort((a, b) => b.douban_score - a.douban_score).slice(0, 5),
  }
})

// ===== Charts =====
let chartInstances = []

function renderCharts() {
  chartInstances.forEach(c => c.dispose())
  chartInstances = []
  if (ipList.value.length === 0) return

  if (activeSection.value === 'overview') {
    renderPie('overview-genre-pie', ipList.value)
    renderScoreDist('overview-score-dist', ipList.value)
  }
  if (activeSection.value === 'novel') {
    renderPie('novel-genre-pie', novels.value)
    renderScoreDist('novel-score-dist', novels.value)
  }
  if (activeSection.value === 'anime') {
    renderPie('anime-genre-pie', animes.value)
    renderStudioBar()
    renderScoreDist('anime-score-dist', animes.value)
  }
}

function renderPie(elId, items) {
  const el = document.getElementById(elId)
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  const map = {}
  items.forEach(ip => ip.genre_tags?.forEach(g => { map[g] = (map[g] || 0) + 1 }))
  const data = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }))
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{ type: 'pie', radius: ['40%', '70%'], itemStyle: { borderRadius: 6, borderColor: '#0d0d1a', borderWidth: 2 }, label: { color: '#ccc', fontSize: 12 }, data }]
  })
}

function renderStudioBar() {
  const el = document.getElementById('anime-studio-bar')
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  const top = animeStudios.value.slice(0, 8)
  if (!top.length) return
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: top.map(s => s.name), axisLabel: { color: '#999', fontSize: 11, rotate: 20 } },
    yAxis: [
      { type: 'value', name: '作品数', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#222' } } },
      { type: 'value', name: '均分', min: 5, max: 10, axisLabel: { color: '#999' }, splitLine: { show: false } },
    ],
    series: [
      { name: '作品数', type: 'bar', data: top.map(s => s.projects.length), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } },
      { name: '平均评分', type: 'line', yAxisIndex: 1, data: top.map(s => s.avgScore || 0), itemStyle: { color: '#fbbf24' }, lineStyle: { width: 2 } },
    ]
  })
}

function renderScoreDist(elId, items) {
  const el = document.getElementById(elId)
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  const bins = { '<6': 0, '6-6.9': 0, '7-7.4': 0, '7.5-7.9': 0, '8-8.4': 0, '8.5-8.9': 0, '9+': 0 }
  items.filter(i => i.douban_score).forEach(i => {
    const s = i.douban_score
    if (s < 6) bins['<6']++; else if (s < 7) bins['6-6.9']++; else if (s < 7.5) bins['7-7.4']++
    else if (s < 8) bins['7.5-7.9']++; else if (s < 8.5) bins['8-8.4']++; else if (s < 9) bins['8.5-8.9']++; else bins['9+']++
  })
  const color = elId.includes('novel') ? ['#a78bfa', '#6d28d9'] : elId.includes('anime') ? ['#60a5fa', '#1d4ed8'] : ['#a78bfa', '#6d28d9']
  chart.setOption({
    backgroundColor: 'transparent', tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(bins), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#222' } } },
    series: [{ type: 'bar', data: Object.values(bins), itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: color[0] }, { offset: 1, color: color[1] }]) } }]
  })
}

function goDetail(id) { router.push(`/ip/${id}`) }

function tierClass(tier) {
  if (!tier) return 'bg-gray-500/15 text-gray-400'
  if (tier.includes('S+')) return 'bg-red-500/15 text-red-300'
  if (tier.includes('S')) return 'bg-yellow-500/15 text-yellow-300'
  if (tier.includes('A')) return 'bg-green-500/15 text-green-300'
  if (tier.includes('B')) return 'bg-blue-500/15 text-blue-300'
  return 'bg-gray-500/15 text-gray-400'
}

function getScoreColor(score) {
  if (!score) return 'text-gray-500'
  if (score >= 9) return 'text-yellow-300'
  if (score >= 8) return 'text-green-300'
  if (score >= 7) return 'text-blue-300'
  return 'text-gray-400'
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-2">📊 数据透视</h1>
    <p class="text-gray-400 text-sm mb-6">多维度分析你收集的 IP 数据</p>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
    </div>

    <div v-else-if="ipList.length === 0" class="text-center py-20">
      <div class="text-5xl mb-4">📊</div>
      <p class="text-gray-400">需要至少录入一些 IP 数据后才能进行分析</p>
    </div>

    <template v-else>
      <!-- Top-level Section Tabs -->
      <div class="flex bg-[#1a1a3a] rounded-lg p-0.5 mb-6 w-fit">
        <button v-for="tab in [
          {key:'overview', label:'📈 总览'},
          {key:'novel', label:`📖 小说 (${novels.length})`},
          {key:'anime', label:`🎬 动漫 (${animes.length})`}
        ]" :key="tab.key" @click="activeSection = tab.key"
          class="px-4 py-2 rounded-md text-sm font-medium transition-all"
          :class="activeSection === tab.key ? 'bg-purple-500/30 text-purple-200' : 'text-gray-400 hover:text-white'">
          {{ tab.label }}
        </button>
      </div>

      <!-- ==================== OVERVIEW ==================== -->
      <div v-if="activeSection === 'overview'" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-white">{{ overview.total }}</div>
            <div class="text-sm text-gray-400 mt-1">总 IP 数</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-purple-300">{{ overview.novels }}</div>
            <div class="text-sm text-gray-400 mt-1">📖 小说</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-blue-300">{{ overview.animes }}</div>
            <div class="text-sm text-gray-400 mt-1">🎬 动漫</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-yellow-300">{{ overview.avgScore }}</div>
            <div class="text-sm text-gray-400 mt-1">平均豆瓣分</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">全部题材分布</h3>
            <div id="overview-genre-pie" style="height: 300px"></div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">全部评分分布（豆瓣）</h3>
            <div id="overview-score-dist" style="height: 300px"></div>
          </div>
        </div>

        <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
          <h3 class="text-sm font-medium text-gray-400 mb-3">🏆 评分 Top 5</h3>
          <div class="space-y-2">
            <div v-for="(ip, i) in overview.topRated" :key="ip.id" @click="goDetail(ip.id)"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <span class="text-lg font-bold w-6 text-center" :class="i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-orange-400':'text-gray-500'">{{ i+1 }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded" :class="ip.type==='novel'?'bg-purple-500/20 text-purple-300':'bg-blue-500/20 text-blue-300'">{{ ip.type==='novel'?'📖':'🎬' }}</span>
              <span class="flex-1 text-sm text-white truncate">{{ ip.name }}</span>
              <span class="font-bold" :class="getScoreColor(ip.douban_score)">{{ ip.douban_score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== NOVEL ANALYTICS ==================== -->
      <div v-if="activeSection === 'novel'" class="space-y-6">
        <div v-if="novels.length === 0" class="text-center py-10 text-gray-500">暂无小说数据</div>
        <template v-else>

          <!-- Novel: Platform -->
          <div>
            <h2 class="text-base font-bold text-purple-300 mb-3">📚 连载平台</h2>
            <div class="space-y-3">
              <div v-for="plat in novelPlatforms" :key="plat.name" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-bold text-white">{{ plat.name }}</h3>
                  <span class="text-sm text-gray-400">{{ plat.projects.length }} 部
                    <span v-if="plat.avgScore"> · 均分 <span :class="getScoreColor(parseFloat(plat.avgScore))">{{ plat.avgScore }}</span></span>
                  </span>
                </div>
                <div class="space-y-1">
                  <div v-for="ip in plat.projects" :key="ip.id" @click="goDetail(ip.id)"
                    class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
                    <span class="text-white flex-1 truncate">{{ ip.name }}</span>
                    <span v-if="ip.author" class="text-gray-500 text-xs">{{ ip.author }}</span>
                    <span v-if="ip.douban_score" :class="getScoreColor(ip.douban_score)" class="font-medium">{{ ip.douban_score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Novel: Genre + Score Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2">小说题材分布</h3>
              <div id="novel-genre-pie" style="height: 280px"></div>
            </div>
            <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2">小说评分分布（豆瓣）</h3>
              <div id="novel-score-dist" style="height: 280px"></div>
            </div>
          </div>

          <!-- Novel: Genre Cards -->
          <div>
            <h2 class="text-base font-bold text-purple-300 mb-3">🏷️ 题材标签</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div v-for="genre in novelGenres" :key="genre.name" class="bg-[#14142a] border border-white/5 rounded-xl p-3">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-white text-sm">{{ genre.name }}</span>
                  <span class="text-xs text-gray-400">{{ genre.count }} 部</span>
                </div>
                <div v-if="genre.avgScore" class="text-xs mt-1">
                  均分 <span :class="getScoreColor(parseFloat(genre.avgScore))" class="font-medium">{{ genre.avgScore }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Novel: Top Rated -->
          <div v-if="novelTopRated.length" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-3">🏆 小说评分排行</h3>
            <div class="space-y-2">
              <div v-for="(ip, i) in novelTopRated" :key="ip.id" @click="goDetail(ip.id)"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
                <span class="font-bold w-5 text-center" :class="i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-orange-400':'text-gray-500'">{{ i+1 }}</span>
                <span class="text-white flex-1 truncate">{{ ip.name }}</span>
                <span v-if="ip.author" class="text-gray-500 text-xs">{{ ip.author }}</span>
                <span v-if="ip.adaptation_score" class="text-xs text-gray-400">改编 {{ ip.adaptation_score }}/5</span>
                <span class="font-bold" :class="getScoreColor(ip.douban_score)">{{ ip.douban_score }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ==================== ANIME ANALYTICS ==================== -->
      <div v-if="activeSection === 'anime'" class="space-y-6">
        <div v-if="animes.length === 0" class="text-center py-10 text-gray-500">暂无动漫数据</div>
        <template v-else>

          <!-- Anime: Studio -->
          <div>
            <h2 class="text-base font-bold text-blue-300 mb-3">🏭 制作公司</h2>
            <div class="space-y-3">
              <div v-for="studio in animeStudios" :key="studio.name" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <h3 class="font-bold text-white">{{ studio.name }}</h3>
                    <span class="text-sm text-gray-400">{{ studio.projects.length }} 部作品
                      <span v-if="studio.avgScore"> · 均分 <span :class="getScoreColor(parseFloat(studio.avgScore))">{{ studio.avgScore }}</span></span>
                    </span>
                  </div>
                  <div v-if="studio.topGenres.length" class="flex gap-1">
                    <span v-for="g in studio.topGenres" :key="g" class="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300">{{ g }}</span>
                  </div>
                </div>
                <div class="space-y-1">
                  <div v-for="ip in studio.projects" :key="ip.id" @click="goDetail(ip.id)"
                    class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
                    <span class="text-white flex-1 truncate">{{ ip.name }}</span>
                    <span v-if="ip.production_tier" class="text-[11px] px-1.5 py-0.5 rounded font-bold" :class="tierClass(ip.production_tier)">
                      {{ ip.production_tier }}
                    </span>
                    <span v-if="ip.douban_score" :class="getScoreColor(ip.douban_score)" class="font-medium">{{ ip.douban_score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Anime: Studio Chart -->
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">制作公司 × 作品数 × 评分</h3>
            <div id="anime-studio-bar" style="height: 300px"></div>
          </div>

          <!-- Anime: Broadcast Platform -->
          <div>
            <h2 class="text-base font-bold text-blue-300 mb-3">📺 播出平台</h2>
            <div class="space-y-3">
              <div v-for="plat in animePlatforms" :key="plat.name" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-bold text-white">{{ plat.name }}</h3>
                  <span class="text-sm text-gray-400">{{ plat.projects.length }} 部
                    <span v-if="plat.avgScore"> · 均分 <span :class="getScoreColor(parseFloat(plat.avgScore))">{{ plat.avgScore }}</span></span>
                  </span>
                </div>
                <div class="space-y-1">
                  <div v-for="ip in plat.projects" :key="ip.id" @click="goDetail(ip.id)"
                    class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
                    <span class="text-white flex-1 truncate">{{ ip.name }}</span>
                    <span v-if="ip.production_tier" class="text-[11px] px-1.5 py-0.5 rounded font-bold" :class="tierClass(ip.production_tier)">
                      {{ ip.production_tier }}
                    </span>
                    <span v-if="ip.douban_score" :class="getScoreColor(ip.douban_score)" class="font-medium">{{ ip.douban_score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Anime: Genre + Score Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2">动漫题材分布</h3>
              <div id="anime-genre-pie" style="height: 280px"></div>
            </div>
            <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
              <h3 class="text-sm font-medium text-gray-400 mb-2">动漫评分分布（豆瓣）</h3>
              <div id="anime-score-dist" style="height: 280px"></div>
            </div>
          </div>

          <!-- Anime: Genre Cards -->
          <div>
            <h2 class="text-base font-bold text-blue-300 mb-3">🏷️ 题材标签</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div v-for="genre in animeGenres" :key="genre.name" class="bg-[#14142a] border border-white/5 rounded-xl p-3">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-white text-sm">{{ genre.name }}</span>
                  <span class="text-xs text-gray-400">{{ genre.count }} 部</span>
                </div>
                <div v-if="genre.avgScore" class="text-xs mt-1">
                  均分 <span :class="getScoreColor(parseFloat(genre.avgScore))" class="font-medium">{{ genre.avgScore }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Anime: Top Rated -->
          <div v-if="animeTopRated.length" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-3">🏆 动漫评分排行</h3>
            <div class="space-y-2">
              <div v-for="(ip, i) in animeTopRated" :key="ip.id" @click="goDetail(ip.id)"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
                <span class="font-bold w-5 text-center" :class="i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-orange-400':'text-gray-500'">{{ i+1 }}</span>
                <span class="text-white flex-1 truncate">{{ ip.name }}</span>
                <span v-if="ip.studio" class="text-gray-500 text-xs">{{ ip.studio }}</span>
                <span v-if="ip.production_tier" class="text-[11px] px-1.5 py-0.5 rounded font-bold" :class="tierClass(ip.production_tier)">
                  {{ ip.production_tier }}
                </span>
                <span class="font-bold" :class="getScoreColor(ip.douban_score)">{{ ip.douban_score }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
