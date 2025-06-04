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
      'SELECT COUNT(DISTINCT fingerprint) as count FROM album_views WHERE album_name = ? AND created_at > datetime("now", "-10 minutes")'
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

    // 检查10分钟内是否有相同指纹的访问记录
    const existingView = await db.prepare(
      'SELECT 1 FROM album_views WHERE album_name = ? AND fingerprint = ? AND created_at > datetime("now", "-10 minutes")'
    ).bind(albumName, fingerprint).first()

    if (!existingView) {
      try {
        // 插入新的浏览记录
        await db.prepare(
          'INSERT INTO album_views (album_name, fingerprint) VALUES (?, ?)'
        ).bind(albumName, fingerprint).run()
        
        // 更新总浏览量统计表
        await db.prepare(
          'INSERT INTO album_view_counts (album_name, count) VALUES (?, 1) ' +
          'ON CONFLICT(album_name) DO UPDATE SET count = count + 1'
        ).bind(albumName).run()

      } catch (error) {
        // 如果发生其他错误，忽略
      }
    }

    // 返回操作成功状态
    return { success: true }
  }
})