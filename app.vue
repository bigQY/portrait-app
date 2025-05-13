<template>
  <UApp>
    <NuxtLoadingIndicator :height="3" color="#4F46E5" />
    <div class="min-h-screen">
      <Header />
      <!-- 主体内容 -->
      <NuxtPage :transition="{
        name: 'page',
        mode: 'out-in'
      }" />
    </div>
  </UApp>
</template>

<script setup>
// 确保 Service Worker 注册只在客户端执行
if (import.meta.client) {
  onMounted(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  });
}
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.25s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

body {
  overflow-x: hidden;
}
</style>
