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

  // 只处理GET请求，返回所有统计数据
  if (event.method === 'GET') {
    const [views, likes, comments] = await Promise.all([
      db.prepare(
        'SELECT COUNT(*) as count FROM album_views WHERE album_name = ?'
      ).bind(albumName).first(),
      db.prepare(
        'SELECT COUNT(*) as count FROM album_likes WHERE album_name = ?'
      ).bind(albumName).first(),
      db.prepare(
        'SELECT * FROM album_comments WHERE album_name = ? ORDER BY created_at DESC'
      ).bind(albumName).all()
    ])

    return {
      views: views?.count || 0,
      likes: likes?.count || 0,
      comments: comments.results || []
    }
  }

  // 其他HTTP方法返回405错误
  throw createError({
    statusCode: 405,
    message: '方法不允许'
  })
}) 