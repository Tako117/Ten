import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple static dictionaries for MVP translation
const resources = {
  en: {
    translation: {
      "dash_input_heading": "Input",
      "dash_input_subtext": "Try typing 'Hello' to see live sign translation.",
      "dash_input_placeholder": "Type here...",
      "dash_play_audio": "Play Audio",
      "dash_process_log": "PROCESS LOG",
      "dash_log_idle": "Idle. Ready to assist.",
      "dash_log_waiting": "Waiting for input...",
      "lang_en_asl": "English to ASL",
      "lang_ru_rsl": "Russian to RSL",
      "lang_kk_ksl": "Kazakh to KSL",
      "hero_badge": "TEÑ AI NEURAL GENERATION",
      "hero_heading": "Bridging Worlds with Real-time Neural Sign",
      "hero_subtext": "Instantly convert spoken language, textbooks, and meetings into highly accurate, AI-driven sign language. The world's fastest translation engine right in your browser.",
      "label_live_asl_output": "Live ASL Neural Output",
      "app.title": "Teñ AI",
      "nav.enter": "Enter Platform",
      "hero.badge": "Introducing Teñ AI",
      "hero.title1": "Breaking educational barriers through ",
      "hero.title2": "AI.",
      "hero.subtitle": "Premium, accessible learning tools designed for everyone. Instantly translate spoken concepts or scan physical textbooks into digital audio and text.",
      "hero.cta1": "Enter Platform",
      "hero.cta2": "Learn More",
      "feat.live.title": "Live Translation",
      "feat.live.desc": "Hold to speak. Our Whisper AI models deliver near-instant, highly accurate text transcriptions.",
      "feat.scan.title": "Instant Scanning",
      "feat.scan.desc": "Point your camera at any textbook. We automatically extract and read the text aloud.",
      "feat.a11y.title": "Fully Accessible",
      "feat.a11y.desc": "Built from the ground up to support screen readers, high contrast needs, and varied learning formats.",
      "dash.status.idle": "Idle. Ready to assist.",
      "dash.status.translating": "Translating audio with AI...",
      "dash.status.scanning": "Scanning textbook with OCR...",
      "dash.status.completed": "Action completed.",
      "dash.status.error": "Error occurred.",
      "dash.ws.title": "Workspace",
      "dash.ws.empty": "Content will appear here once you speak or scan a document...",
      "dash.btn.read": "Read Aloud Again",
      "dash.btn.hold": "Hold to Translate",
      "dash.btn.release": "Release to Stop",
      "dash.btn.scan": "Scan Textbook",
      "dash.scan.progress": "Scanning...",
      "dash.avatar.label": "3D Avatar Assistant"
    }
  },
  ru: {
    translation: {
      "dash_input_heading": "Ввод",
      "dash_input_subtext": "Попробуйте ввести 'Привет', чтобы увидеть перевод жестами в реальном времени.",
      "dash_input_placeholder": "Введите текст здесь...",
      "dash_play_audio": "Воспроизвести аудио",
      "dash_process_log": "ЖУРНАЛ ПРОЦЕССОВ",
      "dash_log_idle": "Ожидание. Готов к работе.",
      "dash_log_waiting": "Ожидание ввода...",
      "lang_en_asl": "Английский на ASL",
      "lang_ru_rsl": "Русский на RSL",
      "lang_kk_ksl": "Казахский на KSL",
      "hero_badge": "НЕЙРОГЕНЕРАЦИЯ TEÑ AI",
      "hero_heading": "Соединяя миры с помощью нейрожестов в реальном времени",
      "hero_subtext": "Мгновенно преобразуйте устную речь, учебники и кездесулер в высокоточный язык жестов на базе ИИ. Самый быстрый механизм перевода прямо в вашем браузере.",
      "label_live_asl_output": "Живой вывод нейронной сети ASL",
      "app.title": "Teñ AI",
      "nav.enter": "Войти в платформу",
      "hero.badge": "Представляем Teñ AI",
      "hero.title1": "Преодоление образовательных барьеров с помощью ",
      "hero.title2": "ИИ.",
      "hero.subtitle": "Премиальные, доступные инструменты для обучения. Мгновенный перевод устной речи или сканирование учебников в текст и аудио.",
      "hero.cta1": "Войти в платформу",
      "hero.cta2": "Узнать больше",
      "feat.live.title": "Живой перевод",
      "feat.live.desc": "Удерживайте, чтобы говорить. Вы получаете точную расшифровку текста почти мгновенно.",
      "feat.scan.title": "Мгновенное сканирование",
      "feat.scan.desc": "Наведите камеру на учебник. Мы автоматически извлекаем текст и читаем его вслух.",
      "feat.a11y.title": "Полная доступность",
      "feat.a11y.desc": "Поддержка программ чтения с экрана, высокой контрастности и различных форматов.",
      "dash.status.idle": "Ожидание. Готов к работе.",
      "dash.status.translating": "Перевод аудио с помощью ИИ...",
      "dash.status.scanning": "Сканирование учебника с помощью OCR...",
      "dash.status.completed": "Действие завершено.",
      "dash.status.error": "Произошла ошибка.",
      "dash.ws.title": "Рабочая область",
      "dash.ws.empty": "Контент появится здесь после того, как вы заговорите или отсканируете документ...",
      "dash.btn.read": "Прочитать вслух еще раз",
      "dash.btn.hold": "Удерживайте для перевода",
      "dash.btn.release": "Отпустите, чтобы остановить",
      "dash.btn.scan": "Сканировать учебник",
      "dash.scan.progress": "Сканирование...",
      "dash.avatar.label": "3D Аватар Помощник"
    }
  },
  kk: {
    translation: {
      "dash_input_heading": "Енгізу",
      "dash_input_subtext": "Нақты уақыттағы ым-ишара аудармасын көру үшін 'Сәлем' деп теріп көріңіз.",
      "dash_input_placeholder": "Осында теріңіз...",
      "dash_play_audio": "Аудионы ойнату",
      "dash_process_log": "ПРОЦЕСС ЖУРНАЛЫ",
      "dash_log_idle": "Күту режимі. Жұмысқа дайын.",
      "dash_log_waiting": "Енгізуді күтуде...",
      "lang_en_asl": "Ағылшыннан ASL-ге",
      "lang_ru_rsl": "Орысшадан RSL-ге",
      "lang_kk_ksl": "Қазақшадан KSL-ге",
      "hero_badge": "TEÑ AI НЕЙРОГЕНЕРАЦИЯСЫ",
      "hero_heading": "Нақты уақыттағы нейро ым-ишара арқылы әлемдерді байланыстыру",
      "hero_subtext": "Ауызша сөйлеуді, оқулықтарды және кездесулерді ЖИ негізіндегі жоғары дәлдіктегі ым-ишара тіліне лезде түрлендіріңіз. Тікелей браузеріңіздегі ең жылдам аударма механизмі.",
      "label_live_asl_output": "ASL нейрондық желісінің тікелей шығысы",
      "app.title": "Teñ AI",
      "nav.enter": "Платформаға кіру",
      "hero.badge": "Teñ AI ұсынамыз",
      "hero.title1": "Білім берудегі кедергілерді жою ",
      "hero.title2": "Жасанды интеллект.",
      "hero.subtitle": "Барлығына арналған жоғары сапалы оқу құралдары. Сөйлеуді лезде аудару немесе оқулықтарды мәтін мен аудиоға сканерлеу.",
      "hero.cta1": "Платформаға кіру",
      "hero.cta2": "Көбірек білу",
      "feat.live.title": "Тікелей аударма",
      "feat.live.desc": "Сөйлеу үшін басып тұрыңыз",
      "feat.scan.title": "Лезде сканерлеу",
      "feat.scan.desc": "Камераны оқулыққа бағыттаңыз. Біз мәтінді шығарып, дауыстап оқимыз.",
      "feat.a11y.title": "Толық қолжетімділік",
      "feat.a11y.desc": "Экрандық оқу құралдарын, жоғары контрастты және түрлі форматтарды қолдау.",
      "dash.status.idle": "Күтуде. Дайын.",
      "dash.status.translating": "Аудионы ЖИ көмегімен аудару...",
      "dash.status.scanning": "Оқулықты OCR арқылы сканерлеу...",
      "dash.status.completed": "Әрекет аяқталды.",
      "dash.status.error": "Қате пайда болды.",
      "dash.ws.title": "Жұмыс кеңістігі",
      "dash.ws.empty": "Сөйлегеннен немесе құжатты сканерлегеннен кейін мазмұн осында пайда болады...",
      "dash.btn.read": "Қайтадан дауыстап оқыңыз",
      "dash.btn.hold": "Аудару үшін басып тұрыңыз",
      "dash.btn.release": "Тоқтату үшін жіберіңіз",
      "dash.btn.scan": "Оқулықты сканерлеу",
      "dash.scan.progress": "Сканерлеу...",
      "dash.avatar.label": "3D Аватар Көмекшісі"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default starting language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
