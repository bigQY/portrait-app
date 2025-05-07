import { D1Database } from '@cloudflare/workers-types'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.DB as D1Database
  const albumName = event.context.params?.name

  if (!albumName || albumName === '' || albumName === 'undefined') {
    throw createError({
      statusCode: 400,
      message: '相册名称不能为空'
    })
  }

  // 获取浏览量
  if (event.method === 'GET') {
    const views = await db.prepare(
      'SELECT COUNT(*) as count FROM album_views WHERE album_name = ?'
    ).bind(albumName).first()
    return views
  }

  // 增加浏览量
  if (event.method === 'POST') {
    const { fingerprint } = await readBody(event)
    
    if (!fingerprint) {
      throw createError({
        statusCode: 400,
        message: '浏览器指纹不能为空'
      })
    }

    try {
      await db.prepare(
        'INSERT INTO album_views (album_name, fingerprint) VALUES (?, ?)'
      ).bind(albumName, fingerprint).run()
    } catch (error) {
      // 如果已经记录过该指纹的访问，忽略错误
    }

    // 返回最新的浏览量
    const views = await db.prepare(
      'SELECT COUNT(*) as count FROM album_views WHERE album_name = ?'
    ).bind(albumName).first()
    return views
  }
}) 