<template>
  <div class="group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
    <!-- 骨架屏 -->
    <div v-show="showSkeleton" class="skeleton z-10" :class="aspectRatioClass"></div>

    <!-- 图片 -->
    <img :src="src" :alt="alt" :class="[
      'w-full h-full object-cover transition-transform duration-300',
      aspectRatioClass,
      { 'group-hover:scale-105': isLoaded && hover && src !== '/img/cover.jpg' },
      { 'blur-xl': isNSFW }
    ]" :loading="loading" @error="handleError" @load="handleLoad" ref="imageRef" />

    <!-- NSFW警告 -->
    <div v-if="isNSFW || isChecking" class="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
      <div class="bg-white dark:bg-gray-800 p-3 rounded-lg text-center shadow-lg">
        <template v-if="isChecking">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ $t('detecting') }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('pleaseWait') }}</p>
        </template>
        <template v-else>
          <UIcon name="i-lucide-shield-alert" class="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ $t('contentProtected') }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('teenModeEnabledMessage') }}</p>
        </template>
      </div>
    </div>

    <!-- 悬浮信息 -->
    <div v-if="showOverlay" :class="[
      'absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300',
      { 'group-hover:opacity-100': isLoaded && hover }
    ]">
      <slot name="overlay">

        <div class="absolute bottom-0 left-0 right-0 p-4">
          <h3 v-if="title" class="text-white text-sm font-medium truncate">{{ title }}</h3>
          <p v-if="subtitle" class="text-gray-200 text-xs mt-1">{{ subtitle }}</p>
        </div>
      </slot>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useImageCache } from '../composables/useImageCache'
import teenMode from '../composables/useTeenMode'
import { useI18n } from 'vue-i18n'

interface Props {
  src: string
  alt?: string
  title?: string
  subtitle?: string
  aspectRatio?: string
  hover?: boolean
  showOverlay?: boolean
  loading?: 'lazy' | 'eager'
  cacheKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  title: '',
  subtitle: '',
  aspectRatio: '3/4',
  hover: true,
  showOverlay: true,
  loading: 'lazy',
  cacheKey: ''
})

const emit = defineEmits<{
  (e: 'load', event: Event): void
  (e: 'error', event: Event | string): void // 修正 error 事件的类型
}>()

const isLoaded = ref(false)
const imageRef = ref<HTMLImageElement | null>(null)
const isNSFW = ref(false)
const isChecking = ref(false)
const { getCache } = useImageCache()
const imageCache = getCache()
const { isTeenModeEnabled, getNSFWModel } = teenMode
const { t } = useI18n()

// 添加状态控制骨架屏显示
const shouldShowSkeleton = ref(false)

// 修改计算属性
const showSkeleton = computed(() => {
  return shouldShowSkeleton.value && (!isLoaded.value || props.src === '/img/cover.jpg')
})

interface NSFWPrediction {
  className: string
  probability: number
}

// 检测图片是否适合
const checkImageContent = async () => {
  // 确保只在客户端执行
  if (!import.meta.client || !isTeenModeEnabled.value || !imageRef.value || !isLoaded.value) return

  try {
    isChecking.value = true

    // 生成图片的唯一标识符（使用URL的哈希值）
    const imageUrl = imageRef.value.src
    const imageHash = await generateImageHash(imageUrl)
    const cacheKey = `nsfw_check_${imageHash}`

    // 检查缓存中是否存在结果
    const cachedResult = localStorage.getItem(cacheKey)
    if (cachedResult) {
      const parsedResult = JSON.parse(cachedResult)
      isNSFW.value = parsedResult.result
      return
    }

    const nsfwModel = await getNSFWModel()
    if (!nsfwModel) return

    // 创建一个新的Image对象用于检测
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(t('imageLoadFailed')))
      img.src = imageUrl
    })

    const predictions = await nsfwModel.classify(img) as NSFWPrediction[]
    console.log('图片内容检测结果:', predictions)

    // 检查是否包含不适合的内容
    const pornPrediction = predictions.find((p: NSFWPrediction) => p.className === 'Porn')
    const sexyPrediction = predictions.find((p: NSFWPrediction) => p.className === 'Sexy')

    const isNSFWResult = Boolean(
      (pornPrediction && pornPrediction.probability > 0.4) ||
      (sexyPrediction && sexyPrediction.probability > 0.8)
    )

    isNSFW.value = isNSFWResult

    // 将结果存入缓存，设置7天过期时间
    const cacheData = {
      result: isNSFWResult,
      timestamp: Date.now(),
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天后过期
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))

  } catch (error) {
    console.error(t('detecting') + 'NSFW检测失败:', error)
    isNSFW.value = false
  } finally {
    isChecking.value = false
  }
}

