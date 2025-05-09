<template>
  <div v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-all duration-300"
    @click.self="close"
  > 
    <!-- 顶部控制按钮 -->
    <div class="fixed top-4 right-4 flex items-center gap-4 z-30">
      <UTooltip text="关闭">
        <button 
          class="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
          :class="{'opacity-0': !showControls}"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="w-6 h-6"/>
        </button>
      </UTooltip>
      <UTooltip v-if="currentImage?.type !== 2" text="下载原图">
        <button 
          class="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
          :class="{'opacity-0': !showControls}"
          @click="downloadImage"
        >
          <UIcon name="i-lucide-download" class="w-6 h-6"/>
        </button>
      </UTooltip>
      <UTooltip v-if="currentImage?.type !== 2" :text="isZoomed ? '恢复原状' : '放大'">
        <button 
          class="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
          :class="{'opacity-0': !showControls}"
          @click="toggleZoom"
        >
          <UIcon :name="isZoomed ? 'i-lucide-zoom-out' : 'i-lucide-zoom-in'" class="w-6 h-6"/>
        </button>
      </UTooltip>
    </div>

    <!-- 左右切换按钮 -->
    <button 
      v-if="currentIndex > 0"
      class="z-30 fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
      :class="{'opacity-0': !showControls}"
      @click="prev"
    >
      <UIcon name="i-lucide-chevron-left" class="w-6 h-6"/>
    </button>
    <button 
      v-if="currentIndex < images.length - 1"
      class="z-30 fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
      :class="{'opacity-0': !showControls}"
      @click="next"
    >
      <UIcon name="i-lucide-chevron-right" class="w-6 h-6"/>
    </button>

    <!-- 主图区域 -->
    <div class="relative max-w-[90vw] max-h-[90vh] transition-transform duration-300" 
      :class="{'scale-95': !imageLoaded, 'scale-100': imageLoaded}" 
      @click="toggleControls"
    >
      <!-- 视频模式 -->
      <template v-if="currentImage?.type === 2">
        <video
          :src="currentImage?.url"
          class="relative z-20 w-auto h-auto max-w-full max-h-[90vh] object-contain"
          controls
          autoplay
          @loadeddata="imageLoaded = true"
          @error="handleVideoError"
        />
      </template>

      <!-- 图片模式 -->
      <template v-else>
        <div 
          class="relative z-20 flex items-center justify-center"
          :class="{'cursor-move': isZoomed}"
          @mousedown="isZoomed && handleImageDragStart($event)"
          @mousemove="isZoomed && handleImageDragMove($event)"
          @mouseup="isZoomed && handleImageDragEnd()"
          @mouseleave="isZoomed && handleImageDragEnd()"
        >
          <!-- 缩略图 -->
          <img 
            :src="currentImage?.thumb" 
            :alt="currentImage?.name"
            class="w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain transition-all duration-300"
            :class="{
              'opacity-100': !imageLoaded,
              'opacity-0': imageLoaded
            }"
          />
          <!-- 大图 -->
          <img 
            :src="currentImage?.url" 
            :alt="currentImage?.name"
            class="absolute inset-0 w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain transition-all duration-300"
            :class="{
              'opacity-0': !imageLoaded, 
              'opacity-100': imageLoaded
            }"
            :style="isZoomed ? {
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(2)`,
              cursor: 'move',
              maxWidth: 'none',
              maxHeight: 'none'
            } : {}"
            @error="$event.target.src = '/img/cover.jpg'"
            @load="imageLoaded = true"
          />
          <!-- 加载指示器 -->
          <div v-if="!imageLoaded" class="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div class="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span class="text-white text-sm">大图加载中...</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 底部预览图 -->
    <div class="z-30 fixed bottom-0 left-0 right-0 bg-black/50 transition-all duration-300 overflow-hidden pb-4" 
      :class="{'opacity-0': !showControls}"
    >
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
          v-for="(image, index) in images" 
          :key="image.name"
          @click="openImage(image)"
          class="flex-shrink-0 w-12 h-12 rounded overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-110"
          :class="{'ring-2 ring-white': image.name === currentImage?.name}"
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
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  images: {
    type: Array,
    required: true
  },
  initialImage: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const imageLoaded = ref(false)
const showControls = ref(true)
const currentImage = ref(props.initialImage || props.images[0])
const currentIndex = ref(props.images.findIndex(img => img.name === (props.initialImage || props.images[0]).name))
const previewContainer = ref(null)

// 拖动状态
const isDragging = ref(false)
const startX = ref(0)
const scrollLeft = ref(0)

// 图片缩放状态
const isZoomed = ref(false)
const imagePosition = ref({ x: 0, y: 0 })
const isDraggingImage = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 监听initialImage变化
watch(() => props.initialImage, (newVal) => {
  if (newVal) {
    currentImage.value = newVal
    currentIndex.value = props.images.findIndex(img => img.name === newVal.name)
  } else if (props.images.length > 0) {
    currentImage.value = props.images[0]
    currentIndex.value = 0
  }
})

// 监听images变化
watch(() => props.images, (newVal) => {
  if (newVal.length > 0 && !currentImage.value) {
    currentImage.value = newVal[0]
    currentIndex.value = 0
  }
}, { immediate: true })

// 切换控制按钮显示状态
const toggleControls = () => {
  showControls.value = !showControls.value
}

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

// 关闭查看器
const close = () => {
  emit('update:modelValue', false)
}

// 下载图片
const downloadImage = async () => {
  try {
    const response = await fetch(currentImage.value.url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentImage.value.name
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('下载失败:', error)
  }
}

// 打开图片
const openImage = (image) => {
  imageLoaded.value = false
  currentImage.value = image
  currentIndex.value = props.images.findIndex(img => img.name === image.name)
}

// 上一张
const prev = () => {
  if (currentIndex.value > 0) {
    openImage(props.images[currentIndex.value - 1])
  }
}

// 下一张
const next = () => {
  if (currentIndex.value < props.images.length - 1) {
    openImage(props.images[currentIndex.value + 1])
  }
}

// 处理视频加载错误
const handleVideoError = (error) => {
  console.error('视频加载失败:', error)
  imageLoaded.value = true
}

// 监听当前图片变化，自动滚动到可视区域
watch(currentIndex, () => {
  nextTick(() => {
    const container = previewContainer.value
    if (!container) return
    
    const thumbnails = container.children
    if (currentIndex.value >= 0 && currentIndex.value < thumbnails.length) {
      const thumbnail = thumbnails[currentIndex.value]
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

// 监听查看器状态
watch(() => props.modelValue, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// 切换缩放状态
const toggleZoom = () => {
  isZoomed.value = !isZoomed.value
  if (!isZoomed.value) {
    // 重置位置
    imagePosition.value = { x: 0, y: 0 }
  }
}

// 处理图片拖动开始
const handleImageDragStart = (e) => {
  isDraggingImage.value = true
  dragStart.value = {
    x: e.clientX - imagePosition.value.x,
    y: e.clientY - imagePosition.value.y
  }
}

// 处理图片拖动移动
const handleImageDragMove = (e) => {
  if (!isDraggingImage.value) return
  e.preventDefault()
  
  imagePosition.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }
}

// 处理图片拖动结束
const handleImageDragEnd = () => {
  isDraggingImage.value = false
}

// 监听图片变化时重置缩放状态
watch(currentImage, () => {
  isZoomed.value = false
  imagePosition.value = { x: 0, y: 0 }
})
</script>

<style>
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 防止图片拖动时选中文本 */
.cursor-move {
  user-select: none;
  -webkit-user-select: none;
}
</style> 