<template>
  <div class="relative">
    <UButton
      :color="searchQuery ? 'primary' : 'gray'"
      :variant="searchQuery ? 'soft' : 'ghost'"
      :icon="'i-lucide-search'"
      :ui="{ rounded: 'rounded-full' }"
      class="!p-2 transition-colors duration-200"
      @click="isSearchOpen = !isSearchOpen"
    />
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="isSearchOpen" class="absolute right-0 mt-2 w-72 origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border dark:border-gray-700">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索相册..."
          class="w-full"
          @input="debounceSearch"
          @keydown.esc="isSearchOpen = false"
          ref="searchInput"
        />
        <!-- 热搜词 -->
        <div class="mt-2 flex flex-wrap gap-2">
          <UButton
            v-for="tag in hotTags"
            :key="tag"
            size="xs"
            color="gray"
            variant="soft"
            :class="{ 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500': searchQuery === tag }"
            class="border dark:border-gray-700"
            @click="handleTagClick(tag)"
          >
            {{ tag }}
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useDebounceFn } from '@vueuse/core'

const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const route = useRoute()

// 热搜词列表
const hotTags = ref(['蠢沫沫','绮太郎','爆机少女喵小吉','森萝财团','桜井宁宁', '喵糖映画', 'BETA','少女',
'白丝','女仆','黑丝','肉丝','学妹','制服','体操','护士','睡衣','旗袍','马尾','JK','死库水','兔女郎','和服'])

// 点击热搜词
const handleTagClick = (tag) => {
  searchQuery.value = tag
  debounceSearch()
}

// 防抖处理搜索
const debounceSearch = useDebounceFn(() => {
  if (isSearchOpen.value) {
    // 保持当前的查询参数，只更新搜索词
    const query = {
      ...route.query,
      q: searchQuery.value || undefined,
      page: searchQuery.value ? '1' : route.query.page // 搜索时重置到第一页
    }
    
    // 如果搜索词为空，删除q参数
    if (!searchQuery.value) {
      delete query.q
    }
    
    navigateTo({
      query
    })
  }
}, 300)

// 监听搜索框打开状态
watch(isSearchOpen, (newVal) => {
  if (newVal) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// 点击外部关闭搜索框
onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', (e) => {
      const searchContainer = document.querySelector('.relative')
      if (searchContainer && !searchContainer.contains(e.target)) {
        isSearchOpen.value = false
      }
    })
  }
})
</script>