// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

//locales
const locales = [
  {
    code: 'zh',
    name: '简体中文',
    file: 'zh-CN.json'
  },
  {
    code: 'en',
    name: 'English',
    file: 'en-US.json'
  },
  {
    code: 'fr',
    name: 'Français',
    file: 'fr-FR.json'
  },
  {
    code: 'de',
    name: 'Deutsch',
    file: 'de-DE.json'
  },
  {
    code: 'es',
    name: 'Español',
    file: 'es-ES.json'
  },
  {
    code: 'ja',
    name: '日本語',
    file: 'ja-JP.json'
  },
  {
    code: 'ko',
    name: '한국어',
    file: 'ko-KR.json'
  },
  {
    code: 'ru',
    name: 'Русский',
    file: 'ru-RU.json'
  },
  {
    code: 'pt',
    name: 'Português',
    file: 'pt-PT.json'
  },
  {
    code: 'it',
    name: 'Italiano',
    file: 'it-IT.json'
  }
]

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: true,
  // CSS 配置
  css: [
    '@/assets/css/main.css',
    '@/assets/css/transitions.css'
  ],

  // 启用实验性特性
  experimental: {
    payloadExtraction: true
  },

  // 模块配置
  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    'nitro-cloudflare-dev',
    '@nuxtjs/sitemap',
    '@nuxtjs/i18n'
  ],

  // 应用配置
  app: {
    head: {
      title: '写真相册',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '精美写真相册展示' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: '写真相册' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/img/icon-192x192.svg' }
      ]
    },
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    keepalive: true
  },

  // 图片优化配置
  image: {
    quality: 80,
    format: ['webp'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    }
  },

  // 颜色模式配置
  colorMode: {
    classSuffix: '',
    fallback: 'light',
    storageKey: 'color-mode'
  },

  nitro: {
    preset: "cloudflare-pages",
    cloudflare: {
      deployConfig: true,
    },
    compressPublicAssets: false,
    routeRules: {
      '/album/**': { 
        ssr: process.env.NODE_ENV === 'production',
        swr: process.env.NODE_ENV === 'production',
        cache: process.env.NODE_ENV === 'production' ? {
          swr: true, // 启用 SWR 缓存
          maxAge: 20 * 60 * 60 // 20小时缓存
        } : false
      },
      '/api/alist/**': { // 涵盖所有 /api/alist/ 路径
        cache: process.env.NODE_ENV === 'production' ? {
          maxAge: 20 * 60 * 60, // 20小时缓存
          staleMaxAge: 20 * 60 * 60 + 3600 // 20小时 + 1小时的staleMaxAge
        } : false
      },
      '/': { 
        ssr: process.env.NODE_ENV === 'production',
        cache: process.env.NODE_ENV === 'production' ? {
          maxAge: 20 * 60 * 60 // 20小时缓存
        } : false
      },
      '/page/**': {
        ssr: process.env.NODE_ENV === 'production',
        cache: process.env.NODE_ENV === 'production' ? {
          maxAge: 20 * 60 * 60 // 20小时缓存
        } : false
      },
      '/rankings': { // 为 rankings 页面添加缓存规则
        ssr: process.env.NODE_ENV === 'production',
        cache: process.env.NODE_ENV === 'production' ? {
          maxAge: 20 * 60 * 60 // 20小时缓存
        } : false
      }
    },
    minify: process.env.NODE_ENV === 'production'
  },

  // 开发工具配置
  devtools: { enabled: true },

  // Vite 配置
  vite: {
    plugins: [
      tailwindcss(),
    ],
    build: {
      target: 'esnext',
      minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: process.env.NODE_ENV === 'production'
        }
      }
    },
    server: {
      hmr: true,
      watch: {
        usePolling: true
      }
    }
  },

  runtimeConfig: {
    // 私有密钥，仅在服务器端可用
    turnstileSecretKey: process.env.NODE_ENV === 'development' 
      ? '1x0000000000000000000000000000000AA'
      : process.env.TURNSTILE_SECRET_KEY,
    upstashRedisUrl: process.env.UPSTASH_REDIS_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_TOKEN,
    // 公共密钥，在客户端和服务器端都可用
    public: {
      turnstileSiteKey: process.env.NODE_ENV === 'development'
        ? '1x00000000000000000000AA'
        : process.env.TURNSTILE_SITE_KEY,
      i18n:{
        locales: locales
      }
    }
  },

  site: { 
    url: 'https://hpic.me', 
    name: '写真相册' 
  },

  // Sitemap 配置
  sitemap: {
    sources: [
      '/api/__sitemap__/urls'
    ]
  },
  i18n: {
    locales: locales,
    defaultLocale: 'zh',
    lazy: true,
    langDir: 'locales/', // 指定语言文件目录
    strategy: 'prefix_except_default', // 路由策略：除默认语言外，其他语言添加前缀 (e.g., /en/about)
    detectBrowserLanguage: { // 浏览器语言检测配置
      useCookie: true, // 使用 cookie 存储用户选择的语言
      cookieKey: 'i18n_redirected', // cookie 名称
      alwaysRedirect: false, // 仅在根路径且未指定语言时重定向
      redirectOn: 'root', // 'root' - 仅在访问根路径时检测并重定向
    },
    experimental:{
      switchLocalePathLinkSSR: true // 启用 SSR 支持的语言切换链接
    }
  }
})