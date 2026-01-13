
import { Language } from "./types";

export const LETTERS_AR = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي']; 
export const LETTERS_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Available Categories for NAP
export const NAP_CATEGORIES = [
  { id: 'name', default: true },
  { id: 'animal', default: true },
  { id: 'plant', default: true },
  { id: 'inanimate', default: true },
  { id: 'country', default: true },
  { id: 'food', default: false },
  { id: 'job', default: false },
  { id: 'color', default: false },
  { id: 'brand', default: false },
  { id: 'celebrity', default: false },
  { id: 'clothing', default: false },
  { id: 'sport', default: false },
  { id: 'movie', default: false },
];

export const FRUITS = [
    '🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍒', '🍑', '🍍', '🥥', '🍉', '🍋', '🍐', '🥭', '🫐',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
    '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍜', '🍝', '🍣', '🍱', '🍩', '🍪', '🎂', '🍰',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🚗', '✈️', '🚀', '🛸',
    '🌵', '🎄', '🌲', '🌳', '🌴', '🌻', '🌹', '🌷', '🍄', '🌑', '🌓', '🌕', '🌍', '🔥', '💧',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯', '💢', '💫', '💦', '💨'
];

export const DARES = [
    "Do your best chicken impression for 10 seconds.",
    "Sing the alphabet backwards.",
    "Do 10 jumping jacks while chanting your name.",
    "Speak in a robot voice for the next round.",
    "Pretend to be a news anchor reporting on this game.",
    "Balance a book (or phone) on your head.",
    "Tell a joke. If no one laughs, do it again.",
    "Act like a monkey until the next round starts.",
    "Confess your favorite cartoon character.",
    "Draw a mustache on your face (or pretend to)."
];

