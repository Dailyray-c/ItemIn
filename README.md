# 物品记 ItemIn

> 家庭物品库存与到期管理 PWA。单文件、可安装、可离线：扫码录入、地点/分区两级存放、
> 到期提醒（保质期 / 保修 / 更换 / 归还）、六类流水与撤销、资产优先统计、
> Upstash Redis 事件溯源云同步。

**当前版本 `1.4.0`** ｜ Service Worker `item-inventory-v8` ｜ 应用文件 `index.html`（10,340 行）
**本仓库尚未部署**：与上游脱钩后**没有任何 remote**，发布前需自行接入仓库（见 §八）。

> 🔀 本仓库由 **FoodIn** 分叉而来（分叉点 `dae2889` = 上游 v2.36.3），自 **v1.0.0** 起更名「物品记」
> 并启用木纹棕品牌色，版本号使用**自成一系的 1.x 序列**。
> 身份说明见 [`docs/本仓库身份与FoodIn的关系.md`](docs/本仓库身份与FoodIn的关系.md)。

---

## 一、功能

| 模块 | 说明 |
|---|---|
| 库存录入 | 手动 / 扫码录入；名称、数量、位置、补货线、总价；日期信息（**到期类型** + 生产日期 / 保质期 / 到期日期）**整体选填**，任填两项自动算第三项 |
| 批量录入 | 多条目同屏录入，逐条校验后汇总成**一个**问题弹窗 |
| 位置管理 | 「地点 → 分区」两级；`location` 存**一个位置标签**（地点名 / 分区名 / 独立标签） |
| 到期提醒 | 按 `expiryDate` 推算临期 / 过期；首页铃铛与「需关注」卡 |
| 流水 | **六类**：入库 `in` / 取出 `eat` / 浪费 `waste` / 调整 `adjust` / 借出 `borrow` / 归还 `return`；支持撤销 |
| 借出归还 | 未归还清单**完全由流水推导**（借出 − 归还 > 0），商品上不存状态位 |
| 智能视图 | 待补货 / 借出未还 / 临期过期 / 待归位 / 没填价格 / 长期未动 |
| 统计 | 资产优先：库存货值 / 可用天数 / 在库 / 已过期；浪费复盘默认收起 |
| 云同步 | `localStorage` + Upstash Redis 事件溯源；铁律「先拉取，拉不到绝不下发」 |
| 数据 | JSON 全量备份导入导出、库存/流水/统计 CSV |
| PWA | 可安装、离线可用 |

> 食品专属功能（加热 / 剩菜 / 小票 OCR）已在 **v1.1.0** 整条移除，相关代码与外部依赖**不在本仓库**。

---

## 二、技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 视图 | **Vue 3.5.42** | `vendor/vue.global.prod.js` 本地加载，含运行时编译器（in-DOM 模板） |
| 样式 | **TailwindCSS 3.4.19** | 只做预编译：`src/tailwind.css` → `styles.css`（产物入库） |
| 构建 | **无** | 没有打包器 / SFC / 路由 / TypeScript；唯一构建动作是重编译 CSS |
| 离线 | **Service Worker** | 同源 GET 白名单 + 预缓存 + 504 兜底 |
| 数据 | **localStorage** + **Upstash Redis REST** | 单文档 `foodin:sync`，gzip + base64 信封 |
| 扫码 | `vendor/html5-qrcode.min.js`、`vendor/qrcode.min.js` | **按需注入**，不进首屏 |

---

## 三、目录结构

```
ItemIn/
├─ index.html              ★ 应用本体（样式 / 模板 / setup 全在这里）
├─ styles.css              Tailwind 编译产物（必须提交）
├─ src/tailwind.css        编译入口（3 行 @tailwind）
├─ tailwind.config.js      色板 + safelist
├─ service-worker.js       PWA 缓存（改后必须 bump CACHE_NAME）
├─ manifest.json           PWA 元信息
├─ icon-180/192/512.png    应用图标
├─ vendor/                 vue / html5-qrcode / qrcode
├─ versions/v1.4.0/        版本三件套归档（回退用）
├─ docs/                   现行文档
│   └─ archive/            历史归档（勿作为开发依据）
├─ .github/workflows/      deploy.yml（Pages 部署）
├─ push-safe.sh / push-clean.sh / push-readme.sh
├─ start_service.bat       本地静态服务（8088）
├─ UI规范.md               ★ UI 硬规则唯一依据
└─ _* 前缀文件             调试产物（已 gitignore）
```

