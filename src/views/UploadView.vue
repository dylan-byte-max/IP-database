<script setup>
import { ref } from 'vue'

const copied = ref('')

function copy(text, key) {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = '' }, 1500)
}

const repoUrl = 'https://github.com/dylan-byte-max/IP-database'
const inboxUrl = `${repoUrl}/upload/main/reports-inbox`

const metaExample = `<!-- type: comic -->
<!-- name: 蝉女 -->
<!-- author: 宫缘乾 -->
<!-- platform: 快看漫画 -->
<!-- tags: 都市情感、悬疑、成人向 -->

# 漫画深度研究报告：《蝉女》

> **一句话定位**：这里写一句话定位……`
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-white mb-2">📤 新增 IP 研究报告</h1>
    <p class="text-gray-400 text-sm mb-6">
      本站已迁移为静态架构，数据存放在 Git 仓库中，通过 GitHub Actions 自动入库
    </p>

    <!-- 架构说明 -->
    <div class="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 mb-6">
      <h3 class="text-sm font-medium text-purple-200 mb-2">✨ 为什么这样设计</h3>
      <ul class="text-sm text-gray-400 space-y-1.5 list-disc list-inside">
        <li>数据存于仓库，<span class="text-gray-200">不会因数据库休眠而「消失」</span></li>
        <li>完整版本历史，改错可随时回滚</li>
        <li>不受办公网 DNS 限制影响，零维护成本</li>
      </ul>
    </div>

    <!-- 入库步骤 -->
    <div class="bg-[#14142a] border border-white/5 rounded-xl p-5 mb-4">
      <h3 class="text-sm font-medium text-gray-300 mb-4">入库步骤</h3>

      <ol class="space-y-4">
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold">1</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-200 mb-1">用 Skill 生成研究报告</p>
            <p class="text-xs text-gray-500">
              <code class="text-purple-300">novel-research</code> /
              <code class="text-blue-300">anime-research</code> ，产出 <code>.md</code> 文件
            </p>
          </div>
        </li>

        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold">2</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-200 mb-1">把 MD 文件放入仓库 <code class="text-pink-300">reports-inbox/</code></p>
            <p class="text-xs text-gray-500 mb-2">本地 commit 推送，或直接在 GitHub 网页拖拽上传</p>
            <a :href="inboxUrl" target="_blank" rel="noreferrer"
              class="inline-block px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors">
              🔗 打开 GitHub 上传页
            </a>
          </div>
        </li>

        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center justify-center font-bold">3</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-200 mb-1">自动完成</p>
            <p class="text-xs text-gray-500">
              Actions 自动解析入库 → Vercel 自动部署，约 1 分钟后刷新本站即可看到
            </p>
          </div>
        </li>
      </ol>
    </div>

    <!-- 元数据说明 -->
    <div class="bg-[#14142a] border border-white/5 rounded-xl p-5">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-300">💡 让解析更准确（可选）</h3>
        <button @click="copy(metaExample, 'meta')"
          class="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">
          {{ copied === 'meta' ? '✅ 已复制' : '复制模板' }}
        </button>
      </div>
      <p class="text-xs text-gray-500 mb-3">
        解析器会自动识别标题、表格字段与评分。若想精确指定，可在 MD 开头加注释：
      </p>
      <pre class="bg-[#0d0d1a] rounded-lg p-3 text-xs text-gray-400 overflow-x-auto font-mono leading-relaxed">{{ metaExample }}</pre>
      <p class="text-xs text-gray-500 mt-3">
        <span class="text-gray-400">type</span> 可选值：
        <code class="text-purple-300">novel</code> /
        <code class="text-blue-300">anime</code> /
        <code class="text-pink-300">comic</code>
      </p>
    </div>
  </div>
</template>