export const CODENAMES_WORDS = [
    "AFRICA", "AGENT", "AIR", "ALIEN", "ALPS", "AMAZON", "AMBULANCE", "AMERICA", "ANGEL", "ANTARCTICA",
    "APPLE", "ARM", "ATLANTIS", "AUSTRALIA", "AZTEC", "BACK", "BALL", "BAND", "BANK", "BAR", "BARK", "BAT",
    "BATTERY", "BEACH", "BEAR", "BEAT", "BED", "BEIJING", "BELL", "BELT", "BERLIN", "BERMUDA", "BERRY", "BILL",
    "BLOCK", "BOARD", "BOLT", "BOMB", "BOND", "BOOM", "BOOT", "BOTTLE", "BOW", "BOX", "BRIDGE", "BRUSH", "BUCK",
    "BUFFALO", "BUG", "BUGLE", "BUTTON", "CALF", "CANADA", "CAP", "CAPITAL", "CAR", "CARD", "CARROT", "CASINO",
    "CAST", "CAT", "CELL", "CENTAUR", "CENTER", "CHAIR", "CHANGE", "CHARGE", "CHECK", "CHEST", "CHICK", "CHINA",
    "CHOCOLATE", "CHURCH", "CIRCLE", "CLIFF", "CLOAK", "CLUB", "CODE", "COLD", "COMIC", "COMPOUND", "CONCERT",
    "COOK", "COPPER", "COTTON", "COURT", "COVER", "CRANE", "CRASH", "CRICKET", "CROSS", "CROWN", "CYCLE",
    "DANCE", "DATE", "DAY", "DEATH", "DECK", "DEGREE", "DIAMOND", "DICE", "DINOSAUR", "DISEASE", "DOCTOR",
    "DOG", "DRAFT", "DRAGON", "DRESS", "DRILL", "DROP", "DUCK", "DWARF", "EAGLE", "EGYPT", "EMBASSY",
    "ENGINE", "ENGLAND", "EUROPE", "EYE", "FACE", "FAIR", "FALL", "FAN", "FENCE", "FIELD", "FIGHTER", "FIGURE",
    "FILE", "FILM", "FIRE", "FISH", "FLUTE", "FLY", "FOOT", "FORCE", "FOREST", "FORK", "FRANCE", "GAME",
    "GAS", "GENIUS", "GERMANY", "GHOST", "GIANT", "GLASS", "GLOVE", "GOLD", "GRACE", "GRASS", "GREECE",
    "GREEN", "GROUND", "HAM", "HAND", "HAWK", "HEAD", "HEART", "HELICOPTER", "HIMALAYAS", "HOLE", "HOLLYWOOD",
    "HONEY", "HOOD", "HOOK", "HORN", "HORSE", "HORSESHOE", "HOSPITAL", "HOTEL", "ICE", "ICE CREAM", "INDIA",
    "IRON", "IVORY", "JACK", "JAM", "JET", "JUPITER", "KANGAROO", "KETCHUP", "KEY", "KID", "KING", "KIWI",
    "KNIFE", "KNIGHT", "LAB", "LAP", "LASER", "LAWYER", "LEAD", "LEMON", "LEPRECHAUN", "LIFE", "LIGHT", "LIMOUSINE",
    "LINE", "LINK", "LION", "LITTER", "LOCH NESS", "LOCK", "LOG", "LONDON", "LUCK", "MAIL", "MAMMOTH", "MAPLE",
    "MARBLE", "MARCH", "MASS", "MATCH", "MERCURY", "MEXICO", "MICROSCOPE", "MILLIONAIRE", "MINE", "MINT", "MISSILE",
    "MODEL", "MOLE", "MOON", "MOSCOW", "MOUNT", "MOUSE", "MOUTH", "MUG", "NAIL", "NEEDLE", "NET", "NEW YORK",
    "NIGHT", "NINJA", "NOTE", "NOVEL", "NURSE", "NUT", "OCTOPUS", "OIL", "OLIVE", "OLYMPUS", "OPERA", "ORANGE",
    "ORGAN", "PALM", "PAN", "PANTS", "PAPER", "PARACHUTE", "PARK", "PART", "PASS", "PASTE", "PENGUIN", "PHOENIX",
    "PIANO", "PIE", "PILOT", "PIN", "PIPE", "PIRATE", "PISTOL", "PIT", "PITCH", "PLANE", "PLASTIC", "PLATE",
    "PLATYPUS", "PLAY", "PLOT", "POINT", "POISON", "POLE", "POLICE", "POOL", "PORT", "POST", "POUND", "PRESS",
    "PRINCESS", "PUMPKIN", "PUPIL", "PYRAMID", "QUEEN", "RABBIT", "RACKET", "RAY", "REVOLUTION", "RING", "RIVER",
    "ROBIN", "ROCK", "ROBOT", "ROLL", "ROME", "ROOT", "ROSE", "ROULETTE", "ROUND", "ROW", "RULER", "SATELLITE",
    "SATURN", "SCALE", "SCHOOL", "SCIENTIST", "SCORPION", "SCREEN", "SCUBA DIVER", "SEAL", "SERVER", "SHADOW",
    "SHAKE", "SHARK", "SHIP", "SHOE", "SHOP", "SHOT", "SINK", "SKYSCRAPER", "SLIP", "SLUG", "SMUGGLER", "SNOW",
    "SNOWMAN", "SOCK", "SOLDIER", "SOUL", "SOUND", "SPACE", "SPELL", "SPIDER", "SPIKE", "SPINE", "SPOT", "SPRING",
    "SPY", "SQUARE", "STADIUM", "STAFF", "STAR", "STATE", "STICK", "STOCK", "STRAW", "STREAM", "STRIKE", "STRING",
    "SUB", "SUIT", "SUPERHERO", "SWING", "SWITCH", "TABLE", "TABLET", "TAG", "TAIL", "TAP", "TEACHER", "TELESCOPE",
    "TEMPLE", "THEATER", "THIEF", "THUMB", "TICK", "TIE", "TIME", "TOKYO", "TOOTH", "TORCH", "TOWER", "TRACK",
    "TRAIN", "TRIANGLE", "TRIP", "TRUNK", "TUBE", "TURKEY", "UNDERTAKER", "UNICORN", "VACUUM", "VAN", "VET",
    "WAKE", "WALL", "WAR", "WASHER", "WATCH", "WATER", "WAVE", "WEB", "WELL", "WHALE", "WHIP", "WIND", "WITCH",
    "WORM", "YARD"
];

