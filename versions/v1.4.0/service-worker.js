const CACHE_NAME = 'item-inventory-v8';   // v1.3.0：配色体系整体重做（中性骨架转暖 + 主色明度体系 + 语义四色收敛 + 示意图层对齐）→ 递增缓存名使旧 styles.css 失效（否则新 HTML 配旧 CSS，会看到「没有 bg-ok-* / text-record-* 这些类」的残缺样式）；v1.2.0 补丁：资源 URL 加 ?v= 版本号 + SW 缓存键去掉 v 归一化（根治与上游 FoodIn「同源同名资源串缓存」：HTML 是新的、styles.css / 图标还是 FoodIn 的）→ 递增缓存名丢弃可能已存了旧文件的 v5；v1.2.0：语义层通用化（取出 / 借出归还 / 补货线 / 到期类型 / 资产优先统计 / 智能视图 / 数量直改 / 重复购买提示）→ 递增缓存名使旧缓存失效；v1.1.1：日期信息改点击展开 + 净含量移入更多信息；v1.1.0：移除小票 OCR 链路（含 Tesseract CDN 白名单）→ 递增缓存名使旧缓存失效；v1.0.1：图标按参考图精确复刻 + 设置页配色统一为木纹棕；v1.0.0（物品记）：应用更名为「物品记」+ 启用木纹棕品牌色；缓存前缀同时由 food-inventory- 改为 item-inventory-，与上游 FoodIn 区分；v2.36.3：重复 id 自愈确定性化 + 修同名流水误迁移 + 自愈移到同步引擎就绪后 + 修备份导入同 id 撞车丢商品；v2.36.2：loadData 逐键隔离 + 损坏隔离（修数据丢失风险）、清理死代码与冗余别名、77 处手写字号收敛为 .fi-hint/.fi-fs-11；v2.36.1：位置/分类归一化、分区删除清理商品位置、多标签维护、空 places 同步和搜索 token 修复；v2.36.0：减少库存二次确认 + 重复 id 商品定位修复 + 保质期单位与日期反算修复 + 顶栏统计卡数据表驱动 + 记录类型筛选多选；v2.35.0：云同步后端 jsonbin → Upstash Redis（月度额度 + 100MB 单值）+ 同步失败给明确原因 + 设置页改填 REST URL/REST Token + 小控件统一 36px + 胶囊两级（32/28）。递增 → 旧 SW 失效，activate 时删除旧缓存

// 仅预缓存「首屏必需」的同域静态资源。
// ❗v2.33.0：html5-qrcode.min.js（375KB）与 qrcode.min.js 已移出这里 ——
//   它们只在打开扫码时才需要，且 index.html 已改为按需注入（ensureScanLib / ensureQrLib）。
//   若仍留在预缓存，安装期会白白下载 395KB 与首屏抢带宽。
//   它们改由「应用首屏后空闲预取」触发本 SW 的运行时 cache-first 逻辑写入缓存，
//   因此离线可用性不变（只是不再与首屏争抢）。
// ❗v1.2.0：下面 5 项必须与页面请求的 URL 完全一致（页面用 ?v=<版本号>，真源 = index.html 的 window.ITEMIN_V）。
//   为什么非带不可：这几项在本地调试时与上游 FoodIn「同源 + 同名」，浏览器按 URL 缓存，
//   不带版本号的那一份很可能取回 FoodIn 的旧文件（旧 CSS 没有 brand-* 类）→ 被预缓存进本应用缓存，
//   之后页面即使发的是带版本号的请求，也永远拿不到正确样式。
//   发版时这里跟 window.ITEMIN_V 一起改；漏改的后果很轻：仅「升级后第一次离线访问」少这几个文件，
//   在线访问不受影响（运行时缓存会补上）。
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=1.4.0',
  './manifest.json?v=1.4.0',
  './icon-180.png?v=1.4.0',
  './icon-192.png?v=1.4.0',
  './icon-512.png?v=1.4.0',
  './vendor/vue.global.prod.js'
];

// 后台写缓存：吞掉 rejection 只记日志。
// 场景：SW 被新版本替换时 activate 会删旧缓存，此时仍在飞的 cache.put 会 reject（InvalidStateError），
// 不接住会在控制台刷未处理拒绝，干扰真实错误排查。
function putQuietly(request, response) {
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .catch((e) => console.warn('[SW] 写入缓存失败（可忽略）：', request.url || request, e && e.name));
}

