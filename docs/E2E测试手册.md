# 物品记 ItemIn · E2E 测试手册

> 收纳「跑截图 / 验收脚本」的全部操作细节。结论级提醒在 `docs/开发经验总览.md`，细则看这里。
> 核对时点：2026-10-18 · 版本 `1.4.0` · SW `item-inventory-v8`

---

## 1. 起服务与跑脚本

### 1.1 必须写在同一条命令里

后台 shell 起的服务在两次工具调用之间会死。用 PowerShell：

```powershell
$ErrorActionPreference = 'Continue'
$root = 'D:\WorkBuddyWorkSpace\ItemIn'
$py   = 'C:\Users\Workbuddy\.workbuddy\binaries\python\versions\3.13.12\python.exe'
$node = 'C:\Users\Workbuddy\.workbuddy\binaries\node\versions\22.22.2-6\node.exe'
Set-Location $root
$srv = Start-Process -FilePath $py -ArgumentList '-m','http.server','8777','--bind','127.0.0.1' `
       -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 2
  & $node "_dev/_shot_xxx.js" 2>&1 | Out-File "_dev/_shot_xxx.log" -Encoding utf8
  "NODE_EXIT=$LASTEXITCODE"
} finally {
  Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
}
```

| 约定 | 值 |
|---|---|
| 日常预览端口 | `8088` |
| **E2E 端口** | **`8777`** |
| **E2E 地址** | **`http://localhost:8777/`** —— Playwright 访问 `127.0.0.1` 会被 refused |

### 1.2 环境注意

- **用 PowerShell 调 node**：bash 里跑 node 可能以退出码 23 结束且**无输出**；长输出一律 `Out-File` 再读
- **不要设 `PLAYWRIGHT_BROWSERS_PATH`**
- 日志编码：`Out-File -Encoding utf8` 在 PowerShell 5.1 下常写成 **UTF-16**，读时按 `utf-16 → utf-8-sig → utf-8` 顺序试
- 脚本必须 `try/catch + flush`，否则抛错时已收集的断言结果全丢

---

## 2. 种子注入的七个坑

> **脚本不生效先查这些，别怀疑产品。**

1. **`addInitScript(fn)` 会丢闭包** —— Playwright 只序列化函数源码，外层变量在页面里不存在。
   → 种子必须**拼字符串注入**：`await ctx.addInitScript({ content: SEED })`。
2. **`settings.places` 必须显式 `[]`** —— 否则 `migrateLooseLocationsToPlaces()` 会灌进默认地点。
3. **空库 + `tourDone !== true` → 自动触发新手导览**，并注入示例数据。
   → 种子必须 `tourDone: true`；localStorage 键是 **`itemin_settings`**。
4. **`places[].zones` 是字符串数组**（`['冷藏','冷冻']`），**不是** `[{name:'冷藏'}]`。
5. **商品 `expiryDate` 别设太近**（否则首页「过期提醒」弹出挡住截图），并设 `settings.expiringDays = 0`。
6. **每个场景独立 `newContext()`** —— 复用同一个 page 时残留弹窗会挡住后续探测。
7. **按钮有前置条件**：
   - 「扫码接入」包在 `v-if="settings.cloudSyncEnabled"` 里 → 不先开云同步按钮**根本不渲染**
   - 「高级设置」入口在设置页 → 不先 `navigateTo('settings')` 就点不到

### 定位技巧

`page.getByText('...').first()` + `scrollIntoViewIfNeeded()` 比 `locator('button:has-text()')` 稳；
表单优先 `label:has-text("商品名称") ~ input[type="text"]`，别用 placeholder 文案。

### localStorage 键速查

| key | 内容 |
|---|---|
| `itemin_settings` | 设置（含 `tourDone` / `demoKept` / `simpleMode`） |
| `itemin_products` | 商品 |
| `itemin_records` | 流水 |
| `itemin_barcode_cache` | 条码记忆库 |
| `itemin_undo_cache` | 撤销快照（本机，不上云） |
| `itemin_sync_v2` | 同步状态与待推队列 |

> ❗键名**没有** `_v1` 后缀；写错键名 = 空库 = 意外触发首次导览。
>
> ❗**前缀已从 `food_inventory_*` 改为 `itemin_*`**（启动时 `migrateLocalStoragePrefix()` 自动搬迁旧键）。
> 沿用旧前缀的种子脚本会**全部失效且不报错** —— 表现为「种子写完仍是空库、还弹了导览」。
> 种子务必用新前缀，并同时写入 `itemin_prefix_migrated`，否则旧键可能被搬进来：
>
> ```js
> localStorage.setItem('itemin_prefix_migrated', String(Date.now()));
> ```

---

## 3. 白名单与导出核对

### 3.1 两份白名单

| 清单 | 位置 | 作用 | 漏登记后果 |
|---|---|---|---|
| `return {}` | `index.html:10340` | 模板可见 | **UI 完全正常但不落盘**（刷新回滚、无 toast）；若漏的是**处理器本身**（`@click="fn(...)"`）则直接 `TypeError: fn is not a function`，按钮失效 |
| `window.__itemin` | `index.html:10332` | 自动化可达 | 脚本测不到 |

新增函数 / 状态**必须同时进两份**（除非刻意只给其中一方）。

### 3.2 核对方法（`tools/chk_exports.py` 已不在仓库）

建议的正则：

```python
re.search(r'(?<![\w$])' + name + r'(?=\s*[,}])', block)   # 用 in 会被尾逗号骗过
```

