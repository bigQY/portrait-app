import { defineEventHandler, getQuery } from 'h3'
import { alistClient } from '../../utils/alistClient'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string
  
  if (!path) {
    return {
      code: 400,
      message: 'Path is required'
    }
  }

  try {
    const fileInfo = await alistClient.getFile(path)
    return { 
      code: 200,
      data: fileInfo 
    }
  } catch (error: any) {
    return {
      code: 500,
      message: error.message
    }
  }
})