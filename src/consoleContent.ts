import type { Lang } from "./i18n";
import type { StackGroup } from "./projects";

export type Line = string | { text: string; href: string };

export interface Section {
  id: string;
  label: string;
  lines: Line[];
}

export interface ConsoleStrings {
  tagline: string;
  boot: string;
  menu: string;
  to3d: string;
  holo: { open: string; hint: string; stack: Record<StackGroup, string> };
  lang: string;
  keys: string;
  footer: string;
  sections: Section[];
}

const EMAIL = "asanchomarmol@gmail.com";
const LINKEDIN = "https://www.linkedin.com/in/environment-artist";
const INSTAGRAM = "https://www.instagram.com/soyvertigo/";

export const consoleContent: Record<Lang, ConsoleStrings> = {
  en: {
    tagline: "3D ENVIRONMENT ARTIST & CREATIVE DEVELOPER",
    boot: "VERTIGO.1.9.9.8 ////> AVAILABLE TO WORK </////",
    menu: "INDEX",
    to3d: "[ ENTER 3D SCENE -> ]",
    lang: "LANG",
    keys: "KEYS: 1-6 SECTION · L LANGUAGE · G 3D WORLD",
    holo: { open: "OPEN ->", hint: "TILT IT · TAP TO FLIP", stack: { frontend: "FRONTEND", backend: "BACKEND", design: "DESIGN", tools: "TOOLS" } },
    footer: "alejandrosancho v0.9",
    sections: [
      {
        id: "about",
        label: "ABOUT",
        lines: [
          "> The limits of my language are the limits of my world.",
          "                                   -- Wittgenstein",
          "",
          "Hi! Welcome to my webpage / portfolio / digital portrait of myself (?)",
          "",
          "Based near the mountains of Barcelona, Spain.",
          "3D artist & non-stop brainy creative designer -- or whatever label fits someone who never stops thinking, learning, creating.",
          "",
          "Environment artist by day, retro web tinkerer by night.",
          "Crafting worlds between pixels and polygons.",
        ],
      },
      {
        id: "background",
        label: "BACKGROUND",
        lines: [
          "ROLE ........ 3D Environment Artist",
          "ALSO ........ Creative Developer (this site is hand-built)",
          "BASE ........ Near Barcelona, Spain",
          "LANGUAGES ... Español · Català · English",
          "",
          "TOOLKIT",
          "  3DS Max · Blender · ZBrush",
          "  Substance Painter · Substance Designer",
          "  Unreal Engine 5 · React · Three.js · TypeScript",
          "",
          "TRAINING",
          "  Mentorship by Visual Architects (2025).",
          "  Learning in public: every project is a study of something new.",
          "",
          "// DRAFT: add employers, schools and dates here.",
        ],
      },
      {
        id: "projects",
        label: "PROJECTS",
        lines: [
          "Selected work: websites, a code lab and 3D art.",
        ],
      },
      {
        id: "interests",
        label: "INTERESTS",
        lines: [
          "* Game dev -- I keep a diary of it",
          "* Design: posters, photos, small experiments",
          "* Music to focus while working",
          "* Retro computing, Y2K interfaces, 1-bit anything",
          "* Writing down tricks and analysis of what I study",
          "* Funny, useful and not so useful things",
          "",
          "// DRAFT: tell me what else belongs on this list.",
        ],
      },
      {
        id: "concerns",
        label: "CONCERNS",
        lines: [
          "What keeps me thinking:",
          "",
          "[1] CRAFT   -- assets must be good AND cheap to render.",
          "[2] LEARNING -- the field moves fast; stopping is falling behind.",
          "[3] SIMPLICITY -- a page should load fast and say its point.",
          "    (Hence this console: no 3D, no textures, 1 bit.)",
          "",
          "// DRAFT: replace with your real concerns and opinions.",
        ],
      },
      {
        id: "contact",
        label: "CONTACT",
        lines: [
          "No spam. No newsletter. Just say hi.",
          "",
          { text: "EMAIL ....... " + EMAIL, href: "mailto:" + EMAIL },
          { text: "LINKEDIN .... /in/environment-artist", href: LINKEDIN },
          { text: "INSTAGRAM ... @soyvertigo", href: INSTAGRAM },
        ],
      },
    ],
  },
  es: {
    tagline: "ARTISTA DE ENTORNOS 3D Y DESARROLLADOR CREATIVO",
    boot: "VERTIGO.1.9.9.8 ////> DISPONIBLE PARA TRABAJAR </////",
    menu: "ÍNDICE",
    to3d: "[ ENTRAR A LA ESCENA 3D -> ]",
    lang: "IDIOMA",
    keys: "TECLAS: 1-6 SECCIÓN · L IDIOMA · G MUNDO 3D",
    holo: { open: "ABRIR ->", hint: "INCLÍNALA · TOCA PARA VOLTEAR", stack: { frontend: "FRONTEND", backend: "BACKEND", design: "DISEÑO", tools: "HERRAMIENTAS" } },
    footer: "alejandrosancho v0.9",
    sections: [
      {
        id: "about",
        label: "SOBRE MÍ",
        lines: [
          "> Los límites de mi lenguaje son los límites de mi mundo.",
          "                                   -- Wittgenstein",
          "",
          "¡Hola! Bienvenido a mi web / portfolio / retrato digital de mí mismo (?)",
          "",
          "Vivo cerca de las montañas de Barcelona, España.",
          "Artista 3D y diseñador creativo que no para de pensar -- o la etiqueta que le toque a quien nunca deja de pensar, aprender y crear.",
          "",
          "Artista de entornos de día, trasteador de webs retro de noche.",
          "Construyendo mundos entre píxeles y polígonos.",
        ],
      },
      {
        id: "background",
        label: "TRAYECTORIA",
        lines: [
          "ROL ......... Artista de Entornos 3D",
          "TAMBIÉN ..... Desarrollador Creativo (esta web está hecha a mano)",
          "BASE ........ Cerca de Barcelona, España",
          "IDIOMAS ..... Español · Català · English",
          "",
          "HERRAMIENTAS",
          "  3DS Max · Blender · ZBrush",
          "  Substance Painter · Substance Designer",
          "  Unreal Engine 5 · React · Three.js · TypeScript",
          "",
          "FORMACIÓN",
          "  Mentoría de Visual Architects (2025).",
          "  Aprendo en público: cada proyecto estudia algo nuevo.",
          "",
          "// BORRADOR: añadir empresas, estudios y fechas.",
        ],
      },
      {
        id: "projects",
        label: "PROYECTOS",
        lines: [
          "Trabajo seleccionado: webs, un laboratorio de código y arte 3D.",
        ],
      },
      {
        id: "interests",
        label: "INTERESES",
        lines: [
          "* Desarrollo de juegos -- llevo un diario",
          "* Diseño: pósters, fotos, pequeños experimentos",
          "* Música para concentrarme mientras trabajo",
          "* Informática retro, interfaces Y2K, todo en 1 bit",
          "* Apuntar trucos y análisis de lo que estudio",
          "* Cosas divertidas, útiles y no tan útiles",
          "",
          "// BORRADOR: dime qué más va en esta lista.",
        ],
      },
      {
        id: "concerns",
        label: "PREOCUPACIONES",
        lines: [
          "Lo que me da vueltas:",
          "",
          "[1] OFICIO   -- los assets deben ser buenos Y baratos de renderizar.",
          "[2] APRENDER -- el sector va rápido; parar es quedarse atrás.",
          "[3] SENCILLEZ -- una página debe cargar rápido y decir lo suyo.",
          "    (De ahí esta consola: sin 3D, sin texturas, 1 bit.)",
          "",
          "// BORRADOR: sustituir por tus preocupaciones y opiniones reales.",
        ],
      },
      {
        id: "contact",
        label: "CONTACTO",
        lines: [
          "Sin spam. Sin newsletter. Solo di hola.",
          "",
          { text: "EMAIL ....... " + EMAIL, href: "mailto:" + EMAIL },
          { text: "LINKEDIN .... /in/environment-artist", href: LINKEDIN },
          { text: "INSTAGRAM ... @soyvertigo", href: INSTAGRAM },
        ],
      },
    ],
  },
  ca: {
    tagline: "ARTISTA D'ENTORNS 3D I DESENVOLUPADOR CREATIU",
    boot: "VERTIGO.1.9.9.8 ////> DISPONIBLE PER TREBALLAR </////",
    menu: "ÍNDEX",
    to3d: "[ ENTRAR A L'ESCENA 3D -> ]",
    lang: "IDIOMA",
    keys: "TECLES: 1-6 SECCIÓ · L IDIOMA · G MÓN 3D",
    holo: { open: "OBRIR ->", hint: "INCLINA-LA · TOCA PER GIRAR", stack: { frontend: "FRONTEND", backend: "BACKEND", design: "DISSENY", tools: "EINES" } },
    footer: "alejandrosancho v0.9",
    sections: [
      {
        id: "about",
        label: "SOBRE MI",
        lines: [
          "> Els límits del meu llenguatge són els límits del meu món.",
          "                                   -- Wittgenstein",
          "",
          "Hola! Benvingut a la meva web / portfolio / retrat digital meu (?)",
          "",
          "Visc prop de les muntanyes de Barcelona, Espanya.",
          "Artista 3D i dissenyador creatiu que no para de pensar -- o l'etiqueta que toqui a qui mai deixa de pensar, aprendre i crear.",
          "",
          "Artista d'entorns de dia, trasteador de webs retro de nit.",
          "Construint mons entre píxels i polígons.",
        ],
      },
      {
        id: "background",
        label: "TRAJECTÒRIA",
        lines: [
          "ROL ......... Artista d'Entorns 3D",
          "TAMBÉ ....... Desenvolupador Creatiu (aquesta web està feta a mà)",
          "BASE ........ Prop de Barcelona, Espanya",
          "IDIOMES ..... Español · Català · English",
          "",
          "EINES",
          "  3DS Max · Blender · ZBrush",
          "  Substance Painter · Substance Designer",
          "  Unreal Engine 5 · React · Three.js · TypeScript",
          "",
          "FORMACIÓ",
          "  Mentoria de Visual Architects (2025).",
          "  Aprenc en públic: cada projecte estudia alguna cosa nova.",
          "",
          "// ESBORRANY: afegir empreses, estudis i dates.",
        ],
      },
      {
        id: "projects",
        label: "PROJECTES",
        lines: [
          "Treball seleccionat: webs, un laboratori de codi i art 3D.",
        ],
      },
      {
        id: "interests",
        label: "INTERESSOS",
        lines: [
          "* Desenvolupament de jocs -- porto un diari",
          "* Disseny: pòsters, fotos, petits experiments",
          "* Música per concentrar-me mentre treballo",
          "* Informàtica retro, interfícies Y2K, tot en 1 bit",
          "* Apuntar trucs i anàlisi del que estudio",
          "* Coses divertides, útils i no tan útils",
          "",
          "// ESBORRANY: digues què més va en aquesta llista.",
        ],
      },
      {
        id: "concerns",
        label: "PREOCUPACIONS",
        lines: [
          "El que em dona voltes:",
          "",
          "[1] OFICI    -- els assets han de ser bons I barats de renderitzar.",
          "[2] APRENDRE -- el sector va ràpid; parar és quedar-se enrere.",
          "[3] SIMPLICITAT -- una pàgina ha de carregar ràpid i dir la seva.",
          "    (D'aquí aquesta consola: sense 3D, sense textures, 1 bit.)",
          "",
          "// ESBORRANY: substituir per les teves preocupacions i opinions reals.",
        ],
      },
      {
        id: "contact",
        label: "CONTACTE",
        lines: [
          "Sense spam. Sense butlletí. Només digues hola.",
          "",
          { text: "EMAIL ....... " + EMAIL, href: "mailto:" + EMAIL },
          { text: "LINKEDIN .... /in/environment-artist", href: LINKEDIN },
          { text: "INSTAGRAM ... @soyvertigo", href: INSTAGRAM },
        ],
      },
    ],
  },
};
