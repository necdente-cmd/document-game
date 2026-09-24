// 🌐 Мультиязычность (RU / KY)
import { state } from './state.js';

export const LANGS = {
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ky: { code: 'ky', name: 'Кыргызча', flag: '🇰🇬' },
};

// ==================== РУССКИЙ СЛОВАРЬ ====================
const RU = {
  // ===== common =====
  'common.cancel': 'Отмена',
  'common.close': 'Закрыть',
  'common.back': '← Назад',
  'common.next': 'Далее →',
  'common.ok': 'ОК',
  'common.yes': 'Да',
  'common.no': 'Нет',
  'common.confirm': 'Подтвердить',
  'common.reject': 'Отклонить',
  'common.loading': 'Загрузка…',

  // ===== welcome =====
  'welcome.title': 'Документ',
  'welcome.subtitle': 'Карточная игра 2×2 · 36 карт',
  'welcome.createGame': '🎮 Создать игру',
  'welcome.joinByCode': '🔗 Войти по коду',
  'welcome.howToPlay': '📚 Как играть',
  'welcome.friends': '👥 Друзья',
  'welcome.author': 'Автор: Dr.Nec.D',
  'welcome.musicOn': 'Музыка включена',
  'welcome.musicOff': 'Музыка выключена',

  // ===== create =====
  'create.title': 'Настройки игры',
  'create.yourName': 'Ваше имя',
  'create.namePlaceholder': 'Имя',
  'create.avatar': 'Аватарка',
  'create.deckStyle': 'Стиль колоды',
  'create.backColor': 'Рубашка',
  'create.docSteps': 'Ступени документов',
  'create.docClassic': 'Классическая',
  'create.docClassicDesc': '6 ступеней',
  'create.docShort': 'Короткая',
  'create.docShortDesc': '4 ступени',
  'create.tableTheme': 'Тема стола',
  'create.createRoom': '🎮 Создать комнату',
  'create.themeClassic': 'Классика',
  'create.themeDark': 'Тёмная',
  'create.themeNeon': 'Неон',
  'create.themePaper': 'Бумага',

  // ===== join =====
  'join.title': 'Войти по коду',
  'join.codeLabel': 'Код комнаты',
  'join.codePlaceholder': 'ABC123',
  'join.enter': '🔗 Войти',

  // ===== lobby (table.js) =====
  'lobby.roomCode': 'Код комнаты',
  'lobby.copyCode': 'Тапни, чтобы скопировать',
  'lobby.players': 'игроков',
  'lobby.waitingPlayers': 'Ждём игроков…',
  'lobby.waitingHost': 'Ждём хоста…',
  'lobby.startGame': '▶ Начать игру',
  'lobby.seating': '🎯 Расстановка',
  'lobby.seatingHint': '(тапни двух игроков чтобы поменять)',
  'lobby.you': '(ты)',
  'lobby.host': 'Хост',
  'lobby.waitingSlot': 'Ждём…',
  'lobby.codeCopied': 'Код скопирован: ',

  // ===== game: positions =====
  'pos.A1': 'A1',
  'pos.B2': 'B2',
  'pos.A3': 'A3',
  'pos.B4': 'B4',

  // ===== game: statuses =====
  'state.beat': 'бьёт',
  'state.think': 'думает',
  'state.move': 'ходит',
  'state.pickup': 'поднимает',
  'state.out': 'вышел',
  'state.offline': 'отошёл',

  // ===== game: banners =====
  'banner.yourTurn': '🎯 ТВОЙ ХОД',
  'banner.yourTurnAttack': '🎯 ТВОЙ ХОД — АТАКУЙ',
  'banner.yourDefend': '🛡️ ТЫ ЗАЩИЩАЕШЬСЯ — БЕЙ КАРТУ',
  'banner.beatSelected': '🎯 БЕЙ ВЫБРАННУЮ КАРТУ',
  'banner.canPass': '👆 Можешь подкинуть или сказать ПАС',

  // ===== game: notices =====
  'notice.bothPassed': '⛔ Оба атакующих пасанули',
  'notice.attackerPassed': '⏳ Атакующий пасанул — ждём партнёра',
  'notice.partnerPassed': '⏳ Партнёр пасанул — ждём атакующего',
  'notice.waitingSeat': '⏳ Ждём {name} — отошёл',

  // ===== game: hints =====
  'hint.waitingSeat': '⏳ Ждём игрока — скоро вернётся',
  'hint.hasYourDoc': '⚠ На столе ваш документ — нужно поднять всё',
  'hint.pullCard': '👆 Тяните свою карту на карту врага',
  'hint.tapEnemyCard': '👆 Тапни карту врага, потом свою — или тяни',
  'hint.decideBito': '✋ Все пасанули — решите: БИТО или Поднять',
  'hint.pullToField': '👆 Тяни карту в поле или тапни её и тапни поле',
  'hint.yourTurn': '👆 Твой ход',

  // ===== game: buttons =====
  'btn.pickUp': '📥<br>ПОДНЯТЬ',
  'btn.throwDocs': '🏆<br>БРОСИТЬ',
  'btn.giveCards': '🔄<br>ОТДАТЬ',
  'btn.return': '🔄<br>ВЕРНУТЬСЯ',
  'btn.passDocs': '📤<br>ПЕРЕДАТЬ',
  'btn.pass': '✋<br>ПАС',
  'btn.bito': '✔ БИТО',

  // ===== game: sides =====
  'side.partner': '★',
  'side.enemy': '✗',

  // ===== info modal =====
  'info.title': '📊 Сведения',
  'info.trump': 'Козырь',
  'info.myDoc': 'Мой док',
  'info.oppDoc': 'Их док',
  'info.score': 'Счёт',

  // ===== settings =====
  'settings.title': '⚙️ Настройки',
  'settings.soundVibro': 'Звук и вибрация',
  'settings.sound': '🔊 Звук',
  'settings.vibration': '📳 Вибрация',
  'settings.mic': '🎤 Микрофон',
  'settings.scale': '📐 Масштаб',
  'settings.scaleSmall': 'Маленький',
  'settings.scaleMedium': 'Средний',
  'settings.scaleLarge': 'Большой',
  'settings.themeTitle': '🎨 Тема стола',
  'settings.themeHint': '(применится в след. комнате)',
  'settings.history': 'История',
  'settings.openHistory': '📜 История конов',
  'settings.room': 'Комната',
  'settings.leaveRoom': '🚪 Покинуть комнату',
  'settings.leaveConfirm': 'Выйти из комнаты?',
  'settings.language': '🌐 Язык',

  // ===== chat =====
  'chat.title': '💬 Чат',
  'chat.placeholder': 'Сообщение...',
  'chat.noMessages': 'Сообщений пока нет…',
  'chat.send': '→',

  // ===== history =====
  'history.title': '📜 История конов',
  'history.round': 'Кон',
  'history.wonBy': 'выиграла команда',
  'history.teamA': 'A',
  'history.teamB': 'B',

  // ===== champion =====
  'champion.title': '🏆 Team {team} — ЧЕМПИОН!',
  'champion.score': 'Счёт',
  'champion.time': 'Время партии',
  'champion.min': 'мин',
  'champion.rounds': 'Конов сыграно',
  'champion.best': '⭐ Лучший игрок',
  'champion.roundsWon': 'кон.',
  'champion.playAgain': '🔄 Играть снова',
  'champion.exitMenu': '🚪 Выйти в меню',

  // ===== modals: about dev =====
  'about.title': '🎴 Документ',
  'about.subtitle': 'Карточная онлайн-игра 2×2',
  'about.version': 'Версия',
  'about.developer': 'Разработчик',
  'about.contacts': 'Контакты',
  'about.rights': '© 2026 Dr.Nec.D · Все права защищены',

  // ===== modals: mail =====
  'mail.title': '✉️ Почта',
  'mail.empty': '📭 Пока нет сообщений',
  'mail.hint': 'Новости и обновления будут появляться здесь',

  // ===== modals: profile =====
  'profile.title': '🧑 Профиль',
  'profile.id': 'ID',
  'profile.gamesPlayed': 'Партий сыграно',
  'profile.wins': 'Побед',
  'profile.statsLater': 'Статистика появится в следующих версиях',

  // ===== tutorial =====
  'tut.step': 'Шаг {n} из {total}',
  'tut.skip': 'Пропустить',
  'tut.back': '← Назад',
  'tut.next': 'Далее →',
  'tut.finish': '🎮 В игру!',

  'tut.s1.emoji': '🎴',
  'tut.s1.title': 'Документ',
  'tut.s1.subtitle': 'Карточная игра 2×2',
  'tut.s1.text': 'Ты играешь с одним партнёром против двух соперников. Партнёр всегда сидит напротив тебя.',

  'tut.s2.emoji': '🏆',
  'tut.s2.title': 'Цель игры',
  'tut.s2.subtitle': 'Дойти до ступени Т',
  'tut.s2.text': 'У каждой команды есть «документ» — свой ранг карт. Начнёте с 6, а за каждый выигранный кон поднимаетесь выше: 6 → 10 → В → Д → К → Т.\n\nПобеждает команда, которая дойдёт до Т и выиграет кон.',

  'tut.s3.emoji': '👆',
  'tut.s3.title': 'Как ходить',
  'tut.s3.subtitle': 'Атака картой',
  'tut.s3.text': 'В свой ход тяни карту из руки в центр стола. Или тапни её, а потом тапни поле.\n\nПомни: своим документом заходить нельзя! Документ можно только бить (и только козырем).',

  'tut.s4.emoji': '🛡️',
  'tut.s4.title': 'Как защищаться',
  'tut.s4.subtitle': 'Всё или ничего',
  'tut.s4.text': 'Когда тебя атакуют, ты либо бьёшь все карты, либо поднимаешь всё.\n\nКак бить: тапни карту врага, потом тапни свою карту в руке. Подходящие карты подсветятся зелёным.',

  'tut.s5.emoji': '✨',
  'tut.s5.title': 'Особые правила',
  'tut.s5.subtitle': 'Своп · Передача',
  'tut.s5.text': '🔄 Своп — если партнёр вышел, можно отдать ему свои карты (1 раз за кон).\n\n📤 Передача документов — если у тебя только документы, передай их партнёру.',

  'tut.s6.emoji': '🚀',
  'tut.s6.title': 'Готов!',
  'tut.s6.subtitle': 'Удачи в игре',
  'tut.s6.text': 'Собирай команду, играй с друзьями и побеждай.\n\nНе забывай: 🎤 микрофон — для голосового чата, 💬 чат — для переписки, ⚙️ настройки — для звука и темы.',

  // ===== toasts =====
  'toast.codeCopied': 'Код скопирован',
  'toast.copyFailed': 'Не удалось скопировать',
  'toast.synced': '🔄 Синхронизация',
  'toast.refreshed': '🔄 Обновлено',
  'toast.micOn': '🎤 Микрофон включён',
  'toast.micError': 'Не удалось получить доступ к микрофону',

  // ===== errors =====
  'err.roomNotFound': 'Комната не найдена',
  'err.roomFull': 'Комната заполнена',
  'err.gameStarted': 'Игра уже началась',
  'err.onlyHost': 'Только хост',
  'err.needPlayers': 'Нужно {n} игроков',
  'err.notYourTurn': 'Не ваш ход',
  'err.noCardsSelected': 'Не выбраны карты',
  'err.cardNotInHand': 'Карты нет в руке',
  'err.ownDocCantPlay': 'Своим документом ({doc}) нельзя',
  'err.onlyAttackerOrPartner': 'Только атакующий или партнёр',
  'err.youPassed': 'Вы уже сказали «Пас»',
  'err.noTarget': 'Некого атаковать',
  'err.defenderUnavailable': 'Защитник недоступен',
  'err.defenderOffline': '⏳ {name} отошёл — ждём возвращения',
  'err.maxCards': 'Максимум {n} карт — не поместится в руках защитника',
  'err.cantBeatOwnDoc': 'Нельзя бить свой документ — придётся поднять',
  'err.ownDocOnlyTrump': 'Свой документ бьёт только козырем',
  'err.doesntBeat': 'Не бьёт',
  'err.notDefending': 'Не вы защищаетесь',
  'err.cardCantReturn': 'Эту карту нельзя вернуть',
  'err.forcedDocCantReturn': 'Навязанный документ нельзя вернуть',
  'err.cardOwnerNotFound': 'Хозяин карты не найден',
  'err.onlyOwnerDecides': 'Только хозяин карты решает',
  'err.forcedDocPickUp': 'Это ваш документ — нужно поднять всё',
  'err.forcedDocPickUpAll': 'Навязанный документ — только поднять',
  'err.yourDocPickUpAll': 'Ваш документ — только поднять',
  'err.waitBothPass': 'Ждём «Пас» от обоих атакующих',
  'err.notAllBeaten': 'Не все карты отбиты',
  'err.docOnTable': 'На столе ваш документ — нужно поднять',
  'err.onlyDocsTransfer': 'Передавать можно только если в руке ТОЛЬКО документы',
  'err.partnerOut': 'Партнёр вышел — передавать некому',
  'err.onlyOpponentConfirms': 'Подтвердить может только противник',
  'err.noPendingRequest': 'Нет активного запроса',
  'err.cantDuringTurn': 'Нельзя во время хода',
  'err.alreadyPending': 'Уже есть запрос',
  'err.swapUsed': 'Своп уже использован',
  'err.partnerStillInGame': 'Партнёр ещё в игре',
  'err.youNotOut': 'Вы не вышли',
  'err.partnerAlsoOut': 'Партнёр тоже вышел',
  'err.notPartnersTurn': 'Сейчас не ход партнёра',
  'err.notYourDecision': 'Не вам решать',
  'err.partnerRefused': 'Партнёр отказался',
  'err.hasRegularCards': 'В руке есть обычные карты',
  'err.partnerInGameTransfer': 'Партнёр ещё в игре — сначала передайте ему документы',
  'err.waitConfirmation': 'Ждём подтверждения',
  'err.onlyHostSeating': 'Только хост может менять расстановку',
  'err.onlyLobby': 'Можно только в лобби',
  'err.wrongFormat': 'Неверный формат',
  'err.wrongPlayerCount': 'Неверное количество игроков',
  'err.duplicatePlayers': 'Дубликаты игроков',
  'err.playerNotFound': 'Игрок не найден',
  'err.notYourTeamChooses': 'Не ваша команда выбирает',
  'err.wrongPlayer': 'Неверный игрок',
  'err.rankMismatch': 'Можно подкидывать только: {allowed}',
  'err.sameRankFirstAttack': 'При первой атаке можно заходить только картами одного ранга',
  'err.waitPassFromBoth': 'Ждём «Пас» от обоих атакующих',
  'err.notAllBeatenYet': 'Не все карты отбиты',
  'err.gameNotOver': 'Игра не закончена',
  'err.partnerNotOut': 'Партнёр ещё в игре — сначала передайте ему документы',
};

