<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <!-- 相册标题 -->
      <div class="py-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ albumName }}</h1>
      </div>

      <!-- 加载状态 -->
      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-gray-400 animate-spin"/>
      </div>
      <!-- 图片瀑布流 -->
      <div v-else class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        <div v-for="item in albumData?.data?.items" :key="item.name" 
          @click="openImageViewer(item)"
          class="break-inside-avoid group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <!-- 图片 -->
          <img
            :src="item.thumb"
            :data-src="item.url"
            :alt="item.name"
            class="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
            @error="$event.target.src = '/img/cover.jpg'"
            ref="lazyImages"
          />
          
          <!-- 悬浮信息 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <p class="text-white text-sm truncate">{{ item.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
    <!-- 自定义全屏图片查看器 -->
    <div v-if="isImageViewerOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity duration-300"
      @click.self="isImageViewerOpen = false"
    >
      <div class="relative max-w-[90vw] max-h-[90vh]">
        <img 
          :src="currentImage?.url" 
          :alt="currentImage?.name"
          class="w-auto h-auto max-w-full max-h-[90vh] object-contain"
          @error="$event.target.src = '/img/cover.jpg'"
        />
        <button 
          class="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200"
          @click="isImageViewerOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-6 h-6"/>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const albumId = route.params.name
const albumName = route.params.name

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
        } else if (item.type !==5){
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
          }))
        }
      }
    }
    return data
  }
})

// 监听相册数据变化，更新懒加载
let observer = null
watch(albumData, () => {
  nextTick(() => {
    if (observer && lazyImages.value) {
      lazyImages.value.forEach(img => {
        if (img) observer.observe(img)
      })
    }
  })
})

// 图片缓存和懒加载
const lazyImages = ref([])

// 使用图片缓存组合式函数
const { getCache } = useImageCache()
const imageCache = getCache()

// 将图片转换为base64
const convertImageToBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg'))
    }
    img.onerror = reject
    img.src = url
  })
}

// 初始化IntersectionObserver
onMounted(async () => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(async entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        const originalUrl = img.dataset.src
        if (originalUrl && originalUrl !== img.src) {
          try {
            // 生成缓存key
            const urlParts = originalUrl.split('/cmcc/')
            const cacheKey = urlParts[1] // 使用相对路径作为key
            
            // 尝试从缓存获取
            const cachedImage = await imageCache.getImage(cacheKey)
            if (cachedImage) {
              img.src = cachedImage
            } else {
              // 从网络加载并缓存
              const base64Data = await convertImageToBase64(originalUrl)
              await imageCache.saveImage(cacheKey, base64Data)
              img.src = base64Data
            }
          } catch (error) {
            console.error('图片加载失败:', error)
            img.src = '/img/cover.jpg'
          }
          observer.unobserve(img)
        }
      }
    })
  }, {
    rootMargin: '50px 50px',
    threshold: 0.1
  })

  // 监听所有图片
  nextTick(() => {
    lazyImages.value.forEach(img => {
      if (img) observer.observe(img)
    })
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})

// 图片查看器状态
const isImageViewerOpen = ref(false)
const currentImage = ref(null)

// 打开图片查看器
const openImageViewer = (image) => {
  currentImage.value = image
  isImageViewerOpen.value = true
}
</script>