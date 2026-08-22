'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ActionKind,
  ApiError,
  GameAction,
  GameState,
  RoutineState,
} from '@/lib/game-types';

type View = 'home' | 'world' | 'host' | 'plan' | 'profile';
type PlanTab = 'actions' | 'routines';
type ProfileTab = 'stats' | 'finance';

const NAV_ITEMS: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'world', label: 'Мир', icon: 'world' },
  { id: 'host', label: 'Хост', icon: 'spark' },
  { id: 'plan', label: 'План', icon: 'calendar' },
  { id: 'profile', label: 'Я', icon: 'user' },
];

const QUICK_ACTIONS: Array<{
  kind: ActionKind;
  label: string;
  note: string;
  icon: IconName;
}> = [
  { kind: 'training', label: 'Тренировка', note: 'Здоровье +3', icon: 'bolt' },
  { kind: 'study', label: 'Учёба', note: 'Фокус +4', icon: 'book' },
  { kind: 'work', label: 'Контракт', note: 'Доход после приёмки', icon: 'briefcase' },
  { kind: 'meditation', label: 'Практика', note: 'Фокус +5', icon: 'circle' },
];

const LOCATIONS = [
  { id: 'center', name: 'Центр', description: 'Работа, встречи и деловые связи.', x: 51, y: 50, tone: 'lime' },
  { id: 'old-city', name: 'Старый город', description: 'История, ремесло и локальные знакомства.', x: 25, y: 36, tone: 'amber' },
  { id: 'sergeli', name: 'Сергели', description: 'Жилой район и новые точки роста.', x: 75, y: 67, tone: 'cyan' },
  { id: 'mountains', name: 'Чимган', description: 'Отдых, восстановление и сложные маршруты.', x: 68, y: 22, tone: 'violet' },
  { id: 'business', name: 'Деловой квартал', description: 'Компании, контракты и рынок труда.', x: 29, y: 73, tone: 'coral' },
] as const;

