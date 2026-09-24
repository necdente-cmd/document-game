// 🌐 Мультиязычность (RU / KY)
export const LANGS = {
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺', font: 'default' },
  ky: { code: 'ky', name: 'Кыргызча', flag: '🇰🇬', font: 'times' },
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
  'common.confirm': '✅ Подтвердить',
  'common.reject': '✖ Отклонить',
  'common.player': 'Игрок',
  'common.min': 'мин',

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
  'join.title': 'Войти в игру',
  'join.codeLabel': 'Код комнаты',
  'join.codePlaceholder': 'ABCD',
  'join.enter': 'Войти',
  'join.enterCode': 'Введите код',

  // ===== lobby =====
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

  // ===== positions =====
  'pos.A1': 'A1',
  'pos.B2': 'B2',
  'pos.A3': 'A3',
  'pos.B4': 'B4',

  // ===== player states =====
  'state.beat': 'бьёт',
  'state.think': 'думает',
  'state.move': 'ходит',
  'state.pickup': 'поднимает',
  'state.out': 'вышел',
  'state.offline': 'отошёл',

  // ===== banners =====
  'banner.yourTurn': '🎯 ТВОЙ ХОД',
  'banner.yourTurnAttack': '🎯 ТВОЙ ХОД — АТАКУЙ',
  'banner.yourDefend': '🛡️ ТЫ ЗАЩИЩАЕШЬСЯ — БЕЙ КАРТУ',
  'banner.beatSelected': '🎯 БЕЙ ВЫБРАННУЮ КАРТУ',
  'banner.canPass': '👆 Можешь подкинуть или сказать ПАС',

  // ===== notices =====
  'notice.bothPassed': '⛔ Оба атакующих пасанули',
  'notice.attackerPassed': '⏳ Атакующий пасанул — ждём партнёра',
  'notice.partnerPassed': '⏳ Партнёр пасанул — ждём атакующего',
  'notice.waitingSeat': '⏳ Ждём {name} — отошёл',

  // ===== hints =====
  'hint.waitingSeat': '⏳ Ждём игрока — скоро вернётся',
  'hint.hasYourDoc': '⚠ На столе ваш документ — нужно поднять всё',
  'hint.pullCard': '👆 Тяните свою карту на карту врага',
  'hint.tapEnemyCard': '👆 Тапни карту врага, потом свою — или тяни',
  'hint.decideBito': '✋ Все пасанули — решите: БИТО или Поднять',
  'hint.pullToField': '👆 Тяни карту в поле или тапни её и тапни поле',
  'hint.yourTurn': '👆 Твой ход',

  // ===== buttons =====
  'btn.pickUp': '📥<br>ПОДНЯТЬ',
  'btn.throwDocs': '🏆<br>БРОСИТЬ',
  'btn.giveCards': '🔄<br>ОТДАТЬ',
  'btn.return': '🔄<br>ВЕРНУТЬСЯ',
  'btn.passDocs': '📤<br>ПЕРЕДАТЬ',
  'btn.pass': '✋<br>ПАС',
  'btn.bito': '✔ БИТО',

  // ===== info =====
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

  // ===== history =====
  'history.title': '📜 История конов',
  'history.empty': 'Пока нет конов',
  'history.round': 'Кон {n}',
  'history.wonBy': '🏆 Team {team}',

  // ===== champion =====
  'champion.title': '🏆 Team {team} — ЧЕМПИОН!',
  'champion.score': 'Счёт',
  'champion.time': 'Время партии',
  'champion.rounds': 'Конов сыграно',
  'champion.best': '⭐ Лучший игрок',
  'champion.roundsShort': 'кон.',
  'champion.playAgain': '🔄 Играть снова',
  'champion.exitMenu': '🚪 Выйти в меню',

  // ===== about =====
  'about.title': '🎴 Документ',
  'about.subtitle': 'Карточная онлайн-игра 2×2',
  'about.version': 'Версия',
  'about.developer': 'Разработчик',
  'about.contacts': 'Контакты',
  'about.rights': '© 2026 Dr.Nec.D · Все права защищены',

  // ===== mail =====
  'mail.title': '✉️ Почта',
  'mail.empty': '📭 Пока нет сообщений',
  'mail.hint': 'Новости и обновления будут появляться здесь',

  // ===== profile =====
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

  // ===== overlays =====
  'ov.passDocs.title': '📢 {name} передаёт документы партнёру',
  'ov.passDocs.waitConfirm': 'Ожидание подтверждения…',
  'ov.passDocs.waitPartner': 'Ждём подтверждения противника…',
  'ov.passDocs.wait': 'Ожидание…',
  'ov.swap.title': '🔄 Своп: {from} ↔ {to}',
  'ov.swap.partnerAsk': 'Партнёр просит вернуть его. Отдадите все свои карты?',
  'ov.swap.waitPartner': 'Ожидание решения партнёра…',
  'ov.swap.opponentConfirm': 'Хозяева передают карты. Подтвердите факт.',
  'ov.swap.wait': 'Ожидание…',
  'ov.start.title': '🏆 Вы выиграли кон! Кто зайдёт в следующем?',
  'ov.start.me': 'Я ({name})',
  'ov.start.partner': 'Партнёр ({name})',

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
  'err.yourDocPickUpAll': 'Ваш документ — только поднять',
  'err.forcedDocPickUpAll': 'Навязанный документ — только поднять',
  'err.waitBothPass': 'Ждём «Пас» от обоих атакующих',
  'err.notAllBeaten': 'Не все карты отбиты',
  'err.docOnTable': 'На столе ваш документ — нужно поднять',
  'err.onlyDocsTransfer': 'Передавать можно только если в руке ТОЛЬКО документы',
  'err.partnerOut': 'Партнёр вышел — передавать некому',
  'err.onlyOpponentConfirms': 'Подтвердить может только противник',
  'err.onlyOpponentCancels': 'Отменить может только противник',
  'err.cantDuringTurn': 'Нельзя во время хода',
  'err.alreadyPending': 'Уже есть запрос',
  'err.swapUsed': 'Своп уже использован',
  'err.partnerStillInGame': 'Партнёр ещё в игре',
  'err.youNotOut': 'Вы не вышли',
  'err.partnerAlsoOut': 'Партнёр тоже вышел',
  'err.notPartnersTurn': 'Сейчас не ход партнёра',
  'err.notYourDecision': 'Не вам решать',
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
  'err.gameNotOver': 'Игра не закончена',
  'err.sameRankFirstAttack': 'При первой атаке можно заходить только картами одного ранга',
};

