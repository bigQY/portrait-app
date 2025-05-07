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
    // 如果已有token且有效，则直接返回
    if (await this.checkToken()) {
      return
    }

    if (this.loginAttempts >= this.maxLoginAttempts) {
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
      // 登录成功，重置计数器
      this.loginAttempts = 0
      this.token = response.data.token
    } catch (error) {
      this.loginAttempts++
      throw error
    }
  }

  public async getFiles(path: string): Promise<any[]> {
    const cacheKey = `files_${path}`
    
    // 尝试从缓存获取数据
    const cachedData = cache.get<any[]>(cacheKey)
    if (cachedData) {
      return cachedData
    }


    
    try {
      const response = await $fetch<AlistResponse<any[]>>('/api/fs/list', {
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
        // 401 表示未登录，尝试登录
        if (response.code === 401) {
          try {
            await this.login()
            // 重新发起请求
            return this.getFiles(path)
          } catch (error) {
            throw new Error(`获取文件列表失败：${error.message}`)
          }
        }
        throw new Error(response.message)
      }

      // 将数据存入缓存，设置30分钟过期
      cache.set(cacheKey, response.data, 30 * 60 * 1000)
      return response.data
    } catch (error) {
      console.error('Error fetching files:', error)
      return []
    }
  }

  public async getFile(path: string): Promise<any> {
    const response = await $fetch<AlistResponse<any>>('/api/fs/get', {
      method: 'GET',
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      params: {
        path
      }
    })
    if (response.code !== 200) {
      throw new Error(response.message)
    }
    return response.data
  }

  public async uploadFile(path: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await $fetch<AlistResponse<void>>('/api/fs/upload', {
      method: 'POST',
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      body: formData,
      params: {
        path
      }
    })
    if (response.code !== 200) {
      throw new Error(response.message)
    }
  }

  public async deleteFile(path: string): Promise<void> {
    const response = await $fetch<AlistResponse<void>>('/api/fs/delete', {
      method: 'DELETE',
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      params: {
        path
      }
    })
    if (response.code !== 200) {
      throw new Error(response.message)
    }
  }
}

// 导出单例实例
export const alistClient = AlistClient.getInstance()