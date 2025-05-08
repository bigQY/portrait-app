import { ref, onMounted } from 'vue'

// 创建一个全局状态来管理青少年模式
export const useTeenMode = () => {
  // 使用ref创建响应式状态，默认关闭青少年模式
  const isTeenModeEnabled = ref(false)

  // 同步本地存储的青少年模式状态
  const syncTeenModeState = () => {
    if (import.meta.client) {
      const savedState = localStorage.getItem('teenMode')
      if (savedState !== null) {
        isTeenModeEnabled.value = savedState === 'true'
        // 如果开启青少年模式，预加载模型
        if (isTeenModeEnabled.value) {
          loadNSFWModel().then((model) => {
            if (model) {
              console.log('NSFW模型已预加载')
            } else {
              console.error('NSFW模型预加载失败')
            }
          })
        }
      }
    }
  }

  // 在客户端挂载后同步状态
  if (import.meta.client) {
    onMounted(() => {
      syncTeenModeState()
    })
  }

  return {
    isTeenModeEnabled,
    syncTeenModeState
  }
}

// 全局NSFW模型实例
let nsfwModelInstance: any = null
// 模型加载状态标记
let isLoading = false
// 用于存储当前加载过程的Promise
let loadingPromise: Promise<any> | null = null

// 动态导入NSFW模型
const loadNSFWModel = async () => {
  // 确保只在客户端执行
  if (!import.meta.client) return null

  // 如果已经有实例，直接返回
  if (nsfwModelInstance) {
    return nsfwModelInstance
  }

  // 如果正在加载中，返回当前的加载Promise
  if (loadingPromise) {
    return loadingPromise
  }

  // 创建新的加载Promise
  loadingPromise = (async () => {
    isLoading = true
    try {
      // 动态导入所需的模块
      const [nsfwjs, tf] = await Promise.all([
        import('nsfwjs'),
        import('@tensorflow/tfjs')
      ])

      // 启用TensorFlow.js生产模式
      tf.enableProdMode()

      // 尝试从IndexedDB加载缓存的模型
      try {
        nsfwModelInstance = await nsfwjs.load('indexeddb://nsfwModel')
        console.log('从缓存加载NSFW模型成功')
      } catch {
        // 如果缓存不存在，从网络加载并保存到IndexedDB
        nsfwModelInstance = await nsfwjs.load()
        await nsfwModelInstance.model.save('indexeddb://nsfwModel')
        console.log('NSFW模型加载并缓存成功')
      }
      return nsfwModelInstance
    } catch (error) {
      console.error('NSFW模型加载失败:', error)
      return null
    } finally {
      isLoading = false
      loadingPromise = null
    }
  })()

  return loadingPromise
}

// 切换青少年模式
const toggleTeenMode = () => {
  const { isTeenModeEnabled } = _teenMode
  isTeenModeEnabled.value = !isTeenModeEnabled.value
  
  // 保存到localStorage
  if (import.meta.client) {
    localStorage.setItem('teenMode', isTeenModeEnabled.value.toString())
    // 如果开启青少年模式，预加载模型
    if (isTeenModeEnabled.value) {
      loadNSFWModel().then((model) => {
        if (model) {
          console.log('NSFW模型已预加载')
        } else {
          console.error('NSFW模型预加载失败')
        }
      })
    }
  }
}

// 获取NSFW模型实例
const getNSFWModel = async () => {
  const { isTeenModeEnabled } = _teenMode
  if (!isTeenModeEnabled.value || !import.meta.client) return null
  return await loadNSFWModel()
}

// 创建一个全局单例实例
const _teenMode = useTeenMode()

// 导出全局实例和相关方法
export default {
  ..._teenMode,
  toggleTeenMode,
  getNSFWModel
}