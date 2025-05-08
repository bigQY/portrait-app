import { alistClient } from '~/server/utils/alistClient'

export default defineEventHandler(async (event) => {
  try {
    // 确保已登录
    await alistClient.login()
    
    // 获取写真图床目录下的所有相册目录
    const basePath = '/cmcc/图床相册'
    const dirsResponse = await alistClient.getFiles(basePath)
    const allDirs = dirsResponse.content.filter(dir => dir.is_dir)
    
    // 只返回必要的相册信息
    const albums = allDirs.map(dir => ({
      id: dir.name,
      updated_at: dir.modified || new Date().toISOString()
    }))

    return {
      code: 200,
      message: 'success',
      data: {
        items: albums,
        pagination: {
          total: albums.length,
          per_page: albums.length
        }
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : '获取相册列表失败'
    })
  }
}) 