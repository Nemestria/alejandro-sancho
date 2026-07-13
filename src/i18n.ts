export type Lang = "en" | "es" | "ca";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "ENGLISH" },
  { code: "es", label: "ESPAÑOL" },
  { code: "ca", label: "CATALÀ" },
];

export const translations: Record<
  Lang,
  {
    chooseLanguage: string;
    loading: string;
    back: string;
    enterPassword: string;
    hint: string;
    confirm: string;
    accessDenied: string;
    welcome: string;
    effectsOn: string;
    effectsOff: string;
    resetCamera: string;
    controls: { hint: string; title: string; clickComputer: string; password: string; back: string; crt: string; dismiss: string; };
    arcade: { insertCoin: string; labComingSoon: string; labBackHint: string; menuHint: string; };
  }
> = {
  en: {
    chooseLanguage: "CHOOSE LANGUAGE",
    loading: "LOADING",
    back: "← BACK",
    enterPassword: "ENTER PASSWORD:",
    hint: "HINT: 1234",
    confirm: "CONFIRM",
    accessDenied: "ACCESS DENIED",
    welcome: "Welcome to my portfolio! Just play around :)",
    effectsOn: "CRT FX: ON",
    effectsOff: "CRT FX: OFF",
    resetCamera: "⟳ RESET VIEW",
    controls: { hint: "CONTROLS", title: "CONTROLS", clickComputer: "click the computer to approach", password: "check the note on the desk", back: "return to the scene", crt: "toggle vintage lens effect", dismiss: "[ESC or click to close]" },
    arcade: { insertCoin: "INSERT COIN", labComingSoon: "UNDER CONSTRUCTION", labBackHint: "[ESC] back to the arcade", menuHint: "↑/↓ select · ENTER confirm" },
  },
  es: {
    chooseLanguage: "ELIGE IDIOMA",
    loading: "CARGANDO",
    back: "← ATRÁS",
    enterPassword: "INTRODUCE LA CONTRASEÑA:",
    hint: "PISTA: 1234",
    confirm: "CONFIRMAR",
    accessDenied: "ACCESO DENEGADO",
    welcome: "¡Bienvenido a mi portfolio! Trastea un poco :)",
    effectsOn: "EFECTOS CRT: SÍ",
    effectsOff: "EFECTOS CRT: NO",
    resetCamera: "⟳ RESTABLECER VISTA",
    controls: { hint: "CONTROLES", title: "CONTROLES", clickComputer: "haz clic en el ordenador para acercarte", password: "revisa la nota encima del escritorio", back: "volver a la escena", crt: "activar/desactivar efecto de lente retro", dismiss: "[ESC o clic para cerrar]" },
    arcade: { insertCoin: "INSERTA UNA MONEDA", labComingSoon: "EN CONSTRUCCIÓN", labBackHint: "[ESC] volver al arcade", menuHint: "↑/↓ elegir · ENTER confirmar" },
  },
  ca: {
    chooseLanguage: "TRIA IDIOMA",
    loading: "CARREGANT",
    back: "← ENRERE",
    enterPassword: "INTRODUEIX LA CONTRASENYA:",
    hint: "PISTA: 1234",
    confirm: "CONFIRMAR",
    accessDenied: "ACCÉS DENEGAT",
    welcome: "Benvingut al meu portfolio! Remena una mica :)",
    effectsOn: "EFECTES CRT: SÍ",
    effectsOff: "EFECTES CRT: NO",
    resetCamera: "⟳ RESTABLIR VISTA",
    controls: { hint: "CONTROLS", title: "CONTROLS", clickComputer: "clica a l'ordinador per apropar-te", password: "revisa la nota sobre l'escriptori", back: "tornar a l'escena", crt: "activar/desactivar efecte de lent retro", dismiss: "[ESC o clic per tancar]" },
    arcade: { insertCoin: "INSEREIX UNA MONEDA", labComingSoon: "EN CONSTRUCCIÓ", labBackHint: "[ESC] tornar a l'arcade", menuHint: "↑/↓ triar · ENTER confirmar" },
  },
};
