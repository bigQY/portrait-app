// NSFW Detection Worker
// 处理图片内容检测，避免阻塞主线程

// 消息处理器
self.addEventListener('message', async (event) => {
  const { id, type, payload } = event.data

  try {
    switch (type) {
      case 'CLASSIFY_IMAGE_DATA':
        const result = await classifyImageData(payload.imageData, payload.cacheKey)
        postMessage({ id, type: 'CLASSIFICATION_RESULT', result, success: true })
        break

      case 'CHECK_CACHE':
        const cachedResult = await getCachedResult(payload.cacheKey)
        postMessage({ 
          id, 
          type: 'CACHE_RESULT', 
          result: cachedResult, 
          success: true 
        })
        break

      case 'SAVE_CACHE':
        await cacheResult(payload.cacheKey, payload.result)
        postMessage({ id, type: 'CACHE_SAVED', success: true })
        break

      case 'CLEANUP_CACHE':
        await cleanupExpiredCache()
        postMessage({ id, type: 'CACHE_CLEANED', success: true })
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    console.error('Worker error:', error)
    postMessage({ 
      id, 
      type: 'ERROR', 
      error: error.message, 
      success: false 
    })
  }
})

// 简化的图片内容分析（基于像素数据的简单启发式算法）
async function classifyImageData(imageData, cacheKey = null) {
  // 检查缓存
  if (cacheKey) {
    const cachedResult = await getCachedResult(cacheKey)
    if (cachedResult !== null) {
      return {
        isNSFW: cachedResult,
        fromCache: true,
        cacheKey,
        method: 'cache'
      }
    }
  }

  try {
    // 将 base64 转换为 ImageData 进行分析
    const analysis = await analyzeImageContent(imageData)
    
    // 缓存结果
    if (cacheKey) {
      await cacheResult(cacheKey, analysis.isNSFW)
    }

    return {
      isNSFW: analysis.isNSFW,
      confidence: analysis.confidence,
      fromCache: false,
      cacheKey,
      method: 'heuristic'
    }
  } catch (error) {
    console.error('[Worker] 图片分析失败:', error)
    return {
      isNSFW: false,
      fromCache: false,
      cacheKey,
      error: error.message,
      method: 'error'
    }
  }
}

// 基于像素数据的简单内容分析 
// 现在直接接收 ImageData 对象，而不是 base64
async function analyzeImageContent(imageData) {
  return new Promise((resolve) => {
    try {
      // 直接处理传入的 ImageData
      const analysis = performHeuristicAnalysis(imageData)
      resolve(analysis)
    } catch (error) {
      console.error('[Worker] 图片分析失败:', error)
      resolve({ isNSFW: false, confidence: 0 })
    }
  })
}

// 简单的启发式分析算法
function performHeuristicAnalysis(imageData) {
  // imageData 现在是从主线程传递的对象，包含 data 数组、width 和 height
  const data = Array.isArray(imageData.data) ? imageData.data : new Uint8ClampedArray(imageData.data)
  const pixels = data.length / 4
  
  let skinPixels = 0
  let totalBrightness = 0
  let colorVariance = 0
  
  // 分析像素
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // 计算亮度
    const brightness = (r + g + b) / 3
    totalBrightness += brightness
    
    // 检测肤色像素 (简单的肤色检测)
    if (isSkinColor(r, g, b)) {
      skinPixels++
    }
    
    // 计算颜色方差
    const avg = brightness
    colorVariance += Math.pow(r - avg, 2) + Math.pow(g - avg, 2) + Math.pow(b - avg, 2)
  }
  
  const avgBrightness = totalBrightness / pixels
  const skinRatio = skinPixels / pixels
  const normalizedVariance = colorVariance / pixels
  
  // 简单的评分系统
  let suspicionScore = 0
  
  // 高肤色比例增加怀疑度
  if (skinRatio > 0.3) suspicionScore += 0.4
  if (skinRatio > 0.5) suspicionScore += 0.3
  
  // 低亮度（可能的私密场景）
  if (avgBrightness < 100) suspicionScore += 0.2
  
  // 低颜色方差（可能的单调背景）
  if (normalizedVariance < 1000) suspicionScore += 0.1
  
  const isNSFW = suspicionScore > 0.6
  
  return {
    isNSFW,
    confidence: suspicionScore,
    skinRatio,
    avgBrightness,
    colorVariance: normalizedVariance
  }
}

// 简单的肤色检测
function isSkinColor(r, g, b) {
  // 基于 RGB 的简单肤色检测
  const isInSkinRange = (
    r > 95 && g > 40 && b > 20 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
    Math.abs(r - g) > 15 &&
    r > g && r > b
  )
  
  return isInSkinRange
}



// 获取缓存结果 (使用 IndexedDB)
async function getCachedResult(cacheKey) {
  return new Promise((resolve) => {
    const request = indexedDB.open('NSFWCache', 1)
    
    request.onerror = () => resolve(null)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('results')) {
        const store = db.createObjectStore('results', { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['results'], 'readonly')
      const store = transaction.objectStore('results')
      const getRequest = store.get(cacheKey)
      
      getRequest.onsuccess = () => {
        const result = getRequest.result
        if (result && result.expires > Date.now()) {
          resolve(result.isNSFW)
        } else {
          resolve(null)
        }
      }
      
      getRequest.onerror = () => resolve(null)
    }
  })
}

// 缓存结果 (使用 IndexedDB)
async function cacheResult(cacheKey, isNSFW) {
  return new Promise((resolve) => {
    const request = indexedDB.open('NSFWCache', 1)
    
    request.onerror = () => resolve(false)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['results'], 'readwrite')
      const store = transaction.objectStore('results')
      
      const data = {
        key: cacheKey,
        isNSFW,
        timestamp: Date.now(),
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天过期
      }
      
      store.put(data)
      
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
    }
  })
}

// 清理过期缓存
async function cleanupExpiredCache() {
  return new Promise((resolve) => {
    const request = indexedDB.open('NSFWCache', 1)
    
    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['results'], 'readwrite')
      const store = transaction.objectStore('results')
      const index = store.index('timestamp')
      const now = Date.now()
      
      index.openCursor().onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          if (cursor.value.expires < now) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
      
      transaction.oncomplete = () => resolve(true)
    }
  })
}

// 定期清理过期缓存
setInterval(cleanupExpiredCache, 60 * 60 * 1000) // 每小时清理一次
