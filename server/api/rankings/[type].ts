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

  let orderByClause = ''
  if (type === 'views') {
    orderByClause = 'vc.count DESC'
  } else if (type === 'likes') {
    orderByClause = 'likes_count DESC'
  } else if (type === 'comments') {
    orderByClause = 'comments_count DESC'
  }

  // 获取所有相册的统计数据
  const albums = await db.prepare(`
    SELECT 
      a.album_name,
      IFNULL(vc.count, 0) as views,
      IFNULL(l.likes_count, 0) as likes,
      IFNULL(c.comments_count, 0) as comments
    FROM (
      SELECT DISTINCT album_name FROM album_view_counts
      UNION
      SELECT DISTINCT album_name FROM album_likes
      UNION
      SELECT DISTINCT album_name FROM album_comments
    ) a
    LEFT JOIN album_view_counts vc ON a.album_name = vc.album_name
    LEFT JOIN (
      SELECT album_name, COUNT(id) as likes_count 
      FROM album_likes 
      GROUP BY album_name
    ) l ON a.album_name = l.album_name
    LEFT JOIN (
      SELECT album_name, COUNT(id) as comments_count 
      FROM album_comments 
      GROUP BY album_name
    ) c ON a.album_name = c.album_name
    ORDER BY ${orderByClause}
    LIMIT 50
  `).all()

  return albums
})