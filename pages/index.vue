<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="py-8">
        <!-- 相册网格 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="album in albums" :key="album.id" class="group">
            <NuxtLink :to="`/album/${album.id}`" class="block">
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  v-if="album.photos?.length > 0"
                  :src="album.cover"
                  :data-src="`https://alist.zzdx.eu.org/d/cmcc/${encodeURIComponent('图床相册')}/${encodeURIComponent(album.name)}/${encodeURIComponent(album.photos[0].name)}`"
                  class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  @error="$event.target.src = '/img/cover.jpg'"
                  ref="lazyImages"
                />
                <img
                  v-else
                  src="/img/cover.jpg"
                  class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                />
                
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

        <!-- 加载更多指示器 -->
        <div 
          ref="loadMoreTrigger" 
          class="mt-8 py-4 flex justify-center"
          v-if="hasNextPage"
        >
          <UIcon 
            name="i-lucide-loader-2" 
            class="w-6 h-6 text-gray-400 animate-spin"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
const currentPage = ref(1)
const pageSize = ref(10)
const allAlbums = ref([])
const hasNextPage = ref(true)
const loadMoreTrigger = ref(null)

// 获取相册列表数据
const { data: albumsData, pending, refresh } = await useFetch('/api/alist/albums', {
  query: computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value
  }))
})

// 监听数据变化，合并数据
watch(albumsData, (newData) => {
  if (newData?.data?.items) {
    if (currentPage.value === 1) {
      allAlbums.value = []
    }
    allAlbums.value.push(...newData.data.items)
    hasNextPage.value = currentPage.value < (newData.data.pagination?.totalPages || 1)

    // 在客户端环境中初始化图片懒加载
    if (import.meta.client) {
      nextTick(() => {
        initializeImageObserver()
      })
    }
    
    // 在数据更新后，等待DOM更新完成再初始化新图片的观察器
    nextTick(() => {
      initializeImageObserver()
    })
  }
}, { immediate: true })

// 相册数据
const albums = computed(() => allAlbums.value)

// 设置无限滚动
onMounted(() => {
  const observer = new IntersectionObserver(async ([entry]) => {
    if (entry.isIntersecting && hasNextPage.value && !pending.value) {
      currentPage.value++
      await refresh()
    }
  }, {
    rootMargin: '100px'
  })

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }

  onUnmounted(() => {
    observer.disconnect()
  })
})

// 图片缓存和懒加载
const lazyImages = ref([])
const loadedThumbnails = ref(new Set())
const loadingFullImages = ref(new Set())
const imageObserver = ref(null)

// 导入缓存管理器
const { cacheStrategy, getCache } = useImageCache()

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

// 初始化图片观察器
const initializeImageObserver = () => {
  if (!import.meta.client) return // 确保只在客户端执行

  // 如果已存在观察器，先断开连接
  if (imageObserver.value) {
    imageObserver.value.disconnect()
  }

  imageObserver.value = new IntersectionObserver(async (entries) => {
    const cache = getCache()
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
            const cachedImage = await cache.getImage(cacheKey)
            if (cachedImage) {
              img.src = cachedImage
              loadedThumbnails.value.add(img)
              checkAndLoadFullImages()
            } else {
              // 从网络加载并缓存
              const base64Data = await convertImageToBase64(originalUrl)
              await cache.saveImage(cacheKey, base64Data)
              img.src = base64Data
              loadedThumbnails.value.add(img)
              checkAndLoadFullImages()
            }
          } catch (error) {
            console.error('图片加载失败:', error)
            img.src = '/img/cover.jpg'
          }
          imageObserver.value.unobserve(img)
        }
      }
    })
  }, {
    rootMargin: '2500px 0px',
    threshold: 0.1
  })

  // 监听所有图片
  lazyImages.value.forEach(img => {
    if (img && !loadedThumbnails.value.has(img)) {
      imageObserver.value.observe(img)
    }
  })
}

// 加载大图
const loadFullImage = async (originalUrl) => {
  if (loadingFullImages.value.has(originalUrl)) return
  
  loadingFullImages.value.add(originalUrl)
  try {
    const cache = getCache()
    const urlParts = originalUrl.split('/cmcc/')
    const cacheKey = urlParts[1]
    
    const cachedImage = await cache.getImage(cacheKey)
    if (!cachedImage) {
      const base64Data = await convertImageToBase64(originalUrl)
      await cache.saveImage(cacheKey, base64Data)
    }
  } catch (error) {
    console.error('大图加载失败:', error)
  } finally {
    loadingFullImages.value.delete(originalUrl)
  }
}

// 检查并开始加载大图
const checkAndLoadFullImages = () => {
  lazyImages.value.forEach(img => {
    const originalUrl = img.dataset.src
    if (originalUrl && loadedThumbnails.value.has(img) && !loadingFullImages.value.has(originalUrl)) {
      loadFullImage(originalUrl)
    }
  })
}

onMounted(() => {
  // 初始化图片观察器
  initializeImageObserver()

  // 组件卸载时清理
  onUnmounted(() => {
    if (imageObserver.value) {
      imageObserver.value.disconnect()
    }
    loadedThumbnails.value.clear()
    loadingFullImages.value.clear()
  })
})
</script>