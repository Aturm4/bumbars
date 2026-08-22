'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

type Tab = 'home' | 'world' | 'host' | 'plan' | 'me';
type MeView = 'hub' | 'finance' | 'company';
type Tone = 'olive' | 'aqua' | 'purple' | 'sand' | 'red';

type TimelineItem = {
  time: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  tone: Tone;
  state?: 'done' | 'active';
};

const timeline: TimelineItem[] = [
  { time: '7:00', icon: '☯', title: 'Медитация', subtitle: 'Серия 12 дней', duration: 'Готово', tone: 'olive', state: 'done' },
  { time: '8:00', icon: '▤', title: 'Учебная сессия', subtitle: 'Глубокая работа · 90 мин', duration: 'Готово', tone: 'purple', state: 'done' },
  { time: '10:00', icon: '🏋', title: 'Силовая тренировка', subtitle: 'Энергия +12 · Здоровье +8', duration: 'Осталось 38 мин', tone: 'olive', state: 'active' },
  { time: '11:00', icon: '✈', title: 'Перелёт в Дубай', subtitle: 'Деловая поездка', duration: '1 ч 15 мин', tone: 'aqua' },
  { time: '14:30', icon: '▣', title: 'Ревью продуктовой стратегии', subtitle: 'Командная встреча', duration: '45 мин', tone: 'sand' },
  { time: '19:00', icon: '▰', title: 'Курс экономики', subtitle: 'Поведенческая экономика · Урок 4', duration: '55 мин', tone: 'purple' },
];

const routines = [
  { icon: '☯', title: 'Утренняя медитация', schedule: 'Каждый день в 7:00', duration: '15 мин', streak: 12, tone: 'olive' as Tone },
  { icon: '🏋', title: 'Тренажёрный зал', schedule: 'Пн, Ср, Пт в 18:30', duration: '60 мин', streak: 18, tone: 'aqua' as Tone },
  { icon: '▰', title: 'Курс экономики', schedule: 'Вт, Чт в 19:00', duration: '55 мин', streak: 7, tone: 'purple' as Tone },
  { icon: '✎', title: 'Дневник', schedule: 'Каждый день в 21:30', duration: '10 мин', streak: 5, tone: 'sand' as Tone },
];

const hubItems = [
  { icon: '▥', title: 'Показатели', copy: 'Самочувствие и прогресс', tone: 'olive' as Tone },
  { icon: '▣', title: 'Карьера', copy: 'Роли, опыт и достижения', tone: 'aqua' as Tone },
  { icon: '▰', title: 'Навыки', copy: 'Освоенные способности', tone: 'purple' as Tone },
  { icon: '▤', title: 'Финансы', copy: 'Доходы, расходы и активы', tone: 'olive' as Tone, target: 'finance' as MeView },
  { icon: '◇', title: 'Образование', copy: 'Курсы и дипломы', tone: 'aqua' as Tone },
  { icon: '▧', title: 'Инвентарь', copy: 'Предметы, инструменты и коллекции', tone: 'purple' as Tone },
  { icon: '●', title: 'Отношения', copy: 'Друзья, семья и связи', tone: 'olive' as Tone },
  { icon: '★', title: 'Репутация', copy: 'Положение и влияние', tone: 'sand' as Tone },
  { icon: '▦', title: 'Активы', copy: 'Компании, недвижимость и доли', tone: 'aqua' as Tone, target: 'company' as MeView },
  { icon: '▱', title: 'Биография', copy: 'История, решения и наследие', tone: 'purple' as Tone },
];

