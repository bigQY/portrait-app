import { defineEventHandler, createError } from 'h3'
import { alistClient } from '../utils/alistClient'

export default defineEventHandler(async (event) => {
  const path = event.node.req.url
  
  // 跳过非 Alist API 请求
  if (!path?.startsWith('/api/alist')) {
    return
  }

  try {
    // 确保已登录
    await alistClient.login()
    
    // 继续处理请求
    return
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Alist API error: ${error.message}`
    })
  }
})