---

## 四、本地运行

```bash
# 方式一
start_service.bat

# 方式二
python -m http.server 8088 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:8088/
```

- ❌ **不要用 `file://` 直接打开**：Service Worker、PWA、跨域全部失效
- ⚠️ **8088 与上游 FoodIn 撞端口**：两边 `styles.css` / 图标 / manifest 同名不同内容。本应用已用
  `?v=<ITEMIN_V>` 做 URL 级隔离，正常刷新即可；顽固残留时用 DevTools → Application → **Clear site data**

### 构建

```bash
npm run build:css     # tailwindcss -i ./src/tailwind.css -o ./styles.css --minify
```

**只有新增「从未出现过」的 utility class 才需要重编译**；改 `.fi-*` 组件类、JS 逻辑、模板条件都不需要。
漏编译的症状：**功能完全正常，只是样式失效或高度塌陷为 0（按钮点不到）**。

> 依赖已随仓库带入（`node_modules/`：tailwindcss 3.4.19 + playwright 1.62.1），一般无需重装。

---

## 五、开发约定（摘要）

完整规则见 [`UI规范.md`](UI规范.md) 与 [`docs/项目运行与开发上手说明.md`](docs/项目运行与开发上手说明.md)。

1. **双白名单**：新增状态 / 函数必须同时进 `return {}`（模板可见）与 `window.__itemin`（自动化），
   漏登记 = UI 正常但**不落盘**
2. **三处表单同步**：`scan` / `batch` / `edit` 结构一致，改一处必须看另两处
3. 模板里 `@change` **一律显式传参**
4. 颜色只用四层：`gray`(stone) / `brand` / 语义四色 / `record` 六色；**禁止 Tailwind 出厂色**
5. 提示只用 5 个构造函数：`toastDone / toastFail / toastGuide / toastErr / toastDup`
6. 调试产物一律 `_` 前缀；**禁 `git add .` / `-A`**
7. 改完 `index.html` **必须**抽取内联 `<script>` 跑 `node --check`

---

## 六、版本与归档

- 版本号 `X.Y.Z` 三位必填；判定规则见 `UI规范.md` §8.2
- **发版四处联动**：`window.ITEMIN_V` → `CACHE_NAME` 数值 +1 → changelog（应用内 + `docs/CHANGELOG.md`）
  → **改完之后**再备份 `versions/vX.Y.Z/`
- 归档方向：`versions/vX.Y.Z/` 的目录名必须等于文件内部的版本号
- 回退：`cp versions/vX.Y.Z/* .`（若该版本后新增过 utility class，还需按该版本重编译 `styles.css`）

---

## 七、文档

| 文档 | 用途 |
|---|---|
| [`docs/文档索引.md`](docs/文档索引.md) | ⭐ **先读**：有哪些文档、谁管什么、冲突时听谁的 |
| [`docs/本仓库身份与FoodIn的关系.md`](docs/本仓库身份与FoodIn的关系.md) | 仓库身份、分叉点、更名换色、精简清单 |
| [`docs/项目运行与开发上手说明.md`](docs/项目运行与开发上手说明.md) | 上手流程：运行 / 构建 / 验收 / 发布 |
| [`docs/项目架构与实现逻辑分析_v1.4.0.md`](docs/项目架构与实现逻辑分析_v1.4.0.md) | 源码地图：分区、数据模型、流程、接口 |
| [`UI规范.md`](UI规范.md) | UI 硬规则唯一依据 |
| [`docs/开发经验总览.md`](docs/开发经验总览.md) | 踩坑索引与排错速查 |
| [`docs/E2E测试手册.md`](docs/E2E测试手册.md) | 截图 / 回归脚本操作细节 |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | 完整版本历史（含分叉前 FoodIn 2.x） |