export const CODENAMES_WORDS_AR = [
    "أسد", "أبيض", "أحمر", "أخضر", "أزرق", "أرض", "أرنب", "إشارة", "أصبع", "أطلال", 
    "ألمانيا", "أمريكا", "أميرة", "أناناس", "أوتوبيس", "أوروبا", "إيطاليا", "إبرة", "إبهام", "اجتماع", 
    "أجراس", "أخطبوط", "أسطوانة", "أسنان", "أشعة", "أظافر", "أعصار", "أفعى", "أقمار", "أكاديمية",
    "أكسجين", "ألماس", "ألمنيوم", "أم", "أمازون", "أمعاء", "أموال", "أمواج", "أنابيب", "أنتاركتيكا",
    "بئر", "باص", "باخرة", "باريس", "بازل", "باندا", "بحر", "بخار", "بدر", "بدلة",
    "برج", "بركان", "برق", "بريد", "بريطانيا", "بصل", "بط", "بطاطس", "بطريق", "بطن",
    "بطل", "بطيخ", "بغداد", "بقرة", "بلاط", "بلبل", "بلح", "بلكونة", "بن", "بناء",
    "بندق", "بنطلون", "بنك", "بوابة", "بوصلة", "بوق", "بولندا", "بومة", "بيانو", "بيت",
    "بيض", "ببغاء", "تاج", "تاريخ", "تاكسي", "تأمين", "تبغ", "تتويج", "تجارة", "تحقيق",
    "تخرج", "تدريب", "تذكرة", "تراب", "ترجمة", "تزحلق", "تسلق", "تسوق", "تصوير", "تطعيم",
    "تطوير", "تعذيب", "تعليم", "تغذية", "تفاح", "تلفاز", "تليفون", "تمثال", "تمر", "تمساح",
    "تنس", "تنكر", "تنين", "توت", "تونس", "توهج", "توابل", "توازن", "توصيل", "توقيع",
    "ثأر", "ثابت", "ثعبان", "ثعلب", "ثقب", "ثلج", "ثوم", "ثياب", "ثيران", "ثكنة",
    "جائزة", "جار", "جامعة", "جبل", "جبن", "جثة", "جدار", "جدول", "جذع", "جرذ",
    "جرس", "جريدة", "جزرة", "جزيرة", "جسر", "جسم", "جفاف", "جلد", "جليد", "جمال",
    "جمل", "جمهورية", "جنوب", "جنية", "جهاز", "جهنم", "جواز", "جواهر", "جوارب", "جوز",
    "جوع", "جيب", "جيش", "جيل", "جيم", "حاجب", "حادث", "حاسوب", "حافلة", "حاكم",
    "حبر", "حبل", "حجر", "حديقة", "حديد", "حذاء", "حرب", "حرس", "حرف", "حريق",
    "حزام", "حزب", "حساب", "حصان", "حصن", "حطب", "حظ", "حفرة", "حقل", "حقيبة",
    "حكم", "حلبة", "حلم", "حلوى", "حمار", "حمام", "حماية", "حمل", "حناء", "حنجرة",
    "حوت", "حوريات", "حوض", "حياة", "حية", "خبز", "ختم", "خدعة", "خدمة", "خريطة",
    "خزانة", "خس", "خشب", "خفاش", "خل", "خلاط", "خلية", "خمسة", "خندق", "خوخ",
    "خوذة", "خوف", "خيار", "خيط", "خيول", "خيمة", "دب", "دبابة", "دبوس", "دخان",
    "دراجة", "درج", "درس", "درع", "دعاية", "دفتر", "دقيقة", "دكتور", "دلو", "دم",
    "دماغ", "دمية", "دواء", "دود", "دولة", "ديك", "ذئب", "ذباب", "ذرة", "ذراع",
    "ذهب", "ذيل", "رأس", "رئيس", "رئة", "راديو", "رأس", "راعي", "رافعة", "راقص",
    "رباط", "ربيع", "رجل", "رحلة", "رز", "رسالة", "رسم", "رصاص", "رعد", "رغيف",
    "رف", "رقبة", "رقم", "ركبة", "رمح", "رمش", "رمل", "رموز", "رنان", "رهان",
    "روبوت", "روح", "روسيا", "روضة", "روما", "رياح", "ريش", "رياضة", "ريف", "زئبق",
    "زجاج", "زر", "زرافة", "زرع", "زعيم", "زفاف", "زكام", "زلزال", "زمرد", "زميل",
    "زنبرك", "زنزانة", "زهرة", "زورق", "زيت", "زيتون", "ساعة", "ساق", "سباحة", "سباق",
    "سبانخ", "سبورة", "ستارة", "سجن", "سحاب", "سحر", "سلحفاة", "سلطة", "سلم", "سم",
    "سماء", "سمك", "سن", "سنجاب", "سندباد", "سيرك", "سيف", "سيارة", "شاحنة", "شارع",
    "شاطئ", "شاي", "شبكة", "شتاء", "شجرة", "شحم", "شرطة", "شريط", "شطرنج", "شعار",
    "شعر", "شعلة", "شغل", "شفاه", "شفرة", "شقراء", "شكولاته", "شمس", "شمعة", "شنطة",
    "شهد", "شهر", "شوكة", "شيخ", "صاروخ", "صابون", "صحراء", "صخرة", "صدفة", "صرصور",
    "صقر", "صليب", "صمغ", "صندوق", "صوت", "صورة", "صوف", "صيف", "صين", "ضابط",
    "ضباب", "ضحك", "ضفدع", "ضلع", "ضوء", "طائر", "طائرة", "طاولة", "طباشير", "طبيب",
    "طبق", "طبل", "طحين", "طرد", "طرف", "طريق", "طعام", "طفل", "طقس", "ظل",
    "ظلام", "ظهر", "عاصفة", "عاصمة", "عالم", "عامل", "عبقرية", "عجلة", "عدسة", "عرب",
    "عربة", "عرس", "عرش", "عرق", "عسل", "عشيرة", "عصا", "عصير", "عضلات",
    "عظم", "عقد", "عقرب", "علم", "علماء", "علي", "عملاق", "عملة", "عمود", "عنبر",
    "عنكبوت", "عنوان", "عود", "عين", "غابة", "غاز", "غبار", "غداء", "غراب", "غراء",
    "غرب", "غزال", "غسالة", "غطاء", "غيوم", "فأس", "فأر", "فاكهة", "فحم", "فراشة",
    "فرشاة", "فرن", "فرنسا", "فريق", "فستق", "فضاء", "فطيرة", "فقاعة", "فلاح", "فلفل",
    "فم", "فندق", "فنون", "فهد", "فول", "فيل", "فيلم", "قائد", "قارب", "قارة",
    "قاضي", "قاعة", "قافلة", "قانون", "قبعة", "قبر", "قبضة", "قدم", "قرش", "قرص",
    "قرن", "قرية", "قزم", "قس", "قسم", "قشرة", "قصة", "قصر", "قط", "قطار",
    "قطن", "قطيع", "قفاز", "قفز", "قفل", "قلب", "قلعة", "قلم", "قمر", "قميص",
    "قناة", "قنبلة", "قنفذ", "قهوة", "قوس", "قوة", "قيادة", "كأس", "كابوس", "كاتب",
    "كارثة", "كاسيت", "كاميرا", "كبش", "كبير", "كتاب", "كتف", "كتلة", "كثبان", "كرسي",
    "كرة", "كرز", "كرتون", "كركم", "كريم", "كسل", "كعب", "كعكة", "كف", "كلب",
    "كلية", "كمبيوتر", "كمثرى", "كنز", "كهرباء", "كهف", "كوكب", "كون", "لؤلؤ", "لاعب",
    "لبن", "لحم", "لسان", "لص", "لعبة", "لغز", "لغم", "لفافة", "لقلق", "لندن",
    "لوحة", "لوز", "ليل", "ليمون", "ماء", "ماس", "مايكرويف", "مباراة", "مبرد", "مبنى",
    "متحف", "مثلث", "مجرة", "مجهر", "محامي", "محرك", "محطة", "مخ", "مختبر", "مخدة",
    "مخيم", "مدخنة", "مدرسة", "مدفع", "مدينة", "مذياع", "مرآة", "م مربع", "مرض", "مرفأ",
    "مركب", "مروحة", "مريخ", "مزرعة", "مزمار", "مستشفى", "مسرح", "مسمار", "مسدس", "مشروب",
    "مشط", "مصباح", "مصر", "مصرف", "مصعد", "مطر", "مطرقة", "مطار", "مظلة", "معادلة",
    "معبد", "معدن", "معطف", "معلم", "مغناطيس", "مفتاح", "مفك", "مقص", "مكتب", "مكتبة",
    "مكعب", "ملابس", "ملح", "ملكة", "ملك", "مليونير", "ممحاة", "ممرض", "ممثل", "منارة",
    "مناخ", "منجم", "منديل", "منظار", "منفاخ", "منقار", "مهندس", "موز", "موسيقى", "موقع",
    "مياه", "ميكانيكي", "ميل", "نار", "ناظور", "نافذة", "ناي", "نبات", "نجم", "نحاس",
    "نحلة", "نخلة", "ندى", "نرد", "نسر", "نص", "نظارة", "نعال", "نعامة", "نعناع",
    "نفق", "نقطة", "نملة", "نمر", "نهر", "نور", "نوم", "نيزك", "هاتف", "هالة",
    "هدية", "هرم", "هلال", "همس", "هند", "هواء", "هيكل", "هيلكوبتر", "واحة", "ورقة",
    "وردة", "وزن", "وسادة", "وطواط", "وقود", "يابان", "يخت", "يد", "يقطين", "يمين"
];

