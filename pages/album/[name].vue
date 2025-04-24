<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <!-- 相册标题栏 -->
      <div class="py-6 flex items-center gap-4">
        <button 
          @click="async () => {
            await navigateTo('/')
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
      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-gray-400 animate-spin"/>
      </div>
      <!-- 图片瀑布流 -->
      <div v-else class="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
        <div v-for="item in albumData?.data?.items" :key="item.name" 
          @click="openImageViewer(item)"
          class="break-inside-avoid group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <!-- 骨架屏 -->
          <div v-if="!imageLoaded[item.name]" class="skeleton aspect-[3/4] z-10"></div>
          <!-- 图片 -->
          <img
            :src="item.thumb"
            :data-src="item.url"
            :alt="item.name"
            :class="[
              'w-full h-auto object-cover transition-transform duration-300 cursor-pointer',
              {'group-hover:scale-105': imageLoaded[item.name]}
            ]"
            @error="$event.target.src = '/img/cover.jpg'"
            @load="imageLoaded[item.name] = true"
            ref="lazyImages"
          />
          
          <!-- 悬浮信息 -->
          <div :class="[
            'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300',
            {'group-hover:opacity-100': imageLoaded[item.name]}
          ]">
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <p class="text-white text-sm truncate">{{ item.name }}</p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
    <!-- 自定义全屏图片查看器 -->
    <div v-if="isImageViewerOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-all duration-300"
      @click.self="isImageViewerOpen = false"
    >
      <!-- 左右切换按钮 -->
      <button 
        v-if="currentImageIndex > 0"
        class="z-30 fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
        :class="{'opacity-0': !showControls}"
        @click="openImageViewer(albumData.data.items[currentImageIndex - 1])"
      >
        <UIcon name="i-lucide-chevron-left" class="w-6 h-6"/>
      </button>
      <button 
        v-if="currentImageIndex < albumData.data.items.length - 1"
        class="z-30 fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
        :class="{'opacity-0': !showControls}"
        @click="openImageViewer(albumData.data.items[currentImageIndex + 1])"
      >
        <UIcon name="i-lucide-chevron-right" class="w-6 h-6"/>
      </button>
      <div class="relative max-w-[90vw] max-h-[90vh] transition-transform duration-300" :class="{'scale-95': !imageLoaded.viewer, 'scale-100': imageLoaded.viewer}" @click="toggleControls">
        <!-- 缩略图作为背景 -->
        <img 
          :src="currentImage?.thumb" 
          :alt="currentImage?.name"
          class="z-10 absolute inset-0 w-full h-full object-contain blur-sm opacity-50 transition-opacity duration-300"
          :class="{'opacity-50': !imageLoaded.viewer, 'opacity-0': imageLoaded.viewer}"
        />
        <!-- 主图 -->
        <img 
          :src="currentImage?.url" 
          :alt="currentImage?.name"
          class="relative z-20 w-auto h-auto max-w-full max-h-[90vh] object-contain transition-opacity duration-300"
          :class="{'opacity-0': !imageLoaded.viewer, 'opacity-100': imageLoaded.viewer}"
          @error="$event.target.src = '/img/cover.jpg'"
          @load="imageLoaded.viewer = true"
        />
        <!-- 加载进度条 -->
        <div v-if="!imageLoaded.viewer" class="z-30 absolute bottom-0 left-0 right-0 h-1 bg-gray-700 overflow-hidden">
          <div class="h-full bg-white animate-progress-indeterminate"></div>
        </div>
        <!-- 控制按钮 -->
        <button 
          class="z-30 fixed top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
          :class="{'opacity-0': !showControls}"
          @click="isImageViewerOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-6 h-6"/>
        </button>
        <!-- 下载按钮 -->
        <button 
          class="z-30 fixed bottom-4 right-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 flex items-center gap-2 transition-opacity duration-300"
          :class="{'opacity-0': !showControls}"
          @click="downloadImage(currentImage)"
        >
          <UIcon name="i-lucide-download" class="w-5 h-5"/>
          <span>下载原图</span>
        </button>
      </div>
        <!-- 底部预览图 -->
        <div class="absolute z-30 fixed bottom-0 left-0 right-0 bg-black/50 transition-opacity duration-300 overflow-hidden pb-4" :class="{'opacity-0': !showControls}">
          <div 
            class="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar w-full max-w-screen-2xl mx-auto" 
            style="scroll-behavior: smooth;"
            @wheel.prevent="handleMouseWheel"
            @mousedown="handleDragStart"
            @mousemove="handleDragMove"
            @mouseup="handleDragEnd"
            @mouseleave="handleDragEnd"
            ref="previewContainer"
          >
            <div 
              v-for="(image, index) in albumData.data.items" 
              :key="image.name"
              @click="openImageViewer(image)"
              class="flex-shrink-0 w-12 h-12 rounded overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-110"
              :class="{'ring-2 ring-white': image.name === currentImage.name}"
            >
              <img 
                :src="image.thumb" 
                :alt="image.name"
                class="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
    </div>
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
  observer = new IntersectionObserver(async (entries) => {
    entries.forEach(async entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        const originalUrl = img.dataset.src
        if (originalUrl) {
          try {
            // 生成缓存key
            const urlParts = originalUrl.split('/cmcc/')
            const cacheKey = urlParts[1] // 使用相对路径作为key
            
            // 尝试从缓存获取缩略图
            const cachedImage = await imageCache.getImage(`thumb_${cacheKey}`)
            if (cachedImage) {
              img.src = cachedImage
            } else {
              // 从网络加载并缓存缩略图
              const base64Data = await convertImageToBase64(img.src)
              await imageCache.saveImage(`thumb_${cacheKey}`, base64Data)
              img.src = base64Data
            }
          } catch (error) {
            console.error('缩略图加载失败:', error)
            // img.src = '/img/cover.jpg'
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
const currentImageIndex = ref(0)
const showControls = ref(true)

// 切换控制按钮显示状态
const toggleControls = () => {
  showControls.value = !showControls.value
}

// 预览图容器引用
const previewContainer = ref(null)

// 拖动状态
const isDragging = ref(false)
const startX = ref(0)
const scrollLeft = ref(0)

// 处理鼠标滚轮事件
const handleMouseWheel = (e) => {
  if (previewContainer.value) {
    previewContainer.value.scrollLeft += e.deltaY
  }
}

// 处理拖动开始
const handleDragStart = (e) => {
  isDragging.value = true
  startX.value = e.pageX - previewContainer.value.offsetLeft
  scrollLeft.value = previewContainer.value.scrollLeft
}

// 处理拖动移动
const handleDragMove = (e) => {
  if (!isDragging.value) return
  e.preventDefault()
  const x = e.pageX - previewContainer.value.offsetLeft
  const walk = (x - startX.value) * 2
  previewContainer.value.scrollLeft = scrollLeft.value - walk
}

// 处理拖动结束
const handleDragEnd = () => {
  isDragging.value = false
}

// 监听当前图片变化，自动滚动到可视区域
watch(currentImageIndex, () => {
  nextTick(() => {
    const container = previewContainer.value
    if (!container) return
    
    const thumbnails = container.children
    if (currentImageIndex.value >= 0 && currentImageIndex.value < thumbnails.length) {
      const thumbnail = thumbnails[currentImageIndex.value]
      const containerWidth = container.offsetWidth
      const thumbnailLeft = thumbnail.offsetLeft
      const thumbnailWidth = thumbnail.offsetWidth
      
      // 计算目标滚动位置，使当前缩略图居中
      const targetScroll = thumbnailLeft - (containerWidth / 2) + (thumbnailWidth / 2)
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      })
    }
  })
})

// 下载图片
const downloadImage = async (image) => {
  try {
    const response = await fetch(image.url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = image.name
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('下载失败:', error)
  }
}

// 打开图片查看器
const openImageViewer = async (image) => {
  imageLoaded.value.viewer = false
  currentImage.value = image
  isImageViewerOpen.value = true
  // 设置当前图片索引
  currentImageIndex.value = albumData.value.data.items.findIndex(item => item.name === image.name)

  try {
    // 生成缓存key
    const urlParts = image.url.split('/cmcc/')
    const cacheKey = urlParts[1] // 使用相对路径作为key
    
    // 尝试从缓存获取
    const cachedImage = await imageCache.getImage(cacheKey)
    if (cachedImage) {
      currentImage.value = { ...image, url: cachedImage }
      imageLoaded.value.viewer = true
    } else {
      // 从网络加载并缓存
      const base64Data = await convertImageToBase64(image.url)
      await imageCache.saveImage(cacheKey, base64Data)
      currentImage.value = { ...image, url: base64Data }
      imageLoaded.value.viewer = true
    }
  } catch (error) {
    console.error('大图加载失败:', error)
    currentImage.value = { ...image, url: '/img/cover.jpg' }
    imageLoaded.value.viewer = true
  }
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