<template>
  <div class="flex items-center gap-6 py-4">
    <!-- 浏览量 -->
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-eye" class="w-5 h-5 text-gray-500 dark:text-gray-400"/>
      <span class="text-gray-600 dark:text-gray-300">{{ views }} 次浏览</span>
    </div>

    <!-- 点赞按钮 -->
    <button 
      @click="handleLike"
      class="flex items-center gap-2 px-3 py-1 rounded-full transition-colors duration-200"
      :class="isLiked ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
    >
      <UIcon 
        :name="'i-lucide-heart'" 
        class="w-5 h-5"
      />
      <span>{{ likes }} 个赞</span>
    </button>
  </div>

  <!-- 评论区 -->
  <div class="mt-6">
    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">评论 ({{ comments.length }})</h3>
    
    <!-- 评论输入框 -->
    <div class="mb-6">
      <!-- 昵称输入 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          你的昵称
        </label>
        <input
          v-model="nickname"
          type="text"
          placeholder="游客"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      
      <textarea
        v-model="newComment"
        placeholder="写下你的评论..."
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        rows="3"
      ></textarea>
      <div class="mt-2 flex justify-end">
        <button
          @click="submitComment"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!newComment.trim()"
        >
          发表评论
        </button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="space-y-4">
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
    </div>
  </div>
</template>

<script setup>
import { getFingerprint } from '~/utils/fingerprint'

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

// 获取浏览器指纹
onMounted(async () => {
  fingerprint.value = await getFingerprint()
  recordView()
})

// 获取统计数据
const fetchStats = async () => {
  const [viewsRes, likesRes, commentsRes] = await Promise.all([
    $fetch(`/api/album/${props.albumName}/views`),
    $fetch(`/api/album/${props.albumName}/likes`),
    $fetch(`/api/album/${props.albumName}/comments`)
  ])
  
  views.value = viewsRes.count
  likes.value = likesRes.count
  comments.value = commentsRes.results || []
}

// 处理点赞
const handleLike = async () => {
  if (!fingerprint.value) {
    // 这里可以添加提示
    return
  }

  const action = isLiked.value ? 'unlike' : 'like'
  const res = await $fetch(`/api/album/${props.albumName}/likes`, {
    method: 'POST',
    body: {
      fingerprint: fingerprint.value,
      action
    }
  })
  
  likes.value = res.count
  isLiked.value = !isLiked.value
}

// 提交评论
const submitComment = async () => {
  if (!newComment.value.trim() || !fingerprint.value) return

  await $fetch(`/api/album/${props.albumName}/comments`, {
    method: 'POST',
    body: {
      content: newComment.value,
      userName: nickname.value.trim() || '游客',
      fingerprint: fingerprint.value
    }
  })

  newComment.value = ''
  await fetchStats()
}

// 删除评论
const deleteComment = async (id) => {
  if (!fingerprint.value) {
    // 如果指纹不存在，重新获取
    fingerprint.value = await getFingerprint()
  }

  await $fetch(`/api/album/${props.albumName}/comments`, {
    method: 'DELETE',
    body: { 
      id,
      fingerprint: fingerprint.value
    }
  })
  
  await fetchStats()
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
  await $fetch(`/api/album/${props.albumName}/views`, {
    method: 'POST'
  })
  await fetchStats()
}
</script> 