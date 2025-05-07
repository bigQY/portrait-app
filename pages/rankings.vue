<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <!-- 标题栏 -->
      <div class="py-6 flex items-center gap-4">
        <button 
          @click="$router.back()"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <UIcon name="i-lucide-chevron-left" class="w-6 h-6 text-gray-600 dark:text-gray-400"/>
        </button>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">排行榜</h1>
      </div>

      <!-- 排行榜类型切换 -->
      <div class="flex gap-4 mb-6">
        <button
          v-for="type in rankingTypes"
          :key="type.value"
          @click="currentType = type.value"
          class="px-4 py-2 rounded-lg transition-colors duration-200"
          :class="currentType === type.value 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
        >
          {{ type.label }}
        </button>
      </div>

      <!-- 排行榜列表 -->
      <div class="space-y-4">
        <div v-for="(album, index) in rankings" :key="album.album_name"
          class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
          <div class="flex items-center gap-4">
            <!-- 排名 -->
            <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full"
              :class="{
                'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400': index === 0,
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': index === 1,
                'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400': index === 2,
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400': index > 2
              }"
            >
              {{ index + 1 }}
            </div>
            <!-- 相册信息 -->
            <div class="flex-grow">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ decodeURIComponent(album.album_name) }}</h3>
              <div class="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-eye" class="w-4 h-4"/>
                  {{ album.views }} 次浏览
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-heart" class="w-4 h-4"/>
                  {{ album.likes }} 个赞
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-message-square" class="w-4 h-4"/>
                  {{ album.comments }} 条评论
                </span>
              </div>
            </div>
            <!-- 查看按钮 -->
            <button
              @click="$router.push(`/album/${album.album_name}`)"
              class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
            >
              查看
            </button>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
const rankingTypes = [
  { label: '浏览量排行', value: 'views' },
  { label: '点赞排行', value: 'likes' },
  { label: '评论排行', value: 'comments' }
]

const currentType = ref('views')
const rankings = ref([])

// 获取排行榜数据
const fetchRankings = async () => {
  const { data } = await useFetch(`/api/rankings/${currentType.value}`)
  if (data.value?.results) {
    // 过滤掉 undefined 的相册
    rankings.value = data.value.results.filter(album => album.album_name !== 'undefined')
  } else {
    rankings.value = []
  }
}

// 监听排行榜类型变化
watch(currentType, () => {
  fetchRankings()
})

// 初始化
onMounted(() => {
  fetchRankings()
})
</script> 