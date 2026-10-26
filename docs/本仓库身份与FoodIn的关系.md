# 本仓库身份与 FoodIn 的关系

> 成立于 **2026-10-11**，最后核对 **2026-10-18**（版本 `1.4.0` / SW `item-inventory-v8`）。
> **新会话先读这一份**，再读《[文档索引](./文档索引.md)》。

---

## 一句话

本仓库是 **FoodIn 的一个独立分叉副本**，自上游 **v2.36.3** 起继续开发，与 `Dailyray-c/FoodIn`
**已完全脱钩**（`origin` 指向自己的仓库 `Dailyray-c/ItemIn`，push 影响不到上游）。
自 **v1.0.0** 起应用更名为 **「物品记」** 并启用**木纹棕**品牌色；`localStorage` 键前缀
为 `itemin_*`，与上游 `food_inventory_*` **已隔离**（启动时自动迁移，见文末）。

---

## 三个容易混淆的对象

| 对象 | 位置 | 关系 |
|---|---|---|
| **FoodIn 上游仓库** | `D:\DS Harness\FoodIn` | **只读参考源**，**勿修改** |
| **本仓库（物品记）** | 当前工作区根目录 | **开发主线** |
| 原「物品记 ItemIn」（从零手写的那一套） | 已归档，不在工作区 | **已废弃**，勿混用其代码或文档 |

---

## 版本号：两套序列

物品记使用**自己的序列**，第一号版本 = **1.0.0**，对应的正是上游 FoodIn 的 **2.37.0**。
FoodIn 2.36 及更早的历史**保留原号、不重编号**。

| 物品记 | 对应 FoodIn | 内容 |
|---|---|---|
| **1.0.0** | 2.37.0 | 更名「物品记」+ 木纹棕品牌色 + 新图标 |
| 1.0.1 | 2.37.1 | 图标按参考图精确复刻 + 设置页配色统一 |
| 1.1.0 | 2.38.0 | 移除食品专属功能（加热 / 小票 OCR / 剩菜）+ 保质期改选填 |
| 1.1.1 | 2.38.1 | 日期信息折叠 + 净含量移入「更多信息」 |
| 1.2.0 | 2.39.0 | 语义层通用化（取出 / 借出归还 / 补货线 / 到期类型 / 资产优先统计） |
| **1.3.0** | 2.40.0 | 配色体系重做（三层 + 按功能域分色） |
| **1.4.0** | — | 辅助色升级为「古风彩虹」+ 每个功能模块一色 |

完整历史见 `docs/CHANGELOG.md`。

---

## 当前坐标（2026-10-24）

| 项 | 值 |
|---|---|
| 应用名 | 物品记 ItemIn |
| 版本 | **1.5.0**（`index.html:16` `window.ITEMIN_V`） |
| Service Worker | **item-inventory-v9** |
| 品牌主色 | `#8A5F3B`（木纹棕） |
| 调试句柄 | `window.__itemin` |
| 应用文件 | `index.html`，10,422 行 |
| Git | `master` @ `origin` = `https://github.com/Dailyray-c/ItemIn.git` |

---

## 分叉点（可精确回溯）

- 上游 HEAD：`dae28891b1f92c67fbc94d4de14bcda4e6098b38`（`master`）
- 分叉基线：`CURRENT_VERSION = '2.36.3'` / SW `food-inventory-v123`
- ❗**本仓库不再保留上游 git 历史**（2026-10-24 起）：旧历史里提交过 `backups/inventory-2026-09-*.json`
  共 14 份真实库存快照，推到公开仓库等于公开数据，因此改用「全新仓库」——当前仓库从单个提交起步。
  旧 `.git` 留在仓库外：`D:/WorkBuddyWorkSpace/ItemIn_git_old_backup`（确认远端无误后可删）。

```bash
# 下面这些命令在本仓库里**已不可用**（没有了 dae2889）
git show dae2889:index.html
git restore --source=dae2889 tools/
# 需要旧文件时，去上面那个备份目录里找，或者去上游 FoodIn 仓库
```

