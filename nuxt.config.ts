// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,
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
    "nitro-cloudflare-dev"
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
      nodeCompat: true
    },
    routeRules: {
      '/album/**': { swr: true },
      '/': { ssr: false }
    }
  },

  // 开发工具配置
  devtools: { enabled: true },

  // Vite 配置
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    // 私有密钥，仅在服务器端可用
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
    // 公共密钥，在客户端和服务器端都可用
    public: {
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY
    }
  },
})