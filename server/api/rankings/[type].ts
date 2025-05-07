import { D1Database } from '@cloudflare/workers-types'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare.env.DB as D1Database
  const type = event.context.params?.type

  if (!type || !['views', 'likes', 'comments'].includes(type)) {
    throw createError({
      statusCode: 400,
      message: '无效的排行榜类型'
    })
  }

  // 获取所有相册的统计数据
  const albums = await db.prepare(`
    SELECT 
      a.album_name,
      COUNT(DISTINCT v.id) as views,
      COUNT(DISTINCT l.id) as likes,
      COUNT(DISTINCT c.id) as comments
    FROM (
      SELECT DISTINCT album_name FROM album_views
      UNION
      SELECT DISTINCT album_name FROM album_likes
      UNION
      SELECT DISTINCT album_name FROM album_comments
    ) a
    LEFT JOIN album_views v ON a.album_name = v.album_name
    LEFT JOIN album_likes l ON a.album_name = l.album_name
    LEFT JOIN album_comments c ON a.album_name = c.album_name
    GROUP BY a.album_name
    ORDER BY ${type} DESC
    LIMIT 50
  `).all()

  return albums
}) 