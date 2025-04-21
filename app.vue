<template>
  <div class="min-h-screen">
    <!-- 导航栏 -->
    <header class="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-300 border-b border-gray-900/10 dark:border-gray-50/[0.06] bg-white/75 dark:bg-gray-900/75">
      <UContainer>
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900 dark:text-white">写真相册</span>
          </NuxtLink>
          <!-- 右侧工具栏 -->
          <div class="flex items-center gap-4">
            <!-- 深色模式切换 -->
            <UButton
              color="gray"
              variant="ghost"
              :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
              :ui="{ rounded: 'rounded-full' }"
              class="!p-2"
              @click="toggleColorMode"
            />
          </div>
        </div>
      </UContainer>
    </header>

    <!-- 主体内容 -->
    <NuxtPage />
  </div>
</template>

<script setup>
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
