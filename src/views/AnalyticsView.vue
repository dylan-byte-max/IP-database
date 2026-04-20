<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()
const ipList = ref([])
const loading = ref(true)
const activeView = ref('studio') // studio | platform | genre | overview

onMounted(async () => {
  const { data } = await supabase.from('ips').select('*').order('created_at', { ascending: false })
  if (data) ipList.value = data
  loading.value = false
  await nextTick()
  renderCharts()
})

watch(activeView, async () => {
  await nextTick()
  renderCharts()
})

// ===== Studio Analysis =====
const studioData = computed(() => {
  const map = {}
  ipList.value.filter(ip => ip.type === 'anime' && ip.studio).forEach(ip => {
    if (!map[ip.studio]) map[ip.studio] = { name: ip.studio, projects: [], totalScore: 0, scoreCount: 0, genres: {} }
    map[ip.studio].projects.push(ip)
    if (ip.douban_score) { map[ip.studio].totalScore += ip.douban_score; map[ip.studio].scoreCount++ }
    ip.genre_tags?.forEach(g => { map[ip.studio].genres[g] = (map[ip.studio].genres[g] || 0) + 1 })
  })
  return Object.values(map).map(s => ({
    ...s,
    avgScore: s.scoreCount ? (s.totalScore / s.scoreCount).toFixed(1) : null,
    topGenres: Object.entries(s.genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
  })).sort((a, b) => b.projects.length - a.projects.length)
})

// ===== Platform Analysis =====
const platformData = computed(() => {
  const map = {}
  ipList.value.forEach(ip => {
    const plats = ip.type === 'anime' ? (ip.broadcast_platforms || []) : (ip.platform ? [ip.platform] : [])
    plats.forEach(p => {
      if (!map[p]) map[p] = { name: p, projects: [], totalScore: 0, scoreCount: 0 }
      map[p].projects.push(ip)
      if (ip.douban_score) { map[p].totalScore += ip.douban_score; map[p].scoreCount++ }
    })
  })
  return Object.values(map).map(p => ({
    ...p,
    avgScore: p.scoreCount ? (p.totalScore / p.scoreCount).toFixed(1) : null,
  })).sort((a, b) => b.projects.length - a.projects.length)
})

// ===== Genre Analysis =====
const genreData = computed(() => {
  const map = {}
  ipList.value.forEach(ip => {
    ip.genre_tags?.forEach(g => {
      if (!map[g]) map[g] = { name: g, count: 0, totalScore: 0, scoreCount: 0 }
      map[g].count++
      if (ip.douban_score) { map[g].totalScore += ip.douban_score; map[g].scoreCount++ }
    })
  })
  return Object.values(map).map(g => ({
    ...g,
    avgScore: g.scoreCount ? (g.totalScore / g.scoreCount).toFixed(1) : null,
  })).sort((a, b) => b.count - a.count)
})

// ===== Overview Stats =====
const overview = computed(() => {
  const animes = ipList.value.filter(i => i.type === 'anime')
  const novels = ipList.value.filter(i => i.type === 'novel')
  const scores = ipList.value.filter(i => i.douban_score).map(i => i.douban_score)
  return {
    total: ipList.value.length,
    animes: animes.length,
    novels: novels.length,
    avgScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-',
    topRated: [...ipList.value].filter(i => i.douban_score).sort((a, b) => b.douban_score - a.douban_score).slice(0, 5),
    tierDist: { S: 0, A: 0, B: 0, C: 0 },
  }
})

// ===== Charts =====
let chartInstances = []

function renderCharts() {
  chartInstances.forEach(c => c.dispose())
  chartInstances = []

  if (ipList.value.length === 0) return

  if (activeView.value === 'overview' || activeView.value === 'genre') {
    renderGenrePie()
  }
  if (activeView.value === 'overview' || activeView.value === 'studio') {
    renderStudioBar()
  }
  if (activeView.value === 'overview') {
    renderScoreDistribution()
  }
}

function renderGenrePie() {
  const el = document.getElementById('genre-pie')
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
      itemStyle: { borderRadius: 6, borderColor: '#0d0d1a', borderWidth: 2 },
      label: { color: '#ccc', fontSize: 12 },
      data: genreData.value.slice(0, 10).map(g => ({ name: g.name, value: g.count })),
    }]
  })
}

