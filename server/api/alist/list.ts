import { defineEventHandler, getQuery } from 'h3'
import { alistClient } from '../../utils/alistClient'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string || '/'
  
  try {
    const files = await alistClient.getFiles(path)
    return { 
      code: 200,
      data: files 
    }
  } catch (error: any) {
    return {
      code: 500,
      message: error.message
    }
  }
})