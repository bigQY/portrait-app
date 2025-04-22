import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const url = query.url as string

    if (!url) {
      throw createError({
        statusCode: 400,
        message: 'URL parameter is required'
      })
    }

    // 验证URL前缀
    if (!url.startsWith('https://cn-beijing-data.aliyundrive.net/imagethumb')) {
      throw createError({
        statusCode: 403,
        message: 'Only aliyundrive image URLs are allowed'
      })
    }

    // 使用fetch获取图片数据
    const response = await fetch(url, {
      headers: {
        'Referer': '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `Failed to fetch image: ${response.statusText}`
      })
    }

    // 设置响应头
    const contentType = response.headers.get('content-type')
    if (contentType) {
      event.node.res.setHeader('Content-Type', contentType)
    }
    event.node.res.setHeader('Cache-Control', 'public, max-age=31536000') // 1年缓存

    // 直接返回图片数据流
    return response.body
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})