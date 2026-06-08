import OpenAI from 'openai'
import type { Direction } from '../src/types/bus.js'
import { addTarget, removeTarget, removeAllTargets, getUser } from './userStore.js'
import { fetchStops, fetchEta } from './busService.js'

const client = new OpenAI()  // reads OPENAI_API_KEY from env

// ── Constants ─────────────────────────────────────────────────────────────────

const CITY_MAP: Record<string, string> = {
  '台北市': 'Taipei',   '台北': 'Taipei',
  '新北市': 'NewTaipei', '新北': 'NewTaipei',
  '桃園市': 'Taoyuan',  '桃園': 'Taoyuan',
  '台中市': 'Taichung', '台中': 'Taichung',
  '台南市': 'Tainan',   '台南': 'Tainan',
  '高雄市': 'Kaohsiung','高雄': 'Kaohsiung',
  '基隆市': 'Keelung',  '基隆': 'Keelung',
  '新竹市': 'Hsinchu',  '新竹縣': 'HsinchuCounty',
  '苗栗縣': 'MiaoliCounty',   '彰化縣': 'ChanghuaCounty',
  '南投縣': 'NantouCounty',   '雲林縣': 'YunlinCounty',
  '嘉義市': 'Chiayi',   '嘉義縣': 'ChiayiCounty',
  '屏東縣': 'PingtungCounty', '宜蘭縣': 'YilanCounty',
  '花蓮縣': 'HualienCounty',  '臺東縣': 'TaitungCounty', '台東': 'TaitungCounty',
  '金門縣': 'KinmenCounty',   '澎湖縣': 'PenghuCounty',
}

const DIRECTION_MAP: Record<string, Direction> = { '去程': 0, '回程': 1 }

const STATUS_LABEL: Record<number, string> = { 1: '尚未發車', 2: '交管', 3: '末班已過', 4: '今日未營運' }

const SYSTEM_PROMPT = `你是台灣公車到站提醒 Bot 的 AI 助理。你能理解使用者用自然語言描述的公車監控需求，並使用工具幫他們設定、查詢或停止監控。

支援城市：台北市、新北市、桃園市、台中市、台南市、高雄市、基隆市、新竹市、新竹縣、苗栗縣、彰化縣、南投縣、雲林縣、嘉義市、嘉義縣、屏東縣、宜蘭縣、花蓮縣、臺東縣、金門縣、澎湖縣

規則：
- 使用工具完成請求後，用繁體中文簡短回覆結果
- 若工具回傳錯誤，說明原因並提供建議
- 需要城市、路線、方向、站牌才能設定監控；若資訊不足，直接問使用者
- 方向只有「去程」或「回程」兩種
- 若使用者詢問與公車監控完全無關的事，回覆：「我只能協助公車到站監控，請問要設定哪條路線？」`

