export type ActionKind = 'training' | 'study' | 'work' | 'meditation' | 'travel';

export type ActionStatus =
  | 'awaiting_confirmation'
  | 'running'
  | 'resolved'
  | 'cancelled'
  | 'failed';

export type RoutineStatus = 'active' | 'paused' | 'cancelled';

export interface PlayerState {
  id: string;
  name: string;
  city: string;
  role: string;
  energy: number;
  health: number;
  focus: number;
  reputation: number;
}

export interface WalletState {
  balanceCents: number;
  currency: 'UZS';
}

export interface GameAction {
  id: string;
  kind: ActionKind;
  title: string;
  description: string;
  status: ActionStatus;
  durationSeconds: number;
  costCents: number;
  energyCost: number;
  rewardFocus: number;
  rewardHealth: number;
  rewardMoneyCents: number;
  riskLabel: string;
  createdAt: string;
  confirmedAt: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  outcome: string | null;
}

export interface RoutineState {
  id: string;
  title: string;
  scheduleLabel: string;
  durationMinutes: number;
  streak: number;
  status: RoutineStatus;
  skipNext: boolean;
  createdAt: string;
}

export interface LedgerEntryState {
  id: string;
  title: string;
  amountCents: number;
  kind: string;
  createdAt: string;
}

export interface EventState {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface GameState {
  player: PlayerState;
  wallet: WalletState;
  actions: GameAction[];
  routines: RoutineState[];
  ledger: LedgerEntryState[];
  events: EventState[];
  serverTime: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
