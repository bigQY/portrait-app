import { defineSitemapEventHandler } from '#imports'
import type { SitemapUrlInput } from '#sitemap/types'

interface Album {
  id: string
  updated_at?: string
}

interface Pagination {
  total: number
  per_page: number
}

interface ApiResponse {
  data: {
    pagination: Pagination
    items: Album[]
  }
}

type Changefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
type Priority = 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1

export default defineSitemapEventHandler(async () => {
  // 获取所有相册列表（使用新的 API 端点）
  const response = await $fetch<ApiResponse>('/api/alist/sitemap-albums')
  const albums = response.data?.items || []
  
  // 生成相册页面的 URL
  const albumUrls = albums.map((album) => ({
    loc: `/album/${album.id}`,
    lastmod: album.updated_at || new Date().toISOString(),
    changefreq: 'daily' as Changefreq,
    priority: 0.8 as Priority,
    _sitemap: 'albums'
  }))

  // 生成首页分页 URL
  const totalPages = Math.ceil(response.data?.pagination?.total / response.data?.pagination?.per_page) || 1
  const pageUrls = Array.from({ length: totalPages }, (_, i) => ({
    loc: i === 0 ? '/' : `/page/${i + 1}`,
    changefreq: 'daily' as Changefreq,
    priority: (i === 0 ? 1.0 : 0.9) as Priority,
    _sitemap: 'pages'
  }))

  // 添加其他静态页面
  const staticUrls = [
    {
      loc: '/rankings',
      changefreq: 'daily' as Changefreq,
      priority: 0.9 as Priority,
      _sitemap: 'pages'
    }
  ]

  // 确保没有重复的 URL
  const allUrls = [...pageUrls, ...staticUrls, ...albumUrls]
  const uniqueUrls = Array.from(new Map(allUrls.map(item => [item.loc, item])).values())

  return uniqueUrls satisfies SitemapUrlInput[]
}) 