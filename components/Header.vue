<template>
  <header class="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-300 border-b border-gray-900/10 dark:border-gray-50/[0.06] bg-white/75 dark:bg-gray-900/75">
    <UContainer>
      <div class="flex items-center justify-between h-16">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="text-lg font-bold text-gray-900 dark:text-white">写真相册</span>
        </NuxtLink>
        <!-- 右侧工具栏 -->
        <div class="flex items-center gap-4">
          <!-- 排行榜入口 -->
          <NuxtLink 
            to="/rankings"
            class="flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-green-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200"
          >
            <UIcon name="i-lucide-trophy" class="w-4 h-4" />
            <span class="ml-1 hidden sm:inline">排行榜</span>
          </NuxtLink>
          <!-- 青少年模式开关 -->
          <button 
            @click="toggleTeenMode" 
            class="flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200"
            :class="isTeenModeEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
          >
            <UIcon :name="isTeenModeEnabled ? 'i-lucide-shield-check' : 'i-lucide-shield'" class="w-4 h-4" />
            <span class="ml-1 hidden sm:inline">青少年模式</span>
          </button>
          <SearchBar v-if="!isAlbumPage" />
          <ThemeToggle />
        </div>
      </div>
    </UContainer>
  </header>
</template>

<script setup>
// 组件引入
import SearchBar from './SearchBar.vue'
import ThemeToggle from './ThemeToggle.vue'
import teenMode from '../composables/useTeenMode'

// 使用路由判断当前页面
const route = useRoute()
const isAlbumPage = computed(() => route.path.startsWith('/album/'))

// 青少年模式状态
const { isTeenModeEnabled, toggleTeenMode, syncTeenModeState } = teenMode

// 在客户端挂载后同步状态
onMounted(() => {
  if (import.meta.client) {
    syncTeenModeState()
  }
})
</script>