---

## 相对上游移除了什么

2026-10-11 精简（备份类 + 检验测试类），移除物**移到 `%TEMP%/ItemIn-cleanup-2026-10-11/`，未硬删**：

| 已移除 | 原因 | 现状 |
|---|---|---|
| `backups/`（CI 库存备份） | 与开发运行无关 | 不再有定时备份 |
| `tools/`（`chk_exports.py` + `tools/e2e/`） | 检验 / 测试脚本 | **仍未恢复**，需要时 `git --git-dir=D:/WorkBuddyWorkSpace/ItemIn_git_old_backup archive dae2889 tools/ | tar -x` |
| `daily-backup.yml` / `daily-expiry-check.yml` | 依赖上游 secrets | 已移除；配套 `scripts/` Python 脚本同批移除（2026-10-17） |
| `versions/`（38 个旧快照） | 体积 | ✅ **自 v1.3.0 起恢复**，现为 `versions/v1.4.0/` |

**v1.1.0 随「移除小票 OCR」一并移除**：`proxy/`、`paddle_models_dl.py`、`start_paddle_host.bat`
（移到 `_backup_before_trim/ocr_external_removed/`）。

> ⚠️ 两条随之变化的习惯：
> 1. **没有 `chk_exports.py`** → 导出白名单靠手工正则核对（方法见 `docs/E2E测试手册.md` §3）
> 2. **`versions/` 已恢复** → 回退仍是 `cp versions/vX.Y.Z/* .`，但**归档必须在 bump 之后做**

---

## 相对上游保留了什么

`index.html`、`styles.css`、`service-worker.js`、`manifest.json`、`icon-180/192/512.png`、`vendor/`、
`src/tailwind.css`、`tailwind.config.js`、`package.json`、`package-lock.json`、`node_modules/`、
`start_service.bat`、`push-safe.sh`（及 `push-clean.sh`、`push-readme.sh`）、
`.github/workflows/deploy.yml`、`UI规范.md`、`docs/`、`.gitignore`、`.gitattributes`

---

## 与上游的隔离 / 共享

| 维度 | 关系 |
|---|---|
| Git | **完全脱钩**：`origin` → `Dailyray-c/ItemIn` |
| 离线缓存 | **隔离**：`item-inventory-*` vs `food-inventory-*`；`activate` 只清自身前缀 |
| 资源 URL | **隔离**：本应用全部带 `?v=<ITEMIN_V>` |
| `localStorage` 前缀 | **隔离**：`itemin_*` vs 上游 `food_inventory_*`（同源 8088 端口调试不再互相覆盖） |
| `localStorage` 键 | 已隔离：启动时 `migrateLocalStoragePrefix()` 一次性搬迁，旧键保留不删 |
| **云同步文档键** | **隔离（v1.5.0）**：`itemin:sync` vs 上游 `foodin:sync`。配置（REST URL + Token）**共用同一份**，只是键不同 → 同库不同键，互不重放 |

---

## 更名与换色（v1.0.0）

| 项 | 上游 FoodIn | 本仓库 |
|---|---|---|
| 应用名 | FoodIn | **物品记** |
| 主色 | `#F97316` | **`#8A5F3B`** |
| 按压态 | `#EA580C` | `#6E4A2E` |
| 页面底 | `#F3F4F6` | `#FAF6F1` |
| PWA `theme_color` | `#F97316` | `#8A5F3B` |
| 图标 | 橙色购物篮 | 浅木纹底 + 深棕收纳架 |
| 调试句柄 | `__foodin` | `__itemin` |
| SW 缓存前缀 | `food-inventory-` | `item-inventory-` |

