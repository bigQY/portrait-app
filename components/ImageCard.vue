<template>
  <div class="group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
    <!-- 骨架屏 -->
    <div v-show="!isLoaded || src === '/img/cover.jpg'" class="skeleton z-10" :class="aspectRatioClass"></div>
    
    <!-- 图片 -->
    <img
      :src="src"
      :alt="alt"
      :class="[
        'w-full h-full object-cover transition-transform duration-300',
        aspectRatioClass,
        {'group-hover:scale-105': isLoaded && hover && src !== '/img/cover.jpg'}
      ]"
      :loading="loading"
      @error="handleError"
      @load="handleLoad"
      ref="imageRef"
    />
    
    <!-- 悬浮信息 -->
    <div v-if="showOverlay" :class="[
      'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300',
      {'group-hover:opacity-100': isLoaded && hover}
    ]">
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <slot name="overlay">
          <h3 v-if="title" class="text-white text-sm font-medium truncate">{{ title }}</h3>
          <p v-if="subtitle" class="text-gray-200 text-xs mt-1">{{ subtitle }}</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useImageCache } from '../composables/useImageCache'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  aspectRatio: {
    type: String,
    default: '3/4'
  },
  hover: {
    type: Boolean,
    default: true
  },
  showOverlay: {
    type: Boolean,
    default: true
  },
  loading: {
    type: String,
    default: 'lazy'
  },
  cacheKey: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['load', 'error'])

const isLoaded = ref(false)
const imageRef = ref(null)
const { getCache } = useImageCache()
const imageCache = getCache()

const aspectRatioClass = computed(() => `aspect-[${props.aspectRatio}]`)

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

// 加载并缓存图片
const loadAndCacheImage = async () => {
  if (props.src === '/img/cover.jpg') return
  
  try {
    // 生成缓存key
    let cacheKey
    if (props.cacheKey){
      cacheKey = props.cacheKey
    } else {
      const urlParts = props.src.split('/cmcc/')
      cacheKey = urlParts[1] // 使用相对路径作为key
    }
    
    if (!cacheKey) return

    // 尝试从缓存获取
    const cachedImage = await imageCache.getImage(`thumb_${cacheKey}`)
    if (cachedImage) {
      imageRef.value.src = cachedImage
    } else {
      // 从网络加载并缓存
      const base64Data = await convertImageToBase64(props.src)
      await imageCache.saveImage(`thumb_${cacheKey}`, base64Data)
      imageRef.value.src = base64Data
    }
  } catch (error) {
    console.error('图片加载失败:', error)
    imageRef.value.src = '/img/cover.jpg'
  }
}

onMounted(() => {
  if (props.loading === 'lazy') {
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting) {
        await loadAndCacheImage()
        observer.disconnect()
      }
    }, {
      rootMargin: '50px 50px',
      threshold: 0.1
    })
    
    observer.observe(imageRef.value)
  } else {
    loadAndCacheImage()
  }
})

const handleError = (event) => {
  event.target.src = '/img/cover.jpg'
  emit('error', event)
}

const handleLoad = (event) => {
  isLoaded.value = true
  emit('load', event)
}

defineExpose({
  imageRef,
  isLoaded
})
</script>

<style scoped>
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