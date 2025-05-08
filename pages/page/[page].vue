<template>
  <AlbumGrid :initial-page="parseInt($route.params.page)" />
</template>

<script setup>
definePageMeta({
  validate: async (route) => {
    const page = parseInt(route.params.page)
    return !isNaN(page) && page > 0
  }
})
</script> 