**换色入口（v1.4.0 起：一处生成、多处派生）**：
① **`tailwind.config.js` 顶部的 `CHIN` 古风色阶表 = 唯一物理真源** —— `ok`/`warn`/`danger`/`info`/`mod`/`record` 全是它的别名，改色只改这一张表
② `index.html` `:root` 的 4 个 `--fi-brand*`（主色）+ 4 个语义色 `-weak`（示意图层专用）+ `--fi-mk-*`（示意图层），值必须与 ① 逐值一致
③ 运行期真源三处：`STATUS_COLOR_MAP`（状态三色）、`recordBarColor()`（记录六色）、`MODULE_STYLE`（模块五色）
④ `brand` 主色仍单独定义（`BRAND` 常量），因为它是「主色」不是「古风辅助色」

改完执行 `npm run build:css`。详见 `UI规范.md` §2.1。

---

## 功能演进（v1.1.0 → v1.4.0）

### v1.1.0：移除食品专属功能（只删不加）

| 已移除 | 范围 |
|---|---|
| 「加热」记录类型 | 商品卡按钮 / 加热次数 / 记录徽章与筛选 / 撤销分支 / 指南说明 |
| 「剩菜」体系 | 统计卡 / 设置项 / 内置分类「剩菜剩饭」及其删除保护 |
| 「小票 OCR」整条链路 | 批量页拍照识别、扫码弹层文字识别、三引擎（Paddle / Tesseract / 百度云）及外部依赖 |

**同时调整**：日期信息整体改为**选填**，取消「至少填两项」校验（任填两项仍自动算第三项）。

**保留未动**：扫码录入、云同步、名称清洗、CSV 导出。

### v1.1.1：录入表单精简

「日期信息」点击展开、默认收起（三处一致）；「净含量」移入「更多信息」。

### v1.2.0：语义层通用化（食材库 → 物品库）

| 改动 | 说明 |
|---|---|
| ① 词表统一 | 「吃完」→「取出」；修掉「取出」卡口径含 `waste` 的重复计数 bug |
| ② 分类通用化 | 9 类通用物品集合；「补全常用物品分类」**只增不删** |
| ③ 到期类型 | 新增 `expiryKind`（保质期 / 保修 / 更换 / 归还），**不新增第二个日期字段** |
| ④ 借出 / 归还 | 新增两类流水；未归还**由流水推导**，不存状态位 |
| ⑤ 补货线 | `minQty`，低于即进「待补货」 |
| ⑥ 首页四卡 | 在库 / 待补货 / 借出未还 / 需关注 + 智能视图 chips |
| ⑦ 数量直改 | 点数量圆 → 可撤销的「调整」流水 |
| ⑧ 重复购买提示 | 按条码或同名命中已有物品即时提示 |
| ⑨ 统计口径 | 资产优先；浪费复盘默认收起 |
| ⑩ 空态 | 「导入备份 / 载入示例」双入口；示例数据可一键清除 |

> **未做**（用户明确排除）：家庭成员 / 多用户协作。

### v1.3.0：配色体系重做

三层色板（stone 中性骨架 / brand 明度体系 / 语义四色）+ 一组记录类型色；
按功能域分色（图标跟域色，控件跟品牌色）。

### v1.4.0：辅助色换古风彩虹 + 模块分色

主色木纹棕不变；11 族古风色（朱砂 / 赭石 / 藤黄 / 松花 / 竹青 / 天水碧 / 石青 / 黛灰 / 靛青 / 藕荷 / 绛色）
共用一条明度曲线，`ok`/`warn`/`danger`/`info`/`mod`/`record` 全部从 `CHIN` 派生。
每个功能模块一色：首页=木纹棕 · 录入=松花 · 记录=天水碧 · 统计=靛青 · 设置=藕荷。

---

## 尚未做的（需要决策）

- **未接入 remote**：当前没有任何远程。发布前需 `git remote add origin <新仓库>`，
  并把 `README.md` / `push-safe.sh` 里的地址改成新仓库的

已结项（不再是待决策项）：

- **`localStorage` 前缀已隔离**：`itemin_*`，启动时自动从 `food_inventory_*` 迁移
- **`scripts/` 已移除**：定时备份 / 临期提醒不再运行；恢复见 `docs/开发经验总览.md` 的「已知缺口」表
