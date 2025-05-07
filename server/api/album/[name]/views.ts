import { D1Database } from '@cloudflare/workers-types'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.DB as D1Database
  const albumName = event.context.params?.name

  if (!albumName) {
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
    let ip = getRequestIP(event)
    if (!ip) {
      ip = '127.0.0.1'
    }

    try {
      await db.prepare(
        'INSERT INTO album_views (album_name, ip_address) VALUES (?, ?)'
      ).bind(albumName, ip).run()
    } catch (error) {
      // 如果已经记录过该IP的访问，忽略错误
    }

    // 返回最新的浏览量
    const views = await db.prepare(
      'SELECT COUNT(*) as count FROM album_views WHERE album_name = ?'
    ).bind(albumName).first()
    return views
  }
}) 