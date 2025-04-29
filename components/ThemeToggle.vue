<template>
  <UButton
    color="gray"
    variant="ghost"
    :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
    :ui="{ rounded: 'rounded-full' }"
    class="!p-2"
    @click="toggleColorMode"
  />
</template>

<script setup>
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>