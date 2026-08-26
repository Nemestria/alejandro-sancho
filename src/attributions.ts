// Third-party asset credits, shown in-app by Credits.tsx.
//
// Deliberately plain data rather than translated strings: an attribution is a
// licence term, and the wording the licensor asks for is the wording that has
// to appear. Translating "by wooolvie is licensed under Creative Commons
// Attribution" would be rewriting the notice, not localising the UI. Only the
// surrounding chrome (the button, the heading) goes through i18n.ts.
//
// Keep in step with ATTRIBUTIONS.md at the repo root.

export interface Attribution {
  /** Work title, exactly as the author titles it. */
  title: string;
  author: string;
  /** Where the work was obtained. */
  url: string;
  licence: string;
  licenceUrl: string;
  /** What it is used for here, and any modification the licence requires stating. */
  usage: string;
}

export const ATTRIBUTIONS: Attribution[] = [
  {
    title: "PSX Style Office Walls Pack",
    author: "wooolvie",
    url: "https://skfb.ly/pspOz",
    licence: "CC BY 4.0",
    licenceUrl: "http://creativecommons.org/licenses/by/4.0/",
    usage: "Room walls and ceiling. Re-scaled and re-lit; tile set reused as ceiling.",
  },
];
