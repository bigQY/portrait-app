<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="py-8">
        <!-- 加载状态 -->
        <div v-if="showLoading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div v-for="i in 10" :key="i" class="relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse">
            <div class="aspect-square w-full"></div>
            <div class="p-4">
              <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
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
              <ImageCard
                :src="album.photos?.length > 0 ? album.cover : '/img/cover.jpg'"
                :title="album.name"
                :subtitle="`${album.photos?.length || 0} 张照片`"
                loading="lazy"
                :cache-key="`cover_${album.name}`"
                @load="imageLoaded[album.id] = true"
              />
            </NuxtLink>
          </div>
        </div>

        <!-- 分页器 -->
        <div class="mt-8 flex justify-center items-center space-x-1 sm:space-x-2">
          <UButton
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
            class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
            variant="ghost"
          >
            <UIcon name="i-lucide-chevron-left" class="w-4 h-4 sm:w-5 sm:h-5" />
          </UButton>
          
          <div class="flex space-x-0.5 sm:space-x-1 relative">
            <template v-for="page in displayPages" :key="page">
              <template v-if="page !== '...'">
                <UButton
                  v-if="page !== currentPage || !showPageInput"
                  :variant="page === currentPage ? 'soft' : 'ghost'"
                  @click="page === currentPage ? showPageInput = true : changePage(page)"
                  class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-all duration-300 relative group text-sm sm:text-base"
                  :class="{
                    'bg-gray-100 dark:bg-gray-800 font-medium': page === currentPage
                  }"
                >
                  <div class="relative w-full h-full flex items-center justify-center">
                    {{ page }}
                    <UIcon 
                      v-if="page === currentPage" 
                      name="i-lucide-pencil" 
                      class="ml-0.5 sm:ml-1 w-3 h-3 sm:w-3.5 sm:h-3.5 -right-0.5 -top-0.5 transition-opacity duration-200 text-gray-500 dark:text-gray-400" 
                    />
                  </div>
                </UButton>
                <!-- 页码输入框 -->
                <div 
                  v-if="page === currentPage && showPageInput" 
                  class="z-10"
                >
                  <input
                    type="number"
                    v-model="pageInputValue"
                    @blur="handlePageInput"
                    @keyup.enter="handlePageInput"
                    class="w-8 h-8 sm:w-10 sm:h-10 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    :min="1"
                    :max="totalPages"
                    ref="pageInput"
                  />
                </div>
              </template>
              <span v-else class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">...</span>
            </template>
          </div>

          <UButton
            :disabled="currentPage === totalPages"
            @click="changePage(currentPage + 1)"
            class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
            variant="ghost"
          >
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 sm:w-5 sm:h-5" />
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


</style>

<script setup>
const route = useRoute()
const router = useRouter()

// 从URL获取当前页码，默认为1
const currentPage = ref(parseInt(route.query.page) || 1)
const pageSize = ref(10)
const totalPages = ref(1)

// 页码输入相关
const showPageInput = ref(false)
const pageInputValue = ref('')
const pageInput = ref(null)

// 处理页码输入
const handlePageInput = () => {
  const newPage = parseInt(pageInputValue.value)
  if (newPage && newPage >= 1 && newPage <= totalPages.value) {
    changePage(newPage)
  }
  showPageInput.value = false
  pageInputValue.value = ''
}

// 监听页码输入框显示状态
watch(showPageInput, (newVal) => {
  if (newVal) {
    pageInputValue.value = currentPage.value.toString()
    nextTick(() => {
      pageInput.value[0]?.focus()
    })
  }
})
// 服务端渲染时默认为true，避免显示骨架屏
const imageLoaded = ref(import.meta.server ? new Proxy({}, {
  get: () => true
}) : {})

// 获取相册列表数据
const { data: albumsData, pending } = await useFetch('/api/alist/albums', {
  query: computed(() => ({
    page: currentPage.value,
    pageSize: pageSize.value,
    q: route.query.q || ''
  })),
  watch: [currentPage, () => route.query.q], // 监听搜索参数变化
  server: true,
  initialCache: false,
  key: `albums-${currentPage.value}-${route.query.q || ''}`,
  lazy: true
})

// 相册数据
const albums = computed(() => albumsData.value?.data?.items || [])

// 计算是否显示加载状态
const showLoading = computed(() => {
  return pending.value || (route.query.q && !albumsData.value)
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
    
    // 重要：确保在数据更新后重置加载状态
    imageLoaded.value = {}
    
    // 在下一个 tick 初始化观察器，确保 DOM 已更新
    nextTick(() => {
      if (import.meta.client) {
        initializeImageObserver()
      }
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

  // 更新URL和页码，保持搜索参数
  await router.push({
    query: {
      ...route.query,  // 保留现有的查询参数
      page: page.toString()
    }
  })
  currentPage.value = page
  
  // 恢复动画类
  if (container) {
    container.classList.remove('fade-out')
    container.classList.add('fade-in')
    setTimeout(() => container.classList.remove('fade-in'), 300)
  }
}

const imageObserver = ref(null)

// 导入缓存管理器
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

// 初始化图片观察器
const initializeImageObserver = () => {
  if (!import.meta.client) return // 确保只在客户端执行

  // 如果已存在观察器，先断开连接
  if (imageObserver.value) {
    imageObserver.value.disconnect()
  }

  imageObserver.value = new IntersectionObserver(async (entries) => {
    entries.forEach(async entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        const coverUrl = img.src
        if (coverUrl && !coverUrl.includes('/img/cover.jpg')) {
          try {
            // 生成缓存key
            const urlParts = coverUrl.split('/cmcc/')
            const cacheKey = urlParts[1] // 使用相对路径作为key
            
            // 尝试从缓存获取缩略图
            const cachedImage = await imageCache.getImage(`thumb_${cacheKey}`)
            if (cachedImage) {
              img.src = cachedImage
            } else {
              // 从网络加载并缓存缩略图
              const base64Data = await convertImageToBase64(coverUrl)
              await imageCache.saveImage(`thumb_${cacheKey}`, base64Data)
              img.src = base64Data
            }
          } catch (error) {
            console.error('缩略图加载失败:', error)
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
  // 移除页面切换动画类
  nextTick(() => {
    const elements = document.querySelectorAll('.fade-out')
    elements.forEach(el => el.classList.remove('fade-out'))
  })
})

onUpdated(() => {
  // 移除页面切换动画类
  nextTick(() => {
    const elements = document.querySelectorAll('.fade-out')
    elements.forEach(el => el.classList.remove('fade-out'))
  })
})
</script>