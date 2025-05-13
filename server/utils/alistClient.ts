import { $fetch } from 'ofetch'
import { cache } from './cache'

export interface AlistResponse<T = any> {
  code: number
  message: string
  data: T
}

export class AlistClient {
  private static instance: AlistClient | null = null
  private baseURL: string
  private token: string | null = null
  private username: string
  private password: string
  private loginAttempts: number = 0
  private readonly maxLoginAttempts: number = 3
  private ongoingRequests: Map<string, Promise<any[]>> = new Map() // For request coalescing
  private constructor(baseURL: string = 'https://alist.zzdx.eu.org', username = 'guest', password = 'guest') {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.username = username
    this.password = password
  }

  public static getInstance(baseURL?: string, username = 'guest', password = 'guest'): AlistClient {
    if (!AlistClient.instance) {
      AlistClient.instance = new AlistClient(baseURL, username, password)
    }
    return AlistClient.instance
  }

  private async checkToken(): Promise<boolean> {
    if (!this.token) return false
    try {
      await $fetch<AlistResponse>('/api/me', {
        method: 'GET',
        baseURL: this.baseURL,
        headers: {
          Authorization: `${this.token}`
        }
      })
      return true
    } catch {
      return false
    }
  }

  public async login(): Promise<void> {
    if (await this.checkToken()) {
      return
    }
    if (this.loginAttempts >= this.maxLoginAttempts) {
      this.loginAttempts = 0 // Reset after too many attempts to allow future manual retries if cause is fixed
      throw new Error('登录失败次数过多，请检查用户名和密码是否正确')
    }
    try {
      const response = await $fetch<AlistResponse<{ token: string }>>('/api/auth/login', {
        method: 'POST',
        baseURL: this.baseURL,
        body: {
          username: this.username,
          password: this.password
        }
      })
      if (response.code !== 200) {
        this.loginAttempts++
        throw new Error(`登录失败：${response.message}`)
      }
      this.loginAttempts = 0
      this.token = response.data.token
    } catch (error) {
      this.loginAttempts++
      throw error
    }
  }

  public async getFiles(path: string): Promise<any[]> {
    const cacheKey = `files${path}`
    const cachedData = await cache.get<any[]>(cacheKey)
    if (cachedData) {
      return cachedData
    }

    if (this.ongoingRequests.has(cacheKey)) {
      return this.ongoingRequests.get(cacheKey)!
    }

    const fetchAndCache = async (): Promise<any[]> => {
      try {
        if (!this.token) { // Ensure token exists before first API call that needs it
            await this.login()
        }

        let response = await $fetch<AlistResponse<any[]>>('/api/fs/list', {
          method: 'GET',
          baseURL: this.baseURL,
          headers: {
            Authorization: `${this.token}`
          },
          params: {
            path
          }
        })

        if (response.code === 401) {
          await this.login() // Token might have expired or was invalid, try logging in again
          response = await $fetch<AlistResponse<any[]>>('/api/fs/list', {
            method: 'GET',
            baseURL: this.baseURL,
            headers: {
              Authorization: `${this.token}`,
            },
            params: {
              path,
            },
          })
        }
        
        if (response.code !== 200) {
          throw new Error(`Alist API error after potential retry: ${response.message} (code: ${response.code})`)
        }

        // Store in cache using default TTL (12 hours) from cache.ts
        // The cache.set method in cache.ts already handles its own error logging for KV.
        await cache.set(cacheKey, response.data)
        console.log(`Cache set for key "${cacheKey}"`)
        return response.data
      } catch (error: any) {
        console.error(`Error in getFiles for path "${path}": ${error.message}`)
        throw error // Re-throw to reject the promise in ongoingRequests
      } finally {
        this.ongoingRequests.delete(cacheKey)
      }
    }

    const requestPromise = fetchAndCache()
    this.ongoingRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  public async getFile(path: string): Promise<any> {
    if (!this.token) await this.login()
    const response = await $fetch<AlistResponse<any>>('/api/fs/get', {
      method: 'GET',
      baseURL: this.baseURL,
      headers: {
        Authorization: `${this.token}`
      },
      params: {
        path
      }
    })
    if (response.code !== 200) {
      if (response.code === 401) {
        await this.login()
        return this.getFile(path) // Retry after login
      }
      throw new Error(response.message)
    }
    return response.data
  }

  public async uploadFile(path: string, file: File): Promise<void> {
    if (!this.token) await this.login()
    const formData = new FormData()
    formData.append('file', file)
    const response = await $fetch<AlistResponse<void>>('/api/fs/upload', {
      method: 'POST',
      baseURL: this.baseURL,
      headers: {
        Authorization: `${this.token}`
      },
      body: formData,
      params: {
        path
      }
    })
    if (response.code !== 200) {
      if (response.code === 401) {
        await this.login()
        return this.uploadFile(path, file) // Retry after login
      }
      throw new Error(response.message)
    }
  }

  public async deleteFile(path: string): Promise<void> {
    if (!this.token) await this.login()
    const response = await $fetch<AlistResponse<void>>('/api/fs/delete', {
      method: 'DELETE',
      baseURL: this.baseURL,
      headers: {
        Authorization: `${this.token}`
      },
      params: {
        path
      }
    })
    if (response.code !== 200) {
      if (response.code === 401) {
        await this.login()
        return this.deleteFile(path) // Retry after login
      }
      throw new Error(response.message)
    }
  }
}

export const alistClient = AlistClient.getInstance()