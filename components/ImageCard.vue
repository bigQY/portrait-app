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
        {'group-hover:scale-105': isLoaded && hover && src !== '/img/cover.jpg'},
        {'blur-xl': isNSFW}
      ]"
      :loading="loading"
      @error="handleError"
      @load="handleLoad"
      ref="imageRef"
    />
    
    <!-- NSFW警告 -->
    <div v-if="isNSFW || isChecking" class="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
      <div class="bg-white dark:bg-gray-800 p-3 rounded-lg text-center shadow-lg">
        <template v-if="isChecking">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
          <p class="text-sm font-medium text-gray-900 dark:text-white">正在检测</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">请稍候...</p>
        </template>
        <template v-else>
          <UIcon name="i-lucide-shield-alert" class="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p class="text-sm font-medium text-gray-900 dark:text-white">内容已保护</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">青少年模式已开启</p>
        </template>
      </div>
    </div>
    
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
import { ref, computed, onMounted, watch } from 'vue'
import { useImageCache } from '../composables/useImageCache'
import teenMode from '../composables/useTeenMode'


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
const isNSFW = ref(false)
const isChecking = ref(false)
const { getCache } = useImageCache()
const imageCache = getCache()
const { isTeenModeEnabled } = teenMode

// 检测图片是否适合
const checkImageContent = async () => {
  if (!import.meta.client || !isTeenModeEnabled.value || !imageRef.value || !isLoaded.value) return
  
  try {
    isChecking.value = true
    const nsfwModel = await teenMode.getNSFWModel()
    if (!nsfwModel) return
    
    // 创建一个新的Image对象用于检测
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageRef.value.src
    })
    
    const predictions = await nsfwModel.classify(img)
    console.log('图片内容检测结果:', predictions)
    
    // 检查是否包含不适合的内容
    // 根据NSFW.js的分类，检查Porn和Sexy类别的概率
    const pornPrediction = predictions.find(p => p.className === 'Porn')
    const sexyPrediction = predictions.find(p => p.className === 'Sexy')
    
    if (
      (pornPrediction && pornPrediction.probability > 0.4) || 
      (sexyPrediction && sexyPrediction.probability > 0.8)
    ) {
      isNSFW.value = true
    } else {
      isNSFW.value = false
    }
  } catch (error) {
    console.error('NSFW检测失败:', error)
    isNSFW.value = false
  } finally {
    isChecking.value = false
  }
}

// 监听青少年模式变化
watch(isTeenModeEnabled, (newValue) => {
  if (newValue && isLoaded.value) {
    loadNSFWModel().then(() => checkImageContent())
  } else {
    isNSFW.value = false
  }
}, { immediate: true })

const aspectRatioClass = computed(() => `aspect-[${props.aspectRatio}]`)

// 将图片转换为base64
const convertImageToBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    // 设置加载超时
    const timeout = setTimeout(() => {
      img.src = ''
      reject(new Error('图片加载超时'))
    }, 15000)
    
    img.onload = () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const base64Data = canvas.toDataURL('image/jpeg')
        if (!base64Data || base64Data === 'data:,') {
          reject(new Error('图片数据转换失败'))
          return
        }
        resolve(base64Data)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = (error) => {
      clearTimeout(timeout)
      reject(new Error(`图片加载失败: ${error.message || '未知错误'}`))
    }
    
    img.src = url
  })
}

// 加载并缓存图片
const loadAndCacheImage = async (retryCount = 0) => {
  if (props.src === '/img/cover.jpg') return
  // 生成缓存key
  let cacheKey
  if (props.cacheKey){
    cacheKey = props.cacheKey
  } else {
    const urlParts = props.src.split('/cmcc/')
    cacheKey = urlParts[1] // 使用相对路径作为key
  }
  
  if (!cacheKey) return

  try {
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
    // console.error('图片加载失败:', error)
    // 最多重试3次
    if (retryCount < 3) {
      // console.log(`重试加载图片 (${retryCount + 1}/3)...`)
      // await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      // return loadAndCacheImage(retryCount + 1)
    } else {
      // 重试失败后使用默认封面图
      // imageRef.value.src = '/img/cover.jpg'
    }
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

const handleLoad = async (event) => {
  isLoaded.value = true
  emit('load', event)
  
  // 如果青少年模式开启，检测图片内容
  if (isTeenModeEnabled.value && import.meta.client) {
    await teenMode.getNSFWModel()
    checkImageContent()
  }
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