export type ActionKind =
  | 'training'
  | 'study'
  | 'work'
  | 'meditation'
  | 'travel'
  | 'schedule'
  | 'organization'
  | 'challenge'
  | 'generic';

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
  age: number | null;
  city: string;
  role: string;
  energy: number;
  health: number;
  strength: number;
  intelligence: number;
}

export interface WalletState {
  balanceCents: number;
  availableCents: number;
  reservedCents: number;
  currency: 'USD';
}

export interface ActionEffectState {
  energy: number;
  health: number;
  strength: number;
  intelligence: number;
  morale: number;
  confidence: number;
  fatigue: number;
  moneyCents: number;
  skillName: string | null;
  summary: string;
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
  effects: ActionEffectState;
  resolutionMode: 'progress' | 'chance' | 'deterministic';
  resultGrade: 'минимальный' | 'обычный' | 'сильный' | null;
  riskLabel: string;
  createdAt: string;
  confirmedAt: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  outcome: string | null;
  targetLocationId: string | null;
}
export interface CharacterState {
  id: string;
  name: string;
  status: 'active' | 'incapacitated' | 'incarcerated' | 'dead';
  morale: number;
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
  kind: 'dialogue' | 'clarification' | 'proposal' | 'outcome' | 'system';
  actionId: string | null;
  createdAt: string;
}

export interface KnowledgeFactState {
  id: string;
  statement: string;
  confidence: number;
  freshnessAt: string;
  visibility: 'public' | 'private' | 'secret';
  source: string;
}

export interface DailyPlanItemState {
  id: string;
  title: string;
  details: string;
  scheduledFor: string | null;
  startCondition: string;
  status: 'planned' | 'waiting' | 'running' | 'completed' | 'blocked' | 'skipped' | 'cancelled';
  actionId: string | null;
}

export interface NotificationState {
  id: string;
  category: 'message' | 'proposal' | 'challenge' | 'world' | 'system';
  senderName: string;
  title: string;
  body: string;
  status: 'unread' | 'read' | 'accepted' | 'declined' | 'replied';
  canAccept: boolean;
  canReply: boolean;
  createdAt: string;
}

export interface DynamicFieldState {
  key: string;
  label: string;
  value: string | number | boolean;
}

export interface DynamicSectionState {
  id: string;
  title: string;
  visibility: 'public' | 'private' | 'secret';
  fields: DynamicFieldState[];
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
  players: WorldPlayerState[];
  events: WorldEventState[];
  markets: MarketState[];
}

export interface WorldPlayerState {
  id: string;
  name: string;
  role: string;
  biography: string;
  color: 'lime' | 'coral' | 'violet' | 'amber';
  knownLocation: string | null;
  lastSeenAt: string | null;
  knowledgeVisibility: 'public' | 'private' | 'secret';
  knownFacts: KnowledgeFactState[];
  status: CharacterState['status'];
  isCurrent: boolean;
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
  dailyPlan: DailyPlanItemState[];
  notifications: NotificationState[];
  dynamicSections: DynamicSectionState[];
  serverTime: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
