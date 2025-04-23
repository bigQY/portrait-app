import { alistClient } from '~/server/utils/alistClient'
import { cache } from '~/server/utils/cache'

const DEFAULT_PAGE_SIZE = 10
const CACHE_KEY_PREFIX = 'albums_list'
const CACHE_TTL = 1 * 60 * 1000 // 10分钟缓存

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = parseInt(query.page) || 1
    const pageSize = parseInt(query.pageSize) || DEFAULT_PAGE_SIZE

    // 确保已登录
    await alistClient.login()
    
    // 获取写真图床目录下的所有相册目录
    const basePath = '/cmcc/图床相册'
    const dirsResponse = await alistClient.getFiles(basePath)
    const allDirs = dirsResponse.content.filter(dir => dir.is_dir)
    
    // 计算总数和分页信息
    const total = allDirs.length
    const totalPages = Math.ceil(total / pageSize)
    
    // 计算当前页的目录范围
    const startIndex = (page - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, total)
    const currentPageDirs = allDirs.slice(startIndex, endIndex)

    // 只处理当前页的相册信息
    const cacheKey = `${CACHE_KEY_PREFIX}_page_${page}_${pageSize}`
    let pageAlbums = cache.get(cacheKey)

    if (!pageAlbums) {
      const albumPromises = currentPageDirs.map(async dir => {
        const id = dir.name
        try {
          const urlDirName = `/cmcc/${encodeURIComponent('图床相册')}/${encodeURIComponent(dir.name)}`
          const subDirFiles = (await alistClient.getFiles(`/cmcc/图床相册/${dir.name}`)).content
          const photos = subDirFiles.filter(file => !file.is_dir && file.type ===5)
          // 如果相册为空，使用默认封面
          const cover = photos.length > 0
            ? (subDirFiles.find(file => !file.is_dir && file.thumb)?.thumb || null)
            : null

          return {
            id,
            name: dir.name,
            cover,
            photos,
            photoCount: photos.length,
            isEmpty: photos.length === 0,
          }
        } catch (error) {
          console.error(`Error processing album ${dir.name}:`, error)
          return null
        }
      })

      // 等待当前页的相册信息获取完成
      pageAlbums = (await Promise.all(albumPromises))
        .filter(album => album !== null)

      // 将当前页数据存入缓存
      cache.set(cacheKey, pageAlbums, CACHE_TTL)
    }

    return {
      code: 200,
      message: 'success',
      data: {
        items: pageAlbums,
        pagination: {
          current: page,
          pageSize,
          total,
          totalPages
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