// 只在本应用「自己的缓存」里查找。
// ❗不要直接用 caches.match(request)：它默认搜**整个源**上的所有缓存。
//   若上游 FoodIn 的 food-inventory-* 缓存还存在（同源部署、或换肤前的遗留），
//   会命中它的旧 index.html / styles.css —— 表现是「改了样式却仍显示旧版」，极难排查。
async function matchOwn(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // ❗v2.33.0 修复：原实现 `cache.addAll(...).catch(() => {})` 有两个坑 ——
    //   ① addAll 是「全有或全无」：任一资源 404（如新增图标忘了上传 / 部署白名单漏了一项）
    //      会让**整批**预缓存全部丢弃，页面退化为完全无缓存；
    //   ② 失败被静默吞掉，控制台毫无线索，只能靠猜。
    //   改为逐资源 allSettled：单个失败不影响其余，失败项明确打日志。
    const results = await Promise.allSettled(PRECACHE_ASSETS.map((url) => cache.add(url)));
    const failed = PRECACHE_ASSETS.filter((_, i) => results[i].status === 'rejected');
    if (failed.length) {
      console.warn('[SW] 预缓存部分失败（其余已就绪，应用仍可离线）：' + failed.join(', ')
        + ' —— 请检查这些文件是否已部署到仓库');
    }
  })());
  self.skipWaiting();
});

// 缓存前缀：本应用只清理「自己前缀」下的旧缓存。
// ❗不要改回「删掉除自己以外的所有缓存」：CacheStorage 按**源**共享、不按路径分配，
//   上游 FoodIn（food-inventory-*）与物品记（item-inventory-*）若部署在同一域名下，
//   无差别清理会把对方的离线缓存一并删掉，两个应用互相打架。
const CACHE_PREFIX = 'item-inventory-';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ★v2.24.4 白名单模式（根治 API 缓存污染）：只接管「同源静态资源」。
  // 旧逻辑是"黑名单"，导致条码查询 API（v1.apizero.cn）与 Open Food Facts 被当成静态资源走
  // cache-first，API 响应被永久缓存：同一条码第二次查询直接返回旧结果（含"未找到"），
  // 永远不再真发请求 → 批量页"无法调用 API"。
  // 现改为白名单：非 GET 一律放行；跨域（第三方 API、扫码 / 二维码库的 jsDelivr 回退源）
  // 一律放行、不缓存；只有同源 GET 才走下面的缓存逻辑。
  if (event.request.method !== 'GET') return;   // POST 等（云同步写入）一律放行

  if (url.origin !== self.location.origin) return;   // 跨域 → 交回浏览器默认网络行为，永不缓存

  // 主页面导航：网络优先（始终拿到最新版），失败回退到缓存
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        putQuietly('./', clone);
        return response;
      }).catch(() => {
        return matchOwn('./').then((r) => r || matchOwn('./index.html'));
      })
    );
    return;
  }

  // 同源静态资源：缓存优先（stale-while-revalidate），离线/秒开
  // v1.2.0：缓存键就是原始 URL —— 带 ?v= 的资源在版本变化时天然 miss（必然回源拿到新文件），
  //   不做「去掉 v 归一化」：那会让预缓存里可能存在的旧文件被带版本号的请求命中，反而永远取不到新版。
  event.respondWith(
    matchOwn(event.request).then((cached) => {
      if (cached) {
        // 后台更新缓存副本，下次访问用新版本
        fetch(event.request).then((response) => {
          if (response && response.status === 200) putQuietly(event.request, response);
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          putQuietly(event.request, clone);
        }
        return response;
      }).catch(() => {
        // ❗v2.33.0 修复：原实现这里 `return caches.match('./')` —— 会给**任何**失败的静态资源
        // 返回首页 HTML。于是 `<script src="./vendor/x.js">` 拿到一份 HTML，浏览器报
        // 「Unexpected token '<'」，看起来像代码语法错误，实际是 SW 喂错了内容，极难排查。
        // 走到这里的一定是静态资源（导航请求在上面已单独处理）→ 明确返回 504，
        // 让浏览器按「资源加载失败」正常处理，不再伪造内容。
        return new Response('', {
          status: 504,
          statusText: 'Offline and not cached'
        });
      });
    })
  );
});