const worldPlaces = [
  { name: 'Кок-Сарой', meta: 'Окраина · Изучено', x: 18, y: 24, icon: '✦', tone: 'purple' },
  { name: 'Гринвуд', meta: 'Тихий район', x: 44, y: 15, icon: '●', tone: 'aqua' },
  { name: 'Старый город', meta: 'Исторический квартал', x: 17, y: 50, icon: '⌂', tone: 'sand' },
  { name: 'Nomad Labs', meta: 'Ваша компания', x: 52, y: 51, icon: '▦', tone: 'olive' },
  { name: 'Сергели', meta: 'Жилой район', x: 80, y: 51, icon: '●', tone: 'aqua' },
  { name: 'Ангренская долина', meta: 'Промышленный маршрут', x: 72, y: 80, icon: '⌂', tone: 'sand' },
  { name: 'Чимганское озеро', meta: 'Горный отдых', x: 87, y: 25, icon: '✦', tone: 'purple' },
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Tile({ children, tone = 'olive', small = false }: { children: ReactNode; tone?: Tone; small?: boolean }) {
  return <span className={cx('icon-tile', tone, small && 'small')}>{children}</span>;
}

function Stars() {
  return <div className="ambient-stars" aria-hidden="true" />;
}

function AppHeader({ title, kicker, back, onBack, compact = false }: { title: string; kicker?: string; back?: boolean; onBack?: () => void; compact?: boolean }) {
  return (
    <header className={cx('screen-header', compact && 'compact')}>
      {back ? <button className="round-button back-button" onClick={onBack} aria-label="Назад">←</button> : null}
      <div>
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h1>{title}</h1>
      </div>
      <button className="round-button" aria-label="Уведомления">♢<i /></button>
    </header>
  );
}

function BottomNav({ tab, onNavigate }: { tab: Tab; onNavigate: (tab: Tab) => void }) {
  const items: Array<{ id: Tab; icon: string; label: string }> = [
    { id: 'home', icon: '⌂', label: 'Главная' },
    { id: 'world', icon: '◎', label: 'Мир' },
    { id: 'host', icon: '●', label: 'Хост' },
    { id: 'plan', icon: '▣', label: 'План' },
    { id: 'me', icon: '◉', label: 'Я' },
  ];
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map((item) => (
        <button key={item.id} className={cx(tab === item.id && 'active', item.id === 'host' && 'host')} onClick={() => onNavigate(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
          <span>{item.icon}</span>{item.label}
        </button>
      ))}
    </nav>
  );
}

function SceneArt({ kind = 'home' }: { kind?: 'home' | 'company' | 'camp' }) {
  return (
    <div className={cx('scene-art', kind)} aria-hidden="true">
      <div className="scene-moon" />
      <span className="tree t1">♠</span><span className="tree t2">♠</span><span className="tree t3">♠</span>
      <div className="floating-island">
        <div className="tiny-cabin"><i /><b>⌂</b></div>
        <span className="fire">♨</span>
        <span className="ghost">●</span>
      </div>
    </div>
  );
}

function HomeScreen({ seconds, navigate, setMeView, showToast }: { seconds: number; navigate: (tab: Tab) => void; setMeView: (view: MeView) => void; showToast: (message: string) => void }) {
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return (
    <>
      <header className="profile-row">
        <div className="avatar-wrap"><div className="avatar">🧑🏻</div><span className="online" /></div>
        <div className="profile-copy"><p className="eyebrow">Добрый вечер</p><h1>Алекс</h1><p>⌖ Ташкент · Продакт-менеджер</p></div>
        <button className="round-button" aria-label="Уведомления" onClick={() => showToast('Новых уведомлений нет.')}>♢<i /></button>
      </header>

      <section className="home-hero" aria-label="Дом Алекса">
        <SceneArt kind="home" />
        <div className="wealth-card">
          <div><span>Наличные</span><strong>$24,680</strong><em>↑ 6.4%</em></div>
          <div><span>Капитал</span><strong>$212,430</strong><em>↑ 7.3%</em></div>
        </div>
      </section>

      <section className="panel action-card">
        <p className="section-label">Текущее действие</p>
        <div className="action-layout">
          <Tile>🏋🏻</Tile>
          <div className="action-main"><h2>Силовая тренировка</h2><div className="progress"><i /></div><p>⚡ Энергия +12 <b>•</b> Здоровье +8</p></div>
          <div className="remaining"><strong>{minutes}:{secs}</strong><span>осталось</span></div>
        </div>
      </section>

      <section className="panel schedule-card">
        <div className="section-heading"><p className="section-label">Следующие действия</p><button onClick={() => navigate('plan')}>Открыть план →</button></div>
        {timeline.slice(3).map((item) => (
          <div className="timeline-row mini" key={item.title}>
            <span className={cx('dot', item.tone)} /><time>{item.time.replace(' AM', '').replace(' PM', '')}</time><Tile tone={item.tone} small>{item.icon}</Tile>
            <div><strong>{item.title}</strong><small>{item.subtitle}</small></div><em>{item.duration}</em>
          </div>
        ))}
      </section>

      <section className="panel routine-card">
        <div className="section-heading"><p className="section-label">Ритуалы</p><button onClick={() => navigate('plan')}>Все ритуалы →</button></div>
        <div className="routine-grid">
          {routines.slice(0, 3).map((routine) => (
            <button key={routine.title} onClick={() => navigate('plan')}>
              <Tile tone={routine.tone} small>{routine.icon}</Tile><strong>{routine.title.replace('Утренняя ', '')}</strong><small>{routine.streak} дней подряд</small><i>● ● ● ● ● ◐</i>
            </button>
          ))}
        </div>
      </section>

      <section className="feature-grid">
        <button className="feature-card career" onClick={() => { setMeView('hub'); navigate('me'); }}><Tile tone="sand">▣</Tile><span><strong>Карьера</strong><small>Продакт-менеджер</small></span><b>→</b></button>
        <button className="feature-card company" onClick={() => { setMeView('company'); navigate('me'); }}><Tile tone="aqua">▦</Tile><span><strong>Nomad Labs</strong><small>+8,7% за месяц</small></span><b>→</b></button>
        <button className="feature-card world" onClick={() => navigate('world')}><Tile tone="purple">◎</Tile><span><strong>Мир</strong><small>Ташкент и окрестности</small></span><b>→</b></button>
      </section>
    </>
  );
}

function WorldScreen({ showToast, openCompany }: { showToast: (message: string) => void; openCompany: () => void }) {
  const [filter, setFilter] = useState('Компании');
  const [selected, setSelected] = useState('Nomad Labs');
  return (
    <div className="screen world-screen">
      <AppHeader title="Мир" kicker="Ташкент и окрестности" />
      <div className="segmented world-tabs" role="tablist">
        {['Игроки', 'Активы', 'Компании', 'События'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'Игроки' ? '●' : item === 'Активы' ? '⌂' : item === 'Компании' ? '▦' : '★'} {item}</button>)}
      </div>
      <section className="world-map" aria-label="Карта Ташкента и окрестностей">
        <div className="river" /><div className="mountains">▲ ▲</div><div className="city-grid" />
        {worldPlaces.map((place) => (
          <button key={place.name} className={cx('map-marker', place.tone, selected === place.name && 'selected')} style={{ left: place.x + '%', top: place.y + '%' }} onClick={() => { setSelected(place.name); showToast(place.name + ' — выбрано'); }}>
            <i>{place.icon}</i><span>{place.name}<small>{place.meta}</small></span>
          </button>
        ))}
      </section>
      <section className="panel company-sheet">
        <span className="drag-handle" />
        <div className="company-intro"><div className="host-avatar large">◉<i>⌁</i></div><div><p className="eyebrow">Рекомендуемая компания</p><h2>{selected}</h2><p>{selected === 'Nomad Labs' ? 'Создаёт инструменты для нового поколения основателей в Центральной Азии.' : 'Изученное место в вашем общем мире.'}</p></div></div>
        <div className="metric-row"><div><span>Оценка</span><strong>$12.4M</strong></div><div><span>Сотрудники</span><strong>42</strong></div><div><span>Положение</span><strong>Сильное</strong></div></div>
        <button className="primary-button" onClick={openCompany}>Открыть компанию <span>→</span></button>
      </section>
    </div>
  );
}

