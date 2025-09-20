import { ref } from 'vue'

// 创建全局响应式状态（单例）
const isTeenModeEnabled = ref(false)

// Worker 实例和状态管理
let workerInstance: Worker | null = null
let isWorkerReady = false
let workerLoadingPromise: Promise<boolean> | null = null
let messageId = 0

// 待处理的消息队列
const pendingMessages = new Map<number, {
  resolve: (value: any) => void
  reject: (reason: any) => void
}>()

// 初始化 Worker
const initWorker = async (): Promise<boolean> => {
  // 确保只在客户端执行
  if (!import.meta.client) return false

  // 如果 Worker 已就绪，直接返回
  if (isWorkerReady && workerInstance) {
    return true
  }

  // 如果正在加载中，返回当前的加载Promise
  if (workerLoadingPromise) {
    return workerLoadingPromise
  }

  // 创建新的加载Promise
  workerLoadingPromise = new Promise<boolean>((resolve, reject) => {
    try {
      // 创建 Worker 实例
      workerInstance = new Worker('/workers/nsfw-worker.js')
      
      // 设置消息处理器
      workerInstance.onmessage = (event) => {
        const { id, type, success, ...payload } = event.data
        
        // 处理消息
        const pendingMessage = pendingMessages.get(id)
        if (pendingMessage) {
          pendingMessages.delete(id)
          if (success) {
            pendingMessage.resolve(payload)
          } else {
            pendingMessage.reject(new Error(payload.error || 'Worker error'))
          }
        }
      }

      // 设置错误处理器
      workerInstance.onerror = (error) => {
        console.error('NSFW Worker 错误:', error)
        isWorkerReady = false
        reject(error)
      }

      // Worker 创建成功，直接标记为就绪
      isWorkerReady = true
      console.log('NSFW Worker 已准备就绪')
      resolve(true)

    } catch (error) {
      console.error('创建 NSFW Worker 失败:', error)
      reject(error)
    }
  })

  workerLoadingPromise.finally(() => {
    workerLoadingPromise = null
  })

  return workerLoadingPromise
}

// 发送消息到 Worker
const sendMessageToWorker = <T = any>(type: string, payload?: any): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!workerInstance || !isWorkerReady) {
      reject(new Error('Worker not ready'))
      return
    }

    const id = ++messageId
    pendingMessages.set(id, { resolve, reject })

    // 设置消息超时
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id)
        reject(new Error('Message timeout'))
      }
    }, 10000) // 10秒超时

    workerInstance.postMessage({
      id,
      type,
      payload
    })
  })
}

// 同步本地存储的青少年模式状态
const syncTeenModeState = () => {
  if (import.meta.client) {
    const savedState = localStorage.getItem('teenMode')
    if (savedState !== null) {
      isTeenModeEnabled.value = savedState === 'true'
      // 如果开启青少年模式，预初始化 Worker
      if (isTeenModeEnabled.value) {
        initWorker().then((success) => {
          if (success) {
            console.log('NSFW Worker 已预初始化')
          } else {
            console.error('NSFW Worker 预初始化失败')
          }
        }).catch((error) => {
          console.error('NSFW Worker 初始化失败:', error)
        })
      }
    }
  }
}

// 在客户端初始化时同步状态
if (import.meta.client) {
  syncTeenModeState()
}

// 创建一个全局状态来管理青少年模式
export const useTeenMode = () => {
  return {
    isTeenModeEnabled,
    syncTeenModeState
  }
}

// 切换青少年模式
const toggleTeenMode = () => {
  isTeenModeEnabled.value = !isTeenModeEnabled.value
  
  // 保存到localStorage
  if (import.meta.client) {
    localStorage.setItem('teenMode', isTeenModeEnabled.value.toString())
    // 如果开启青少年模式，预初始化 Worker
    if (isTeenModeEnabled.value) {
      initWorker().then((success) => {
        if (success) {
          console.log('NSFW Worker 已预初始化')
        } else {
          console.error('NSFW Worker 预初始化失败')
        }
      }).catch((error) => {
        console.error('NSFW Worker 初始化失败:', error)
      })
    }
  }
}

// 检测图片内容（使用 Worker）
const classifyImage = async (imageUrl: string, cacheKey?: string) => {
  if (!isTeenModeEnabled.value || !import.meta.client) {
    return { isNSFW: false, fromCache: false }
  }

  try {
    // 确保 Worker 已初始化
    const workerReady = await initWorker()
    if (!workerReady) {
      throw new Error('Worker 初始化失败')
    }

    // 先检查缓存
    if (cacheKey) {
      try {
        const cacheResult = await sendMessageToWorker('CHECK_CACHE', { cacheKey })
        if (cacheResult.result !== null) {
          return {
            isNSFW: cacheResult.result,
            fromCache: true,
            cacheKey
          }
        }
      } catch (error) {
        console.warn('缓存检查失败:', error)
      }
    }

    // 在主线程将图片转换为 ImageData
    const imageData = await convertImageToImageData(imageUrl)
    if (!imageData) {
      throw new Error('图片转换失败')
    }
    
    // 发送 ImageData 到 Worker 进行分析
    const result = await sendMessageToWorker('CLASSIFY_IMAGE_DATA', {
      imageData: {
        data: Array.from(imageData.data), // 转换为普通数组以便传输
        width: imageData.width,
        height: imageData.height
      },
      cacheKey
    })

    return result.result
  } catch (error) {
    console.error('图片内容检测失败:', error)
    return { 
      isNSFW: false, 
      fromCache: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

// 在主线程将图片转换为 ImageData
const convertImageToImageData = (url: string): Promise<ImageData | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    // 设置加载超时
    const timeout = setTimeout(() => {
      img.src = ''
      resolve(null)
    }, 10000) // 10秒超时

    img.onload = () => {
      clearTimeout(timeout)
      try {
        // 创建一个较小的画布以提高性能
        const canvas = document.createElement('canvas')
        const targetSize = 224 // 减小尺寸以提高性能和传输效率
        canvas.width = targetSize
        canvas.height = targetSize
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        
        // 绘制并调整尺寸
        ctx.drawImage(img, 0, 0, targetSize, targetSize)
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize)
        resolve(imageData)
      } catch (error) {
        console.error('图片处理失败:', error)
        resolve(null)
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      console.error('图片加载失败:', url)
      resolve(null)
    }

    img.src = url
  })
}

// 清理过期缓存
const cleanupCache = async () => {
  if (!import.meta.client || !workerInstance || !isWorkerReady) {
    return false
  }

  try {
    await sendMessageToWorker('CLEANUP_CACHE')
    return true
  } catch (error) {
    console.error('缓存清理失败:', error)
    return false
  }
}

// 清理 Worker 资源
const cleanupWorker = () => {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
    isWorkerReady = false
    pendingMessages.clear()
  }
}

// 导出全局实例和相关方法
export default {
  isTeenModeEnabled,
  syncTeenModeState,
  toggleTeenMode,
  classifyImage,
  cleanupCache,
  cleanupWorker
}