// 生成图片URL的哈希值
const generateImageHash = async (url: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(url)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 清理过期的缓存
const cleanupExpiredCache = () => {
  const now = Date.now()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('nsfw_check_')) {
      try {
        const cacheData = JSON.parse(localStorage.getItem(key) || '')
        if (cacheData.expires < now) {
          localStorage.removeItem(key)
        }
      } catch (e) {
        // 如果解析失败，删除无效的缓存项
        localStorage.removeItem(key)
      }
    }
  }
}

// 监听青少年模式变化
watch(isTeenModeEnabled, (newValue) => {
  if (newValue && isLoaded.value && import.meta.client) {
    getNSFWModel().then(() => checkImageContent())
  } else {
    isNSFW.value = false
  }
}, { immediate: true })

const aspectRatioClass = computed(() => `aspect-[${props.aspectRatio}]`)

// 将图片转换为base64
const convertImageToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    // 设置加载超时
    const timeout = setTimeout(() => {
      img.src = ''
      reject(new Error(t('imageLoadTimeout')))
    }, 15000)

    img.onload = () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error(t('canvasContextError')))
          return
        }
        ctx.drawImage(img, 0, 0)
        const base64Data = canvas.toDataURL('image/jpeg')
        if (!base64Data || base64Data === 'data:,') {
          reject(new Error(t('imageDataConversionFailed')))
          return
        }
        resolve(base64Data)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = (error: Event) => {
      clearTimeout(timeout)
      reject(new Error(`${t('imageLoadFailed')} ${error instanceof Error ? error.message : t('unknownError')}`))
    }

    img.src = url
  })
}

// 加载并缓存图片
const loadAndCacheImage = async (retryCount = 0) => {
  if (props.src === '/img/cover.jpg' || !imageRef.value) return

  // 生成缓存key
  let cacheKey = props.cacheKey
  if (!cacheKey) {
    // 使用完整的URL作为key，但移除查询参数和哈希
    const url = new URL(props.src, window.location.origin)
    cacheKey = url.pathname
  }

  if (!cacheKey) {
    console.error(t('cacheKeyGenerationFailed'), props.src)
    return
  }

  try {
    // 尝试从缓存获取
    const cachedImage = await imageCache.getImage(`thumb_${cacheKey}`)
    if (cachedImage && imageRef.value) {
      console.log(t('loadImageFromCache'), cacheKey)
      imageRef.value.src = cachedImage
    } else if (imageRef.value) {
      // 从网络加载并缓存
      console.log(t('loadImageFromNetwork'), cacheKey)
      const base64Data = await convertImageToBase64(props.src)
      await imageCache.saveImage(`thumb_${cacheKey}`, base64Data)
      imageRef.value.src = base64Data
    }
  } catch (error) {
    console.error(t('imageLoadFailed'), error)
  }
}

onMounted(() => {
  // 在客户端首次挂载时启用骨架屏
  let isSSR = ref(false)
  if (import.meta.server) {
    shouldShowSkeleton.value = false
    isSSR.value = true
  }

  if (isSSR.value && import.meta.client) {
    shouldShowSkeleton.value = true
  }

  if (props.loading === 'lazy' && imageRef.value) {
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

  cleanupExpiredCache()
})

const handleError = (event: Event) => {
  if (event.target instanceof HTMLImageElement) {
    event.target.src = '/img/cover.jpg'
  }
  emit('error', event)
}

const handleLoad = async (event: Event) => {
  isLoaded.value = true
  shouldShowSkeleton.value = false // 图片加载成功，隐藏骨架屏
  emit('load', event)

  // 如果青少年模式开启，检测图片内容
  if (isTeenModeEnabled.value && import.meta.client) {
    await getNSFWModel()
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