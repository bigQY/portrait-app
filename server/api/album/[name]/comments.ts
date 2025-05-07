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

  // 获取评论列表
  if (event.method === 'GET') {
    const comments = await db.prepare(
      'SELECT * FROM album_comments WHERE album_name = ? ORDER BY created_at DESC'
    ).bind(albumName).all()
    return comments
  }

  // 添加新评论
  if (event.method === 'POST') {
    const body = await readBody(event)
    const { content, userName, fingerprint } = body

    if (!content || !fingerprint) {
      throw createError({
        statusCode: 400,
        message: '评论内容和指纹不能为空'
      })
    }

    const result = await db.prepare(
      'INSERT INTO album_comments (album_name, content, user_name, fingerprint) VALUES (?, ?, ?, ?)'
    ).bind(albumName, content, userName || '游客', fingerprint).run()

    return result
  }

  // 删除评论
  if (event.method === 'DELETE') {
    const { id, fingerprint } = await readBody(event)
    if (!id || !fingerprint) {
      throw createError({
        statusCode: 400,
        message: '评论ID和指纹不能为空'
      })
    }

    try {
      // 先检查评论是否存在且属于该用户
      const comment = await db.prepare(
        'SELECT * FROM album_comments WHERE id = ? AND album_name = ? AND fingerprint = ?'
      ).bind(id, albumName, fingerprint).first()

      if (!comment) {
        throw createError({
          statusCode: 404,
          message: '评论不存在或无权删除'
        })
      }

      // 执行删除操作
      const result = await db.prepare(
        'DELETE FROM album_comments WHERE id = ? AND album_name = ? AND fingerprint = ?'
      ).bind(id, albumName, fingerprint).run()

      return { success: true, message: '评论删除成功' }
    } catch (error) {
      console.error('删除评论失败：', error)
      throw createError({
        statusCode: 500,
        message: '删除评论失败，请稍后重试'
      })
    }
  }
}) 