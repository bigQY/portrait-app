import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fingerprint: string | null = null

export async function getFingerprint(): Promise<string> {
  if (fingerprint) {
    return fingerprint
  }

  try {
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    fingerprint = result.visitorId
    return fingerprint
  } catch (error) {
    console.error('获取浏览器指纹失败:', error)
    // 如果获取失败，使用一个随机字符串作为后备方案
    fingerprint = Math.random().toString(36).substring(2)
    return fingerprint
  }
} 