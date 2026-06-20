// Erzähl-Stationen (datengetrieben). center = [lon,lat] des Zielgebiets, zoom = Globus-Scale-Faktor.
// storm = IBTrACS-SID (Hero-Track), island = ISO3 (Impact-Halo), year = Bezugsjahr für Betroffene.
export const STEPS = [
  {
    id: "intro",
    center: [186, -12], zoom: 1.0, idle: true,
    headline: "The Pacific of Storms",
    body: "Every faint line is a tropical cyclone since 1980. Warm seas feed them — and small island nations stand directly in their path.",
  },
  {
    id: "winston",
    center: [178, -17.8], zoom: 2.7, storm: "2016041S14170", island: "FJI", year: 2016,
    headline: "Cyclone Winston · 2016",
    body: "The most intense tropical cyclone ever recorded in the Southern Hemisphere — a Category 5 striking Fiji head-on.",
  },
  {
    id: "harold",
    center: [168.3, -17.7], zoom: 2.7, storm: "2020092S09155", island: "VUT", year: 2020,
    headline: "Cyclone Harold · 2020",
    body: "A Category 5 tearing across Vanuatu in the middle of a pandemic lockdown, then on to Fiji and Tonga.",
  },
  {
    id: "gita",
    center: [-175.2, -21.1], zoom: 2.9, storm: "2018038S15172", island: "TON", year: 2018,
    headline: "Cyclone Gita · 2018",
    body: "Tonga's most damaging storm in decades — a Category 4 that crossed Tongatapu, home to most of the nation.",
  },
  {
    id: "outro",
    center: [190, -14], zoom: 1.0, idle: true,
    headline: "Who Carries It",
    body: "Tiny populations, a vast warming ocean. The heaviest footprints of these storms fall on those least responsible for the warming that fuels them.",
  },
];
