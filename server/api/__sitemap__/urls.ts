import { defineSitemapEventHandler, useRuntimeConfig } from '#imports' // Import useRuntimeConfig
import type { SitemapUrlInput, SitemapUrl } from '#sitemap/types' // Import SitemapUrl for clarity

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

// type Changefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
// type Priority = 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
// Using SitemapUrl properties directly will infer these types.

export default defineSitemapEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig();
  const i18nModuleOptions = runtimeConfig.public.i18n;

  // Construct i18nConfig dynamically
  const i18nConfig = {
    defaultLocale: i18nModuleOptions.defaultLocale,
    // Ensure locales is an array of objects with at least a 'code' property
    locales: i18nModuleOptions.locales.map((l: any) => ({ code: l.code, name: l.name || l.code })),
    strategy: i18nModuleOptions.strategy
  };

  const allLocalizedUrls: SitemapUrl[] = [];

  // Fetch all albums (using the new API endpoint)
  const response = await $fetch<ApiResponse>('/api/alist/sitemap-albums')
  const albums = response.data?.items || []
  
  // Generate album page URLs (for each language)
  albums.forEach((album) => {
    const basePath = `/album/${album.id}`;
    i18nConfig.locales.forEach((locale: { code: string }) => { // Added type for locale
      let loc = basePath;
      if (i18nConfig.strategy === 'prefix_except_default') {
        if (locale.code !== i18nConfig.defaultLocale) {
          loc = `/${locale.code}${basePath}`;
        }
      }
      // TODO: Add logic for other strategies like 'prefix' if needed in the future

      allLocalizedUrls.push({
        loc,
        lastmod: album.updated_at || new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.8
      });
    });
  });

  // Generate homepage pagination URLs (for each language)
  const totalItems = response.data?.pagination?.total || 0;
  const itemsPerPage = response.data?.pagination?.per_page || 1; // Avoid division by zero
  const totalPages = itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;

  for (let i = 0; i < totalPages; i++) {
    const basePath = i === 0 ? '/' : `/page/${i + 1}`;
    i18nConfig.locales.forEach((locale: { code: string }) => { // Added type for locale
      let loc = basePath;
      if (i18nConfig.strategy === 'prefix_except_default') {
        if (locale.code !== i18nConfig.defaultLocale) {
          loc = `/${locale.code}${basePath === '/' ? '' : basePath}`;
        }
      }
      // TODO: Add logic for other strategies

      allLocalizedUrls.push({
        loc,
        changefreq: 'daily',
        priority: (i === 0 ? 1.0 : 0.9)
      });
    });
  }

  // Add other static pages (for each language)
  const staticBasePaths = ['/rankings'];
  staticBasePaths.forEach(basePath => {
    i18nConfig.locales.forEach((locale: { code: string }) => { // Added type for locale
      let loc = basePath;
      if (i18nConfig.strategy === 'prefix_except_default') {
        if (locale.code !== i18nConfig.defaultLocale) {
          loc = `/${locale.code}${basePath}`;
        }
      }
      // TODO: Add logic for other strategies

      allLocalizedUrls.push({
        loc,
        changefreq: 'daily',
        priority: 0.9
      });
    });
  });

  // Ensure no duplicate URLs (based on loc)
  const uniqueUrls = Array.from(new Map(allLocalizedUrls.map(item => [item.loc, item])).values());

  return uniqueUrls satisfies SitemapUrlInput[]; // Use satisfies for type checking
})