function renderStudioBar() {
  const el = document.getElementById('studio-bar')
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  const top = studioData.value.slice(0, 8)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: top.map(s => s.name), axisLabel: { color: '#999', fontSize: 11, rotate: 20 } },
    yAxis: [
      { type: 'value', name: '作品数', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#222' } } },
      { type: 'value', name: '均分', min: 5, max: 10, axisLabel: { color: '#999' }, splitLine: { show: false } },
    ],
    series: [
      { name: '作品数', type: 'bar', data: top.map(s => s.projects.length), itemStyle: { color: '#7c3aed', borderRadius: [4, 4, 0, 0] } },
      { name: '平均评分', type: 'line', yAxisIndex: 1, data: top.map(s => s.avgScore || 0), itemStyle: { color: '#fbbf24' }, lineStyle: { width: 2 } },
    ]
  })
}

function renderScoreDistribution() {
  const el = document.getElementById('score-dist')
  if (!el) return
  const chart = echarts.init(el, 'dark')
  chartInstances.push(chart)
  const bins = { '<6': 0, '6-6.9': 0, '7-7.4': 0, '7.5-7.9': 0, '8-8.4': 0, '8.5-8.9': 0, '9+': 0 }
  ipList.value.filter(i => i.douban_score).forEach(i => {
    const s = i.douban_score
    if (s < 6) bins['<6']++
    else if (s < 7) bins['6-6.9']++
    else if (s < 7.5) bins['7-7.4']++
    else if (s < 8) bins['7.5-7.9']++
    else if (s < 8.5) bins['8-8.4']++
    else if (s < 9) bins['8.5-8.9']++
    else bins['9+']++
  })
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: Object.keys(bins), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#222' } } },
    series: [{
      type: 'bar', data: Object.values(bins),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#a78bfa' }, { offset: 1, color: '#6d28d9' }
        ])
      }
    }]
  })
}

