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
          v-if="currentImage?.type !== 2"
          :src="currentImage?.thumb" 
          :alt="currentImage?.name"
          class="z-10 absolute inset-0 w-full h-full object-contain blur-sm opacity-50 transition-opacity duration-300"
          :class="{'opacity-50': !imageLoaded.viewer, 'opacity-0': imageLoaded.viewer}"
        />
        <!-- 主图或视频 -->
        <template v-if="currentImage?.type === 2">
          <video
            :src="currentImage?.url"
            class="relative z-20 w-auto h-auto max-w-full max-h-[90vh] object-contain"
            controls
            autoplay
            @loadeddata="imageLoaded.viewer = true"
            @error="handleVideoError"
          />
        </template>
        <img 
          v-else
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
          v-if="currentImage?.type !== 2"
          class="z-30 fixed bottom-4 right-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 flex items-center gap-2"
          :class="{'opacity-0': !showControls}"
          @click="downloadImage(currentImage)"
        >
          <UIcon name="i-lucide-download" class="w-5 h-5"/>
          <span>下载原图</span>
        </button>
      </div>
        <!-- 底部预览图 -->
        <div class="z-30 fixed bottom-0 left-0 right-0 bg-black/50 transition-all duration-300 overflow-hidden pb-4" :class="{'opacity-0': !showControls}">
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
    currentImage.value = image
    imageLoaded.value.viewer = true
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

// 处理视频加载错误
const handleVideoError = (error) => {
  console.error('视频加载失败:', error)
  imageLoaded.value.viewer = true
}

watch(isImageViewerOpen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

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