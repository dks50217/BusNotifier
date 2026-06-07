import type { TdxStop, TdxEta, Direction } from '@/types/bus'

// ---------------------------------------------------------------------------
// Mock stop lists — keyed by `${routeName}-${direction}`
// ---------------------------------------------------------------------------

export const MOCK_STOPS: Record<string, TdxStop[]> = {
  '299-0': [
    { StopUID: 'TPE29900001', StopName: { Zh_tw: '捷運市政府站', En: 'MRT City Hall' }, StopSequence: 1 },
    { StopUID: 'TPE29900002', StopName: { Zh_tw: '台北101/世貿', En: 'Taipei 101/WTSC' }, StopSequence: 2 },
    { StopUID: 'TPE29900003', StopName: { Zh_tw: '信義廣場', En: 'Xinyi Square' }, StopSequence: 3 },
    { StopUID: 'TPE29900004', StopName: { Zh_tw: '象山捷運站', En: 'MRT Xiangshan' }, StopSequence: 4 },
    { StopUID: 'TPE29900005', StopName: { Zh_tw: '福德街口', En: 'Fude St.' }, StopSequence: 5 },
  ],
  '299-1': [
    { StopUID: 'TPE29910001', StopName: { Zh_tw: '福德街口', En: 'Fude St.' }, StopSequence: 1 },
    { StopUID: 'TPE29910002', StopName: { Zh_tw: '象山捷運站', En: 'MRT Xiangshan' }, StopSequence: 2 },
    { StopUID: 'TPE29910003', StopName: { Zh_tw: '信義廣場', En: 'Xinyi Square' }, StopSequence: 3 },
    { StopUID: 'TPE29910004', StopName: { Zh_tw: '台北101/世貿', En: 'Taipei 101/WTSC' }, StopSequence: 4 },
    { StopUID: 'TPE29910005', StopName: { Zh_tw: '捷運市政府站', En: 'MRT City Hall' }, StopSequence: 5 },
  ],
  '307-0': [
    { StopUID: 'TPE30700001', StopName: { Zh_tw: '捷運西門站', En: 'MRT Ximen' }, StopSequence: 1 },
    { StopUID: 'TPE30700002', StopName: { Zh_tw: '中華路一段', En: 'Zhonghua Rd. Sec.1' }, StopSequence: 2 },
    { StopUID: 'TPE30700003', StopName: { Zh_tw: '台北車站', En: 'Taipei Main Station' }, StopSequence: 3 },
    { StopUID: 'TPE30700004', StopName: { Zh_tw: '館前路', En: 'Guanqian Rd.' }, StopSequence: 4 },
  ],
  '307-1': [
    { StopUID: 'TPE30710001', StopName: { Zh_tw: '館前路', En: 'Guanqian Rd.' }, StopSequence: 1 },
    { StopUID: 'TPE30710002', StopName: { Zh_tw: '台北車站', En: 'Taipei Main Station' }, StopSequence: 2 },
    { StopUID: 'TPE30710003', StopName: { Zh_tw: '中華路一段', En: 'Zhonghua Rd. Sec.1' }, StopSequence: 3 },
    { StopUID: 'TPE30710004', StopName: { Zh_tw: '捷運西門站', En: 'MRT Ximen' }, StopSequence: 4 },
  ],
}

// ---------------------------------------------------------------------------
// Dynamic mock ETA — simulates a bus approaching then resetting
// ---------------------------------------------------------------------------

const etaCounters: Record<string, number> = {}

function cycleEstimate(key: string): number {
  if (!(key in etaCounters)) etaCounters[key] = 600
  etaCounters[key] = Math.max(0, etaCounters[key] - 30)
  if (etaCounters[key] === 0) etaCounters[key] = 600
  return etaCounters[key]
}

export function buildMockEta(
  routeName: string,
  direction: Direction,
  stopUID: string,
): TdxEta {
  const key = `${routeName}-${direction}-${stopUID}`
  const estimate = cycleEstimate(key)
  const stopsAway = Math.ceil(estimate / 120)

  return {
    PlateNumb: 'ABC-1234',
    StopUID: stopUID,
    StopName: { Zh_tw: '(mock)', En: '(mock)' },
    RouteUID: `TPE${routeName}`,
    RouteName: { Zh_tw: routeName, En: routeName },
    Direction: direction,
    EstimateTime: estimate,
    StopCountDown: stopsAway,
    StopStatus: 0,
    A2EventType: estimate <= 30 ? 1 : 0,
    UpdateTime: new Date().toISOString(),
  }
}
