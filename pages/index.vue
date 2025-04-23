<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="py-8">
        <!-- 加载状态 -->
        <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <div class="skeleton z-10 absolute inset-0"></div>
          </div>
        </div>

        <!-- 相册网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="album in albums" :key="album.id" class="group">
            <NuxtLink :to="`/album/${album.id}`" class="block" @click.native.prevent="async (e) => {
              const container = e.currentTarget.closest('.group')
              if (container) {
                container.classList.add('fade-out')
              }
              navigateTo(`/album/${album.id}`)
            }">
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <div v-if="!imageLoaded[album.id]" class="skeleton z-10"></div>
                <img
                  v-if="album.photos?.length > 0"
                  :src="album.cover"
                  :data-src="`https://alist.zzdx.eu.org/d/cmcc/${encodeURIComponent('图床相册')}/${encodeURIComponent(album.name)}/${encodeURIComponent(album.photos[0].name)}`"
                  :class="[
                    'object-cover w-full h-full transition-transform duration-300',
                    {'group-hover:scale-105': imageLoaded[album.id]}
                  ]"
                  @error="$event.target.src = '/img/cover.jpg'"
                  @load="imageLoaded[album.id] = true"
                  ref="lazyImages"
                />
                <img
                  v-else
                  src="/img/cover.jpg"
                  :class="[
                    'object-cover w-full h-full transition-transform duration-300',
                    {'group-hover:scale-105': imageLoaded[album.id]}
                  ]"
                  @load="imageLoaded[album.id] = true"
                />
                
                <!-- 相册信息悬浮层 -->
                <div :class="[
                  'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300',
                  {'group-hover:opacity-100': imageLoaded[album.id]}
                ]">
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
        <div class="mt-8 flex justify-center items-center space-x-2">
          <UButton
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
            class="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
            variant="ghost"
          >
            <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
          </UButton>
          
          <div class="flex space-x-1">
            <template v-for="page in displayPages" :key="page">
              <UButton
                v-if="page !== '...'"
                :variant="page === currentPage ? 'soft' : 'ghost'"
                @click="changePage(page)"
                class="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-all duration-300"
                :class="{
                  'bg-gray-100 dark:bg-gray-800 font-medium': page === currentPage
                }"
              >
                {{ page }}
              </UButton>
              <span v-else class="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400">...</span>
            </template>
          </div>

          <UButton
            :disabled="currentPage === totalPages"
            @click="changePage(currentPage + 1)"
            class="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
            variant="ghost"
          >
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5" />
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<style>
.fade-out {
  opacity: 0.6;
  transform: scale(0.98);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.98);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.95);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.98);
  }
}

.fade-in {
  opacity: 1;
  transform: scale(1);
  transition: all 0.3s ease-in-out;
}

.skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.dark .skeleton {
  background: linear-gradient(90deg, #2d3748 25%, #1a202c 50%, #2d3748 75%);
  background-size: 200% 100%;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

<script setup>
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const imageLoaded = ref({})

// 获取相册列表数据
const { data: albumsData, pending } = await useFetch('/api/alist/albums', {
  query: computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value
  })),
  watch: [currentPage]
})

// 计算要显示的页码
const displayPages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 2 // 当前页码前后显示的页数
  const pages = []

  // 始终显示第一页
  pages.push(1)

  // 计算显示范围
  let left = Math.max(2, current - delta)
  let right = Math.min(total - 1, current + delta)

  // 添加省略号和页码
  if (left > 2) pages.push('...')
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push('...')
  if (total > 1) pages.push(total)

  return pages
})

// 监听数据变化
watch(albumsData, (newData) => {
  if (newData?.data) {
    totalPages.value = newData.data.pagination?.totalPages || 1
  }

  // 在数据更新后，等待DOM更新完成再初始化新图片的观察器
  if (import.meta.client) {
    nextTick(() => {
      initializeImageObserver()
    })
  }
}, { immediate: true })

// 切换页面的方法
const changePage = async (page) => {
  if (page === currentPage.value || page < 1 || page > totalPages.value) return
  
  // 重置所有图片的加载状态
  imageLoaded.value = {}
  
  // 添加页面切换动画类
  const container = document.querySelector('.grid')
  if (container) {
    container.classList.add('fade-out')
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  currentPage.value = page
  
  // 恢复动画类
  if (container) {
    container.classList.remove('fade-out')
    container.classList.add('fade-in')
    setTimeout(() => container.classList.remove('fade-in'), 300)
  }
}

// 相册数据
const albums = computed(() => albumsData.value?.data?.items || [])

// 图片懒加载
const lazyImages = ref([])
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
            } else {
              // 从网络加载并缓存
              const base64Data = await convertImageToBase64(originalUrl)
              await cache.saveImage(cacheKey, base64Data)
              img.src = base64Data
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
    if (img) {
      imageObserver.value.observe(img)
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
  })
})
</script>