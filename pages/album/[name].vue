<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <!-- 相册标题栏 -->
      <div class="py-6 flex items-center gap-4">
        <button 
          @click="async () => {
            $router.back()
            // 等待DOM更新后清除动画类
            nextTick(() => {
              const elements = document.querySelectorAll('.fade-out')
              elements.forEach(el => el.classList.remove('fade-out'))
            })
          }"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <UIcon name="i-lucide-chevron-left" class="w-6 h-6 text-gray-600 dark:text-gray-400"/>
        </button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ albumName }}</h1>
      </div>

      <!-- 加载状态 -->
      <div v-if="showLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div v-for="i in 10" :key="i" class="relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse">
          <div class="aspect-square w-full"></div>
          <div class="p-4">
            <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      <!-- 图片瀑布流 -->
      <div v-else class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        <div v-for="item in albumData?.data?.items" :key="item.name" 
          @click="openImageViewer(item)"
          class="break-inside-avoid">
          <ImageCard
            :src="item.thumb"
            :alt="item.name"
            :title="item.name"
            :loading="'lazy'"
            @load="imageLoaded[item.name] = true"
            :cache-key="`${albumName}_${item.name}`"
            ref="lazyImages"
          >
            <!-- 添加视频播放图标 -->
            <template v-if="item.type === 2" #overlay>
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <div class="relative w-16 h-16 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-black/70 transition-colors duration-200">
                  <UIcon name="i-lucide-play" class="w-8 h-8 text-white"/>
                </div>
                <div class="mt-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
                  {{ item.name }}
                </div>
              </div>
            </template>
          </ImageCard>
        </div>
      </div>

      <!-- 统计信息和评论区 -->
      <div class="mt-12">
        <AlbumStats :album-name="albumName" />
      </div>
    </UContainer>

    <!-- 使用新的图片查看器组件 -->
    <ImageViewer
      v-model="isImageViewerOpen"
      :images="albumData?.data?.items || []"
      :initial-image="currentImage"
    />
  </div>
</template>

<script setup>
const route = useRoute()
const albumId = route.params.name
const albumName = route.params.name
const imageLoaded = ref({
  viewer: false
})

// 获取相册数据
const { data: albumData, pending } = await useFetch(`/api/alist/list`, {
  query: {
    path: `/cmcc/图床相册/${albumName}`,
  },
  transform: (data) => {
    if (data?.data?.content) {
      const unIllegalData = data.data.content.filter(item => {
        // item.thumb不能有illegal字符串
        if (item.thumb.includes('illegal')) {
          return false
        } else if (item.type !==5 && item.type !== 2){
          return false
        } else {
          return true
        }
      })
      return {
        data: {
          items: unIllegalData.map(item => ({
            name: item.name,
            url: `https://alist.zzdx.eu.org/d/cmcc/${encodeURIComponent('图床相册')}/${encodeURIComponent(albumName)}/${encodeURIComponent(item.name)}`,
            thumb: item.thumb,
            type: item.type
          }))
        }
      }
    }
    return data
  },
  lazy: true,
  server: true,
  initialCache: false
})

// 相册数据
const albums = computed(() => albumData.value?.data?.items || [])

// 计算是否显示加载状态
const showLoading = computed(() => {
  return pending.value || !albumData.value
})

// 监听相册数据变化
watch(albumData, () => {
  nextTick(() => {
    // 更新图片加载状态
  })
})

// 图片查看器状态
const isImageViewerOpen = ref(false)
const currentImage = ref(null)

// 打开图片查看器
const openImageViewer = (image) => {
  currentImage.value = image
  isImageViewerOpen.value = true
}

// 返回按钮处理函数
const handleReturn = () => {
  window.history.back()
}
</script>

<style>
/* 隐藏滚动条但保持可滚动 */
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>