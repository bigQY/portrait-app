// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

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
        { name: 'description', content: '精美写真相册展示' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
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

  },

  // 开发工具配置
  devtools: { enabled: true },

  // Vite 配置
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})