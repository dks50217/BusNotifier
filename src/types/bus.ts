// ── TDX API raw shapes ────────────────────────────────────────────────────────

export type Direction = 0 | 1; // 0 = 去程, 1 = 回程

/** Raw stop shape returned by TDX Route/Stop API */
export interface TdxStop {
  StopUID: string;
  StopName: { Zh_tw: string; En: string };
  StopSequence: number;
}

/** Raw ETA record returned by TDX EstimatedTimeOfArrival API */
export interface TdxEta {
  PlateNumb?: string;           // absent when StopStatus ≠ 0
  StopUID: string;
  StopName: { Zh_tw: string; En: string };
  RouteUID: string;
  RouteName: { Zh_tw: string; En: string };
  Direction: Direction;
  EstimateTime?: number | null; // seconds; absent when no bus running
  StopCountDown?: number | null;
  /** 0=正常, 1=尚未發車, 2=交管, 3=末班已過, 4=今日未營運 */
  StopStatus: 0 | 1 | 2 | 3 | 4;
  /** 1=進站中, 0=離站 */
  A2EventType?: 0 | 1;
  UpdateTime: string;
}

// ── Normalised domain models ──────────────────────────────────────────────────

export interface BusStop {
  stopUID: string;
  stopName: string;
  sequence: number;
  direction: Direction;
  routeName: string;
}

export interface BusEta {
  stopUID: string;
  stopName: string;
  routeName: string;
  direction: Direction;
  estimateSecs: number | null; // seconds
  stopsAway: number | null;
  stopStatus: TdxEta['StopStatus'];
  isArriving: boolean; // A2EventType === 1
  updatedAt: string;
}

// ── Store / subscription models ───────────────────────────────────────────────

export interface MonitorTarget {
  id: string; // `${routeName}-${direction}-${stopUID}`
  routeName: string;
  direction: Direction;
  stopUID: string;
  stopName: string;
  city: string;
}

export interface PollingResult {
  target: MonitorTarget;
  eta: BusEta | null;
  loading: boolean;
  error: string | null;
  lastPolled: Date | null;
}

// ── Alert thresholds ──────────────────────────────────────────────────────────

export const ALERT_THRESHOLD_SECS = 3 * 60; // 3 minutes
export const ALERT_THRESHOLD_STOPS = 2;