type IconName =
  | 'home'
  | 'world'
  | 'spark'
  | 'calendar'
  | 'user'
  | 'wallet'
  | 'bolt'
  | 'heart'
  | 'focus'
  | 'arrow'
  | 'clock'
  | 'book'
  | 'briefcase'
  | 'circle'
  | 'plus'
  | 'check'
  | 'close'
  | 'pause'
  | 'skip'
  | 'refresh'
  | 'pin';

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5M9 21v-6h6v6"/></>,
    world: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 4 5.5 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.5-4-9s1.4-6.5 4-9Z"/></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15l2 2 5-5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z"/></>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/>,
    focus: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>,
    circle: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    pause: <path d="M9 5v14M15 5v14"/>,
    skip: <><path d="m5 6 9 6-9 6V6ZM18 6v12"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M18.5 16a8 8 0 1 1 .5-8.5L20 12"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function formatMoney(cents: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(cents / 100)} сум`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function countdown(dueAt: string | null, now: number): string {
  if (!dueAt) return '—';
  const seconds = Math.max(0, Math.ceil((new Date(dueAt).getTime() - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function actionStatus(status: GameAction['status']): string {
  return {
    awaiting_confirmation: 'Ждёт решения',
    running: 'Выполняется',
    resolved: 'Завершено',
    cancelled: 'Отклонено',
    failed: 'Ошибка',
  }[status];
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: IconName; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-icon"><Icon name={icon} size={18} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}<small>/100</small></strong>
      </div>
      <div className="metric-track"><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <span className="empty-mark">○</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function ActionCard({
  action,
  now,
  busy,
  onConfirm,
  onCancel,
}: {
  action: GameAction;
  now: number;
  busy: string | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <article className={`action-card status-${action.status}`}>
      <div className="action-card-top">
        <span className="status-pill">{actionStatus(action.status)}</span>
        <span className="action-time">
          <Icon name="clock" size={15} />
          {action.status === 'running' ? countdown(action.dueAt, now) : `${Math.ceil(action.durationSeconds / 60)} мин`}
        </span>
      </div>
      <h3>{action.title}</h3>
      <p>{action.description}</p>
      <div className="action-costs">
        <span><Icon name="wallet" size={15} />{action.costCents ? formatMoney(action.costCents) : 'Без расходов'}</span>
        <span><Icon name="bolt" size={15} />{action.energyCost ? `−${action.energyCost}` : '0'} энергии</span>
        <span>Риск: {action.riskLabel.toLowerCase()}</span>
      </div>
      {action.outcome && <div className="outcome"><Icon name="check" size={16} />{action.outcome}</div>}
      {action.status === 'awaiting_confirmation' && (
        <div className="action-buttons">
          <button className="button button-primary" disabled={busy === action.id} onClick={() => onConfirm(action.id)}>
            <Icon name="check" size={17} /> Подтвердить
          </button>
          <button className="button button-quiet" disabled={busy === action.id} onClick={() => onCancel(action.id)}>
            Отклонить
          </button>
        </div>
      )}
    </article>
  );
}

function RoutineCard({
  routine,
  busy,
  onMutate,
}: {
  routine: RoutineState;
  busy: string | null;
  onMutate: (id: string, mutation: 'skip' | 'pause' | 'resume' | 'cancel') => void;
}) {
  const isBusy = busy === routine.id;
  return (
    <article className={`routine-card ${routine.status === 'paused' ? 'is-paused' : ''}`}>
      <div className="routine-index">{routine.streak}</div>
      <div className="routine-copy">
        <div className="routine-title-line">
          <h3>{routine.title}</h3>
          <span>{routine.status === 'active' ? 'Активен' : 'На паузе'}</span>
        </div>
        <p>{routine.scheduleLabel} · {routine.durationMinutes} мин</p>
        {routine.skipNext && <em>Следующий сеанс будет пропущен</em>}
      </div>
      <div className="routine-actions">
        {routine.status === 'active' ? (
          <>
            <button className="icon-button" disabled={isBusy || routine.skipNext} onClick={() => onMutate(routine.id, 'skip')} title="Пропустить следующий раз" aria-label="Пропустить следующий раз"><Icon name="skip" /></button>
            <button className="icon-button" disabled={isBusy} onClick={() => onMutate(routine.id, 'pause')} title="Поставить на паузу" aria-label="Поставить на паузу"><Icon name="pause" /></button>
          </>
        ) : (
          <button className="button button-small" disabled={isBusy} onClick={() => onMutate(routine.id, 'resume')}>Возобновить</button>
        )}
        <button className="icon-button danger" disabled={isBusy} onClick={() => onMutate(routine.id, 'cancel')} title="Отменить ритуал" aria-label="Отменить ритуал"><Icon name="close" /></button>
      </div>
    </article>
  );
}

export default function BumbarsClient() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('home');
  const [planTab, setPlanTab] = useState<PlanTab>('actions');
  const [profileTab, setProfileTab] = useState<ProfileTab>('stats');
  const [selectedLocation, setSelectedLocation] = useState<(typeof LOCATIONS)[number]>(LOCATIONS[0]);
  const [intent, setIntent] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [showRoutineForm, setShowRoutineForm] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy('load');
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      const data = await response.json() as GameState | ApiError;
      if (!response.ok) throw new Error((data as ApiError).error);
      setState(data as GameState);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось связаться с сервером');
    } finally {
      if (!quiet) setBusy(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const request = useCallback(async (path: string, init: RequestInit, key: string, success: string) => {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(path, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
      const data = await response.json() as GameState | ApiError;
      if (!response.ok) throw new Error((data as ApiError).error);
      setState(data as GameState);
      setNotice(success);
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Команда не выполнена');
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const propose = useCallback(async (kind?: ActionKind, command?: string) => {
    const submitted = command ?? intent;
    const ok = await request(
      '/api/actions',
      { method: 'POST', body: JSON.stringify({ kind, intent: submitted }) },
      'proposal',
      'Предложение рассчитано. Проверьте стоимость и подтвердите.',
    );
    if (ok) {
      setIntent('');
      setView('host');
    }
  }, [intent, request]);

  const confirmAction = useCallback((id: string) => void request(
    `/api/actions/${id}/confirm`,
    { method: 'POST' },
    id,
    'Действие запущено. Списание и таймер записаны на сервере.',
  ), [request]);

  const cancelAction = useCallback((id: string) => void request(
    `/api/actions/${id}/cancel`,
    { method: 'POST' },
    id,
    'Предложение отклонено без списаний.',
  ), [request]);

  const mutateRoutine = useCallback((id: string, mutation: 'skip' | 'pause' | 'resume' | 'cancel') => void request(
    `/api/routines/${id}`,
    { method: 'PATCH', body: JSON.stringify({ mutation }) },
    id,
    'Расписание обновлено на сервере.',
  ), [request]);

  const awaiting = useMemo(() => state?.actions.filter((item) => item.status === 'awaiting_confirmation') ?? [], [state]);
  const running = useMemo(() => state?.actions.filter((item) => item.status === 'running') ?? [], [state]);
  const finished = useMemo(() => state?.actions.filter((item) => item.status === 'resolved') ?? [], [state]);

  function submitIntent(event: FormEvent) {
    event.preventDefault();
    if (intent.trim()) void propose(undefined, intent);
  }

  async function submitRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await request(
      '/api/routines',
      {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          scheduleLabel: form.get('schedule'),
          durationMinutes: Number(form.get('duration')),
        }),
      },
      'routine-create',
      'Ритуал создан и сохранён.',
    );
    if (ok) {
      event.currentTarget.reset();
      setShowRoutineForm(false);
    }
  }

  if (!state) {
    return (
      <main className="boot-screen">
        <div className="boot-logo">Б</div>
        <div className="boot-copy">
          <strong>{error ? 'Сервер не ответил' : 'Поднимаем ваш мир'}</strong>
          <span>{error ?? 'Загружаем состояние из постоянной базы…'}</span>
        </div>
        {error && <button className="button button-primary" onClick={() => void load()}>Повторить</button>}
      </main>
    );
  }

  const activeAction = running[0] ?? awaiting[0] ?? null;
  const displayNow = now || new Date(state.serverTime).getTime();

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <button className="brand-button" onClick={() => setView('home')} aria-label="На главную">
          <span>Б</span><i />
        </button>
        <nav aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)} title={item.label}>
              <Icon name={item.icon} size={22} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="rail-refresh" onClick={() => void load()} disabled={busy === 'load'} title="Обновить состояние" aria-label="Обновить состояние">
          <Icon name="refresh" size={20} />
        </button>
      </aside>

      <div className="app-frame">
        <header className="topbar">
          <div className="player-chip">
            <span className="avatar">А</span>
            <div><strong>{state.player.name}</strong><small>{state.player.role}</small></div>
          </div>
          <div className="server-chip"><i />Серверное состояние <span>· {formatTime(state.serverTime)} ТШК</span></div>
          <button className="balance-chip" onClick={() => { setView('profile'); setProfileTab('finance'); }}>
            <Icon name="wallet" size={17} /><span>{formatMoney(state.wallet.balanceCents)}</span><Icon name="arrow" size={16} />
          </button>
        </header>

        {error && <div className="alert alert-error"><span>{error}</span><button onClick={() => setError(null)} aria-label="Закрыть"><Icon name="close" size={16} /></button></div>}
        {notice && <div className="alert alert-success"><Icon name="check" size={16} /><span>{notice}</span></div>}

        <main className="screen">
          {view === 'home' && (
            <div className="home-screen">
              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="eyebrow">Суббота · день строится сейчас</span>
                  <h1>Не прожить идеально.<br/><em>Прожить осознанно.</em></h1>
                  <p>Каждое действие проходит через сервер: ресурсы проверяются, последствия фиксируются, история остаётся.</p>
                  <button className="button button-primary button-large" onClick={() => setView('host')}>
                    Сказать, что хочу сделать <Icon name="arrow" size={18} />
                  </button>
                </div>
                <div className="hero-orbit" aria-label="Показатели персонажа">
                  <div className="orbit-ring orbit-one" />
                  <div className="orbit-ring orbit-two" />
                  <div className="orbit-core"><span>{state.player.energy}</span><small>энергия</small></div>
                  <div className="orbit-tag tag-focus">Фокус {state.player.focus}</div>
                  <div className="orbit-tag tag-health">Здоровье {state.player.health}</div>
                  <div className="orbit-tag tag-place">Ташкент</div>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-main">
                  <div className="section-heading">
                    <div><span className="eyebrow">Следующий узел</span><h2>{activeAction ? 'Действие в работе' : 'Маршрут свободен'}</h2></div>
                    <button className="text-button" onClick={() => setView('plan')}>Весь план <Icon name="arrow" size={15} /></button>
                  </div>
                  {activeAction ? (
                    <ActionCard action={activeAction} now={displayNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} />
                  ) : (
                    <EmptyState title="Нет активных действий" body="Создайте предложение через Хоста — он рассчитает ресурсы до запуска." />
                  )}

                  <div className="quick-grid">
                    {QUICK_ACTIONS.map((item) => (
                      <button key={item.kind} className="quick-card" disabled={busy === 'proposal'} onClick={() => void propose(item.kind)}>
                        <span className="quick-icon"><Icon name={item.icon} /></span>
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                        <Icon name="plus" size={17} />
                      </button>
                    ))}
                  </div>
                </div>

                <aside className="dashboard-side">
                  <div className="metrics-card">
                    <div className="section-heading compact"><h2>Ресурсы</h2><span>обновлено {formatTime(state.serverTime)}</span></div>
                    <Metric label="Энергия" value={state.player.energy} icon="bolt" tone="lime" />
                    <Metric label="Здоровье" value={state.player.health} icon="heart" tone="coral" />
                    <Metric label="Фокус" value={state.player.focus} icon="focus" tone="cyan" />
                  </div>
                  <div className="evidence-card">
                    <span className="eyebrow">Лента доказательств</span>
                    <div className="event-list">
                      {state.events.slice(0, 4).map((event) => (
                        <div className="event-row" key={event.id}>
                          <i />
                          <div><strong>{event.title}</strong><p>{event.body}</p><time>{formatTime(event.createdAt)}</time></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </section>
            </div>
          )}

          {view === 'world' && (
            <div className="world-screen">
              <div className="page-heading">
                <div><span className="eyebrow">Живая карта</span><h1>Ташкент — сеть возможностей</h1><p>Точка на карте — не декорация. Маршрут создаёт серверное предложение с ценой и временем.</p></div>
                <div className="world-legend"><i />Доступно сейчас</div>
              </div>
              <div className="world-layout">
                <section className="map-board" aria-label="Карта районов Ташкента">
                  <div className="map-grid" />
                  <div className="route-line route-a" />
                  <div className="route-line route-b" />
                  <div className="map-water" />
                  {LOCATIONS.map((location) => (
                    <button
                      key={location.id}
                      className={`map-node tone-${location.tone} ${selectedLocation.id === location.id ? 'selected' : ''}`}
                      style={{ left: `${location.x}%`, top: `${location.y}%` }}
                      onClick={() => setSelectedLocation(location)}
                    >
                      <span><Icon name="pin" size={18} /></span><strong>{location.name}</strong>
                    </button>
                  ))}
                  <span className="map-coordinate">41.2995° N / 69.2401° E</span>
                </section>
                <aside className="location-panel">
                  <span className="location-number">0{LOCATIONS.findIndex((item) => item.id === selectedLocation.id) + 1}</span>
                  <span className="eyebrow">Выбранная точка</span>
                  <h2>{selectedLocation.name}</h2>
                  <p>{selectedLocation.description}</p>
                  <dl>
                    <div><dt>Длительность</dt><dd>5 минут</dd></div>
                    <div><dt>Расход</dt><dd>{formatMoney(128_000_000)}</dd></div>
                    <div><dt>Риск</dt><dd>Средний</dd></div>
                  </dl>
                  <button className="button button-primary button-full" disabled={busy === 'proposal'} onClick={() => void propose('travel', `Поехать в район «${selectedLocation.name}»`)}>
                    Проложить маршрут <Icon name="arrow" size={18} />
                  </button>
                  <small>Списание произойдёт только после отдельного подтверждения.</small>
                </aside>
              </div>
              <section className="world-events">
                <div className="section-heading"><div><span className="eyebrow">Пульс мира</span><h2>Последние события</h2></div></div>
                <div className="world-event-grid">
                  {state.events.slice(0, 6).map((event, index) => (
                    <article key={event.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{event.title}</h3><p>{event.body}</p></div><time>{formatTime(event.createdAt)}</time></article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {view === 'host' && (
            <div className="host-screen">
              <div className="page-heading">
                <div><span className="eyebrow">Хост · детерминированный маршрутизатор v0</span><h1>Намерение — сначала.<br/>Последствия — до клика.</h1><p>Хост понимает тип намерения, а стоимость, таймер и эффекты рассчитывает сервер.</p></div>
                <div className="host-signal"><span><Icon name="spark" size={28} /></span><div><strong>На связи</strong><small>База доступна</small></div></div>
              </div>

              <section className="command-console">
                <div className="console-prefix">Я хочу</div>
                <form onSubmit={submitIntent}>
                  <input value={intent} onChange={(event) => setIntent(event.target.value)} maxLength={280} placeholder="например, позаниматься экономикой вечером" aria-label="Опишите намерение" />
                  <button className="button button-primary" disabled={!intent.trim() || busy === 'proposal'}>
                    Рассчитать <Icon name="arrow" size={18} />
                  </button>
                </form>
                <div className="prompt-row">
                  {['провести силовую тренировку', 'взять рабочий контракт', 'изучить новый модуль', 'сделать практику внимания'].map((prompt) => (
                    <button key={prompt} onClick={() => setIntent(prompt)}>{prompt}</button>
                  ))}
                </div>
              </section>

              <div className="host-layout">
                <section>
                  <div className="section-heading"><div><span className="eyebrow">Требуют решения</span><h2>Предложения</h2></div><span className="count-badge">{awaiting.length}</span></div>
                  <div className="action-stack">
                    {awaiting.length ? awaiting.map((action) => <ActionCard key={action.id} action={action} now={displayNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} />) : <EmptyState title="Очередь пуста" body="Опишите намерение или выберите быстрый сценарий. Ничего не запустится без подтверждения." />}
                  </div>
                </section>
                <aside className="host-log">
                  <span className="eyebrow">Журнал Хоста</span>
                  {state.events.slice(0, 8).map((event) => (
                    <div key={event.id} className="host-log-row"><time>{formatTime(event.createdAt)}</time><div><strong>{event.title}</strong><p>{event.body}</p></div></div>
                  ))}
                </aside>
              </div>
            </div>
          )}

          {view === 'plan' && (
            <div className="plan-screen">
              <div className="page-heading heading-with-actions">
                <div><span className="eyebrow">План без блокировки интерфейса</span><h1>Действия и ритуалы</h1><p>Персонаж может быть занят — вы всё равно можете планировать следующее.</p></div>
                {planTab === 'routines' && <button className="button button-primary" onClick={() => setShowRoutineForm((value) => !value)}><Icon name="plus" size={18} />Новый ритуал</button>}
              </div>
              <div className="segmented" role="tablist" aria-label="Раздел плана">
                <button role="tab" aria-selected={planTab === 'actions'} className={planTab === 'actions' ? 'active' : ''} onClick={() => setPlanTab('actions')}>Действия <span>{state.actions.filter((item) => item.status !== 'cancelled').length}</span></button>
                <button role="tab" aria-selected={planTab === 'routines'} className={planTab === 'routines' ? 'active' : ''} onClick={() => setPlanTab('routines')}>Ритуалы <span>{state.routines.length}</span></button>
              </div>

              {planTab === 'actions' && (
                <div className="plan-columns">
                  <section><div className="column-label"><i className="dot-lime" />Сейчас и на решении <span>{running.length + awaiting.length}</span></div><div className="action-stack">{[...running, ...awaiting].length ? [...running, ...awaiting].map((action) => <ActionCard key={action.id} action={action} now={displayNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} />) : <EmptyState title="Нет текущих действий" body="Создайте предложение через Хоста." />}</div></section>
                  <section><div className="column-label"><i className="dot-cyan" />Завершено <span>{finished.length}</span></div><div className="action-stack">{finished.length ? finished.map((action) => <ActionCard key={action.id} action={action} now={displayNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} />) : <EmptyState title="Пока пусто" body="Завершённые действия появятся здесь вместе с результатом." />}</div></section>
                </div>
              )}

              {planTab === 'routines' && (
                <div className="routine-section">
                  {showRoutineForm && (
                    <form className="routine-form" onSubmit={submitRoutine}>
                      <div><label htmlFor="routine-title">Название</label><input id="routine-title" name="title" required minLength={2} maxLength={60} placeholder="Например, вечерняя прогулка" /></div>
                      <div><label htmlFor="routine-schedule">Расписание</label><input id="routine-schedule" name="schedule" required minLength={3} maxLength={80} placeholder="Каждый день · 20:00" /></div>
                      <div><label htmlFor="routine-duration">Минут</label><input id="routine-duration" name="duration" type="number" required min={5} max={180} defaultValue={30} /></div>
                      <button className="button button-primary" disabled={busy === 'routine-create'}>Сохранить</button>
                    </form>
                  )}
                  <div className="routine-list">{state.routines.map((routine) => <RoutineCard key={routine.id} routine={routine} busy={busy} onMutate={mutateRoutine} />)}</div>
                </div>
              )}
            </div>
          )}

          {view === 'profile' && (
            <div className="profile-screen">
              <section className="profile-hero">
                <div className="profile-monogram">А</div>
                <div><span className="eyebrow">Персонаж игрока</span><h1>{state.player.name}</h1><p><Icon name="briefcase" size={16} />{state.player.role} <span>·</span> <Icon name="pin" size={16} />{state.player.city}</p></div>
                <div className="reputation-stamp"><span>{state.player.reputation}</span><small>репутация</small></div>
              </section>
              <div className="segmented profile-tabs" role="tablist" aria-label="Раздел профиля">
                <button role="tab" aria-selected={profileTab === 'stats'} className={profileTab === 'stats' ? 'active' : ''} onClick={() => setProfileTab('stats')}>Показатели</button>
                <button role="tab" aria-selected={profileTab === 'finance'} className={profileTab === 'finance' ? 'active' : ''} onClick={() => setProfileTab('finance')}>Финансы</button>
              </div>
              {profileTab === 'stats' ? (
                <div className="profile-grid">
                  <section className="stat-board">
                    <div className="section-heading"><div><span className="eyebrow">Текущее состояние</span><h2>Ресурсы персонажа</h2></div></div>
                    <Metric label="Энергия" value={state.player.energy} icon="bolt" tone="lime" />
                    <Metric label="Здоровье" value={state.player.health} icon="heart" tone="coral" />
                    <Metric label="Фокус" value={state.player.focus} icon="focus" tone="cyan" />
                    <Metric label="Репутация" value={state.player.reputation} icon="spark" tone="amber" />
                  </section>
                  <section className="evidence-board">
                    <div className="section-heading"><div><span className="eyebrow">Без глобального уровня</span><h2>Подтверждённый опыт</h2></div></div>
                    <p className="board-intro">Компетентность растёт через завершённые события, а не через абстрактные очки уровня.</p>
                    <div className="evidence-entries">
                      {finished.length ? finished.map((action) => <div key={action.id}><Icon name="check" size={16} /><div><strong>{action.title}</strong><span>{action.outcome}</span></div><time>{action.resolvedAt ? formatDate(action.resolvedAt) : ''}</time></div>) : <EmptyState title="Доказательств пока нет" body="Завершите первое действие — результат станет частью истории." />}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="finance-layout">
                  <section className="balance-board">
                    <span className="eyebrow">Доступно сейчас</span>
                    <h2>{formatMoney(state.wallet.balanceCents)}</h2>
                    <p>Баланс рассчитывается только по ledger-записям.</p>
                    <div className="ledger-summary"><span>Записей <strong>{state.ledger.length}</strong></span><span>Доходов <strong>{state.ledger.filter((entry) => entry.amountCents > 0).length}</strong></span><span>Расходов <strong>{state.ledger.filter((entry) => entry.amountCents < 0).length}</strong></span></div>
                  </section>
                  <section className="ledger-board">
                    <div className="section-heading"><div><span className="eyebrow">Аудируемая история</span><h2>Операции</h2></div></div>
                    <div className="ledger-list">{state.ledger.map((entry) => <div key={entry.id}><span className={`ledger-icon ${entry.amountCents >= 0 ? 'positive' : 'negative'}`}><Icon name={entry.amountCents >= 0 ? 'arrow' : 'wallet'} size={17} /></span><div><strong>{entry.title}</strong><small>{formatDate(entry.createdAt)} · {formatTime(entry.createdAt)}</small></div><b className={entry.amountCents >= 0 ? 'positive-text' : 'negative-text'}>{entry.amountCents >= 0 ? '+' : '−'}{formatMoney(Math.abs(entry.amountCents))}</b></div>)}</div>
                  </section>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {NAV_ITEMS.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}
      </nav>
    </div>
  );
}