function HostScreen({ showToast }: { showToast: (message: string) => void }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { who: 'Алекс', text: 'Хост, что сейчас происходит в Nomad Labs?', mine: true },
    { who: 'Хост', text: 'В Nomad Labs кипит работа. Команда выпустила сильное обновление, а новая вакансия необычно хорошо подходит вашему опыту.', mine: false },
  ]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setMessages((current) => [...current, { who: 'Алекс', text: value, mine: true }]);
    setDraft('');
    window.setTimeout(() => {
      setMessages((current) => [...current, { who: 'Хост', text: 'Я превращу это в предложение: сначала покажу стоимость, длительность, требования и риски — и только потом что-либо изменится.', mine: false }]);
    }, 450);
  }

  return (
    <div className="screen host-screen">
      <header className="host-header">
        <div className="host-avatar">◉<i>⌁</i></div><div><p className="eyebrow">Всегда рядом</p><h1>Хост</h1><p>ИИ-ведущий · знает ваш мир</p></div>
        <button className="round-button" aria-label="Настройки Хоста">⚙</button>
      </header>
      <div className="world-context"><Tile tone="purple" small>✦</Tile><div><span>Текущий мир</span><strong>Ташкент и окрестности</strong></div><div className="night"><b>◒</b><span>22:45<small>Ясная ночь</small></span></div></div>
      <section className="conversation" aria-live="polite">
        {messages.map((message, index) => (
          <article className={cx('message', message.mine && 'mine')} key={index}>
            <div className={message.mine ? 'avatar mini-avatar' : 'host-avatar mini-avatar'}>{message.mine ? '🧑🏻' : '◉'}</div>
            <div><p><strong>{message.who}</strong><time>22:{12 + index}</time></p><span>{message.text}</span></div>
          </article>
        ))}
        <div className="opportunity-divider"><span>✦</span> Новая возможность <i /></div>
        <article className="opportunity-card">
          <div className="job-visual"><div className="office-building">▥<i>▦</i></div><span>♠ ♠</span></div>
          <div className="job-copy"><div className="job-title"><Tile>▦</Tile><div><h2>Бэкенд-разработчик</h2><p><b>Nomad Labs</b> · Полная занятость</p></div></div>
          <p>Создавайте масштабируемые системы для нового поколения стартап-инструментов.</p>
          <div className="chips"><span>TypeScript</span><span>Node.js</span><span>PostgreSQL</span></div></div>
          <div className="job-metrics"><span>⌖ <small>Локация</small><strong>Ташкент</strong></span><span>●● <small>Команда</small><strong>42</strong></span><span>▣ <small>Зарплата</small><strong>$2k–$3k/mo</strong></span></div>
          <div className="job-actions"><button onClick={() => showToast('Вакансия сохранена.')}>Подробнее</button><button className="apply" onClick={() => showToast('Предложение для отклика создано — проверьте его в Плане.')}>Откликнуться →</button></div>
        </article>
      </section>
      <form className="host-composer" onSubmit={sendMessage}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Расскажите Хосту, что хотите сделать…" aria-label="Сообщение Хосту" />
        <button type="submit" aria-label="Отправить сообщение">↑</button>
      </form>
    </div>
  );
}

