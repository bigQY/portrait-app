<template>
  <div class="flex items-center gap-6 py-4">
    <!-- 浏览量 -->
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-eye" class="w-5 h-5 text-gray-500 dark:text-gray-400"/>
      <template v-if="isLoading">
        <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </template>
      <template v-else>
        <span class="text-gray-600 dark:text-gray-300">{{ $t('viewsUnit', { count: views }) }}</span>
      </template>
    </div>

    <!-- 点赞按钮 -->
    <button 
      @click="handleLike"
      class="flex items-center gap-2 px-3 py-1 rounded-full transition-colors duration-200"
      :class="isLiked ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
      :disabled="isLoading"
    >
      <UIcon 
        :name="'i-lucide-heart'" 
        class="w-5 h-5"
      />
      <template v-if="isLoading">
        <div class="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </template>
      <template v-else>
        <span>{{ $t('likesUnit', { count: likes }) }}</span>
      </template>
    </button>
  </div>

  <!-- 评论区 -->
  <div class="mt-6">
    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
      {{ $t('commentsCount', { count: comments.length }) }}
    </h3>
    
    <!-- 评论输入框 -->
    <div class="mb-6">
      <!-- 昵称输入 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ $t('yourNickname') }}
        </label>
        <input
          v-model="nickname"
          type="text"
          :placeholder="$t('guest')"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      
      <textarea
        v-model="newComment"
        :placeholder="$t('writeYourComment')"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        rows="3"
      ></textarea>
      <div class="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <!-- Turnstile 验证组件 -->
        <div ref="turnstileContainer" class="cf-turnstile w-full sm:w-auto"></div>
        <!-- 发表按钮 -->
        <button
          @click="submitComment"
          class="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          :disabled="!newComment.trim() || isLoading || !turnstileToken"
        >
          {{ $t('publishComment') }}
        </button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="space-y-4">
      <!-- 骨骼屏加载动画 -->
      <template v-if="isLoading">
        <div v-for="i in 3" :key="i" 
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-2">
              <div class="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div class="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div class="mt-2 space-y-2">
            <div class="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div class="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </template>

      <!-- 实际评论列表 -->
      <template v-else>
        <div v-for="comment in comments" :key="comment.id" 
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
          <div class="flex justify-between items-start">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">{{ comment.user_name }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400 ml-2">{{ formatDate(comment.created_at) }}</span>
            </div>
            <button 
              v-if="comment.fingerprint === fingerprint"
              @click="deleteComment(comment.id)"
              class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
            >
              <UIcon name="i-lucide-trash-2" class="w-4 h-4"/>
            </button>
          </div>
          <p class="mt-2 text-gray-700 dark:text-gray-300">{{ comment.content }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { getFingerprint } from '~/utils/fingerprint'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const config = useRuntimeConfig()
const props = defineProps({
  albumName: {
    type: String,
    required: true
  }
})

const fingerprint = ref('')
const nickname = ref('')
const views = ref(0)
const likes = ref(0)
const isLiked = ref(false)
const comments = ref([])
const newComment = ref('')
const isLoading = ref(true)
const turnstileContainer = ref(null)
const turnstileToken = ref('')

// 初始化 Turnstile
onMounted(async () => {
  fingerprint.value = await getFingerprint()
  recordView()
  
  // 加载 Turnstile
  if (process.client) {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.turnstile.render(turnstileContainer.value, {
        sitekey: config.public.turnstileSiteKey,
        size:'flexible',
        callback: (token) => {
          turnstileToken.value = token
        },
        'expired-callback': () => {
          turnstileToken.value = ''
        },
        'error-callback': () => {
          turnstileToken.value = ''
        }
      })
    }
  }
})

// 获取统计数据
const fetchStats = async () => {
  if (!props.albumName || props.albumName === '' || props.albumName === 'undefined') {
    console.error(t('albumNameInvalid'))
    return
  }

  try {
    isLoading.value = true
    const stats = await $fetch(`/api/album/${encodeURIComponent(props.albumName)}/stats`)
    
    views.value = stats.views
    likes.value = stats.likes
    comments.value = stats.comments
  } catch (error) {
    console.error(t('fetchStatsFailed'), error)
  } finally {
    isLoading.value = false
  }
}

// 处理点赞
const handleLike = async () => {
  if (!fingerprint.value || isLoading.value || !props.albumName || props.albumName === '' || props.albumName === 'undefined') {
    return
  }

  try {
    isLoading.value = true
    const action = isLiked.value ? 'unlike' : 'like'
    const res = await $fetch(`/api/album/${encodeURIComponent(props.albumName)}/likes`, {
      method: 'POST',
      body: {
        fingerprint: fingerprint.value,
        action
      }
    })
    
    likes.value = res.count
    isLiked.value = !isLiked.value
  } catch (error) {
    console.error(t('likeFailed'), error)
  } finally {
    isLoading.value = false
  }
}

// 提交评论
const submitComment = async () => {
  if (!newComment.value.trim() || !fingerprint.value || isLoading.value || !props.albumName || props.albumName === '' || props.albumName === 'undefined' || !turnstileToken.value) return

  try {
    isLoading.value = true
    await $fetch(`/api/album/${encodeURIComponent(props.albumName)}/comments`, {
      method: 'POST',
      body: {
        content: newComment.value,
        userName: nickname.value.trim() || t('guest'),
        fingerprint: fingerprint.value,
        turnstileToken: turnstileToken.value
      }
    })

    newComment.value = ''
    turnstileToken.value = ''
    window.turnstile.reset()
    await fetchStats()
  } catch (error) {
    console.error(t('submitCommentFailed'), error)
  } finally {
    isLoading.value = false
  }
}

// 删除评论
const deleteComment = async (id) => {
  if (!id || !fingerprint.value || !props.albumName || props.albumName === '' || props.albumName === 'undefined') {
    console.error(t('deleteCommentFailedMissingParams'), { id, fingerprint: fingerprint.value, albumName: props.albumName })
    return
  }

  try {
    isLoading.value = true
    const response = await $fetch(`/api/album/${encodeURIComponent(props.albumName)}/comments?id=${id}&fingerprint=${encodeURIComponent(fingerprint.value)}`, {
      method: 'DELETE'
    })
    
    if (response.success) {
      // 直接从本地状态中移除评论
      comments.value = comments.value.filter(comment => comment.id !== id)
      await fetchStats()
    } else {
      throw new Error(response.message || t('deleteCommentFailed'))
    }
  } catch (error) {
    console.error(t('deleteCommentFailed'), error)
    alert(error.message || t('deleteCommentFailedTryAgain'))
  } finally {
    isLoading.value = false
  }
}

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 记录浏览量
const recordView = async () => {
  if (!props.albumName || props.albumName === '' || props.albumName === 'undefined') {
    console.error(t('albumNameInvalid'))
    return
  }

  if (!fingerprint.value) {
    console.error(t('browserFingerprintInvalid'))
    return
  }

  try {
    await $fetch(`/api/album/${encodeURIComponent(props.albumName)}/views`, {
      method: 'POST',
      body: {
        fingerprint: fingerprint.value
      }
    })
    await fetchStats()
  } catch (error) {
    console.error(t('recordViewFailed'), error)
  }
}
</script>

<style scoped>
.cf-turnstile {
  width: 100%;
}
</style>