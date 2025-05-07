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

  // 获取点赞数
  if (event.method === 'GET') {
    const likes = await db.prepare(
      'SELECT COUNT(*) as count FROM album_likes WHERE album_name = ?'
    ).bind(albumName).first()
    return likes
  }

  // 添加/取消点赞
  if (event.method === 'POST') {
    const { fingerprint, action } = await readBody(event)

    if (!fingerprint) {
      throw createError({
        statusCode: 400,
        message: '指纹不能为空'
      })
    }

    if (action === 'like') {
      try {
        await db.prepare(
          'INSERT INTO album_likes (album_name, fingerprint) VALUES (?, ?)'
        ).bind(albumName, fingerprint).run()
      } catch (error) {
        // 如果已经点赞，忽略错误
      }
    } else if (action === 'unlike') {
      await db.prepare(
        'DELETE FROM album_likes WHERE album_name = ? AND fingerprint = ?'
      ).bind(albumName, fingerprint).run()
    }

    // 返回最新的点赞数
    const likes = await db.prepare(
      'SELECT COUNT(*) as count FROM album_likes WHERE album_name = ?'
    ).bind(albumName).first()
    return likes
  }
}) 