步骤：
1. 取模板区（`<div id="app">` 到 app 脚本之前）所有 `{{ }}` / `v-if` / `@click` / `:prop` 里出现的标识符；
   **必须排除 `v-for` 别名与 `v-slot` 解构**，否则满屏噪音（本次 100 项里 97 项是别名的属性访问）；
2. 取 `return {` 到对应 `};` 之间的键名；
3. 只保留**被当作函数调用**的名字（`name(`，且前面不是 `.`）—— 这是信噪比最高的口径：
   94 个调用点减完定义集只剩 1 项真雷，一眼能看完；
4. 差集分两种后果：漏的是**值** → 静默失效（渲染成空 / 不落盘）；
   漏的是**处理器本身** → `TypeError: xxx is not a function`，点击完全无反应。

> 本次（v1.4.0）就是靠第 3 步揪出 `toggleCategory`：录入 / 批量录入 / 编辑三处「分类」按钮全废，
> 而页面加载与其它页面均无异常 —— 只靠「点一遍」很难发现，靠差集一秒定位。

> 需要原脚本时（旧历史已移出本仓库，只能从备份取）：
> `git --git-dir=D:/WorkBuddyWorkSpace/ItemIn_git_old_backup archive dae2889 tools/ | tar -x`（会带回 `chk_exports.py` 与 `tools/e2e/`）。

### 3.3 有些是 getter，不是 ref

`showScanModal` / `showFilterModal` / `apiMessage` / `tourActive` 等导出的是 `() => xxx.value`。

- 读：`__itemin.showScanModal()`
- 写：`__itemin.setShowScanModal(true)` / `setShowFilterModal(true)`
- ❌ `__itemin.showScanModal.value = true` —— **静默无效**

---

## 4. 断言与截图纪律

- **颜色/透明度过渡会造出中间态**：截图可能刚好抓在渐变中途。加**稳态复采样**：
  ```js
  const settle = async () => { await page.waitForTimeout(500); return probe(); };
  ```
- **断言写错 ≠ 产品有 Bug** —— 先分辨是谁的错
- 每个场景落 `_results.json`，同时打 `== 场景名 | 说明` + `JSON.stringify(info)`
- `fill()` 对 `input[type=number]` **只派发 `input` 不派发 `change`**（假阴性）→ 补 `.blur()`
- element screenshot 前**不要**隐藏 `position:fixed`；比元素高的图用 `page.screenshot({clip, fullPage:true})`

### 拦截外部 API

不要打真实云端。当前后端是 **Upstash Redis REST**（旧 jsonbin 的 `{record, metadata}` 形状已不适用）：

```js
// 读：GET {url}/get/itemin%3Async → { result: "<JSON 字符串>" }
// 写：POST {url}/set/itemin%3Async → { result: "OK" }
await ctx.route('**/upstash.io/**', async route => {
  const mode = global.__syncMode || 'ok';
  if (mode === 'fail401') {
    return route.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ error: 'WRONGPASS invalid or missing auth token' }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ result: JSON.stringify({
      schemaVersion: 2, syncedAt: 'demo', events: [],
      snapshot: { products: [], records: [], settings: {}, upToId: null, knownIds: [] },
      barcodeCache: {} }) }) });
});
```

- 手动触发同步：`__itemin.cloudSync()`
- 查看待推队列：localStorage `itemin_sync_v2`
- 条码查询 API（apizero / Open Food Facts）也要拦截，否则会打真实网络

### 导览遮罩

导览蒙层会拦住所有点击。探针开头：

```js
await page.waitForTimeout(1500);        // 先等导览自动起来
await page.evaluate(() => window.__itemin.endTour());
```

并确保种子里 `settings.tourDone = true`。

---

## 5. 回归脚本清单

`tools/e2e/` 已随精简移除，当前回归脚本是工作区根目录的 `_` 前缀文件（**不进仓库**）：

| 脚本 | 覆盖 |
|---|---|
| `_shot_visual.js` | 全页面视觉巡检（首页 / 记录 / 统计 / 设置 / 指南） |
| `_shot_itemin.js` | 应用主流程冒烟 |
| `_shot_settings*.js` | 设置页分区截图 |
| `_shot_ver.js` | 版本号 / changelog 展示 |
| `_gen_icons.js` | 图标生成（非测试） |
| `_probe_ref.js` / `_probe_theme.js` | 配色 / 图标像素探针 |
| `_chk_states.js` | 首页三状态（互斥 / 标记 / 空态 / 筛选弹窗）16 项断言 |
| `_chk_toggle.js` | 分类按钮回归（防 `return {}` 漏登记） |
| `_verify_fix.js` | localStorage 前缀隔离与迁移 |

> 以上脚本**全部放在根目录 `_dev/` 下**（截图产物在 `_dev/shots/`）。`_dev/` 匹配 `.gitignore` 的 `_*/`，不会进仓库。

命名约定：**`_dev/_shot_<主题>.js`**，截图产物 `_dev/shots/_<主题>_*.png`；单轮验收可写 `_dev/_chk_<主题>.js`。

> 新建回归脚本时沿用本手册 §1 的启动模板与 §4 的断言纪律。

---

## 6. 调试产物与清理

- 一律 `_` 前缀（`.gitignore` 已屏蔽），**禁 `git add .` / `-A`**
- 清理 = **先移到 `%TEMP%/ItemIn-cleanup-<日期>/` 再确认**，不直接删
- PowerShell `Add-Type`（回收站 API）常被安全策略拦截，别指望它