---

## 八、部署

### 前提：先接入 remote

```bash
git remote add origin <你的仓库地址>
```

当前 `push-safe.sh` 在 fetch 阶段会因无 remote 而**明确报错退出**（这是有意的保护，不是故障）。

### 发布

```bash
./push-safe.sh "release(v1.3.1): 一句话说明"
```

- `push-safe.sh`：固定白名单 + `versions/` 全量（常规发版）
- `push-clean.sh`：`git add -u` + `docs/`（文档整理后，**新增文档走这个**）
- `push-readme.sh`：只推 README

三个脚本都：直连 GitHub（清代理）、`FETCH_HEAD` OID 判活、非快进时重新对齐后重演提交、**绝不 rebase**。

### 部署链路

```
git push → .github/workflows/deploy.yml → cp 白名单到 _site/ → GitHub Pages
```

- 拷贝白名单：`index.html` `styles.css` `service-worker.js` `manifest.json` `icon-180/192/512.png` + `vendor/`
- **新增顶层目录必须同步加 `cp -r <dir> _site/`**，否则线上 404
- 三方一致性：**deploy.yml 拷贝清单 ⊇ `PRECACHE_ASSETS` ⊇ 页面 `src="./…"`**
- 改过 SW 后线上需**刷新两次**

---

## 九、数据与隐私

- 库存数据默认仅存本机 `localStorage`（键前缀 `itemin_*`，与上游 FoodIn 的 `food_inventory_*` **已隔离**）
- 从旧版本升级时，启动会自动把 `food_inventory_*` 一次性搬到 `itemin_*`；旧键保留不删（回滚兜底），确认无碍后可手动清理
- 开启云同步后经 Upstash Redis 同步；**请勿在商品名中存放敏感信息**
- 撤销快照仅存本机，**不上传云端**
- 与上游 FoodIn 部署在同一域名时两者会**共享 localStorage**，离线缓存已隔离
  （`item-inventory-*` vs `food-inventory-*`）

---

## 十、品牌与换色

**v1.4.0 起是「一处生成、多处派生」**：`tailwind.config.js` 顶部的 `CHIN` 古风色阶表是全部辅助色的
物理真源，`ok` / `warn` / `danger` / `info` / `mod` / `record` 六组都是它的别名。改色流程：

| # | 位置 | 内容 |
|---|---|---|
| ① | `tailwind.config.js` → `CHIN`（+ `BRAND`） | 11 族古风色 × 8 档 / 主色木纹棕 10 档 —— **改这里** |
| ② | `index.html` `<style>` → `:root` | 4 个 `--fi-brand*` + 4 个语义色 `-weak` + `--fi-mk-*`（示意图层），值须与 ① 逐值一致 |
| ③ | `index.html` → `STATUS_COLOR_MAP` / `recordBarColor()` / `MODULE_STYLE` | 运行期真源：状态三色 / 记录六色 / 模块五色 |
| ④ | `npm run build:css` | 重编译 `styles.css`（产物入库） |

当前主色 `brand-500 = #8A5F3B`（木纹棕），同时是 PWA `theme_color`。
模块色：首页=木纹棕 · 录入=松花 `#609b36` · 记录=天水碧 `#368c8c` · 统计=靛青 `#443795` · 设置=藕荷 `#a23f70`。

> ❗**不要**用品牌色替代语义色；**状态色与记录类型色是两套语义，不得合并**。
> ❗**控件（主按钮 / 开关 / 分段按钮 / FAB）一律品牌色**，模块色只用于导航 / 页头 / 域图标。
> 图标由 `_dev/_gen_icons.js`（Playwright 渲染 SVG，结果可复现）生成；所有调试脚本都收在 `_dev/`（`_` 前缀目录已被 `.gitignore` 屏蔽）。
