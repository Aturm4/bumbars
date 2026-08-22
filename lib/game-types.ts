export type ActionKind = 'training' | 'study' | 'work' | 'meditation' | 'travel';

export type ActionStatus =
  | 'awaiting_confirmation'
  | 'running'
  | 'resolved'
  | 'cancelled'
  | 'failed';

export type RoutineStatus = 'active' | 'paused' | 'cancelled';

export type CapacityKind = 'foreground' | 'background' | 'passive';

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
  difficultyLabel: string;
  capacity: CapacityKind;
  probabilityPercent: number;
  rollPercent: number | null;
  succeeded: boolean | null;
  rewardMoneyCents: number;
  riskLabel: string;
  createdAt: string;
  confirmedAt: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  outcome: string | null;
}
export interface CharacterState {
  id: string;
  name: string;
  status: 'active' | 'incapacitated' | 'incarcerated' | 'dead';
  morale: number;
  stress: number;
  confidence: number;
  fatigue: number;
  biography: string;
}

export interface LocationState {
  id: string;
  name: string;
  kind: 'place' | 'district' | 'city' | 'region';
  note: string;
  riskLabel: string;
  travelCostCents: number;
  travelMinutes: number;
  x: number;
  y: number;
  glyph: string;
  actionKind: ActionKind;
  visited: boolean;
}

export interface SkillState {
  id: string;
  name: string;
  domain: string;
  competence: number;
  evidenceCount: number;
}

export interface ExperienceState {
  id: string;
  domain: string;
  title: string;
  outcome: 'success' | 'failure' | 'mixed';
  complexity: string;
  occurredAt: string;
}

export interface CredentialState {
  id: string;
  title: string;
  issuer: string;
  progress: number;
  status: 'active' | 'completed';
}

export interface AssetState {
  id: string;
  title: string;
  kind: 'inventory' | 'property' | 'vehicle' | 'investment' | 'equity';
  estimatedValueCents: number;
  liquidationValueCents: number;
  locationName: string;
}

export interface OrganizationState {
  id: string;
  name: string;
  kind: string;
  role: string;
  ownershipPercent: number;
  cashCents: number;
  monthlyRevenueCents: number;
  monthlyProfitCents: number;
  members: number;
}

export interface RelationshipState {
  id: string;
  name: string;
  trust: number;
  respect: number;
  affection: number;
  resentment: number;
}

export interface ReputationState {
  domain: string;
  value: number;
  visibility: 'public' | 'private' | 'hidden';
}

export interface GoalState {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
}

export interface WorldEventState {
  id: string;
  title: string;
  summary: string;
  scope: string;
  happenedAt: string;
}

export interface MarketState {
  id: string;
  name: string;
  demand: string;
  competition: string;
  trend: number;
}

export interface EmploymentState {
  organization: string;
  title: string;
  monthlySalaryCents: number;
  dailyPayoutCents: number;
  performance: string;
  nextSession: string;
}

export interface StoryThreadState {
  id: string;
  title: string;
  status: string;
  tension: number;
}

export interface CaseState {
  id: string;
  title: string;
  stage: string;
  visibility: string;
}

export interface HostMessageState {
  id: string;
  role: 'player' | 'host';
  body: string;
  createdAt: string;
}

export interface ProfileState {
  skills: SkillState[];
  experience: ExperienceState[];
  credentials: CredentialState[];
  assets: AssetState[];
  organizations: OrganizationState[];
  relationships: RelationshipState[];
  reputations: ReputationState[];
  goals: GoalState[];
  storyThreads: StoryThreadState[];
  employment: EmploymentState | null;
  cases: CaseState[];
}

export interface WorldState {
  currentLocationId: string;
  locations: LocationState[];
  events: WorldEventState[];
  markets: MarketState[];
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
  character: CharacterState;
  wallet: WalletState;
  actions: GameAction[];
  routines: RoutineState[];
  ledger: LedgerEntryState[];
  events: EventState[];
  world: WorldState;
  profile: ProfileState;
  hostMessages: HostMessageState[];
  serverTime: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
