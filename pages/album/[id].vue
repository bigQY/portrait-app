<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <UContainer>
      <div class="py-8">
        <!-- 返回按钮和标题 -->
        <div class="flex items-center gap-4 mb-6">
          <NuxtLink to="/" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <UIcon name="i-heroicons-arrow-left" class="w-6 h-6" />
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ album?.name }}</h1>
        </div>

        <!-- 照片瀑布流 -->
        <div class="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          <div v-for="(photo, index) in photos" :key="index" class="break-inside-avoid">
            <div 
              class="relative overflow-hidden rounded-lg cursor-zoom-in hover:shadow-lg transition-shadow duration-300"
              @click="openLightbox(index)"
            >
              <nuxt-img
                :src="photo.url || photo.thumb"
                class="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <!-- 图片预览弹窗 -->
        <UModal v-model="isLightboxOpen" :ui="{
          wrapper: 'fixed inset-0 z-50',
          overlay: {
            background: 'bg-gray-950/90'
          },
          container: 'flex items-center justify-center h-full p-4',
          base: 'max-h-[90vh] max-w-[90vw] bg-transparent'
        }">
          <div class="relative">
            <nuxt-img
              v-if="currentPhoto"
              :src="currentPhoto.url || currentPhoto.thumb"
              class="max-h-[85vh] w-auto rounded-lg"
            />
            
            <!-- 导航按钮 -->
            <div class="absolute inset-0 flex items-center justify-between p-4">
              <UButton
                v-if="currentPhotoIndex > 0"
                color="white"
                variant="ghost"
                icon="i-heroicons-chevron-left"
                :ui="{ rounded: 'rounded-full' }"
                class="!p-2"
                @click="previousPhoto"
              />
              <UButton
                v-if="currentPhotoIndex < photos.length - 1"
                color="white"
                variant="ghost"
                icon="i-heroicons-chevron-right"
                :ui="{ rounded: 'rounded-full' }"
                class="!p-2"
                @click="nextPhoto"
              />
            </div>

            <!-- 关闭按钮 -->
            <UButton
              color="white"
              variant="ghost"
              icon="i-heroicons-x-mark"
              :ui="{ rounded: 'rounded-full' }"
              class="!p-2 absolute top-4 right-4"
              @click="closeLightbox"
            />
          </div>
        </UModal>

        <!-- 加载状态 -->
        <div v-if="pending" class="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
          <UIcon name="i-lucide-lightbulb" class="size-5 w-8 h-8 text-primary-500" />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
const route = useRoute()
const albumId = route.params.id

// 获取相册数据
const { data: albumData, pending } = await useFetch(`/api/alist/albums`, {
  query: {
    path: `/img/写真图床/${albumId}`
  },
  transform: (data) => {
    // 过滤掉不能序列化的数据
    if (data?.data?.items) {
      return {
        data: {
          items: data.data.items.map(item => ({
            name: item.name,
            photos: item.photos?.map(photo => ({
              url: photo.url,
              thumb: photo.thumb
            })) || []
          }))
        }
      }
    }
    return data
  }
})

// 相册和照片数据
const album = computed(() => albumData.value?.data?.items?.[0])
const photos = computed(() => album.value?.photos || [])

// 图片预览相关状态
const isLightboxOpen = ref(false)
const currentPhotoIndex = ref(0)
const currentPhoto = computed(() => photos.value[currentPhotoIndex.value])

// 打开预览
function openLightbox(index) {
  currentPhotoIndex.value = index
  isLightboxOpen.value = true
}

// 关闭预览
function closeLightbox() {
  isLightboxOpen.value = false
}

// 上一张照片
function previousPhoto() {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--
  }
}

// 下一张照片
function nextPhoto() {
  if (currentPhotoIndex.value < photos.value.length - 1) {
    currentPhotoIndex.value++
  }
}

// 键盘导航
onMounted(() => {
  const handleKeydown = (e) => {
    if (!isLightboxOpen.value) return
    
    switch(e.key) {
      case 'ArrowLeft':
        previousPhoto()
        break
      case 'ArrowRight':
        nextPhoto()
        break
      case 'Escape':
        closeLightbox()
        break
    }
  }

  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>