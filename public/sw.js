// Service Worker for image caching
const CACHE_NAME = 'portrait-app-cache-v1';
const IMAGE_CACHE_NAME = 'portrait-app-image-cache-v1';

// 缓存策略：优先从缓存加载，如果缓存中没有则从网络加载并缓存
// self.addEventListener('fetch', (event) => {
//   // 只处理图片请求
//   if (event.request.destination === 'image') {
//     event.respondWith(
//       caches.match(event.request).then((response) => {
//         // 如果在缓存中找到响应，则返回缓存的响应
//         if (response) {
//           return response;
//         }

//         // 如果缓存中没有找到，则从网络获取
//         return fetch(event.request).then((networkResponse) => {
//           // 检查是否成功获取响应
//           if (!networkResponse || networkResponse.status !== 200) {
//             return networkResponse;
//           }

//           // 将响应复制一份，因为响应流只能使用一次
//           const responseToCache = networkResponse.clone();

//           // 将新的响应添加到缓存中
//           caches.open(IMAGE_CACHE_NAME).then((cache) => {
//             cache.put(event.request, responseToCache);
//           });

//           return networkResponse;
//         }).catch(() => {
//           // 如果网络请求失败，返回默认的封面图片
//           return caches.match('/img/cover.jpg');
//         });
//       })
//     );
//   }
// });

// // 清理旧版本缓存
// self.addEventListener('activate', (event) => {
//   event.waitUntil(
//     caches.keys().then((cacheNames) => {
//       return Promise.all(
//         cacheNames.map((cacheName) => {
//           if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
//             return caches.delete(cacheName);
//           }
//         })
//       );
//     })
//   );
// });