function RoutineView({ onBack, showToast }: { onBack: () => void; showToast: (message: string) => void }) {
  const [selected, setSelected] = useState(routines[1]);
  return (
    <div className="screen routine-screen">
      <AppHeader title="Ритуалы" kicker="Маленькие привычки, большие приключения."  back onBack={onBack} />
      <div className="routine-hero"><SceneArt kind="camp" /></div>
      <div className="section-heading routine-toolbar"><div className="segmented compact-tabs"><button className="active">● Активные</button><button>▣ Архив</button></div><button className="outline-button" onClick={() => showToast('Конструктор ритуала открыт.')}>＋ Новый ритуал</button></div>
      <div className="routine-list">
        {routines.map((routine) => (
          <button className={cx('routine-list-item', selected.title === routine.title && 'selected')} key={routine.title} onClick={() => setSelected(routine)}>
            <Tile tone={routine.tone}>{routine.icon}</Tile><div><strong>{routine.title}</strong><small>{routine.schedule}</small></div><span>◷ {routine.duration}</span><b>{routine.streak} 🔥<small>дней подряд</small></b><i>›</i>
          </button>
        ))}
      </div>
      <section className="panel routine-drawer">
        <span className="drag-handle" />
        <div className="routine-summary"><Tile tone={selected.tone}>{selected.icon}</Tile><div><h2>{selected.title}</h2><p>Укрепляйте желаемую жизнь с помощью устойчивого ритма.</p></div><button onClick={() => onBack()} aria-label="Закрыть ритуал">×</button></div>
        <div className="routine-facts"><span><small>Расписание</small><strong>{selected.schedule}</strong></span><span><small>Длительность</small><strong>{selected.duration}</strong></span><span><small>Серия</small><strong>{selected.streak} дней</strong></span></div>
        <div className="routine-actions">
          <button onClick={() => showToast('Следующее занятие пропущено.')}>⏭ <span><strong>Пропустить раз</strong><small>Пропустить одно занятие</small></span></button>
          <button onClick={() => showToast('Ритуал приостановлен на 7 дней.')}>⏸ <span><strong>Приостановить</strong><small>Поставить на паузу</small></span></button>
          <button onClick={() => showToast('Редактор ритуала открыт.')}>✎ <span><strong>Изменить ритуал</strong><small>Изменить расписание или длительность</small></span></button>
          <button className="danger" onClick={() => showToast('Ритуал сохранён — изменений нет.')}>▧ <span><strong>Отменить ритуал</strong><small>Удалить навсегда</small></span></button>
        </div>
      </section>
    </div>
  );
}

