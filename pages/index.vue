<template>
  <div>
    <NuxtPage v-if="showPage" />
    <AlbumGrid v-else :initial-page="1" />
  </div>
</template>

<script setup>
const route = useRoute()

// 判断是否显示分页页面
const showPage = computed(() => {
  const page = route.query.page
  return page && page !== '1'
})
</script>