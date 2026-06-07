# BusNotifier 公車到站提醒

即時追蹤台灣公車到站時間，在公車快到站時推送瀏覽器通知與音效提醒。

---

## 功能

- **路線搜尋** — 依縣市 + 路線號碼查詢去程／回程站牌，支援全台 21 縣市
- **即時 ETA** — 查詢結果每站顯示預估到站分鐘數，每 30 秒自動刷新
  - 3 分鐘內 → 橙色警示
  - 4–8 分鐘 → 黃色提醒
  - 9 分鐘以上 → 藍色一般
  - 即將進站 → 綠色閃爍
- **自訂監控** — 可對任意站牌設定監控，公車進入 3 分鐘 / 2 站內時觸發提醒
- **瀏覽器通知 + 音效** — 使用 Notification API 與 Web Audio API
- **Mock 模式** — 無需 TDX 憑證即可在本機開發測試

---

## 技術棧

| 類別 | 套件 |
|------|------|
| 框架 | React 18 + TypeScript |
| 建構工具 | Vite 5 |
| 狀態管理 | Zustand |
| 資料請求 | Axios |
| 樣式 | Tailwind CSS 3 |
| 資料來源 | [TDX 運輸資料流通服務](https://tdx.transportdata.tw/) |

---

## 事前準備

- Node.js ≥ 18
- TDX 帳號（免費註冊）：https://tdx.transportdata.tw/register

### 取得 TDX Client ID / Secret

1. 登入 TDX → 右上角「會員中心」→「API 金鑰管理」
2. 建立一組應用程式，複製 **Client ID** 與 **Client Secret**

---

## 安裝與啟動

```bash
# 安裝依賴
npm install

# 複製環境變數範本並填入憑證
cp .env.example .env
```

編輯 `.env`：

```env
# 切換為 false 以使用真實 TDX API
VITE_USE_MOCK=false

VITE_TDX_CLIENT_ID=你的_client_id
VITE_TDX_CLIENT_SECRET=你的_client_secret
```

```bash
# 啟動開發伺服器
npm run dev
```

瀏覽器開啟 `http://localhost:5173`

### 僅使用 Mock 資料（無需 TDX 帳號）

```env
VITE_USE_MOCK=true
```

Mock 模式會模擬公車逐漸靠近的 ETA 循環，每次 polling 減少 30 秒，歸零後重置。

---

## 建置

```bash
npm run build   # 輸出至 dist/
npm run preview # 預覽 production build
```

---

## 專案結構

```
src/
├── api/
│   ├── busService.ts   # fetchStops / fetchEta / fetchAllStopsEta
│   ├── tdxClient.ts    # OAuth2 token + Axios instance
│   └── mockData.ts     # Mock 站牌與 ETA 資料
├── components/
│   ├── AlertBanner/    # 監控中站牌的即時到站卡片
│   ├── MonitorList/    # 已監控站牌列表
│   ├── NotificationPermission/  # 通知權限提示橫幅
│   ├── Search/         # 路線搜尋表單
│   └── StopList/       # 站牌列表 + ETA 顯示
├── hooks/
│   ├── useBusPolling.ts  # 定時輪詢 + 警報觸發
│   ├── useNotification.ts
│   └── useAudio.ts
├── store/
│   └── useBusStore.ts  # Zustand：監控目標持久化至 localStorage
├── types/
│   └── bus.ts          # 所有型別定義
└── utils/
    ├── cities.ts       # 縣市代碼對照表
    └── localStorage.ts
```

---

## 環境變數一覽

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `VITE_USE_MOCK` | `true` | `false` 改用真實 TDX API |
| `VITE_TDX_CLIENT_ID` | — | TDX OAuth2 Client ID |
| `VITE_TDX_CLIENT_SECRET` | — | TDX OAuth2 Client Secret |

> **注意**：`.env` 內容會打包進瀏覽器 bundle，請勿將 Secret 提交至公開 repo。

---

## 授權

MIT
