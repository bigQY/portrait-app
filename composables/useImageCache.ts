import { ref } from 'vue'

// 缓存策略类型
export type CacheStrategy = 'indexeddb' | 'serviceworker'

// 创建全局状态
const cacheStrategy = ref<CacheStrategy>('indexeddb')

// 缓存接口
export interface ImageCache {
  getImage: (key: string) => Promise<string | null>
  saveImage: (key: string, data: string) => Promise<void>
}

// IndexedDB 缓存实现
class IndexedDBCache implements ImageCache {
  private dbName = 'imageCache'
  private version = 1
  private storeName = 'images'
  private db: IDBDatabase | null = null

  private async initDB() {
    if (this.db) return this.db

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => {
        console.error('IndexedDB打开失败:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
    })
  }

  async getImage(key: string): Promise<string | null> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(key)
        
        request.onerror = () => {
          console.error('获取缓存图片失败:', request.error)
          reject(request.error)
        }
        
        request.onsuccess = () => {
          resolve(request.result)
        }
      })
    } catch (error) {
      console.error('IndexedDB操作失败:', error)
      return null
    }
  }

  async saveImage(key: string, data: string): Promise<void> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.put(data, key)
        
        request.onerror = () => {
          console.error('保存缓存图片失败:', request.error)
          reject(request.error)
        }
        
        request.onsuccess = () => resolve()
      })
    } catch (error) {
      console.error('IndexedDB操作失败:', error)
      throw error
    }
  }
}

// Service Worker 缓存实现
class ServiceWorkerCache implements ImageCache {
  private cacheName = 'image-cache'

  async getImage(key: string): Promise<string | null> {
    try {
      const cache = await caches.open(this.cacheName)
      const response = await cache.match(key)
      if (response) {
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }
      return null
    } catch (error) {
      console.error('Service Worker cache error:', error)
      return null
    }
  }

  async saveImage(key: string, data: string): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName)
      const response = await fetch(data)
      await cache.put(key, response)
    } catch (error) {
      console.error('Service Worker cache error:', error)
    }
  }
}

// 导出组合式函数
export function useImageCache() {
  const getCache = (): ImageCache => {
    return cacheStrategy.value === 'indexeddb' 
      ? new IndexedDBCache() 
      : new ServiceWorkerCache()
  }

  return {
    cacheStrategy,
    getCache,
  }
}