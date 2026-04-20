<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const ipList = ref([])
const loading = ref(true)
const activeTab = ref('all') // all / novel / anime
const searchQuery = ref('')
const sortBy = ref('created_at')
const filterStudio = ref('')
const filterPlatform = ref('')

onMounted(async () => {
  await fetchIPs()
})

async function fetchIPs() {
  loading.value = true
  const { data, error } = await supabase
    .from('ips')
    .select('*')
    .order('created_at', { ascending: false })
  if (!error && data) ipList.value = data
  loading.value = false
}

const filteredList = computed(() => {
  let list = ipList.value
  if (activeTab.value !== 'all') {
    list = list.filter(ip => ip.type === activeTab.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(ip =>
      ip.name?.toLowerCase().includes(q) ||
      ip.studio?.toLowerCase().includes(q) ||
      ip.author?.toLowerCase().includes(q) ||
      ip.genre_tags?.some(t => t.toLowerCase().includes(q))
    )
  }
  if (filterStudio.value) {
    list = list.filter(ip => ip.studio === filterStudio.value)
  }
  if (filterPlatform.value) {
    list = list.filter(ip =>
      ip.broadcast_platforms?.includes(filterPlatform.value) ||
      ip.platform === filterPlatform.value
    )
  }
  if (sortBy.value === 'score') {
    list = [...list].sort((a, b) => (b.douban_score || 0) - (a.douban_score || 0))
  } else if (sortBy.value === 'name') {
    list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'))
  }
  return list
})

const studios = computed(() => {
  const s = new Set()
  ipList.value.forEach(ip => { if (ip.studio) s.add(ip.studio) })
  return [...s].sort()
})

const platforms = computed(() => {
  const p = new Set()
  ipList.value.forEach(ip => {
    if (ip.type === 'anime' && ip.broadcast_platforms) {
      ip.broadcast_platforms.forEach(pl => p.add(pl))
    }
    if (ip.type === 'novel' && ip.platform) p.add(ip.platform)
  })
  return [...p].sort()
})

const stats = computed(() => ({
  total: ipList.value.length,
  novels: ipList.value.filter(i => i.type === 'novel').length,
  animes: ipList.value.filter(i => i.type === 'anime').length,
}))

function goDetail(id) {
  router.push(`/ip/${id}`)
}

function getScoreBadgeClass(score) {
  if (!score) return 'bg-gray-700 text-gray-400'
  if (score >= 9) return 'bg-yellow-500/20 text-yellow-300'
  if (score >= 8) return 'bg-green-500/20 text-green-300'
  if (score >= 7) return 'bg-blue-500/20 text-blue-300'
  return 'bg-gray-600/20 text-gray-300'
}
</script>

<template>
  <div>
    <!-- Stats Bar -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a3a] rounded-lg text-sm">
        <span class="text-gray-400">共</span>
        <span class="font-bold text-white">{{ stats.total }}</span>
        <span class="text-gray-400">个 IP</span>
        <span class="text-gray-600 mx-1">|</span>
        <span class="text-purple-300">📖 {{ stats.novels }}</span>
        <span class="text-gray-600 mx-1">|</span>
        <span class="text-blue-300">🎬 {{ stats.animes }}</span>
      </div>
    </div>

    <!-- Tabs + Search + Filters -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
      <!-- Tabs -->
      <div class="flex bg-[#1a1a3a] rounded-lg p-0.5">
        <button v-for="tab in [{key:'all',label:'全部'},{key:'novel',label:'📖 小说'},{key:'anime',label:'🎬 动漫'}]"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          :class="activeTab === tab.key ? 'bg-purple-500/30 text-purple-200' : 'text-gray-400 hover:text-white'"
        >{{ tab.label }}</button>
      </div>

      <!-- Search -->
      <div class="relative flex-1 w-full sm:max-w-xs">
        <input v-model="searchQuery" type="text" placeholder="搜索名称、制作公司、作者、标签..."
          class="w-full pl-9 pr-3 py-2 bg-[#1a1a3a] border border-white/5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50" />
        <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Filters -->
      <select v-if="studios.length" v-model="filterStudio"
        class="bg-[#1a1a3a] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none">
        <option value="">所有制作公司</option>
        <option v-for="s in studios" :key="s" :value="s">{{ s }}</option>
      </select>

      <select v-model="sortBy"
        class="bg-[#1a1a3a] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none">
        <option value="created_at">最近添加</option>
        <option value="score">评分最高</option>
        <option value="name">名称排序</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredList.length === 0" class="text-center py-20">
      <div class="text-5xl mb-4">{{ ipList.length === 0 ? '📭' : '🔍' }}</div>
      <p class="text-gray-400 text-lg mb-2">
        {{ ipList.length === 0 ? '还没有任何 IP 记录' : '没有匹配的结果' }}
      </p>
      <p v-if="ipList.length === 0" class="text-gray-500 text-sm mb-6">
        使用 novel-research 或 anime-research Skill 生成报告后上传
      </p>
      <button v-if="ipList.length === 0" @click="router.push('/upload')"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
        📤 上传第一份报告
      </button>
    </div>

    <!-- Card Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="ip in filteredList" :key="ip.id"
        @click="goDetail(ip.id)"
        class="group bg-[#14142a] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-purple-500/30 hover:bg-[#1a1a3a] transition-all duration-200">

        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="ip.type === 'novel' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'">
                {{ ip.type === 'novel' ? '📖 小说' : '🎬 动漫' }}
              </span>
              <span v-if="ip.production_tier" class="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-bold">
                {{ ip.production_tier }}
              </span>
            </div>
            <h3 class="font-bold text-white truncate group-hover:text-purple-200 transition-colors">
              {{ ip.name }}
            </h3>
          </div>
          <!-- Score badge -->
          <div v-if="ip.douban_score" class="ml-2 flex-shrink-0">
            <div class="text-center px-2 py-1 rounded-lg" :class="getScoreBadgeClass(ip.douban_score)">
              <div class="text-lg font-bold leading-tight">{{ ip.douban_score }}</div>
              <div class="text-[10px] opacity-70">豆瓣</div>
            </div>
          </div>
        </div>

        <!-- Meta -->
        <div class="space-y-1.5 text-sm text-gray-400">
          <div v-if="ip.type === 'anime' && ip.studio" class="flex items-center gap-1.5">
            <span class="text-gray-600">🏭</span>
            <span class="truncate">{{ ip.studio }}</span>
          </div>
          <div v-if="ip.type === 'novel' && ip.author" class="flex items-center gap-1.5">
            <span class="text-gray-600">✍️</span>
            <span>{{ ip.author }}</span>
          </div>
          <div v-if="ip.type === 'anime' && ip.broadcast_platforms?.length" class="flex items-center gap-1.5">
            <span class="text-gray-600">📺</span>
            <span class="truncate">{{ ip.broadcast_platforms.join(' / ') }}</span>
          </div>
          <div v-if="ip.type === 'novel' && ip.platform" class="flex items-center gap-1.5">
            <span class="text-gray-600">📚</span>
            <span>{{ ip.platform }}</span>
          </div>
          <div v-if="ip.ai_summary" class="text-gray-500 text-xs mt-2 line-clamp-2">
            {{ ip.ai_summary }}
          </div>
        </div>

        <!-- Tags -->
        <div v-if="ip.genre_tags?.length" class="flex flex-wrap gap-1 mt-3">
          <span v-for="tag in ip.genre_tags.slice(0, 4)" :key="tag"
            class="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
            {{ tag }}
          </span>
          <span v-if="ip.genre_tags.length > 4" class="text-[11px] px-1.5 py-0.5 text-gray-600">
            +{{ ip.genre_tags.length - 4 }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
