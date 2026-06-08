import type { Request, Response } from 'express'
import type { WebhookEvent } from '@line/bot-sdk'
import { getLineClient } from './lineClient.js'
import { addTarget, removeAllTargets, removeTarget, ensureUser, getUser } from './userStore.js'
import { fetchStops, fetchEta } from './busService.js'
import { handleAiMessage } from './aiHandler.js'
import type { Direction } from '../src/types/bus.js'

const IS_AI_MODE = process.env.BOT_MODE === 'ai'

// ── City label → TDX city code ────────────────────────────────────────────────

const CITY_MAP: Record<string, string> = {
  '台北市': 'Taipei',   '台北': 'Taipei',
  '新北市': 'NewTaipei', '新北': 'NewTaipei',
  '桃園市': 'Taoyuan',  '桃園': 'Taoyuan',
  '台中市': 'Taichung', '台中': 'Taichung',
  '台南市': 'Tainan',   '台南': 'Tainan',
  '高雄市': 'Kaohsiung','高雄': 'Kaohsiung',
  '基隆市': 'Keelung',  '基隆': 'Keelung',
  '新竹市': 'Hsinchu',  '新竹縣': 'HsinchuCounty',
  '苗栗縣': 'MiaoliCounty',
  '彰化縣': 'ChanghuaCounty',
  '南投縣': 'NantouCounty',
  '雲林縣': 'YunlinCounty',
  '嘉義市': 'Chiayi',   '嘉義縣': 'ChiayiCounty',
  '屏東縣': 'PingtungCounty',
  '宜蘭縣': 'YilanCounty',
  '花蓮縣': 'HualienCounty',
  '臺東縣': 'TaitungCounty', '台東': 'TaitungCounty',
  '金門縣': 'KinmenCounty',
  '澎湖縣': 'PenghuCounty',
}

const DIRECTION_MAP: Record<string, Direction> = {
  '去程': 0, '0': 0,
  '回程': 1, '1': 1,
}

const HELP_TEXT = IS_AI_MODE
  ? `🚌 公車提醒 Bot（AI 模式）

直接用自然語言告訴我你想做什麼，例如：
• 我要監控307路去程在台北車站
• 台北市299回程象山站幫我追蹤
• 現在307多久到
• 取消所有監控`
  : `🚌 公車提醒 Bot 使用說明

【設定監控】
設定 {城市} {路線} {去程|回程} {站牌}
例：設定 台北市 307 去程 台北車站

【查詢即時ETA】
查詢

【停止監控】
停止 {路線} {去程|回程} {站牌}
停止全部

【說明】
說明`