function PlanScreen({ seconds, showToast }: { seconds: number; showToast: (message: string) => void }) {
  const [mode, setMode] = useState<'today' | 'week' | 'routines'>('today');
  const [addOpen, setAddOpen] = useState(false);
  if (mode === 'routines') return <RoutineView onBack={() => setMode('today')} showToast={showToast} />;
  return (
    <div className="screen plan-screen">
      <AppHeader title="План" kicker="Организуйте день, стройте будущее."  />
      <div className="segmented plan-tabs"><button className={mode === 'today' ? 'active' : ''} onClick={() => setMode('today')}>Сегодня</button><button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Неделя</button><button onClick={() => setMode('routines')}>Ритуалы</button></div>
      <div className="date-row"><h2>▣ {mode === 'today' ? 'Пятница, 23 мая' : '19–25 мая'}</h2><button className="outline-button" onClick={() => setAddOpen(true)}>Добавить действие ＋</button></div>
      {mode === 'week' ? (
        <section className="panel week-card">
          {['Пн 19', 'Вт 20', 'Ср 21', 'Чт 22', 'Пт 23', 'Сб 24', 'Вс 25'].map((day, index) => <button key={day} className={index === 4 ? 'active' : ''}><span>{day.split(' ')[0]}</span><strong>{day.split(' ')[1]}</strong><i>{index === 4 ? '3 действия' : index % 2 ? '2 действия' : '1 действие'}</i></button>)}
        </section>
      ) : (
        <section className="day-timeline">
          {timeline.map((item) => (
            <article className={cx('day-item', item.state)} key={item.title}>
              <time>{item.time}</time><span className={cx('timeline-node', item.state, item.tone)}>{item.state === 'done' ? '✓' : item.state === 'active' ? '◉' : ''}</span>
              <div className="day-card"><Tile tone={item.tone}>{item.icon}</Tile><div><h2>{item.title}</h2><p>{item.subtitle}</p>{item.state === 'active' ? <div className="progress"><i /></div> : null}</div><span>{item.state === 'active' ? Math.floor(seconds / 60) + ' мин осталось' : item.duration}</span></div>
            </article>
          ))}
        </section>
      )}
      <section className="panel quote-card"><div className="camp-emoji">♠ ♠<i>♨</i></div><blockquote>«Дисциплина сегодня — свобода завтра».<small>Продолжай, <b>Алекс</b>.</small></blockquote></section>
      {addOpen ? <ActionModal close={() => setAddOpen(false)} submit={() => { setAddOpen(false); showToast('Действие добавлено в план.'); }} /> : null}
    </div>
  );
}

function ActionModal({ close, submit }: { close: () => void; submit: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="action-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={close} aria-label="Закрыть">×</button><p className="eyebrow">Предложение действия</p><h2 id="action-title">Что вы хотите сделать?</h2>
        <label>Действие<input defaultValue="Проверить метрики запуска" /></label>
        <div className="form-grid"><label>Начало<input type="time" defaultValue="16:00" /></label><label>Длительность<select defaultValue="45"><option value="30">30 мин</option><option value="45">45 мин</option><option value="60">1 час</option></select></label></div>
        <div className="proposal-note"><span>◉</span><p>Хост проверит требования и покажет риски до изменения состояния персонажа.</p></div>
        <button className="primary-button" onClick={submit}>Добавить в план →</button>
      </section>
    </div>
  );
}

