<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const ip = ref(null)
const loading = ref(true)
const showDeleteConfirm = ref(false)

onMounted(async () => {
  const { data, error } = await supabase
    .from('ips')
    .select('*')
    .eq('id', route.params.id)
    .single()
  if (!error && data) ip.value = data
  loading.value = false
})

const renderedMd = computed(() => {
  if (!ip.value?.raw_md) return ''
  return marked(ip.value.raw_md, { breaks: true })
})

async function deleteIP() {
  const { error } = await supabase.from('ips').delete().eq('id', ip.value.id)
  if (!error) router.push('/')
}

function getScoreColor(score) {
  if (!score) return '#666'
  if (score >= 9) return '#fbbf24'
  if (score >= 8) return '#34d399'
  if (score >= 7) return '#60a5fa'
  return '#9ca3af'
}
</script>

<template>
  <div>
    <!-- Back button -->
    <button @click="router.push('/')"
      class="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </button>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!ip" class="text-center py-20">
      <div class="text-5xl mb-4">😕</div>
      <p class="text-gray-400">未找到该 IP 记录</p>
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-6">
      <!-- Sidebar: Key Metrics -->
      <div class="lg:w-72 flex-shrink-0 order-2 lg:order-1">
        <div class="lg:sticky lg:top-20 space-y-4">

          <!-- Type Badge -->
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-2xl">{{ ip.type === 'novel' ? '📖' : '🎬' }}</span>
              <span class="text-sm font-medium" :class="ip.type === 'novel' ? 'text-purple-300' : 'text-blue-300'">
                {{ ip.type === 'novel' ? '小说' : '动漫' }}
              </span>
            </div>
            <h2 class="text-lg font-bold text-white mb-2">{{ ip.name }}</h2>
            <p v-if="ip.ai_summary" class="text-sm text-gray-400 leading-relaxed">{{ ip.ai_summary }}</p>
          </div>

          <!-- Scores -->
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-3">评分</h3>
            <div class="space-y-2">
              <div v-if="ip.douban_score" class="flex items-center justify-between">
                <span class="text-sm text-gray-400">豆瓣</span>
                <span class="text-lg font-bold" :style="{ color: getScoreColor(ip.douban_score) }">
                  {{ ip.douban_score }}
                </span>
              </div>
              <div v-if="ip.bangumi_score" class="flex items-center justify-between">
                <span class="text-sm text-gray-400">Bangumi</span>
                <span class="text-lg font-bold" :style="{ color: getScoreColor(ip.bangumi_score) }">
                  {{ ip.bangumi_score }}
                </span>
              </div>
              <div v-if="ip.yousuu_score" class="flex items-center justify-between">
                <span class="text-sm text-gray-400">优书网</span>
                <span class="text-lg font-bold" :style="{ color: getScoreColor(ip.yousuu_score) }">
                  {{ ip.yousuu_score }}
                </span>
              </div>
              <div v-if="ip.adaptation_score" class="flex items-center justify-between pt-2 border-t border-white/5">
                <span class="text-sm text-gray-400">改编潜力</span>
                <span class="text-lg font-bold text-yellow-300">{{ ip.adaptation_score }}/5</span>
              </div>
            </div>
          </div>

          <!-- Key Info -->
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-3">关键信息</h3>
            <div class="space-y-2 text-sm">
              <div v-if="ip.studio" class="flex justify-between">
                <span class="text-gray-500">制作公司</span>
                <span class="text-gray-200">{{ ip.studio }}</span>
              </div>
              <div v-if="ip.director" class="flex justify-between">
                <span class="text-gray-500">导演</span>
                <span class="text-gray-200">{{ ip.director }}</span>
              </div>
              <div v-if="ip.author" class="flex justify-between">
                <span class="text-gray-500">作者</span>
                <span class="text-gray-200">{{ ip.author }}</span>
              </div>
              <div v-if="ip.platform" class="flex justify-between">
                <span class="text-gray-500">平台</span>
                <span class="text-gray-200">{{ ip.platform }}</span>
              </div>
              <div v-if="ip.source_type" class="flex justify-between">
                <span class="text-gray-500">原著类型</span>
                <span class="text-gray-200">{{ ip.source_type }}</span>
              </div>
              <div v-if="ip.production_tier" class="flex justify-between">
                <span class="text-gray-500">制作水准</span>
                <span class="font-bold"
                  :class="ip.production_tier.includes('S+') ? 'text-red-300'
                    : ip.production_tier.includes('S') ? 'text-yellow-300'
                    : ip.production_tier.includes('A') ? 'text-green-300'
                    : ip.production_tier.includes('B') ? 'text-blue-300'
                    : 'text-gray-400'">
                  {{ ip.production_tier }}
                </span>
              </div>
              <div v-if="ip.total_seasons" class="flex justify-between">
                <span class="text-gray-500">季数</span>
                <span class="text-gray-200">{{ ip.total_seasons }}季</span>
              </div>
              <div v-if="ip.total_episodes" class="flex justify-between">
                <span class="text-gray-500">总集数</span>
                <span class="text-gray-200">{{ ip.total_episodes }}集</span>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="ip.genre_tags?.length" class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-3">标签</h3>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="tag in ip.genre_tags" :key="tag"
                class="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-300">
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-[#14142a] border border-white/5 rounded-xl p-4">
            <button @click="showDeleteConfirm = true"
              class="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              🗑️ 删除记录
            </button>
          </div>

          <!-- Delete Confirm -->
          <div v-if="showDeleteConfirm" class="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <p class="text-sm text-red-300 mb-3">确定要删除「{{ ip.name }}」吗？此操作不可撤销。</p>
            <div class="flex gap-2">
              <button @click="deleteIP" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm text-white">确认删除</button>
              <button @click="showDeleteConfirm = false" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main: MD Report -->
      <div class="flex-1 order-1 lg:order-2 min-w-0">
        <div class="bg-[#14142a] border border-white/5 rounded-xl p-6 sm:p-8">
          <div v-if="renderedMd" class="markdown-body" v-html="renderedMd"></div>
          <div v-else class="text-center py-10 text-gray-500">
            <p>暂无完整报告内容</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