function goDetail(id) { router.push(`/ip/${id}`) }

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

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="ipList.length === 0" class="text-center py-20">
      <div class="text-5xl mb-4">📊</div>
      <p class="text-gray-400">需要至少录入一些 IP 数据后才能进行分析</p>
    </div>

    <template v-else>
      <!-- View Tabs -->
      <div class="flex bg-[#1a1a3a] rounded-lg p-0.5 mb-6 w-fit">
        <button v-for="tab in [{key:'overview',label:'📈 总览'},{key:'studio',label:'🏭 制作公司'},{key:'platform',label:'📺 平台'},{key:'genre',label:'🏷️ 题材'}]"
          :key="tab.key" @click="activeView = tab.key"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          :class="activeView === tab.key ? 'bg-purple-500/30 text-purple-200' : 'text-gray-400 hover:text-white'">
          {{ tab.label }}
        </button>
      </div>

      <!-- Overview -->
      <div v-if="activeView === 'overview'" class="space-y-6">
        <!-- Stat cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-white">{{ overview.total }}</div>
            <div class="text-sm text-gray-400 mt-1">总 IP 数</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-blue-300">{{ overview.animes }}</div>
            <div class="text-sm text-gray-400 mt-1">动漫</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-purple-300">{{ overview.novels }}</div>
            <div class="text-sm text-gray-400 mt-1">小说</div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4 text-center">
            <div class="text-3xl font-bold text-yellow-300">{{ overview.avgScore }}</div>
            <div class="text-sm text-gray-400 mt-1">平均豆瓣分</div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">题材分布</h3>
            <div id="genre-pie" style="height: 300px"></div>
          </div>
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">评分分布（豆瓣）</h3>
            <div id="score-dist" style="height: 300px"></div>
          </div>
        </div>

        <!-- Top rated -->
        <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
          <h3 class="text-sm font-medium text-gray-400 mb-3">🏆 评分 Top 5</h3>
          <div class="space-y-2">
            <div v-for="(ip, i) in overview.topRated" :key="ip.id"
              @click="goDetail(ip.id)"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <span class="text-lg font-bold w-6 text-center" :class="i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'">
                {{ i + 1 }}
              </span>
              <span class="text-xs px-1.5 py-0.5 rounded"
                :class="ip.type === 'novel' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'">
                {{ ip.type === 'novel' ? '📖' : '🎬' }}
              </span>
              <span class="flex-1 text-sm text-white truncate">{{ ip.name }}</span>
              <span class="font-bold" :class="getScoreColor(ip.douban_score)">{{ ip.douban_score }}</span>
            </div>
          </div>
        </div>

        <!-- Studio bar -->
        <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
          <h3 class="text-sm font-medium text-gray-400 mb-2">制作公司 × 作品数 × 评分</h3>
          <div id="studio-bar" style="height: 300px"></div>
        </div>
      </div>

      <!-- Studio View -->
      <div v-if="activeView === 'studio'" class="space-y-4">
        <div v-if="studioData.length === 0" class="text-center py-10 text-gray-500">暂无制作公司数据</div>
        <div v-for="studio in studioData" :key="studio.name"
          class="bg-[#14142a] border border-white/5 rounded-xl p-5">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-white">🏭 {{ studio.name }}</h3>
              <div class="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span>{{ studio.projects.length }} 部作品</span>
                <span v-if="studio.avgScore">·  均分 <span :class="getScoreColor(parseFloat(studio.avgScore))">{{ studio.avgScore }}</span></span>
              </div>
            </div>
            <div v-if="studio.topGenres.length" class="flex gap-1">
              <span v-for="g in studio.topGenres" :key="g"
                class="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{{ g }}</span>
            </div>
          </div>
          <div class="space-y-1.5">
            <div v-for="ip in studio.projects" :key="ip.id"
              @click="goDetail(ip.id)"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
              <span class="text-white flex-1 truncate">{{ ip.name }}</span>
              <span v-if="ip.production_tier" class="text-[11px] px-1.5 py-0.5 rounded font-bold"
                :class="ip.production_tier.includes('S') ? 'bg-yellow-500/15 text-yellow-300' : ip.production_tier.includes('A') ? 'bg-green-500/15 text-green-300' : 'bg-gray-500/15 text-gray-400'">
                {{ ip.production_tier }}
              </span>
              <span v-if="ip.douban_score" :class="getScoreColor(ip.douban_score)" class="font-medium">{{ ip.douban_score }}</span>
            </div>
          </div>
        </div>

        <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
          <h3 class="text-sm font-medium text-gray-400 mb-2">制作公司对比</h3>
          <div id="studio-bar" style="height: 300px"></div>
        </div>
      </div>

      <!-- Platform View -->
      <div v-if="activeView === 'platform'" class="space-y-4">
        <div v-if="platformData.length === 0" class="text-center py-10 text-gray-500">暂无平台数据</div>
        <div v-for="plat in platformData" :key="plat.name"
          class="bg-[#14142a] border border-white/5 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-white">📺 {{ plat.name }}</h3>
              <span class="text-sm text-gray-400">{{ plat.projects.length }} 部作品
                <span v-if="plat.avgScore"> · 均分 <span :class="getScoreColor(parseFloat(plat.avgScore))">{{ plat.avgScore }}</span></span>
              </span>
            </div>
          </div>
          <div class="space-y-1.5">
            <div v-for="ip in plat.projects" :key="ip.id"
              @click="goDetail(ip.id)"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors text-sm">
              <span class="text-xs px-1.5 py-0.5 rounded"
                :class="ip.type === 'novel' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'">
                {{ ip.type === 'novel' ? '📖' : '🎬' }}
              </span>
              <span class="text-white flex-1 truncate">{{ ip.name }}</span>
              <span v-if="ip.douban_score" :class="getScoreColor(ip.douban_score)" class="font-medium">{{ ip.douban_score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Genre View -->
      <div v-if="activeView === 'genre'" class="space-y-4">
        <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
          <h3 class="text-sm font-medium text-gray-400 mb-2">题材分布</h3>
          <div id="genre-pie" style="height: 300px"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="genre in genreData" :key="genre.name"
            class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-white">{{ genre.name }}</h4>
              <span class="text-sm text-gray-400">{{ genre.count }} 部</span>
            </div>
            <div v-if="genre.avgScore" class="text-sm mt-1">
              <span class="text-gray-500">均分 </span>
              <span :class="getScoreColor(parseFloat(genre.avgScore))" class="font-medium">{{ genre.avgScore }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