function FinanceView({ onBack }: { onBack: () => void }) {
  const assets = [
    ['▤', 'Наличные', '$24,680', '↑ 6.4%', 'olive'],
    ['◆', 'Инвестиции', '$68,340', '↑ 8.7%', 'purple'],
    ['⌂', 'Недвижимость', '$74,200', '↑ 5.1%', 'sand'],
    ['▦', 'Доли в бизнесе', '$58,900', '↑ 9.3%', 'aqua'],
    ['◒', 'Долг', '−$13,690', '↓ 2.2%', 'red'],
  ];
  return (
    <div className="screen finance-screen">
      <AppHeader title="Финансы" kicker="Капитал" back onBack={onBack} />
      <section className="panel finance-chart">
        <p className="section-label">Ваш капитал</p><div className="finance-total"><strong>$212,430</strong><span>↑ 7.3%<small>к прошлому месяцу</small></span></div>
        <div className="chart-area"><div className="grid-lines" /><div className="area-bars">{[18,24,37,48,58,76,72,86,94,100].map((height, index) => <i key={index} style={{ height: height + '%' }}><b /></i>)}</div></div>
        <div className="range-tabs">{['7Д','1М','3М','6М','1Г','Всё'].map((range) => <button key={range} className={range === '6М' ? 'active' : ''}>{range}</button>)}</div>
      </section>
      <section className="panel asset-list">{assets.map((asset) => <button key={asset[1]}><Tile tone={asset[4] as Tone} small>{asset[0]}</Tile><strong>{asset[1]}</strong><b>{asset[2]}</b><em className={asset[4] === 'red' ? 'down' : ''}>{asset[3]}</em><span>›</span></button>)}</section>
      <section className="panel cashflow-row"><div><Tile>↗</Tile><span>Доход за месяц<strong>$9,720</strong><small>↑ 6.2%</small></span></div><div><Tile tone="sand">↘</Tile><span>Расходы за месяц<strong>$4,350</strong><small className="down">↑ 3.1%</small></span></div><div><Tile tone="purple">▤</Tile><span>Чистый доход<strong>$5,370</strong><small>↑ 10.4%</small></span></div></section>
      <section className="panel transactions"><div className="section-heading"><p className="section-label">Последние операции</p><button>Все операции →</button></div>
        {[['✈','Перелёт в Дубай','Путешествия','12 авг.','−$1,280','aqua'],['▦','Зарплата Nomad Labs','Доход','10 авг.','+$7,500','olive'],['▧','Покупка техники','Покупки','9 авг.','−$320','purple'],['⌂','Доход от аренды','Доход','8 авг.','+$1,950','sand'],['◉','Счёт за электричество','Коммунальные услуги','7 авг.','−$120','sand']].map((tx) => <div key={tx[1]}><Tile tone={tx[5] as Tone} small>{tx[0]}</Tile><span><strong>{tx[1]}</strong><small>{tx[2]}</small></span><time>{tx[3]}</time><b className={tx[4].startsWith('+') ? 'positive' : ''}>{tx[4]}</b></div>)}
      </section>
    </div>
  );
}

function CompanyView({ onBack }: { onBack: () => void }) {
  const [companyTab, setCompanyTab] = useState('Обзор');
  return (
    <div className="screen company-screen">
      <AppHeader title="Nomad Labs" kicker="Продуктовая студия · Проверено" back onBack={onBack} />
      <section className="company-hero"><div className="host-avatar company-avatar">◉<i>⌁</i></div><div><h2>Вы — сооснователь</h2><p>Создаём инструменты для нового поколения основателей.</p></div><SceneArt kind="company" /></section>
      <section className="panel company-metrics"><div><Tile>◕</Tile><span>Доля<strong>34.2%</strong></span></div><div><Tile tone="aqua">▦</Tile><span>Оценка<strong>$12.4M</strong></span></div><div><Tile>▤</Tile><span>Наличные<strong>$24,680</strong></span></div><div><Tile tone="olive">↗</Tile><span>Выручка за месяц<strong>$86,420</strong><small>+6.2%</small></span></div><div><Tile tone="sand">●</Tile><span>Прибыль за месяц<strong>$21,350</strong><small>+8.7%</small></span></div><div><Tile tone="purple">●●</Tile><span>Сотрудники<strong>42</strong><small>+3 за месяц</small></span></div></section>
      <div className="segmented company-tabs">{['Обзор','Финансы','Команда','Проекты','Доли'].map((tab) => <button key={tab} className={companyTab === tab ? 'active' : ''} onClick={() => setCompanyTab(tab)}>{tab}</button>)}</div>
      {companyTab === 'Обзор' ? <section className="panel about-company"><div><p className="section-label">О Nomad Labs</p><h2>Маленькая команда. Большие идеи. Реальное влияние.</h2><p>Nomad Labs — продуктовая студия, создающая полезные инструменты для основателей Центральной Азии. Результаты зависят от спроса, качества исполнения, состояния команды и ваших решений.</p></div><div className="company-workbench"><div className="host-avatar">◉</div><span>▱</span><i>♨</i></div><div className="company-details"><span>▣ <small>Основана</small><strong>Январь 2023</strong></span><span>⌖ <small>Штаб-квартира</small><strong>Ташкент, Узбекистан</strong></span><div><p>Направления</p><i>Инструменты разработчика</i><i>Продуктивность</i><i>ИИ и автоматизация</i></div></div></section> :
      <section className="panel tab-placeholder"><Tile tone={companyTab === 'Финансы' ? 'olive' : companyTab === 'Команда' ? 'aqua' : 'purple'}>{companyTab === 'Финансы' ? '▤' : companyTab === 'Команда' ? '●●' : '▣'}</Tile><h2>{companyTab}</h2><p>Раздел готов для детерминированных данных компании: контрактов, проводок, проектов, показателей и событий владения.</p><button className="outline-button">Открыть раздел →</button></section>}
      <section className="panel company-proof"><blockquote>«Маленькая команда.<br />Большие идеи.<br />Реальное влияние».</blockquote><div><strong>12</strong><span>Продуктов выпущено</span></div><div><strong>4.8</strong><span>Рейтинг компании</span></div><div><strong>7</strong><span>Рынков охвачено</span></div><div><strong>1.2K</strong><span>Пользователей получили помощь</span></div></section>
    </div>
  );
}

