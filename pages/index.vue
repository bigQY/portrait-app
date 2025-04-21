<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="py-8">
        <!-- 相册网格 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="album in albums" :key="album.id" class="group">
            <NuxtLink :to="`/album/${album.id}`" class="block">
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <nuxt-img
                  v-if="album.photos?.length > 0"
                  :src="`https://alist.zzdx.eu.org/d/img/%E5%86%99%E7%9C%9F%E5%9B%BE%E5%BA%8A/${album.id}/${album.name}/${album.photos[0].name}`"
                  class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UIcon name="i-heroicons-photo" class="w-12 h-12 text-gray-400"/>
                </div>
                
                <!-- 相册信息悬浮层 -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div class="absolute bottom-0 left-0 right-0 p-4">
                    <h3 class="text-white text-sm font-medium truncate">{{ album.name }}</h3>
                    <p class="text-gray-200 text-xs mt-1">{{ album.photos?.length || 0 }} 张照片</p>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- 分页器 -->
        <div class="mt-8 flex justify-center" v-if="totalPages > 1">
          <UPagination
            v-model="currentPage"
            :total="totalPages"
            :ui="{
              rounded: 'rounded-full',
              default: {
                padding: 'px-3 py-2',
                size: 'sm',
                activeButton: 'bg-primary-500 text-white',
                inactiveButton: 'bg-gray-100 dark:bg-gray-800',
              }
            }"
          />
        </div>

        <!-- 加载状态 -->
        <div v-if="pending" class="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
            <UIcon name="i-lucide-lightbulb" class="size-5 w-8 h-8 text-primary-500" />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
const currentPage = ref(1)
const pageSize = ref(10)

// 获取相册列表数据
const { data: albumsData, pending, refresh } = await useFetch('/api/alist/albums', {
  query: computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value
  }))
})

// 相册数据
const albums = computed(() => albumsData.value?.data?.items || [])
const totalPages = computed(() => albumsData.value?.data?.pagination?.totalPages || 0)

// 监听页码变化，自动滚动到顶部
watch(currentPage, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
</script>