export const DICTIONARY: Record<Language, any> = {
  [Language.EN]: {
    welcome: "GaMeS",
    tagline: "School Days Reimagined",
    enterName: "Enter your nickname",
    enterGameId: "Enter Game Code",
    create: "Create Game",
    join: "Join Game",
    connect: "Connect",
    connectionError: "Connection lost. Please try again.",
    copied: "Code copied to clipboard!",
    startGame: "Start Game",
    waiting: "Waiting for players...",
    players: "Players",
    round: "Round",
    letter: "Letter",
    spinning: "...",
    stop: "STOP!",
    timerEnd: "Time's Up!",
    someoneStopped: "stopped the round!",
    common: {
        lobby: "Lobby",
        leave: "Leave",
        quit: "Quit",
        host: "Host",
        turn: "Your Turn!",
        waiting: "Waiting...",
        invite: "Invite",
        settings: "Settings"
    },
    status: {
      review: "Review Answers",
    },
    categories: {
      name: "Name",
      animal: "Animal",
      plant: "Plant",
      inanimate: "Inanimate",
      country: "Country",
      food: "Food",
      job: "Job",
      color: "Color",
      brand: "Brand",
      celebrity: "Celebrity",
      clothing: "Clothing",
      sport: "Sport",
      movie: "Movie"
    },
    settings: {
        title: "Game Settings",
        activeCats: "Categories",
        mode: "Game Mode",
        modeStop: "First to Stop",
        modeTimer: "Timer",
        letterSelect: "Letter Selection",
        auto: "Automatic",
        manual: "Manual",
        timerDuration: "Timer (sec)",
        gridSize: "Grid Size",
        gridType: "Grid Style",
        turnTimer: "Turn Limit",
        off: "Off",
        shape: "Shape"
    },
    game: {
        nap: "Name Animal Plant",
        napDesc: "The classic category race. Think fast before someone hits STOP!",
        dots: "Dots & Boxes",
        dotsDesc: "Strategic territory capture. Close the boxes to score points.",
        hangman: "Hangman",
        hangmanDesc: "Guess the word before the drawing is complete.",
        fruit: "Fruit Salad",
        fruitDesc: "A chaotic card game of pattern matching and quick reflexes.",
        codenames: "Code Names",
        codenamesDesc: "Spies, clues, and red herrings. Find your team's agents first.",
        tictactoe: "Ultimate Tic Tac Toe",
        tictactoeDesc: "The strategic 9-board variant. Think ahead to control your opponent's next move.",
    },
    types: {
        SQUARE: "Square",
        TRIANGLE: "Triangle"
    },
    shapes: {
        SQUARE: "Box",
        DIAMOND: "Diamond",
        CROSS: "Cross",
        DONUT: "Donut",
        HOURGLASS: "Hourglass",
        RANDOM: "Random"
    },
    dots: {
        turn: "Your Turn!",
        waitingFor: "Waiting for"
    },
    hangman: {
        setWord: "Set Secret Word",
        enterSecret: "Enter word...",
        category: "Category",
        categoryPlaceholder: "Category Hint (Optional)",
        difficulty: "Difficulty",
        easy: "Easy (10)",
        hard: "Hard (6)",
        waitingForSetup: "Setting up...",
        hint: "Hint (-50pts)",
        won: "You Survived!",
        lost: "Game Over",
    },
    fruit: {
        waitingOthers: "Waiting for selection...",
        selectToPass: "Select a card to pass",
        slam: "SLAM!",
        slamNow: "SLAM NOW!",
        youWon: "You Won!",
        youLost: "You Lost!",
        badSlam: "FALSE ALARM!",
        badSlamDesc: "You slammed without a winning hand!",
        dare: "Penalty Dare",
        place: "Ranking",
        settings: {
            mystery: "Mystery Mode",
            wild: "Wildcards",
            win: "Win Condition",
            classic: "Classic (4 of a kind)",
            pairs: "Pairs (2 + 2)"
        },
        bluff: "Bluff"
    },
    codenames: {
        spymaster: "Spymaster",
        operative: "Operative",
        giveClue: "Give Clue",
        endTurn: "End Turn",
        cluePlaceholder: "Clue Word",
        guesses: "Guesses",
        redTurn: "Red Team's Turn",
        blueTurn: "Blue Team's Turn",
        assassin: "Assassin!",
        victory: "Victory!",
        redWins: "Red Team Wins!",
        blueWins: "Blue Team Wins!"
    },
    tictactoe: {
        xTurn: "X's Turn",
        oTurn: "O's Turn",
        free: "Free Move!",
        won: "Winner!",
        draw: "Draw!",
        waiting: "Waiting for move...",
        settings: {
            classic: "Classic",
            extreme: "Extreme",
            gravity: "Gravity",
            fog: "Fog of War",
            winLine: "3-in-Row",
            winPoints: "Most Points"
        },
        powerups: {
            eraser: "Eraser",
            eraserDesc: "Clear any opponent mark on an active board.",
            hallPass: "Hall Pass",
            hallPassDesc: "Play in any sub-board you want.",
            switch: "Switch",
            switchDesc: "Change the active sub-board randomly.",
            bomb: "Nuke",
            bombDesc: "Reset an entire sub-board.",
            freeze: "Freeze",
            freezeDesc: "Lock a board for one turn."
        }
    }
  },
  [Language.AR]: {
    welcome: "ألعـاب",
    tagline: "أيام الدراسة والذكريات",
    enterName: "اختار اسمك",
    enterGameId: "رمز الغرفة",
    create: "إنشاء غرفة",
    join: "انضمام",
    connect: "اتصال",
    connectionError: "خطأ في الاتصال",
    copied: "تم النسخ!",
    startGame: "ابدأ اللعب",
    waiting: "ننتظر البقية...",
    players: "اللاعبين",
    round: "جولة",
    letter: "حرف",
    spinning: "...",
    stop: "ستوب!",
    timerEnd: "انتهى الوقت!",
    someoneStopped: "وقف اللعب!",
    common: {
        lobby: "الرئيسية",
        leave: "خروج",
        quit: "انسحاب",
        host: "مضيف",
        turn: "دورك!",
        waiting: "ننتظر...",
        invite: "دعوَة",
        settings: "إعدادات"
    },
    status: {
      review: "النتائج",
    },
    categories: {
      name: "إنسان",
      animal: "حيوان",
      plant: "نبات",
      inanimate: "جماد",
      country: "بلاد",
      food: "أكل",
      job: "مهنة",
      color: "لون",
      brand: "ماركة",
      celebrity: "مشهور",
      clothing: "ملابس",
      sport: "رياضة",
      movie: "فيلم"
    },
    settings: {
        title: "الإعدادات",
        activeCats: "الفئات",
        mode: "نظام اللعب",
        modeStop: "ستوب (الأسرع)",
        modeTimer: "مؤقت",
        letterSelect: "اختيار الحرف",
        auto: "عشوائي",
        manual: "يدوي",
        timerDuration: "الوقت (ثواني)",
        gridSize: "حجم الشبكة",
        gridType: "نوع الشبكة",
        turnTimer: "وقت الدور",
        off: "بدون",
        shape: "الشكل"
    },
    game: {
        nap: "إنسان حيوان",
        napDesc: "لعبة الطيبين. مين أسرع واحد يكتب ومين بيقول ستوب؟",
        dots: "نقط ومربعات",
        dotsDesc: "قفل المربعات واكسب مساحات. لعبة ذكاء وتكتيك.",
        hangman: "حبل المشنقة",
        hangmanDesc: "خمن الكلمة قبل ما الرسمة تكتمل وتخسر.",
        fruit: "سلطة فواكه",
        fruitDesc: "لعبة سرعة وتركيز. جمع الكروت المتشابهة واضرب الجرس!",
        codenames: "العميل السري",
        codenamesDesc: "فرق وجواسيس. حاول تكتشف مكان عملائك من تلميحات القائد.",
        tictactoe: "إكس أو المطورة",
        tictactoeDesc: "مش إكس أو عادية. دي ٩ ألعاب في بعض، لازم تفكر لبعيد.",
    },
    types: {
        SQUARE: "مربع",
        TRIANGLE: "مثلث"
    },
    shapes: {
        SQUARE: "صندوق",
        DIAMOND: "ماسة",
        CROSS: "زائد",
        DONUT: "دونات",
        HOURGLASS: "ساعة رملية",
        RANDOM: "عشوائي"
    },
    dots: {
        turn: "دورك!",
        waitingFor: "ننتظر"
    },
    hangman: {
        setWord: "اكتب الكلمة السرية",
        enterSecret: "اكتب هنا...",
        category: "التصنيف",
        categoryPlaceholder: "تلميح (اختياري)",
        difficulty: "المستوى",
        easy: "سهل (١٠)",
        hard: "صعب (٦)",
        waitingForSetup: "يتم التجهيز...",
        hint: "مساعدة (-٥٠)",
        won: "نجوت!",
        lost: "خسرت",
    },
    fruit: {
        waitingOthers: "في انتظار الاختيار...",
        selectToPass: "اختر كرت تمرره لجارك",
        slam: "اضرب!",
        slamNow: "اضرب الآن!",
        youWon: "فزت!",
        youLost: "خسرت!",
        badSlam: "غلطة!",
        badSlamDesc: "ضربت بدون ما الورق يتطابق!",
        dare: "حكم عليك",
        place: "المركز",
        settings: {
            mystery: "الوضع الغامض",
            wild: "الجوكر",
            win: "شرط الفوز",
            classic: "كلاسيكي (٤)",
            pairs: "أزواج (٢+٢)"
        },
        bluff: "تمويه"
    },
    codenames: {
        spymaster: "القائد",
        operative: "عميل",
        giveClue: "إرسال",
        endTurn: "إنهاء الدور",
        cluePlaceholder: "كلمة واحدة",
        guesses: "محاولات",
        redTurn: "دور الأحمر",
        blueTurn: "دور الأزرق",
        assassin: "القاتل!",
        victory: "نصر!",
        redWins: "الفريق الأحمر فاز!",
        blueWins: "الفريق الأزرق فاز!"
    },
    tictactoe: {
        xTurn: "دور X",
        oTurn: "دور O",
        free: "العب في أي مكان!",
        won: "الفائز!",
        draw: "تعادل!",
        waiting: "ننتظر...",
        settings: {
            classic: "كلاسيكي",
            extreme: "إكستريم",
            gravity: "جاذبية",
            fog: "ضباب الحرب",
            winLine: "خط ٣",
            winPoints: "أكثر نقاط"
        },
        powerups: {
            eraser: "الممحاة",
            eraserDesc: "امسح علامة للخصم",
            hallPass: "جواز مرور",
            hallPassDesc: "العب في أي مكان",
            switch: "تبديل",
            switchDesc: "غيّر اللوحة النشطة عشوائياً",
            bomb: "نووي",
            bombDesc: "تصفير لوحة كاملة",
            freeze: "تجميد",
            freezeDesc: "قفل لوحة لدور واحد"
        }
    }
  }
};
