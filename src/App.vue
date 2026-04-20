<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)

const navItems = [
  { path: '/', label: 'IP 库', icon: '📚' },
  { path: '/upload', label: '上传', icon: '📤' },
  { path: '/analytics', label: '数据透视', icon: '📊' },
]

function navigateTo(path) {
  router.push(path)
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#0d0d1a] text-white">
    <!-- Top Nav -->
    <nav class="sticky top-0 z-50 bg-[#12122a]/90 backdrop-blur-lg border-b border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-14">
          <!-- Logo -->
          <div class="flex items-center gap-2 cursor-pointer" @click="navigateTo('/')">
            <span class="text-xl">🎬</span>
            <span class="font-bold text-base tracking-wide bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              IP Database
            </span>
          </div>
          <!-- Desktop Nav -->
          <div class="hidden sm:flex items-center gap-1">
            <button
              v-for="item in navItems" :key="item.path"
              @click="navigateTo(item.path)"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              :class="route.path === item.path
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-gray-400 hover:text-white hover:bg-white/5'"
            >
              <span class="mr-1.5">{{ item.icon }}</span>{{ item.label }}
            </button>
          </div>
          <!-- Mobile menu button -->
          <button class="sm:hidden p-2 text-gray-400" @click="mobileMenuOpen = !mobileMenuOpen">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                :d="mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="sm:hidden border-t border-white/5 bg-[#12122a]">
        <button
          v-for="item in navItems" :key="item.path"
          @click="navigateTo(item.path)"
          class="w-full text-left px-6 py-3 text-sm"
          :class="route.path === item.path ? 'text-purple-300 bg-purple-500/10' : 'text-gray-400'"
        >
          <span class="mr-2">{{ item.icon }}</span>{{ item.label }}
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <router-view />
    </main>
  </div>
</template>
