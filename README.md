# BusNotifier 公車到站提醒

即時追蹤台灣公車到站時間，透過 **LINE Bot** 主動推播到站通知，支援固定指令與 AI 自然語言兩種操作模式。

---

## 功能

- **LINE Bot 推播** — 公車進入 3 分鐘 / 2 站內時，自動傳訊息通知
- **多使用者** — 每位加入 Bot 的使用者可各自設定監控路線與站牌
- **AI 模式** — 整合 OpenAI，讓使用者用自然語言設定監控，無需記憶指令格式
- **指令模式** — 使用固定指令快速操作
- **即時查詢** — 隨時查詢目前所有監控站牌的 ETA
- **網頁前台** — React SPA，可搜尋站牌、查看即時 ETA（需瀏覽器保持開啟）
- **Mock 模式** — 無需 TDX 憑證即可在本機開發測試前台

---

## 架構

```
前台 (Vite + React)          後台 (Express + Node.js)
─────────────────────        ──────────────────────────
搜尋站牌 / 查看 ETA   ←→    LINE Webhook 接收指令
（需瀏覽器開啟）             ├─ 指令模式：解析固定指令
                             ├─ AI 模式：呼叫 OpenAI 解析自然語言
                             ├─ 背景每 30 秒 poll TDX API
                             └─ 快到站時 push LINE 訊息
```

---

## 技術棧

| 類別 | 套件 |
|------|------|
| 前台框架 | React 18 + TypeScript + Vite 5 |
| 後台框架 | Express 4 |
| LINE 整合 | @line/bot-sdk v9 |
| AI 自然語言 | OpenAI API（gpt-4o-mini） |
| 狀態管理 | Zustand |
| 資料請求 | Axios |
| 樣式 | Tailwind CSS 3 |
| 資料來源 | [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) |

---

## 事前準備

- Node.js ≥ 18
- TDX 帳號（免費）：https://tdx.transportdata.tw/register
- LINE Developers 帳號：https://developers.line.biz/
- OpenAI API Key（AI 模式需要）：https://platform.openai.com/api-keys
- 具備 HTTPS 公開網址（Webhook 必要）

### 取得 TDX Client ID / Secret

1. 登入 TDX → 右上角「會員中心」→「API 金鑰管理」
2. 建立一組應用程式，複製 **Client ID** 與 **Client Secret**

### 建立 LINE Messaging API Channel

1. 登入 LINE Developers Console → 建立 Provider → 建立 **Messaging API** channel
2. 進入 channel → **Messaging API** 頁籤
3. 複製 **Channel secret**（Basic settings）與 **Channel access token**（Messaging API）
4. 設定 Webhook URL：`https://你的網域/webhook`，並開啟「Use webhook」

---

## 安裝

```bash
npm install
```

建立 `.env`：

```env
# ── TDX API（前後台共用） ─────────────────────
VITE_USE_MOCK=false
VITE_TDX_CLIENT_ID=你的_tdx_client_id
VITE_TDX_CLIENT_SECRET=你的_tdx_client_secret

# ── LINE Bot（後台） ──────────────────────────
LINE_CHANNEL_SECRET=你的_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=你的_line_channel_access_token

# ── 操作模式 ──────────────────────────────────
# command（預設）：使用固定指令
# ai：使用自然語言，需填入 OPENAI_API_KEY
BOT_MODE=command

# ── OpenAI（BOT_MODE=ai 時必填） ─────────────
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # 預設 gpt-4o-mini

PORT=3000
```

> TDX 金鑰只需填一份。`VITE_` 前綴讓前台 Vite bundle 能讀到；後台 server 會自動 fallback 讀取同一組變數。

---

## 啟動

### 後台 LINE Bot Server（主要服務）

```bash
# 正式執行
npm run server

# 開發模式（檔案變更自動重啟）
npm run server:dev
```

Server 啟動後會同時：
- 監聽 `POST /webhook` 接收 LINE 事件
- 每 30 秒 poll TDX API，快到站時主動推播

### 前台開發（選用）

```bash
npm run dev      # http://localhost:5173
npm run build    # 輸出至 dist/
```

---

## LINE Bot 使用方式

模式由 `.env` 的 `BOT_MODE` 決定，重啟 server 後生效。

### AI 模式（`BOT_MODE=ai`）

直接用口語描述需求：

```
我要監控307路去程在台北車站
台北市299回程象山站幫我追蹤
現在307多久到
取消所有監控
```

### 指令模式（`BOT_MODE=command`，預設）

| 傳給 Bot | 效果 |
|----------|------|
| `設定 台北市 307 去程 台北車站` | 開始監控指定站牌 |
| `查詢` | 回報目前所有監控站牌的 ETA |
| `停止 307 去程 台北車站` | 停止單一監控 |
| `停止全部` | 清除所有監控 |
| `說明` | 顯示指令說明 |

---

## 專案結構

```
src/                         # 前台 React SPA
├── api/
│   ├── busService.ts        # fetchStops / fetchEta
│   ├── tdxClient.ts         # OAuth2 token + Axios（Vite 環境）
│   └── mockData.ts          # Mock 資料
├── components/              # UI 元件
├── hooks/                   # useBusPolling / useNotification / useAudio
├── store/useBusStore.ts     # Zustand — 監控目標持久化至 localStorage
├── types/bus.ts             # 共用型別（前後台共用）
└── utils/

server/                      # 後台 Express + LINE Bot
├── index.ts                 # 入口 — 掛載 webhook，啟動 poller
├── webhook.ts               # LINE 事件處理 + 模式路由
├── aiHandler.ts             # OpenAI function calling — 自然語言解析
├── lineClient.ts            # LINE SDK client singleton
├── busService.ts            # TDX API（Node 環境，process.env）
├── userStore.ts             # 使用者設定讀寫（JSON 檔，含 mode 欄位）
├── poller.ts                # 背景輪詢 + 推播邏輯
└── data/users.json          # 使用者資料（自動建立）
```

---

## 環境變數

| 變數 | 必填 | 用途 |
|------|------|------|
| `VITE_USE_MOCK` | ✓ | `true` 使用 mock 資料，`false` 呼叫真實 TDX |
| `VITE_TDX_CLIENT_ID` | ✓ | TDX Client ID（前後台共用） |
| `VITE_TDX_CLIENT_SECRET` | ✓ | TDX Client Secret（前後台共用） |
| `LINE_CHANNEL_SECRET` | ✓ | LINE Webhook 簽章驗證 |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✓ | LINE Push Message 授權 |
| `BOT_MODE` | — | `command`（預設）或 `ai` |
| `OPENAI_API_KEY` | `BOT_MODE=ai` | OpenAI API 金鑰 |
| `OPENAI_MODEL` | — | 使用的模型，預設 `gpt-4o-mini` |
| `PORT` | — | Server 監聽埠，預設 `3000` |

---

## 授權

MIT
