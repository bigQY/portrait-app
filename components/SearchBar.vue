<template>
  <div class="relative">
    <UButton
      :color="searchQuery ? 'primary' : 'gray'"
      :variant="searchQuery ? 'soft' : 'ghost'"
      :icon="'i-lucide-search'"
      :ui="{ rounded: 'rounded-full' }"
      class="!p-2 transition-colors duration-200"
      @click="isSearchOpen = !isSearchOpen"
    />
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="isSearchOpen" class="absolute mt-2 w-72 left-1/2 -translate-x-1/2 origin-top sm:left-auto sm:right-0 sm:translate-x-0 sm:origin-top-right bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border dark:border-gray-700">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('searchAlbums')"
          class="w-full"
          @input="debounceSearch"
          @keydown.esc="isSearchOpen = false"
          ref="searchInput"
        />
        <!-- 热搜词 -->
        <div class="mt-2 flex flex-wrap gap-2">
          <UButton
            v-for="tag in hotTagsWithI18n"
            :key="tag.name"
            size="xs"
            color="gray"
            variant="soft"
            :class="{ 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500': searchQuery === tag }"
            class="border dark:border-gray-700"
            @click="handleTagClick(tag.name)"
          >
            {{ tag.i18n }}
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
const localePath = useLocalePath()

const route = useRoute()
const isSearchOpen = ref(false)
const searchQuery = ref(route.query.q || '')
const searchInput = ref(null)
const { t } = useI18n()

// 热搜词列表
// const hotTags = ref(['蠢沫沫','绮太郎','爆机少女喵小吉','森萝财团','桜井宁宁', '喵糖映画', 'BETA','少女',
// '白丝','女仆','黑丝','肉丝','学妹','制服','体操','护士','睡衣','旗袍','马尾','JK','死库水','兔女郎','和服',
// '学妹','女友', '毛衣','户外','精灵', '居家', '美足', '夏日', '浴缸', '内衣', '短裙','修女'])
const hotTagsWithI18n = ref([
  { name: '蠢沫沫', i18n: t('hotTags.chunmomo') },
  { name: '绮太郎', i18n: t('hotTags.qitailang') },
  { name: '爆机少女喵小吉', i18n: t('hotTags.baojishaonvmiaoxiaoji') },
  { name: '森萝财团', i18n: t('hotTags.senluocaituan') },
  { name: '桜井宁宁', i18n: t('hotTags.yingjingningning') },
  { name: '喵糖映画', i18n: t('hotTags.miaotangyinghua') },
  { name: 'BETA', i18n: t('hotTags.beta') },
  { name: '少女', i18n: t('hotTags.shaonv') },
  { name: '白丝', i18n: t('hotTags.baisi') },
  { name: '女仆', i18n: t('hotTags.nvpu') },
  { name: '黑丝', i18n: t('hotTags.heisi') },
  { name: '肉丝', i18n: t('hotTags.rousi') },
  { name: '学妹', i18n: t('hotTags.xuemei') },
  { name: '制服', i18n: t('hotTags.zhifu') },
  { name: '体操', i18n: t('hotTags.ticao') },
  { name: '护士', i18n: t('hotTags.hushi') },
  { name: '睡衣', i18n: t('hotTags.shuiyi') },
  { name: '旗袍', i18n: t('hotTags.qipao') },
  { name: '马尾', i18n: t('hotTags.mawei') },
  { name: 'JK', i18n: t('hotTags.jk') },
  { name: '死库水', i18n: t('hotTags.sikuishui') },
  { name: '兔女郎', i18n: t('hotTags.tunvlang') },
  { name: '和服', i18n: t('hotTags.hefu') },
  { name: '学妹', i18n: t('hotTags.xuemei') }, // Repeated as in hotTags array
  { name: '女友', i18n: t('hotTags.nvyou') },
  { name: '毛衣', i18n: t('hotTags.maoyi') },
  { name: '户外', i18n: t('hotTags.huwai') },
  { name: '精灵', i18n: t('hotTags.jingling') },
  { name: '居家', i18n: t('hotTags.jujia') },
  { name: '美足', i18n: t('hotTags.meizu') },
  { name: '夏日', i18n: t('hotTags.xiari') },
  { name: '浴缸', i18n: t('hotTags.yugang') },
  { name: '内衣', i18n: t('hotTags.neiyi') },
  { name: '短裙', i18n: t('hotTags.duanqun') },
  { name: '修女', i18n: t('hotTags.xiunv') }
])

// 监听路由变化，更新搜索框内容
watch(() => route.query.q, (newQuery) => {
  searchQuery.value = newQuery || ''
})

// 点击热搜词
const handleTagClick = (tag) => {
  searchQuery.value = tag
  debounceSearch()
}

// 防抖处理搜索
const debounceSearch = useDebounceFn(() => {
  if (isSearchOpen.value) {
    // 保持当前的查询参数，只更新搜索词
    const query = {
      ...route.query,
      q: searchQuery.value || undefined
    }
    
    // 如果搜索词为空，删除q参数
    if (!searchQuery.value) {
      delete query.q
    }
    
    // 重置到首页
    navigateTo(localePath({
      path: '/',
      query
    }))
  }
}, 300)

// 监听搜索框打开状态
watch(isSearchOpen, (newVal) => {
  if (newVal) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// 点击外部关闭搜索框
onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', (e) => {
      const searchContainer = document.querySelector('.relative') // Consider a more specific selector if needed
      if (searchContainer && !searchContainer.contains(e.target) && !e.target.closest('.relative')) {
        isSearchOpen.value = false
      }
    })
  }
})
</script>