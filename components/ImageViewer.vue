<template>
  <div v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-all duration-300"
    @click.self="showControls && toggleControls"
    @mousedown.prevent="isZoomed && handleImageDragStart($event)"
    @mousemove.prevent="isZoomed && handleImageDragMove($event)"
    @mouseup.prevent="isZoomed && handleImageDragEnd()"
    @mouseleave.prevent="isZoomed && handleImageDragEnd()"
    @wheel.prevent="handleWheel"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
    @touchend.prevent="handleTouchEnd"
  > 
    <!-- 顶部控制按钮 -->
    <div class="fixed top-4 right-4 flex items-center gap-4 z-30" @click.stop @touchstart.stop @touchmove.stop @touchend.stop>
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
      @click.stop="prev"
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <UIcon name="i-lucide-chevron-left" class="w-6 h-6"/>
    </button>
    <button 
      v-if="currentIndex < images.length - 1"
      class="z-30 fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors duration-200 flex items-center justify-center transition-opacity duration-300"
      :class="{'opacity-0': !showControls}"
      @click.stop="next"
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <UIcon name="i-lucide-chevron-right" class="w-6 h-6"/>
    </button>

    <!-- 主图区域 -->
    <div class="relative max-w-[90vw] max-h-[calc(90vh-8rem)]" 
      :class="{
        'scale-95': !imageLoaded, 
        'scale-100': imageLoaded,
        'transition-transform duration-300': !isDraggingImage
      }"
      :style="isZoomed ? {
        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel})`,
        transformOrigin: 'center'
      } : {}"
    >
      <!-- 视频模式 -->
      <template v-if="currentImage?.type === 2">
        <div class="relative">
          <video
            :src="currentImage?.url"
            class="relative z-20 w-auto h-auto max-w-full max-h-[calc(90vh-8rem)] object-contain"
            controls
            autoplay
            @loadeddata="imageLoaded = true"
            @error="handleVideoError"
            @click.stop
            @touchstart.stop
            @touchmove.stop
            @touchend.stop
          />
        </div>
      </template>

      <!-- 图片模式 -->
      <template v-else>
        <div 
          class="relative z-20 flex items-center justify-center w-full h-full"
          :class="{'cursor-move': isZoomed}"
          @click.stop
          @touchstart.stop
          @touchmove.stop
          @touchend.stop
        >
          <!-- 缩略图 -->
          <img 
            :src="currentImage?.thumb" 
            :alt="currentImage?.name"
            class="w-auto h-auto max-w-[90vw] max-h-[calc(90vh-8rem)] object-contain transition-all duration-300"
            :class="{
              'opacity-100': !imageLoaded,
              'opacity-0': imageLoaded
            }"
          />
          <!-- 大图 -->
          <div class="absolute inset-0 overflow-hidden">
            <img 
              :src="currentImage?.url" 
              :alt="currentImage?.name"
              class="w-auto h-auto max-w-[90vw] max-h-[calc(90vh-8rem)] object-contain transition-all duration-300"
              :class="{
                'opacity-0': !imageLoaded, 
                'opacity-100': imageLoaded
              }"
              :style="isZoomed ? {
                cursor: 'move',
                position: 'absolute'
              } : {}"
              @error="$event.target.src = '/img/cover.jpg'"
              @load="imageLoaded = true"
            />
          </div>
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
const zoomLevel = ref(1)
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.1

// 触摸状态
const touchStartDistance = ref(0)
const touchStartPosition = ref({ x: 0, y: 0 })
const isTouching = ref(false)
const isPinching = ref(false)
const touchStartTime = ref(0)
const TOUCH_THRESHOLD = 10 // 移动阈值
const TOUCH_TIME_THRESHOLD = 200 // 时间阈值（毫秒）

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
    // 重置位置和缩放级别
    imagePosition.value = { x: 0, y: 0 }
    zoomLevel.value = 1
  } else {
    // 设置默认缩放级别为2.0
    zoomLevel.value = 2.0
  }
}

// 处理主图区域点击
const handleMainAreaClick = (e) => {
  // 如果正在拖动图片，不触发控制按钮的显示/隐藏
  if (isDraggingImage.value) return
  toggleControls()
}

// 处理触摸开始
const handleTouchStart = (e) => {
  touchStartTime.value = Date.now()
  touchStartPosition.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  }

  if (e.touches.length === 2) {
    // 双指触摸 - 开始缩放
    isPinching.value = true
    touchStartDistance.value = getTouchDistance(e.touches)
  } else if (e.touches.length === 1) {
    // 单指触摸 - 开始拖动
    isTouching.value = true
    isDraggingImage.value = true
    dragStart.value = {
      x: e.touches[0].clientX - imagePosition.value.x,
      y: e.touches[0].clientY - imagePosition.value.y
    }
  }
}

// 处理触摸移动
const handleTouchMove = (e) => {
  if (isPinching.value && e.touches.length === 2) {
    // 双指缩放
    const currentDistance = getTouchDistance(e.touches)
    const scale = currentDistance / touchStartDistance.value
    const newZoom = Math.min(Math.max(zoomLevel.value * scale, MIN_ZOOM), MAX_ZOOM)
    
    // 更新缩放级别和位置
    zoomLevel.value = newZoom
    isZoomed.value = newZoom > 1
    
    // 更新触摸起始距离
    touchStartDistance.value = currentDistance
  } else if (isTouching.value && e.touches.length === 1) {
    // 检查是否超过移动阈值
    const dx = e.touches[0].clientX - touchStartPosition.value.x
    const dy = e.touches[0].clientY - touchStartPosition.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > TOUCH_THRESHOLD) {
      // 如果移动距离超过阈值，认为是拖动
      requestAnimationFrame(() => {
        imagePosition.value = {
          x: e.touches[0].clientX - dragStart.value.x,
          y: e.touches[0].clientY - dragStart.value.y
        }
      })
    }
  }
}

// 处理触摸结束
const handleTouchEnd = (e) => {
  const touchEndTime = Date.now()
  const touchDuration = touchEndTime - touchStartTime.value
  
  // 如果触摸时间短且移动距离小，认为是点击
  if (touchDuration < TOUCH_TIME_THRESHOLD) {
    const dx = e.changedTouches[0].clientX - touchStartPosition.value.x
    const dy = e.changedTouches[0].clientY - touchStartPosition.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < TOUCH_THRESHOLD) {
      // 触发点击事件
      const target = e.target
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        // 让按钮的点击事件正常触发
        return
      }
      toggleControls()
    }
  }

  if (e.touches.length === 0) {
    isPinching.value = false
    isTouching.value = false
    isDraggingImage.value = false
  }
}

// 计算两个触摸点之间的距离
const getTouchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// 修改图片拖动开始处理函数
const handleImageDragStart = (e) => {
  isDraggingImage.value = true
  dragStart.value = {
    x: e.clientX - imagePosition.value.x,
    y: e.clientY - imagePosition.value.y
  }
  document.body.style.cursor = 'move'
}

// 修改图片拖动移动处理函数
const handleImageDragMove = (e) => {
  if (!isDraggingImage.value) return
  
  requestAnimationFrame(() => {
    imagePosition.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
  })
}

// 修改图片拖动结束处理函数
const handleImageDragEnd = () => {
  isDraggingImage.value = false
  document.body.style.cursor = ''
}

// 处理鼠标滚轮事件
const handleWheel = (e) => {
  if (!isZoomed.value) {
    isZoomed.value = true
  }

  // 计算鼠标在图片上的相对位置
  const rect = e.currentTarget.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  // 计算缩放前的相对位置
  const beforeZoomX = (mouseX - imagePosition.value.x) / zoomLevel.value
  const beforeZoomY = (mouseY - imagePosition.value.y) / zoomLevel.value

  // 更新缩放级别
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  const newZoom = Math.min(Math.max(zoomLevel.value + delta, MIN_ZOOM), MAX_ZOOM)
  
  // 如果缩放级别没有变化，直接返回
  if (newZoom === zoomLevel.value) return
  
  zoomLevel.value = newZoom

  // 计算缩放后的新位置，保持鼠标指向的点不变
  const afterZoomX = beforeZoomX * zoomLevel.value
  const afterZoomY = beforeZoomY * zoomLevel.value

  // 更新图片位置
  imagePosition.value = {
    x: mouseX - afterZoomX,
    y: mouseY - afterZoomY
  }
}

// 修改监听图片变化时的重置
watch(currentImage, () => {
  isZoomed.value = false
  imagePosition.value = { x: 0, y: 0 }
  zoomLevel.value = 1
  isDraggingImage.value = false
  isTouching.value = false
  isPinching.value = false
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