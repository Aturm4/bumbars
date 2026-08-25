export interface RoutedSkill {
  key: string;
  version: string;
  reason: string;
  principles: string[];
}

const SKILLS: Record<string, RoutedSkill> = {
  actions: {
    key: 'core.actions', version: 'v2', reason: 'универсальный жизненный цикл решения',
    principles: [
      'Отделяй обсуждение от конкретного намерения.',
      'Не запускай действие и не меняй состояние; формируй только семантический черновик.',
      'Платное, опасное или необратимое действие требует серверного предложения и подтверждения.',
    ],
  },
  knowledge: {
    key: 'core.knowledge', version: 'v2', reason: 'граница между истиной и знаниями персонажа',
    principles: [
      'Отвечай только из переданного visible context.',
      'Если факта нет, честно говори о нехватке сведений.',
      'Не раскрывай скрытые коэффициенты и оптимальный маршрут развития.',
    ],
  },
  training: {
    key: 'health.training', version: 'v2', reason: 'нагрузка, прогресс и восстановление',
    principles: ['Обычная тренировка даёт градацию пользы, а не случайную бинарную неудачу.', 'Учитывай затраты энергии, усталость и накопление evidence.'],
  },
  education: {
    key: 'education.learning', version: 'v2', reason: 'навыки, опыт и образование',
    principles: ['Навык и опыт динамические и подтверждаются событиями.', 'Провал тоже может давать опыт, но не обязан давать компетентность.'],
  },
  career: {
    key: 'career.employment', version: 'v2', reason: 'работа и доказательная карьера',
    principles: ['Нет глобального карьерного уровня.', 'Должность зависит от опыта, навыков, образования, репутации и истории результатов.'],
  },
  business: {
    key: 'business.organization', version: 'v2', reason: 'организации и рынок',
    principles: ['Создание организации административно упрощено, но не гарантирует успех.', 'Название и формат выбирает игрок; деньги, рынок и права считает сервер.'],
  },
  scheduling: {
    key: 'systems.scheduling', version: 'v2', reason: 'план дня и recurring',
    principles: ['Расписание поддерживает конкретное время, AFTER и WHEN_FREE.', 'При конфликте не запускай второе foreground-действие; запроси или предложи доступное окно.'],
  },
  social: {
    key: 'social.relationships', version: 'v2', reason: 'игроки, NPC и сообщения',
    principles: ['Публичное, приватное и тайное знание различаются.', 'Предложения другому игроку становятся уведомлением и требуют его решения.'],
  },
  risk: {
    key: 'core.high-risk', version: 'v2', reason: 'опасные и необратимые последствия',
    principles: ['Не превращай тяжёлое действие в обычную кнопку.', 'Не давай инструкций по причинению вреда; сообщай общие риски и применяй жёсткие границы.'],
  },
};

export function routeSkillsForMessage(input: string): RoutedSkill[] {
  const text = input.toLocaleLowerCase('ru-RU');
  const selected = new Set<string>(['actions', 'knowledge']);
  if (/трен|зал|спорт|кардио|сил|вынослив/.test(text)) selected.add('training');
  if (/уч|курс|книг|образован|сертифик|интеллект/.test(text)) selected.add('education');
  if (/работ|должност|карьер|зарплат|контракт/.test(text)) selected.add('career');
  if (/компан|организац|бизнес|фонд|парт|клуб|банд|сект/.test(text)) selected.add('business');
  if (/план|после|кажд(ый|ую)|расписан|перенес|отмен|в\s+\d{1,2}/.test(text)) selected.add('scheduling');
  if (/тимур|дина|руслан|игрок|npc|сообщен|отнош|поедин|ринг|вызов/.test(text)) selected.add('social');
  if (/опас|риск|драк|поедин|уби|оруж|ставк/.test(text)) selected.add('risk');
  return [...selected].slice(0, 5).map((key) => SKILLS[key]);
}

export function serializePlaybooks(skills: RoutedSkill[]): string {
  return skills.map((skill) => `${skill.key}@${skill.version}: ${skill.principles.join(' ')}`).join('\n');
}