// ==================== КЫРГЫЗСКИЙ СЛОВАРЬ (заполни) ====================
const KY = {
  // Скопируй все ключи из RU и замени значения на кыргызский
  // Например:
  // 'common.cancel': 'Жокко чыгаруу',
  // 'welcome.title': 'Документ',
  // ...и т.д.
};

// ==================== ЯДРО ====================
const DICTS = { ru: RU, ky: KY };
let currentLang = 'ru';

export function initI18n() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && DICTS[saved]) currentLang = saved;
  } catch {}
  document.documentElement.lang = currentLang;
  return currentLang;
}

export function setLang(code) {
  if (!DICTS[code]) return;
  currentLang = code;
  try { localStorage.setItem('lang', code); } catch {}
  document.documentElement.lang = code;
  window.dispatchEvent(new CustomEvent('lang-change', { detail: { lang: code } }));
}

export function getLang() {
  return currentLang;
}

export function t(key, params = {}) {
  const dict = DICTS[currentLang] || RU;
  let str = dict[key] ?? RU[key] ?? key;
  // Простая подстановка {name}, {n}, {doc} и т.д.
  for (const k in params) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  }
  return str;
}

export function toggleLang() {
  setLang(currentLang === 'ru' ? 'ky' : 'ru');
  return currentLang;
}