<template>
  <div class="relative">
    <UButton
      color="gray"
      variant="ghost"
      :icon="'i-lucide-search'"
      :ui="{ rounded: 'rounded-full' }"
      class="!p-2"
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
      <div v-if="isSearchOpen" class="absolute right-0 mt-2 w-72 origin-top-right">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索相册..."
          class="w-full"
          @input="debounceSearch"
          @keydown.esc="isSearchOpen = false"
          ref="searchInput"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useDebounceFn } from '@vueuse/core'

const isSearchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)

// 防抖处理搜索
const debounceSearch = useDebounceFn(() => {
  if (isSearchOpen.value) {
    navigateTo(`/?q=${encodeURIComponent(searchQuery.value)}`)
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