// ── Tool definitions (OpenAI format) ─────────────────────────────────────────

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'setup_monitoring',
      description: '設定公車到站監控。使用者想追蹤某條路線在特定站牌的到站時間時呼叫。',
      parameters: {
        type: 'object',
        properties: {
          city:      { type: 'string', description: '城市名稱，例如：台北市、新北市' },
          routeName: { type: 'string', description: '路線號碼，例如：307、299' },
          direction: { type: 'string', enum: ['去程', '回程'], description: '行駛方向' },
          stopName:  { type: 'string', description: '站牌名稱，例如：台北車站' },
        },
        required: ['city', 'routeName', 'direction', 'stopName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_eta',
      description: '查詢使用者目前所有監控站牌的即時到站時間',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_monitoring',
      description: '停止特定站牌的公車監控',
      parameters: {
        type: 'object',
        properties: {
          routeName: { type: 'string', description: '路線號碼' },
          direction: { type: 'string', enum: ['去程', '回程'] },
          stopName:  { type: 'string', description: '站牌名稱' },
        },
        required: ['routeName', 'direction', 'stopName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_all_monitoring',
      description: '停止使用者所有的公車監控',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

// ── Arg validation (independent of OpenAI output) ────────────────────────────

const ROUTE_RE = /^[A-Za-z0-9一-鿿\-_]{1,20}$/  // 路線名最多 20 字
const STOP_RE  = /^[一-鿿 A-Za-z0-9()（）\-\/]{1,30}$/  // 站牌名最多 30 字

function validateArgs(args: Record<string, string>): string | null {
  if (args.city    !== undefined && !CITY_MAP[args.city])            return `不支援的城市：${args.city}`
  if (args.direction !== undefined && !DIRECTION_MAP[args.direction]) return '方向必須是「去程」或「回程」'
  if (args.routeName !== undefined && !ROUTE_RE.test(args.routeName)) return '路線名稱格式不正確'
  if (args.stopName  !== undefined && !STOP_RE.test(args.stopName))   return '站牌名稱格式不正確'
  return null
}

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(userId: string, name: string, args: Record<string, string>): Promise<string> {
  const validationError = validateArgs(args)
  if (validationError) return `錯誤：${validationError}`

  if (name === 'setup_monitoring') {
    const city = CITY_MAP[args.city]
    const direction = DIRECTION_MAP[args.direction]
    if (!city) return `錯誤：找不到城市「${args.city}」`
    if (direction === undefined) return '錯誤：方向請填去程或回程'

    const stops = await fetchStops(city, args.routeName, direction)
    if (stops.length === 0) return `找不到 ${args.routeName}路 ${args.direction} 的站牌，請確認路線名稱與城市`

    const stop = stops.find(s => s.stopName.includes(args.stopName) || args.stopName.includes(s.stopName))
    if (!stop) {
      const list = stops.slice(0, 10).map((s, i) => `${i + 1}. ${s.stopName}`).join('、')
      return `找不到「${args.stopName}」。可用站牌：${list}${stops.length > 10 ? '…' : ''}`
    }

    addTarget(userId, {
      id: `${args.routeName}-${direction}-${stop.stopUID}`,
      routeName: args.routeName,
      direction,
      stopUID: stop.stopUID,
      stopName: stop.stopName,
      city,
    })
    return `成功設定：${args.routeName}路 ${args.direction} ${stop.stopName}`
  }

  if (name === 'query_eta') {
    const user = getUser(userId)
    if (!user || user.targets.length === 0) return '目前沒有任何監控設定'

    const lines: string[] = []
    for (const t of user.targets) {
      const dirLabel = t.direction === 0 ? '去程' : '回程'
      try {
        const eta = await fetchEta(t.city, t.routeName, t.direction, t.stopUID)
        if (!eta) {
          lines.push(`${t.routeName}路 ${dirLabel} ${t.stopName}：無資料`)
        } else if (eta.stopStatus !== 0) {
          lines.push(`${t.routeName}路 ${dirLabel} ${t.stopName}：${STATUS_LABEL[eta.stopStatus] ?? '異常'}`)
        } else if (eta.isArriving) {
          lines.push(`${t.routeName}路 ${dirLabel} ${t.stopName}：⚡ 進站中！`)
        } else {
          const mins = eta.estimateSecs != null ? Math.ceil(eta.estimateSecs / 60) : '?'
          lines.push(`${t.routeName}路 ${dirLabel} ${t.stopName}：約 ${mins} 分鐘（${eta.stopsAway ?? '?'} 站）`)
        }
      } catch {
        lines.push(`${t.routeName}路 ${dirLabel} ${t.stopName}：查詢失敗`)
      }
    }
    return lines.join('\n')
  }

  if (name === 'stop_monitoring') {
    const direction = DIRECTION_MAP[args.direction]
    const user = getUser(userId)
    const target = user?.targets.find(
      t => t.routeName === args.routeName &&
           t.direction === direction &&
           (t.stopName.includes(args.stopName) || args.stopName.includes(t.stopName)),
    )
    if (!target) return '找不到對應的監控設定'
    removeTarget(userId, target.id)
    return `已停止：${args.routeName}路 ${args.direction} ${target.stopName}`
  }

  if (name === 'stop_all_monitoring') {
    removeAllTargets(userId)
    return '已停止所有監控'
  }

  return `未知工具：${name}`
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 200

export async function handleAiMessage(userId: string, text: string): Promise<string> {
  if (text.length > MAX_INPUT_LENGTH) {
    return '訊息太長，請簡短描述你的需求（例如：監控307路去程台北車站）。'
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    // wrap in instruction tag to keep user content separate from operator instructions
    { role: 'user', content: `<user_message>${text}</user_message>` },
  ]

  for (let i = 0; i < 5; i++) {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    })

    const message = response.choices[0].message
    messages.push(message)

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? '好的！'
    }

    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments) as Record<string, string>
      const result = await executeTool(userId, call.function.name, args)
      messages.push({ role: 'tool', tool_call_id: call.id, content: result })
    }
  }

  return '發生錯誤，請稍後再試。'
}