// ==================== КЫРГЫЗСКИЙ СЛОВАРЬ ====================
const KY = {
  'common.cancel': 'Жокко чыгаруу',
  'common.close': 'Жабуу',
  'common.back': '← Артка',
  'common.next': 'Кийинки →',
  'common.ok': 'ОК',
  'common.yes': 'Ооба',
  'common.no': 'Жок',
  'common.confirm': '✅ Ырастоо',
  'common.reject': '✖ Баш тартуу',
  'common.player': 'Оюнчу',
  'common.min': 'мин',

  'welcome.title': 'Документ',
  'welcome.subtitle': '2×2 карта оюну · 36 карта',
  'welcome.createGame': '🎮 Оюн түзүү',
  'welcome.joinByCode': '🔗 Код менен кирүү',
  'welcome.howToPlay': '📚 Оюн эрежеси',
  'welcome.friends': '👥 Достор',
  'welcome.author': 'Автору: Dr.Nec.D',
  'welcome.musicOn': 'Музыка күйүк',
  'welcome.musicOff': 'Музыка өчүк',

  'create.title': 'Оюн жөндөөлөрү',
  'create.yourName': 'Сиздин атыңыз',
  'create.namePlaceholder': 'Атыңыз',
  'create.avatar': 'Аватар',
  'create.deckStyle': 'Карталардын стили',
  'create.backColor': 'Картанын арты',
  'create.docSteps': 'Документ баскычтары',
  'create.docClassic': 'Классикалык',
  'create.docClassicDesc': '6 баскыч',
  'create.docShort': 'Кыска',
  'create.docShortDesc': '4 баскыч',
  'create.tableTheme': 'Стол темасы',
  'create.createRoom': '🎮 Бөлмө түзүү',
  'create.themeClassic': 'Классика',
  'create.themeDark': 'Караңгы',
  'create.themeNeon': 'Неон',
  'create.themePaper': 'Кагаз',

  'join.title': 'Оюнга кирүү',
  'join.codeLabel': 'Бөлмөнүн коду',
  'join.codePlaceholder': 'ABCD',
  'join.enter': 'Кирүү',
  'join.enterCode': 'Кодду киргизиңиз',

  'lobby.roomCode': 'Бөлмөнүн коду',
  'lobby.copyCode': 'Көчүрүү үчүн таптаңыз',
  'lobby.players': 'оюнчу',
  'lobby.waitingPlayers': 'Оюнчуларды күтүп жатабыз…',
  'lobby.waitingHost': 'Хостту күтүп жатабыз…',
  'lobby.startGame': '▶ Оюнду баштоо',
  'lobby.seating': '🎯 Орунчуларды жайгаштыруу',
  'lobby.seatingHint': '(эки оюнчуну таптап алмаштырыңыз)',
  'lobby.you': '(сиз)',
  'lobby.host': 'Хост',
  'lobby.waitingSlot': 'Күтүп жатабыз…',
  'lobby.codeCopied': 'Код көчүрүлдү:',

  'state.beat': 'чабып жатат',
  'state.think': 'ойлонуп жатат',
  'state.move': 'жүрүп жатат',
  'state.pickup': 'көтөрүп жатат',
  'state.out': 'чыгып кетти',
  'state.offline': 'убактылуу жок',

  'banner.yourTurn': '🎯 СИЗДИН ЖҮРҮШҮҢҮЗ',
  'banner.yourTurnAttack': '🎯 СИЗДИН ЖҮРҮШҮҢҮЗ — КАРТА ЖҮРҮҢҮЗ',
  'banner.yourDefend': '🛡️ СИЗ КОРГОНУП ЖАТАСЫЗ — КАРТАНЫ ЧАБЫҢЫЗ',
  'banner.beatSelected': '🎯 ТАНДАЛГАН КАРТАНЫ ЧАБЫҢЫЗ',
  'banner.canPass': '👆 Карта кошуңуз же ЖОК айтыңыз',

  'notice.bothPassed': '⛔ Эки чабуучутең жок деди',
  'notice.attackerPassed': '⏳ Чабуучу жок деди — өнөктү күтүп жатабыз',
  'notice.partnerPassed': '⏳ Өнөктөш жок деди — чабуучуну күтүп жатабыз',
  'notice.waitingSeat': '⏳ {name} күтүп жатабыз — убактылуу жок',

  'hint.waitingSeat': '⏳ Оюнчуну күтүп жатабыз — жакында келет',
  'hint.hasYourDoc': '⚠ Столдо сиздин документ — баарын көтөрүү керек',
  'hint.pullCard': '👆 Өз картаңызды душмандын картасына тартыңыз',
  'hint.tapEnemyCard': '👆 Душмандын картасын басыңыз, анан өзүңүздүкүн — же тартыңыз',
  'hint.decideBito': '✋ Баары жок деди — чечиңиз: КЕТИРҮҮ же Көтөрүү',
  'hint.pullToField': '👆 Картаны талаага тартыңыз же аны басып, талааны басыңыз',
  'hint.yourTurn': '👆 Сиздин жүрүшүңүз',

  'btn.pickUp': '📥<br>КӨТӨРҮҮ',
  'btn.throwDocs': '🏆<br>ТАШТОО',
  'btn.giveCards': '🔄<br>БЕРҮҮ',
  'btn.return': '🔄<br>КАЙТУУ',
  'btn.passDocs': '📤<br>ӨТКӨРҮҮ',
  'btn.pass': '✋<br>ЖОК',
  'btn.bito': '✔ КЕТИРҮҮ',

  'info.title': '📊 Маалымат',
  'info.trump': 'Козыр',
  'info.myDoc': 'Менин документим',
  'info.oppDoc': 'Алардын документи',
  'info.score': 'Эсеп',

  'settings.title': '⚙️ Жөндөөлөр',
  'settings.soundVibro': 'Үн жана титирөө',
  'settings.sound': '🔊 Үн',
  'settings.vibration': '📳 Титирөө',
  'settings.mic': '🎤 Микрофон',
  'settings.scale': '📐 Масштаб',
  'settings.scaleSmall': 'Кичине',
  'settings.scaleMedium': 'Орточо',
  'settings.scaleLarge': 'Чоң',
  'settings.themeTitle': '🎨 Стол темасы',
  'settings.themeHint': '(кийинки бөлмөдө колдонулат)',
  'settings.history': 'Тарых',
  'settings.openHistory': '📜 Оюндардын тарыхы',
  'settings.room': 'Бөлмө',
  'settings.leaveRoom': '🚪 Бөлмөдөн чыгуу',
  'settings.leaveConfirm': 'Бөлмөдөн чыгасызбы?',
  'settings.language': '🌐 Тил',

  'chat.title': '💬 Чат',
  'chat.placeholder': 'Билдирүү...',
  'chat.noMessages': 'Азырынча билдирүү жок…',

  'history.title': '📜 Оюндардын тарыхы',
  'history.empty': 'Азырынча оюн жок',
  'history.round': 'ОЮН {n}',
  'history.wonBy': '🏆 Курам {team}',

  'champion.title': '🏆 Курам {team} — ЧЕМПИОН!',
  'champion.score': 'Эсеп',
  'champion.time': 'Оюн убактысы',
  'champion.rounds': 'Ойнолгон оюндар',
  'champion.best': '⭐ Эң мыкты оюнчу',
  'champion.roundsShort': 'оюн.',
  'champion.playAgain': '🔄 Кайра ойноо',
  'champion.exitMenu': '🚪 Менюга чыгуу',

  'about.title': '🎴 Документ',
  'about.subtitle': '2×2 онлайн карта оюну',
  'about.version': 'Версия',
  'about.developer': 'Иштеп чыгуучу',
  'about.contacts': 'Байланыштар',
  'about.rights': '© 2026 Dr.Nec.D · Бардык укуктар корголгон',

  'mail.title': '✉️ Почта',
  'mail.empty': '📭 Азырынча билдирүү жок',
  'mail.hint': 'Жаңылыктар жана жаңыртуулар ушул жерде пайда болот',

  'profile.title': '🧑 Профиль',
  'profile.id': 'ID',
  'profile.gamesPlayed': 'Ойнолгон партиялар',
  'profile.wins': 'Жеңиштер',
  'profile.statsLater': 'Статистика кийинки версияларда пайда болот',

  'tut.step': 'Кадам {n} / {total}',
  'tut.skip': 'Өткөрүп жиберүү',
  'tut.back': '← Артка',
  'tut.next': 'Кийинки →',
  'tut.finish': '🎮 Оюнга!',
  'tut.s1.emoji': '🎴',
  'tut.s1.title': 'Документ',
  'tut.s1.subtitle': '2×2 карта оюну',
  'tut.s1.text': 'Сиз бир өнөктөш менен эки атаандашка каршы ойнойсуз. Өнөктөш дайыма сиздин каршыңызда отурат.',
  'tut.s2.emoji': '🏆',
  'tut.s2.title': 'Оюндун максаты',
  'tut.s2.subtitle': 'Т баскычына жетүү',
  'tut.s2.text': 'Ар бир команданын «документи» бар — өз карта рангы. 6дан баштайсыз, ал эми ар бир утулган кон үчүн жогору көтөрүлөсүз: 6 → 10 → В → Д → К → Т.\n\nТ баскычына жетип, кон уткан команда жеңет.',
  'tut.s3.emoji': '👆',
  'tut.s3.title': 'Кантип жүрүү керек',
  'tut.s3.subtitle': 'Карта менен чабуу',
  'tut.s3.text': 'Өз кезегиңизде колуңуздагы картаны столдун ортосуна тартыңыз. Же аны таптап, анан талааны таптаңыз.\n\nЭсиңизде болсун: өз документиңиз менен кирүү болбойт! Документти чабууга гана болот (жана козыр менен гана).',
  'tut.s4.emoji': '🛡️',
  'tut.s4.title': 'Кантип коргонуу керек',
  'tut.s4.subtitle': 'Баары же эч нерсе',
  'tut.s4.text': 'Сизге чабуул кылганда, же бардык карталарды чабасыз, же баарын көтөрөсүз.\n\nКантип чабуу керек: душмандын картасын таптаңыз, анан колуңуздагы өз картаңызды таптаңыз. Ылайыктуу карталар жашыл түстө белгиленет.',
  'tut.s5.emoji': '✨',
  'tut.s5.title': 'Өзгөчө эрежелер',
  'tut.s5.subtitle': 'Алмашуу · Өткөрүү',
  'tut.s5.text': '🔄 Алмашуу — өнөктөш чыкса, ага өз карталарыңызды бере аласыз (бир кондо 1 жолу).\n\n📤 Документтерди өткөрүү — эгер колуңузда документтер гана болсо, аларды өнөктөшүңүзгө өткөрүңүз.',
  'tut.s6.emoji': '🚀',
  'tut.s6.title': 'Даяр!',
  'tut.s6.subtitle': 'Оюнда ийгилик',
  'tut.s6.text': 'Команда топтоп, достор менен ойноп, жеңиңиз.\n\nУнутпаңыз: 🎤 микрофон — үн чаты үчүн, 💬 чат — жазышуу үчүн, ⚙️ жөндөөлөр — үн жана тема үчүн.',

  'ov.passDocs.title': '📢 {name} документтерин өнөктөшүнө өткөрүп жатат',
  'ov.passDocs.waitConfirm': 'Ырастоону күтүп жатабыз…',
  'ov.passDocs.waitPartner': 'Атаандаштын ырастоосун күтүп жатабыз…',
  'ov.passDocs.wait': 'Күтүп жатабыз…',
  'ov.swap.title': '🔄 Алмашуу: {from} ↔ {to}',
  'ov.swap.partnerAsk': 'Өнөктөш кайтарып берүүнү сурап жатат. Бардык карталарыңызды бересизби?',
  'ov.swap.waitPartner': 'Өнөктөштүн чечимин күтүп жатабыз…',
  'ov.swap.opponentConfirm': 'Атаандаштар карталарды өткөрүп жатат. Фактыны ырастаңыз.',
  'ov.swap.wait': 'Күтүп жатабыз…',
  'ov.start.title': '🏆 Сиз кон уттуңуз! Кийинкиге ким кирет?',
  'ov.start.me': 'Мен ({name})',
  'ov.start.partner': 'Өнөктөш ({name})',

  'toast.codeCopied': 'Код көчүрүлдү',
  'toast.copyFailed': 'Көчүрүү мүмкүн болбоду',
  'toast.synced': '🔄 Синхрондоштуруу',
  'toast.refreshed': '🔄 Жаңыртылды',
  'toast.micOn': '🎤 Микрофон күйүк',
  'toast.micError': 'Микрофонго кирүү мүмкүн болбоду',

  'err.roomNotFound': 'Бөлмө табылган жок',
  'err.roomFull': 'Бөлмө толук',
  'err.gameStarted': 'Оюн башталып кеткен',
  'err.onlyHost': 'Хост гана',
  'err.needPlayers': '{n} оюнчу керек',
  'err.notYourTurn': 'Сиздин жүрүшүңүз эмес',
  'err.noCardsSelected': 'Карталар тандалган жок',
  'err.cardNotInHand': 'Карта колдо жок',
  'err.ownDocCantPlay': 'Өз документиңиз ({doc}) менен кирүү болбойт',
  'err.onlyAttackerOrPartner': 'Чабуучу же өнөктөш гана',
  'err.youPassed': 'Сиз «Пас» дедиңиз',
  'err.noTarget': 'Чабуул кыла турган эч ким жок',
  'err.defenderUnavailable': 'Коргоочу жеткиликсиз',
  'err.defenderOffline': '⏳ {name} убактылуу жок — кайтышын күтүп жатабыз',
  'err.maxCards': 'Максимум {n} карта — коргоочунун колуна батпайт',
  'err.cantBeatOwnDoc': 'Өз документиңизди чабууга болбойт — көтөрүү керек',
  'err.ownDocOnlyTrump': 'Өз документи козыр менен гана чабылат',
  'err.doesntBeat': 'Чаппайт',
  'err.notDefending': 'Сиз коргонуп жаткан жоксуз',
  'err.yourDocPickUpAll': 'Сиздин документ — баарын көтөрүү гана',
  'err.forcedDocPickUpAll': 'Таңууланган документ — баарын көтөрүү гана',
  'err.waitBothPass': 'Эки чабуучунун тең «Пас» айтышын күтүп жатабыз',
  'err.notAllBeaten': 'Бардык карталар чабылган жок',
  'err.docOnTable': 'Столдо сиздин документ — көтөрүү керек',
  'err.onlyDocsTransfer': 'Колдо документтер гана болсо, өткөрүүгө болот',
  'err.partnerOut': 'Өнөктөш чыкты — өткөрө турган эч ким жок',
  'err.onlyOpponentConfirms': 'Атаандаш гана ырастай алат',
  'err.onlyOpponentCancels': 'Атаандаш гана жокко чыгара алат',
  'err.cantDuringTurn': 'Жүрүш учурунда болбойт',
  'err.alreadyPending': 'Сурам мурунтан бар',
  'err.swapUsed': 'Алмашуу мурун колдонулган',
  'err.partnerStillInGame': 'Өнөктөш дагы эле оюнда',
  'err.youNotOut': 'Сиз чыккан жоксуз',
  'err.partnerAlsoOut': 'Өнөктөш да чыкты',
  'err.notPartnersTurn': 'Азыр өнөктөштүн жүрүшү эмес',
  'err.notYourDecision': 'Сиз чечпейсиз',
  'err.hasRegularCards': 'Колдо кадимки карталар бар',
  'err.partnerInGameTransfer': 'Өнөктөш дагы эле оюнда — алгач ага документтерди өткөрүңүз',
  'err.waitConfirmation': 'Ырастоону күтүп жатабыз',
  'err.onlyHostSeating': 'Орундарды хост гана өзгөртө алат',
  'err.onlyLobby': 'Лоббиде гана болот',
  'err.wrongFormat': 'Туура эмес формат',
  'err.wrongPlayerCount': 'Оюнчулардын саны туура эмес',
  'err.duplicatePlayers': 'Оюнчулар кайталанган',
  'err.playerNotFound': 'Оюнчу табылган жок',
  'err.notYourTeamChooses': 'Сиздин команда тандабайт',
  'err.wrongPlayer': 'Туура эмес оюнчу',
  'err.gameNotOver': 'Оюн бүтө элек',
  'err.sameRankFirstAttack': 'Биринчи чабуулда бир эле рангдагы карталар менен кирүүгө болот',
};

// ==================== ЯДРО ====================
const DICTS = { ru: RU, ky: KY };
let currentLang = 'ru';

export function initI18n() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && DICTS[saved]) currentLang = saved;
  } catch {}
  applyLangFont();
  document.documentElement.lang = currentLang;
  return currentLang;
}

function applyLangFont() {
  const lang = currentLang;
  if (lang === 'ky') {
    document.documentElement.dataset.lang = 'ky';
  } else {
    document.documentElement.dataset.lang = 'ru';
  }
}

export function setLang(code) {
  if (!DICTS[code]) return;
  currentLang = code;
  try { localStorage.setItem('lang', code); } catch {}
  applyLangFont();
  document.documentElement.lang = code;
  window.dispatchEvent(new CustomEvent('lang-change', { detail: { lang: code } }));
}

export function getLang() {
  return currentLang;
}

export function t(key, params = {}) {
  const dict = DICTS[currentLang] || RU;
  let str = dict[key] ?? RU[key] ?? key;
  for (const k in params) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  }
  return str;
}

export function toggleLang() {
  setLang(currentLang === 'ru' ? 'ky' : 'ru');
  return currentLang;
}