// ── Webhook entry point ───────────────────────────────────────────────────────

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // Always respond 200 immediately so LINE doesn't retry
  res.sendStatus(200)

  const events: WebhookEvent[] = req.body.events
  for (const event of events) {
    try {
      if (event.type === 'follow' && event.source.userId) {
        await handleFollow(event.source.userId)
      } else if (event.type === 'message' && event.message.type === 'text' && event.source.userId) {
        await handleText(event.source.userId, event.message.text.trim())
      }
    } catch (err) {
      console.error('[webhook] event handler error:', err)
    }
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleFollow(userId: string): Promise<void> {
  ensureUser(userId)
  await reply(userId, `歡迎使用公車提醒 Bot！\n\n${HELP_TEXT}`)
}

async function handleText(userId: string, text: string): Promise<void> {
  if (text === '說明' || text.toLowerCase() === 'help') {
    await reply(userId, HELP_TEXT)
    return
  }

  if (IS_AI_MODE) {
    try {
      await reply(userId, await handleAiMessage(userId, text))
    } catch (err) {
      console.error('[aiHandler]', err)
      await reply(userId, '⚠️ AI 處理失敗，請稍後再試。')
    }
    return
  }

  // ── Command mode ──────────────────────────────────────────────────────────
  if (text === '查詢') {
    await handleQuery(userId)
    return
  }
  if (text === '停止全部') {
    removeAllTargets(userId)
    await reply(userId, '已停止所有監控。')
    return
  }
  if (text.startsWith('設定 ')) {
    await handleSetup(userId, text.slice(3).trim())
    return
  }
  if (text.startsWith('停止 ')) {
    await handleStop(userId, text.slice(3).trim())
    return
  }
  await reply(userId, `不認識的指令。\n\n${HELP_TEXT}`)
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleSetup(userId: string, args: string): Promise<void> {
  const parts = args.split(/\s+/)
  if (parts.length < 4) {
    await reply(userId, '格式：設定 {城市} {路線} {去程|回程} {站牌}\n例：設定 台北市 307 去程 台北車站')
    return
  }

  const [cityLabel, routeName, dirLabel, ...stopParts] = parts
  const stopKeyword = stopParts.join(' ')
  const city = CITY_MAP[cityLabel]
  const direction = DIRECTION_MAP[dirLabel]

  if (!city) {
    await reply(userId, `找不到城市「${cityLabel}」，請使用中文城市名，例：台北市`)
    return
  }
  if (direction === undefined) {
    await reply(userId, '方向請填「去程」或「回程」')
    return
  }

  const stops = await fetchStops(city, routeName, direction)
  if (stops.length === 0) {
    await reply(userId, `找不到 ${routeName}路 ${dirLabel} 的站牌資料，請確認路線名稱與城市是否正確。`)
    return
  }

  const stop = stops.find(s => s.stopName.includes(stopKeyword) || stopKeyword.includes(s.stopName))
  if (!stop) {
    const list = stops.slice(0, 12).map((s, i) => `${i + 1}. ${s.stopName}`).join('\n')
    const suffix = stops.length > 12 ? `\n（共 ${stops.length} 站，顯示前 12 站）` : ''
    await reply(userId, `找不到「${stopKeyword}」。\n\n${routeName}路 ${dirLabel} 站牌列表：\n${list}${suffix}`)
    return
  }

  addTarget(userId, {
    id: `${routeName}-${direction}-${stop.stopUID}`,
    routeName,
    direction,
    stopUID: stop.stopUID,
    stopName: stop.stopName,
    city,
  })
  await reply(userId, `✅ 已設定監控\n路線：${routeName}\n方向：${dirLabel}\n站牌：${stop.stopName}\n\n公車快到站時會通知你！`)
}

async function handleStop(userId: string, args: string): Promise<void> {
  const parts = args.split(/\s+/)
  if (parts.length < 3) {
    await reply(userId, '格式：停止 {路線} {去程|回程} {站牌}')
    return
  }

  const [routeName, dirLabel, ...stopParts] = parts
  const stopKeyword = stopParts.join(' ')
  const direction = DIRECTION_MAP[dirLabel]

  if (direction === undefined) {
    await reply(userId, '方向請填「去程」或「回程」')
    return
  }

  const user = getUser(userId)
  const target = user?.targets.find(
    t => t.routeName === routeName &&
         t.direction === direction &&
         (t.stopName.includes(stopKeyword) || stopKeyword.includes(t.stopName)),
  )

  if (!target) {
    await reply(userId, '找不到對應的監控設定。')
    return
  }

  removeTarget(userId, target.id)
  await reply(userId, `已停止監控 ${routeName}路 ${dirLabel} ${target.stopName}。`)
}

async function handleQuery(userId: string): Promise<void> {
  const user = getUser(userId)
  if (!user || user.targets.length === 0) {
    await reply(userId, `你還沒有設定任何監控。\n\n${HELP_TEXT}`)
    return
  }

  const lines: string[] = []
  for (const t of user.targets) {
    const dirLabel = t.direction === 0 ? '去程' : '回程'
    try {
      const eta = await fetchEta(t.city, t.routeName, t.direction, t.stopUID)
      lines.push(formatEtaLine(t.routeName, dirLabel, t.stopName, eta))
    } catch {
      lines.push(`🚌 ${t.routeName}路 ${dirLabel} ${t.stopName}\n   查詢失敗`)
    }
  }

  await reply(userId, lines.join('\n\n'))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEtaLine(routeName: string, dirLabel: string, stopName: string, eta: Awaited<ReturnType<typeof fetchEta>>): string {
  const header = `🚌 ${routeName}路 ${dirLabel} ${stopName}`
  if (!eta) return `${header}\n   無資料`
  const statusLabel: Record<number, string> = { 1: '尚未發車', 2: '交管', 3: '末班已過', 4: '今日未營運' }
  if (eta.stopStatus !== 0) return `${header}\n   ${statusLabel[eta.stopStatus] ?? '異常'}`
  if (eta.isArriving) return `${header}\n   ⚡ 進站中！`
  const mins = eta.estimateSecs != null ? Math.ceil(eta.estimateSecs / 60) : '?'
  const stops = eta.stopsAway ?? '?'
  return `${header}\n   約 ${mins} 分鐘（${stops} 站）`
}

async function reply(userId: string, text: string): Promise<void> {
  await getLineClient().pushMessage({ to: userId, messages: [{ type: 'text', text }] })
}