function MeScreen({ view, setView, showToast }: { view: MeView; setView: (view: MeView) => void; showToast: (message: string) => void }) {
  if (view === 'finance') return <FinanceView onBack={() => setView('hub')} />;
  if (view === 'company') return <CompanyView onBack={() => setView('hub')} />;
  return (
    <div className="screen me-screen">
      <header className="me-hero">
        <div className="avatar-wrap"><div className="avatar xl">🧑🏻</div><span className="online" /></div><div><p className="eyebrow">Ваш путь</p><h1>Алекс</h1><p>▣ Продакт-менеджер</p><p>⌖ Ташкент, Узбекистан</p></div><button className="round-button" onClick={() => showToast('Настройки открыты.')}>⚙</button><SceneArt kind="home" />
      </header>
      <section className="profile-finance"><button onClick={() => setView('finance')}><Tile tone="purple">◆</Tile><span>Капитал<strong>$212,430</strong><small>↑ 7,3% к прошлому месяцу</small></span></button><button onClick={() => setView('finance')}><Tile tone="sand">◉</Tile><span>Доход за месяц<strong>$9,340</strong><small>↑ 5,6% к прошлому месяцу</small></span></button></section>
      <section className="panel profile-hub"><p className="section-label">Центр профиля</p><div className="hub-grid">
        {hubItems.map((item) => <button key={item.title} onClick={() => item.target ? setView(item.target) : showToast(item.title + ' готов к данным вашей истории.')}><Tile tone={item.tone}>{item.icon}</Tile><span><strong>{item.title}</strong><small>{item.copy}</small></span><b>›</b></button>)}
      </div></section>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('home');
  const [meView, setMeView] = useState<MeView>('hub');
  const [seconds, setSeconds] = useState(38 * 60 + 42);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const content = useMemo(() => {
    if (tab === 'home') return <HomeScreen seconds={seconds} navigate={setTab} setMeView={setMeView} showToast={setToast} />;
    if (tab === 'world') return <WorldScreen showToast={setToast} openCompany={() => { setMeView('company'); setTab('me'); }} />;
    if (tab === 'host') return <HostScreen showToast={setToast} />;
    if (tab === 'plan') return <PlanScreen seconds={seconds} showToast={setToast} />;
    return <MeScreen view={meView} setView={setMeView} showToast={setToast} />;
  }, [tab, meView, seconds]);

  return (
    <main className="app-shell">
      <section className="mobile-world">
        <Stars />
        <div className="screen-content" key={tab + meView}>{content}</div>
        <BottomNav tab={tab} onNavigate={(next) => { setTab(next); if (next !== 'me') setMeView('hub'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
      </section>
    </main>
  );
}



