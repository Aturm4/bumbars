'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionKind, ApiError, GameAction, GameState, RoutineState } from '@/lib/game-types';

type View = 'host' | 'dossier' | 'plan' | 'profile';
type DossierTab = 'people' | 'events' | 'relations';
type ProfilePage = 'character' | 'career' | 'skills' | 'assets' | 'relations' | 'biography' | 'finance';

const NAV: Array<{ id: View; label: string; glyph: string }> = [
  { id: 'host', label: 'Хост', glyph: '✦' },
  { id: 'dossier', label: 'Досье', glyph: '▰' },
  { id: 'plan', label: 'Путь', glyph: '▦' },
  { id: 'profile', label: 'Алекс', glyph: '●' },
];

const PROMPTS = [
  'провести силовую тренировку',
  'взять рабочий контракт',
  'изучить новый модуль',
  'сделать практику внимания',
];

function formatMoney(cents: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(cents / 100)} сум`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'short' }).format(new Date(value));
}

function dayNumber(value: string): number {
  const date = new Date(value);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

function remaining(action: GameAction | undefined, now: number): string {
  if (!action?.dueAt) return '00:00';
  const seconds = Math.max(0, Math.ceil((new Date(action.dueAt).getTime() - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function readableRequestError(reason: unknown, fallback: string): string {
  if (reason instanceof TypeError && /fetch|network|load failed/i.test(reason.message)) {
    return 'Не удалось связаться с сервером. Проверь соединение и повтори.';
  }
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function statusText(action: GameAction): string {
  return {
    awaiting_confirmation: 'Нужно решение',
    running: 'В пути',
    resolved: 'Завершено',
    cancelled: 'Отклонено',
    failed: 'Не удалось',
  }[action.status];
}
function assetKindText(kind: string): string {
  return {
    inventory: 'инвентарь',
    property: 'недвижимость',
    vehicle: 'транспорт',
    investment: 'инвестиция',
    equity: 'доля в компании',
  }[kind] ?? 'актив';
}


function GameActionCard({
  action,
  now,
  busy,
  onConfirm,
  onCancel,
  compact = false,
}: {
  action: GameAction;
  now: number;
  busy: string | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`game-action-card action-${action.status} ${compact ? 'compact' : ''}`}>
      <div className="action-seal">{action.kind === 'training' ? '↟' : action.kind === 'study' ? '✎' : action.kind === 'work' ? 'N' : action.kind === 'travel' ? '⌖' : '○'}</div>
      <div className="action-card-copy">
        <div className="action-card-meta"><span>{statusText(action)}</span><time>{action.status === 'running' ? remaining(action, now) : `${Math.ceil(action.durationSeconds / 60)} мин`}</time></div>
        <h3>{action.title}</h3>
        {!compact && <p>{action.description}</p>}
        <div className="action-tags"><span>{action.costCents ? formatMoney(action.costCents) : 'без расходов'}</span><span>{action.energyCost ? `−${action.energyCost} энергии` : 'без усталости'}</span><span>оценка: {Math.round(action.probabilityPercent)}%</span><span>{action.capacity === 'foreground' ? 'занимает персонажа' : 'можно в фоне'}</span><span>риск: {action.riskLabel.toLowerCase()}</span></div>
        {action.rollPercent !== null && <small className="action-roll">бросок сервера: {action.rollPercent.toFixed(2)}% · {action.succeeded ? 'успех' : 'неудача'}</small>}
        {action.outcome && !compact && <blockquote>{action.outcome}</blockquote>}
        {action.status === 'awaiting_confirmation' && (
          <div className="action-decisions">
            <button disabled={busy === action.id} onClick={() => onConfirm(action.id)}>Начать</button>
            <button disabled={busy === action.id} onClick={() => onCancel(action.id)}>Отказаться</button>
          </div>
        )}
      </div>
    </article>
  );
}

function ResourceBar({ label, value, tone, glyph }: { label: string; value: number; tone: string; glyph: string }) {
  return <div className={`character-stat tone-${tone}`}><span>{glyph}</span><div><small>{label}</small><strong>{value}<em>/100</em></strong><i><b style={{ width: `${value}%` }} /></i></div></div>;
}

function RoutineToken({ routine, busy, confirming, onMutate, onConfirmCancel }: {
  routine: RoutineState;
  busy: string | null;
  confirming: boolean;
  onMutate: (id: string, mutation: 'skip' | 'pause' | 'resume' | 'cancel') => void;
  onConfirmCancel: (id: string | null) => void;
}) {
  const isBusy = busy === routine.id;
  return (
    <article className={`routine-token ${routine.status === 'paused' ? 'paused' : ''}`}>
      <div className="streak-flame"><strong>{routine.streak}</strong><span>дней</span></div>
      <div className="routine-token-copy"><small>{routine.status === 'active' ? 'АКТИВНЫЙ РИТУАЛ' : 'НА ПАУЗЕ'}</small><h3>{routine.title}</h3><p>{routine.scheduleLabel} · {routine.durationMinutes} мин</p>{routine.skipNext && <em>следующий раз пропущен</em>}</div>
      <div className="routine-token-actions">
        {confirming ? (
          <><button className="danger" disabled={isBusy} onClick={() => onMutate(routine.id, 'cancel')}>Точно отменить</button><button onClick={() => onConfirmCancel(null)}>Оставить</button></>
        ) : routine.status === 'active' ? (
          <><button disabled={isBusy || routine.skipNext} onClick={() => onMutate(routine.id, 'skip')}>Пропустить</button><button disabled={isBusy} onClick={() => onMutate(routine.id, 'pause')}>Пауза</button><button className="icon-choice" onClick={() => onConfirmCancel(routine.id)} aria-label={`Отменить ритуал ${routine.title}`}>×</button></>
        ) : (
          <><button disabled={isBusy} onClick={() => onMutate(routine.id, 'resume')}>Продолжить</button><button className="icon-choice" onClick={() => onConfirmCancel(routine.id)} aria-label={`Отменить ритуал ${routine.title}`}>×</button></>
        )}
      </div>
    </article>
  );
}

function ProfileContent({ state, page, finished }: { state: GameState; page: ProfilePage; finished: GameAction[] }) {
  if (page === 'character') {
    return <div className="character-sheet">
      <section className="stats-paper"><small>СОСТОЯНИЕ</small><h2>Не уровень, а прожитый опыт</h2>
        <ResourceBar label="Энергия" value={state.player.energy} tone="lime" glyph="ϟ"/>
        <ResourceBar label="Здоровье" value={state.player.health} tone="coral" glyph="♥"/>
        <ResourceBar label="Фокус" value={state.player.focus} tone="cyan" glyph="◎"/>
        <ResourceBar label="Мораль" value={state.character.morale} tone="amber" glyph="☀"/>
        <div className="psyche-row"><span>Стресс <b>{state.character.stress}</b></span><span>Уверенность <b>{state.character.confidence}</b></span><span>Усталость <b>{state.character.fatigue}</b></span></div>
      </section>
      <section className="backpack-paper"><small>РЮКЗАК И ДОКАЗАТЕЛЬСТВА</small><h2>Что Алекс забирает с собой</h2>
        <div className="inventory-grid">{state.profile.assets.filter((asset) => asset.kind === 'inventory' || asset.kind === 'vehicle').map((asset) => <div key={asset.id}><span>{asset.kind === 'vehicle' ? '⌁' : '▤'}</span><strong>{asset.title}</strong><small>{formatMoney(asset.estimatedValueCents)}</small></div>)}</div>
        <div className="experience-list">{finished.slice(0, 5).map((action) => <div key={action.id}><span>✓</span><div><strong>{action.title}</strong><small>{action.outcome}</small></div><time>{action.resolvedAt ? formatDate(action.resolvedAt) : ''}</time></div>)}</div>
      </section>
    </div>;
  }

  if (page === 'career') {
    const job = state.profile.employment;
    return <div className="profile-ledger-grid">
      <section className="profile-book-card"><small>КАРЬЕРА</small><h2>{job?.title ?? 'Свободный путь'}</h2><p>{job?.organization ?? 'Нет активного трудового контракта'}</p>
        {job && <dl><div><dt>Месячный эквивалент</dt><dd>{formatMoney(job.monthlySalaryCents)}</dd></div><div><dt>Игровая выплата</dt><dd>{formatMoney(job.dailyPayoutCents)} / день</dd></div><div><dt>Результат</dt><dd>{job.performance}</dd></div><div><dt>Следующая сессия</dt><dd>{formatDate(job.nextSession)} · {formatTime(job.nextSession)}</dd></div></dl>}
      </section>
      <section className="profile-book-card"><small>ОБРАЗОВАНИЕ</small><h2>Учебный путь</h2>{state.profile.credentials.map((item) => <article className="progress-record" key={item.id}><div><strong>{item.title}</strong><small>{item.issuer} · {item.status === 'completed' ? 'завершено' : item.progress + '%'}</small></div><i><b style={{ width: item.progress + '%' }}/></i></article>)}</section>
      <section className="profile-book-card wide"><small>ЦЕЛИ БЕЗ ПОДСКАЗОК</small>{state.profile.goals.map((goal) => <h3 key={goal.id}>✦ {goal.title}</h3>)}<p>Хост помнит направление, но не превращает его в готовый маршрут.</p></section>
    </div>;
  }

  if (page === 'skills') {
    return <div className="profile-ledger-grid">
      <section className="profile-book-card wide"><small>КОМПЕТЕНТНОСТЬ</small><h2>Навыки и доказательства</h2>{state.profile.skills.map((skill) => <article className="skill-record" key={skill.id}><div><strong>{skill.name}</strong><small>{skill.domain} · доказательств: {skill.evidenceCount}</small></div><span>{skill.competence}</span><i><b style={{ width: skill.competence + '%' }}/></i></article>)}</section>
      <section className="profile-book-card wide"><small>ОПЫТ</small>{state.profile.experience.map((item) => <article className="evidence-record" key={item.id}><span className={item.outcome}>{item.outcome === 'success' ? '✓' : item.outcome === 'failure' ? '×' : '≈'}</span><div><strong>{item.title}</strong><small>{item.domain} · сложность: {item.complexity}</small></div><time>{formatDate(item.occurredAt)}</time></article>)}</section>
    </div>;
  }

  if (page === 'assets') {
    return <div className="profile-ledger-grid">
      <section className="profile-book-card wide"><small>АКТИВЫ</small><h2>То, чем персонаж действительно владеет</h2>{state.profile.assets.map((asset) => <article className="asset-record" key={asset.id}><div><strong>{asset.title}</strong><small>{asset.locationName} · {assetKindText(asset.kind)}</small></div><b>{formatMoney(asset.estimatedValueCents)}</b><em>быстрая продажа: {formatMoney(asset.liquidationValueCents)}</em></article>)}</section>
      {state.profile.organizations.map((org) => <section className="profile-book-card wide organization-record" key={org.id}><small>ОРГАНИЗАЦИЯ</small><h2>{org.name}</h2><p>{org.kind} · {org.role} · доля {org.ownershipPercent}%</p><dl><div><dt>Казна</dt><dd>{formatMoney(org.cashCents)}</dd></div><div><dt>Выручка / месяц</dt><dd>{formatMoney(org.monthlyRevenueCents)}</dd></div><div><dt>Прибыль / месяц</dt><dd>{formatMoney(org.monthlyProfitCents)}</dd></div><div><dt>Участники</dt><dd>{org.members}</dd></div></dl></section>)}
    </div>;
  }

  if (page === 'relations') {
    return <div className="profile-ledger-grid">
      <section className="profile-book-card"><small>ОТНОШЕНИЯ</small><h2>Не один friendship score</h2>{state.profile.relationships.map((rel) => <article className="relation-record" key={rel.id}><strong>{rel.name}</strong><div><span>доверие {rel.trust}</span><span>уважение {rel.respect}</span><span>тепло {rel.affection}</span><span>обида {rel.resentment}</span></div></article>)}</section>
      <section className="profile-book-card"><small>РЕПУТАЦИЯ</small><h2>По разным кругам</h2>{state.profile.reputations.filter((rep) => rep.visibility !== 'hidden').map((rep) => <article className="reputation-record" key={rep.domain}><strong>{rep.domain}</strong><span>{rep.value}</span><small>{rep.visibility === 'public' ? 'видно миру' : 'личная оценка'}</small></article>)}</section>
      <section className="profile-book-card wide"><small>АКТИВНЫЕ НИТИ</small>{state.profile.storyThreads.map((thread) => <article className="thread-record" key={thread.id}><strong>{thread.title}</strong><i><b style={{ width: thread.tension + '%' }}/></i><span>напряжение {thread.tension}</span></article>)}{state.profile.cases.length === 0 && <p>Открытых расследований, известных персонажу, нет.</p>}</section>
    </div>;
  }

  if (page === 'biography') {
    return <div className="profile-ledger-grid">
      <section className="profile-book-card wide biography-card"><small>БИОГРАФИЯ</small><h2>{state.character.name}</h2><blockquote>{state.character.biography}</blockquote><p>История строится из важных событий, а не из ежедневного журнала.</p></section>
      <section className="profile-book-card wide"><small>ПОСЛЕДНИЕ СОБЫТИЯ</small>{state.events.slice(0, 8).map((event) => <article className="evidence-record" key={event.id}><span>✦</span><div><strong>{event.title}</strong><small>{event.body}</small></div><time>{formatDate(event.createdAt)}</time></article>)}</section>
    </div>;
  }

  return <div className="wallet-sheet"><section className="wallet-pouch"><small>В КОШЕЛЬКЕ</small><h2>{formatMoney(state.wallet.balanceCents)}</h2><p>Баланс меняется только через сбалансированные серверные проводки.</p><div><span>операций <strong>{state.ledger.length}</strong></span><span>доходов <strong>{state.ledger.filter((entry) => entry.amountCents > 0).length}</strong></span><span>расходов <strong>{state.ledger.filter((entry) => entry.amountCents < 0).length}</strong></span></div></section><section className="receipt-stack"><small>ПОСЛЕДНИЕ ЧЕКИ</small>{state.ledger.map((entry) => <article key={entry.id}><div><strong>{entry.title}</strong><small>{formatDate(entry.createdAt)} · {formatTime(entry.createdAt)}</small></div><b className={entry.amountCents >= 0 ? 'gain' : 'spend'}>{entry.amountCents >= 0 ? '+' : '−'}{formatMoney(Math.abs(entry.amountCents))}</b></article>)}</section></div>;
}

function relationshipLabel(trust: number, resentment: number): string {
  if (resentment >= 40) return 'напряжённые';
  if (trust >= 70) return 'близкие';
  if (trust >= 50) return 'надёжные';
  if (trust >= 30) return 'знакомые';
  return 'неопределённые';
}

function DossierScreen({ state, tab, busy, onTab, onTravel, onOpenHistory }: {
  state: GameState;
  tab: DossierTab;
  busy: boolean;
  onTab: (tab: DossierTab) => void;
  onTravel: (locationId: string, locationName: string) => void;
  onOpenHistory: () => void;
}) {
  const locations = new Map(state.world.locations.map((location) => [location.id, location.name]));
  const others = state.world.players.filter((player) => !player.isCurrent);
  const hostRelation = state.profile.relationships.find((item) => item.name === 'Хост');
  const hostMessage = state.hostMessages[state.hostMessages.length - 1];
  const currentMapLocationId = state.world.players.find((player) => player.isCurrent)?.mapLocationId;
  const knownPlaces = state.world.locations.filter((location) => location.kind === 'district' || location.kind === 'region');
  const peopleCount = others.length + 1;

  return <div className="dossier-screen game-screen-panel">
    <section className="dossier-folder" aria-label="Досье Алекса">
      <header className="dossier-file-heading">
        <span className="dossier-clip" aria-hidden="true" />
        <div><h1>ДОСЬЕ</h1><p>Люди, связи и то, что тебе известно</p></div>
        <span className="dossier-round-stamp" aria-hidden="true">Б</span>
      </header>

      <div className="dossier-tabs" role="tablist" aria-label="Разделы досье">
        <button role="tab" aria-selected={tab === 'people'} className={tab === 'people' ? 'active' : ''} onClick={() => onTab('people')}>ЛЮДИ <span>{peopleCount}</span></button>
        <button role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'active' : ''} onClick={() => onTab('events')}>СОБЫТИЯ <span>{state.world.events.length}</span></button>
        <button role="tab" aria-selected={tab === 'relations'} className={tab === 'relations' ? 'active' : ''} onClick={() => onTab('relations')}>СВЯЗИ <span>{state.profile.relationships.length}</span></button>
      </div>

      <div className="dossier-file-body">
        {tab === 'people' && <div className="dossier-card-stack">
          {others.map((person, index) => {
            const relation = state.profile.relationships.find((item) => item.name === person.name);
            return <article className={`dossier-index-card tone-${person.color}`} key={person.id}>
              <span className="dossier-side-tab" aria-hidden="true" />
              <header><span className="dossier-initial">{person.name.slice(0, 1)}</span><div><h2>{person.name}</h2><p>{person.role}</p></div><b>{index === 1 ? 'ОБЩЕЕ' : 'ЛИЧНОЕ'}</b></header>
              <dl>
                <div><dt>отношение:</dt><dd>{relation ? relationshipLabel(relation.trust, relation.resentment) : 'не определено'}</dd></div>
                <div><dt>последний контакт:</dt><dd>{formatDate(person.lastSeenAt)} · {formatTime(person.lastSeenAt)} · {locations.get(person.locationId) ?? 'место неизвестно'}</dd></div>
                <div><dt>что известно:</dt><dd>{person.biography}</dd></div>
              </dl>
            </article>;
          })}
          <article className="dossier-index-card tone-lime dossier-host-card">
            <span className="dossier-side-tab" aria-hidden="true" />
            <header><span className="dossier-initial">Х</span><div><h2>Хост</h2><p>ИИ-ведущий</p></div><b>СЛУЖЕБНОЕ</b></header>
            <dl>
              <div><dt>отношение:</dt><dd>{hostRelation ? relationshipLabel(hostRelation.trust, hostRelation.resentment) : 'доверенное'}</dd></div>
              <div><dt>последний контакт:</dt><dd>{hostMessage ? `${formatDate(hostMessage.createdAt)} · ${formatTime(hostMessage.createdAt)}` : 'ещё не было'}</dd></div>
              <div><dt>что известно:</dt><dd>Объясняет исход, а деньги, время, шанс и последствия считает сервер.</dd></div>
            </dl>
          </article>
        </div>}

        {tab === 'events' && <div className="dossier-card-stack dossier-event-stack">
          {state.world.events.map((event, index) => <article className={`dossier-index-card tone-${index % 2 ? 'amber' : 'coral'}`} key={event.id}>
            <span className="dossier-side-tab" aria-hidden="true" />
            <header><span className="dossier-initial">{index + 1}</span><div><h2>{event.title}</h2><p>{event.scope}</p></div><b>ИЗВЕСТНО</b></header>
            <dl><div><dt>когда:</dt><dd>{formatDate(event.happenedAt)} · {formatTime(event.happenedAt)}</dd></div><div><dt>что произошло:</dt><dd>{event.summary}</dd></div></dl>
          </article>)}
          {knownPlaces.map((location) => {
            const isCurrent = location.id === currentMapLocationId;
            return <article className="dossier-index-card tone-violet dossier-route-card" key={location.id}>
              <span className="dossier-side-tab" aria-hidden="true" />
              <header><span className="dossier-initial">{location.glyph}</span><div><h2>{location.name}</h2><p>{location.kind === 'region' ? 'известный регион' : 'известный район'}</p></div><b>{isCurrent ? 'ВЫ ЗДЕСЬ' : 'МАРШРУТ'}</b></header>
              <dl><div><dt>что известно:</dt><dd>{location.note}</dd></div><div><dt>условия:</dt><dd>{location.travelMinutes} мин · {formatMoney(location.travelCostCents)} · риск {location.riskLabel.toLowerCase()}</dd></div></dl>
              <button disabled={busy || isCurrent} onClick={() => onTravel(location.id, location.name)}>{isCurrent ? 'ТЕКУЩЕЕ МЕСТО' : 'ПОДГОТОВИТЬ ПОЕЗДКУ'}</button>
            </article>;
          })}
        </div>}

        {tab === 'relations' && <div className="dossier-card-stack dossier-relations-stack">
          {state.profile.relationships.map((relation, index) => <article className={`dossier-index-card tone-${['lime', 'coral', 'violet', 'amber'][index % 4]}`} key={relation.id}>
            <span className="dossier-side-tab" aria-hidden="true" />
            <header><span className="dossier-initial">{relation.name.slice(0, 1)}</span><div><h2>{relation.name}</h2><p>{relationshipLabel(relation.trust, relation.resentment)}</p></div><b>{relation.trust >= 60 ? 'БЛИЗКИЕ' : 'ЛИЧНОЕ'}</b></header>
            <div className="dossier-relation-metrics"><span>доверие <b>{relation.trust}</b></span><span>уважение <b>{relation.respect}</b></span><span>тепло <b>{relation.affection}</b></span><span>обида <b>{relation.resentment}</b></span></div>
          </article>)}
        </div>}
      </div>

      <footer className="dossier-connection-slip">
        <strong>СОСТОЯНИЕ<br/>СВЯЗЕЙ</strong>
        <div>{state.profile.relationships.slice(0, 2).map((relation, index) => <span key={relation.id}><i className={index ? 'violet' : ''} />{relation.name}: доверие {relation.trust}</span>)}</div>
        <b aria-hidden="true">↗</b>
      </footer>
      <button className="dossier-open-history" onClick={onOpenHistory}>ОТКРЫТЬ ИСТОРИЮ</button>
    </section>
  </div>;
}
export default function GameApp() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('dossier');
  const [dossierTab, setDossierTab] = useState<DossierTab>('people');
  const [profilePage, setProfilePage] = useState<ProfilePage>('character');
  const [hostIntent, setHostIntent] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [confirmRoutine, setConfirmRoutine] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy('load');
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      const data = await response.json() as GameState | ApiError;
      if (!response.ok) throw new Error((data as ApiError).error);
      setState(data as GameState);
      setError(null);
    } catch (reason) {
      setError(readableRequestError(reason, 'Мир временно недоступен'));
    } finally {
      if (!quiet) setBusy(null);
    }
  }, []);

  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(() => void load(true), 10_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(clock);
      window.clearInterval(sync);
    };
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const request = useCallback(async (path: string, init: RequestInit, key: string, success: string) => {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
      const data = await response.json() as GameState | ApiError;
      if (!response.ok) throw new Error((data as ApiError).error);
      setState(data as GameState);
      setNotice(success);
      return true;
    } catch (reason) {
      setError(readableRequestError(reason, 'Команда не выполнена'));
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const propose = useCallback(async (kind?: ActionKind, intent?: string, targetLocationId?: string) => {
    const ok = await request('/api/actions', { method: 'POST', body: JSON.stringify({ kind, intent: intent ?? hostIntent, targetLocationId }) }, 'proposal', 'Хост подготовил карточку решения.');
    if (ok) {
      setHostIntent('');
      setView('host');
    }
  }, [hostIntent, request]);

  const confirmAction = useCallback((id: string) => void request(`/api/actions/${id}/confirm`, { method: 'POST' }, id, 'Действие началось. Мир запомнил решение.'), [request]);
  const cancelAction = useCallback((id: string) => void request(`/api/actions/${id}/cancel`, { method: 'POST' }, id, 'Карточка убрана без списаний.'), [request]);
  const mutateRoutine = useCallback((id: string, mutation: 'skip' | 'pause' | 'resume' | 'cancel') => {
    void request(`/api/routines/${id}`, { method: 'PATCH', body: JSON.stringify({ mutation }) }, id, 'Ритуал изменён.');
    if (mutation === 'cancel') setConfirmRoutine(null);
  }, [request]);

  const running = useMemo(() => state?.actions.filter((action) => action.status === 'running') ?? [], [state]);
  const awaiting = useMemo(() => state?.actions.filter((action) => action.status === 'awaiting_confirmation') ?? [], [state]);
  const finished = useMemo(() => state?.actions.filter((action) => action.status === 'resolved') ?? [], [state]);
  async function submitHost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hostIntent.trim()) await propose(undefined, hostIntent);
  }

  async function submitRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await request('/api/routines', {
      method: 'POST',
      body: JSON.stringify({ title: form.get('title'), scheduleLabel: form.get('schedule'), durationMinutes: Number(form.get('duration')) }),
    }, 'routine-create', 'Новый ритуал появился на игровом поле.');
    if (ok) {
      formElement.reset();
      setShowRoutineForm(false);
    }
  }

  if (!state) {
    return <main className="world-loading"><span>Б</span><strong>Ташкент просыпается…</strong><p>{error ?? 'Загружаем живой мир'}</p>{error && <button onClick={() => void load()}>Повторить</button>}</main>;
  }

  const clockNow = now || new Date(state.serverTime).getTime();

  return (
    <main className={`bumbars-game view-${view}`}>
      <div className="world-backdrop" />
      <div className="world-vignette" />

      <header className="persistent-hud">
        <button className="player-plaque" onClick={() => { setView('profile'); setProfilePage('character'); }}>
          <span>А</span><div><small>ИГРОК</small><strong>{state.player.name}</strong><em>{state.player.role}</em></div>
        </button>
        <div className="resource-plaque">
          <button onClick={() => { setView('profile'); setProfilePage('finance'); }}><span className="res-coin">●</span><small>кошелёк</small><strong>{formatMoney(state.wallet.balanceCents)}</strong></button>
          <div><span className="res-energy">ϟ</span><small>энергия</small><strong>{state.player.energy}</strong></div>
          <div><span className="res-health">♥</span><small>здоровье</small><strong>{state.player.health}</strong></div>
        </div>
        <button className="day-plaque" onClick={() => void load()} disabled={busy === 'load'}><small>ДЕНЬ {dayNumber(state.serverTime)}</small><strong>{formatTime(state.serverTime)}</strong><em>Ташкент · обновить</em></button>
      </header>

      <section className="game-canvas">
        {view === 'host' && (
          <div className="host-screen game-screen-panel">
            <div className="host-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/host-character.png" alt="Хост — игровой ведущий Bumbars" />
              <div className="host-shadow" />
              <div className="host-nameplate"><small>ИИ-ВЕДУЩИЙ</small><strong>Хост</strong><span>понимает намерение · сервер считает последствия</span></div>
            </div>
            <section className="host-dialogue">
              <div className="dialogue-heading"><div><small>ЖУРНАЛ РЕШЕНИЙ</small><h1>Что будем делать?</h1></div><span className="host-online">● на связи</span></div>
              <div className="host-history">{state.hostMessages.map((message) => <article className={message.role} key={message.id}><small>{message.role === 'host' ? 'ХОСТ' : state.player.name.toUpperCase()}</small><p>{message.body}</p><time>{formatTime(message.createdAt)}</time></article>)}</div>
              <form className="host-command" onSubmit={submitHost}><label htmlFor="host-intent">Я хочу…</label><div><input id="host-intent" value={hostIntent} onChange={(event) => setHostIntent(event.target.value)} maxLength={280} placeholder="например, позаниматься экономикой вечером"/><button disabled={!hostIntent.trim() || busy === 'proposal'}>Рассчитать →</button></div></form>
              <div className="suggestion-cards">{PROMPTS.map((prompt) => <button key={prompt} onClick={() => setHostIntent(prompt)}>{prompt}</button>)}</div>
              <div className="host-cards"><div className="subheading"><h2>Карточки выбора</h2><span>{awaiting.length}</span></div>{awaiting.length ? awaiting.map((action) => <GameActionCard key={action.id} action={action} now={clockNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} />) : <div className="game-empty"><strong>Колода пуста</strong><p>Опиши намерение. Хост не запустит ничего без твоего решения.</p></div>}</div>
            </section>
          </div>
        )}

        {view === 'plan' && (
          <div className="plan-screen game-screen-panel">
            <header className="screen-title"><div><small>ЛИЧНЫЙ ПУТЕВОЙ ЖУРНАЛ</small><h1>Сегодняшний путь</h1><p>Алекс может быть занят, но ты всегда можешь планировать следующий ход.</p></div><button className="add-routine" onClick={() => setShowRoutineForm((value) => !value)}>+ Новый ритуал</button></header>
            {showRoutineForm && <form className="ritual-maker" onSubmit={submitRoutine}><div><label htmlFor="ritual-title">Ритуал</label><input id="ritual-title" name="title" required minLength={2} maxLength={60} placeholder="Вечерняя прогулка"/></div><div><label htmlFor="ritual-schedule">Когда</label><input id="ritual-schedule" name="schedule" required minLength={3} maxLength={80} placeholder="Каждый день · 20:00"/></div><div><label htmlFor="ritual-duration">Минут</label><input id="ritual-duration" name="duration" type="number" required min={5} max={180} defaultValue={30}/></div><button disabled={busy === 'routine-create'}>Добавить на поле</button></form>}
            <div className="open-journal">
              <section className="journal-page today-page"><div className="page-tab">ДЕЙСТВИЯ</div><div className="page-heading"><span>{running.length + awaiting.length}</span><h2>В дороге</h2></div><div className="path-line" />{[...running, ...awaiting].length ? [...running, ...awaiting].map((action, index) => <div className="path-stop" key={action.id}><span>{index + 1}</span><GameActionCard action={action} now={clockNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} compact /></div>) : <div className="game-empty"><strong>Путь свободен</strong><p>Выбери маршрут в досье или поговори с Хостом.</p></div>}<div className="page-heading resolved-heading"><span>{finished.length}</span><h2>Следы опыта</h2></div>{finished.slice(0, 3).map((action) => <GameActionCard key={action.id} action={action} now={clockNow} busy={busy} onConfirm={confirmAction} onCancel={cancelAction} compact />)}</section>
              <section className="journal-page routine-page"><div className="page-tab">РИТУАЛЫ</div><div className="page-heading"><span>{state.routines.length}</span><h2>Повторяющийся маршрут</h2></div><div className="routine-stack">{state.routines.map((routine) => <RoutineToken key={routine.id} routine={routine} busy={busy} confirming={confirmRoutine === routine.id} onMutate={mutateRoutine} onConfirmCancel={setConfirmRoutine}/>)}</div></section>
            </div>
          </div>
        )}

        {view === 'dossier' && <DossierScreen state={state} tab={dossierTab} busy={busy === 'proposal'} onTab={setDossierTab} onTravel={(locationId, locationName) => void propose('travel', `поехать в ${locationName}`, locationId)} onOpenHistory={() => { setProfilePage('biography'); setView('profile'); }} />}

        {view === 'profile' && (
          <div className="profile-screen game-screen-panel">
            <header className="character-header"><div className="character-avatar">А<span /></div><div><small>ЛИСТ ПЕРСОНАЖА</small><h1>{state.player.name}</h1><p>{state.player.role} · {state.player.city}</p></div><div className="reputation-medal"><span>{state.player.reputation}</span><small>репутация</small></div></header>
            <div className="sheet-tabs"><button className={profilePage === 'character' ? 'active' : ''} onClick={() => setProfilePage('character')}>Персонаж</button><button className={profilePage === 'career' ? 'active' : ''} onClick={() => setProfilePage('career')}>Карьера</button><button className={profilePage === 'skills' ? 'active' : ''} onClick={() => setProfilePage('skills')}>Навыки</button><button className={profilePage === 'assets' ? 'active' : ''} onClick={() => setProfilePage('assets')}>Активы</button><button className={profilePage === 'relations' ? 'active' : ''} onClick={() => setProfilePage('relations')}>Связи</button><button className={profilePage === 'biography' ? 'active' : ''} onClick={() => setProfilePage('biography')}>История</button><button className={profilePage === 'finance' ? 'active' : ''} onClick={() => setProfilePage('finance')}>Кошелёк</button></div>
            <ProfileContent state={state} page={profilePage} finished={finished} />
          </div>
        )}
      </section>

      <nav className="game-dock" aria-label="Главная навигация">{NAV.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><span>{item.glyph}</span><strong>{item.label}</strong></button>)}</nav>
      {notice && <div className="game-toast success">✓ {notice}</div>}
      {error && <div className="game-toast error">{error}<button onClick={() => setError(null)}>×</button></div>}
    </main>
  );
}
