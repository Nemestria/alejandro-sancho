import type { Lang } from "./i18n";

// The five projects shown as holographic cards in the console's PROJECTS
// section (HoloCard.tsx). Thumbnails are site screenshots in public/projects/;
// at runtime they are dithered to 1 bit in the active theme's ink colour.
//
// Descriptions are written from what each site says about itself — DRAFT until
// Alejandro words them himself.
export interface Project {
  id: string;
  title: string;
  url: string;
  img: string;
  tags: string[];
  kind: Record<Lang, string>;
  desc: Record<Lang, string>;
}

export const PROJECTS: Project[] = [
  {
    id: "targetgrass",
    title: "TARGET GRASS",
    url: "https://www.targetgrass.com/",
    img: "/projects/targetgrass.jpg",
    tags: ["WEB", "B2B", "CATALOG"],
    kind: { en: "WEB / B2B", es: "WEB / B2B", ca: "WEB / B2B" },
    desc: {
      en: "B2B site for an artificial-turf supplier that sells only to installers: product catalogue, sample requests and permanent stock.",
      es: "Web B2B de un proveedor de césped artificial que vende solo a instaladores: catálogo, petición de muestras y stock permanente.",
      ca: "Web B2B d'un proveïdor de gespa artificial que ven només a instal·ladors: catàleg, petició de mostres i estoc permanent.",
    },
  },
  {
    id: "edgeering",
    title: "EDGEERING",
    url: "https://edgeering3-d.vercel.app/",
    img: "/projects/edgeering.jpg",
    tags: ["WEB", "3D", "5 LANGS"],
    kind: { en: "WEB / 3D", es: "WEB / 3D", ca: "WEB / 3D" },
    desc: {
      en: "Corten steel and PVC garden edging profiles. Product site with a 3D viewer and five languages.",
      es: "Perfiles de separación de jardín en acero corten y PVC. Web de producto con visor 3D y cinco idiomas.",
      ca: "Perfils de separació de jardí en acer corten i PVC. Web de producte amb visor 3D i cinc idiomes.",
    },
  },
  {
    id: "bandamas",
    title: "BANDAMAS",
    url: "https://www.bandamas.es/",
    img: "/projects/bandamas.jpg",
    tags: ["WEB", "CATALOG", "BLOG"],
    kind: { en: "WEB / SHOP", es: "WEB / TIENDA", ca: "WEB / BOTIGA" },
    desc: {
      en: "Tools and accessories for professional installers: catalogue, nationwide shipping, tutorials and a blog.",
      es: "Herramientas y accesorios para instaladores profesionales: catálogo, envíos a toda España, tutoriales y blog.",
      ca: "Eines i accessoris per a instal·ladors professionals: catàleg, enviaments a tot Espanya, tutorials i blog.",
    },
  },
  {
    id: "3d-lab",
    title: "3D LAB",
    url: "https://3d-lab.vercel.app/",
    img: "/projects/3d-lab.jpg",
    tags: ["THREE.JS", "R3F", "GLSL"],
    kind: { en: "LAB / CODE", es: "LAB / CÓDIGO", ca: "LAB / CODI" },
    desc: {
      en: "My lab: twelve three.js projects, from a first spinning cube to custom GLSL. Built in the open.",
      es: "Mi laboratorio: doce proyectos de three.js, del primer cubo giratorio al GLSL propio. Hecho en abierto.",
      ca: "El meu laboratori: dotze projectes de three.js, del primer cub giratori al GLSL propi. Fet en obert.",
    },
  },
  {
    id: "artstation",
    title: "ARTSTATION",
    url: "https://www.artstation.com/vrtigo",
    img: "/projects/artstation.png",
    tags: ["3D ART", "UE5", "PROPS & ENV"],
    kind: { en: "3D ART", es: "ARTE 3D", ca: "ART 3D" },
    desc: {
      en: "My 3D environment art: game-ready props and environments, built for Unreal Engine 5.",
      es: "Mi arte 3D de entornos: props y escenarios listos para juego, hechos para Unreal Engine 5.",
      ca: "El meu art 3D d'entorns: props i escenaris llestos per a joc, fets per a Unreal Engine 5.",
    },
  },
];
