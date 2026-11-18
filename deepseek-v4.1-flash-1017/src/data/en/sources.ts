/**
 * English display copy for the source list. Keys match SOURCES ids.
 * The Chinese source array remains the source of truth for ids/URLs/groups.
 */
export interface SourceCopyEn {
  title: string
  publisher?: string
  note?: string
}

export const SOURCE_COPY_EN: Record<string, SourceCopyEn> = {
  'unesco-element': {
    title:
      "The Twenty-Four Solar Terms, knowledge in China of time and practices developed through observation of the sun's annual motion",
    publisher: 'UNESCO · Representative List of the Intangible Cultural Heritage of Humanity',
    note: 'Official entry for the element (00647); supports the 2016 inscription record in “Origins”.',
  },
  'unesco-decision': {
    title: 'Decision 11.COM 10.B.6',
    publisher: 'Intergovernmental Committee for the Safeguarding of the Intangible Cultural Heritage, UNESCO',
    note: 'The 2016 inscription decision of the eleventh session, confirming the nomination title and result.',
  },
  ihchina: {
    title: 'The “Twenty-Four Solar Terms” is formally inscribed on UNESCO’s Representative List',
    publisher: 'China Intangible Cultural Heritage Network · China Intangible Cultural Heritage Digital Museum',
    note: 'Covers the 2006 national list, the 2011 and 2014 extensions, the successful inscription of 30 November 2016, and the protection working group.',
  },
  'ich-solar-terms': {
    title: 'The Twenty-Four Solar Terms feature',
    publisher: 'China Intangible Cultural Heritage Network · China Intangible Cultural Heritage Digital Museum',
    note: 'Official introductions to the terms, the song, and local practices such as the Jiuhua Beginning of Spring rite, Banshan Beginning of Summer custom, Sanmen winter rite and Zhuang Frost’s Descent festival.',
  },
  'weather-calculation': {
    title: 'How the twenty-four solar terms are divided and calculated',
    publisher: 'China Weather Web · Public Meteorological Service Centre, China Meteorological Administration',
    note: 'Explains the difference between the mean-qi and fixed-qi methods, and why solar-term dates are relatively stable in the Gregorian calendar.',
  },
  'nao-rekiyou': {
    title: 'Reki Yōkō · Dates of the 24 solar terms',
    publisher: 'National Astronomical Observatory of Japan (NAO), Calendar Computation Office',
    note: 'Used to cross-check all 24 solar-term instants for 2024 and 2025. Converted from UTC+9 to UTC+8, every result falls within the officially published minute, with a maximum offset of 43.2 seconds from the start of that minute. The official values are published only to the minute.',
  },
  pmo: {
    title: 'Purple Mountain Observatory, Chinese Academy of Sciences',
    publisher: 'Purple Mountain Observatory (PMO), Chinese Academy of Sciences',
    note: 'The institution that computes and publishes the Chinese Astronomical Almanac and solar-term instants; the Beijing-time convention used here follows its published standard.',
  },
  'astronomy-engine': {
    title: 'Astronomy Engine (MIT License)',
    publisher: 'Don Cross / cosinekitty',
    note: 'Used for SearchSunLongitude(), which solves the instants when apparent geocentric solar longitude reaches each 15° multiple. The library supplies apparent solar coordinates including nutation, aberration and ΔT; its ΔT model is the Espenak–Meeus polynomial.',
  },
  meeus: {
    title: 'Astronomical Algorithms (2nd edition)',
    publisher: 'Jean Meeus · Willmann-Bell, 1998',
    note: 'The classic reference for apparent solar longitude, obliquity, hour angle and sidereal time, and the basis for the coordinate conventions used by Astronomy Engine.',
  },
  'nasa-deltat': {
    title: 'ΔT piecewise polynomials (Espenak & Meeus)',
    publisher: 'NASA GSFC · Five Millennium Canon of Solar Eclipses',
    note: 'Historical estimates and future extrapolations of ΔT = TT − UT. Future ΔT cannot be known exactly, so instants farther into the future become less certain.',
  },
  classics: {
    title:
      'Rites of Zhou, Book of Documents (“Canon of Yao”), Zuo Zhuan, Lüshi Chunqiu, Taichu Calendar, Shoushi Calendar, Shixian Calendar',
    publisher: 'Classical texts and state calendars, pre-Qin to Qing dynasty',
    note: 'Primary textual basis for the timeline’s accounts of shadow measurement, the eight seasonal nodes, the entry of the terms into official calendars, and the later reform of timekeeping. Ancient works have no single authoritative online edition, so no link is supplied.',
  },
  huainanzi: {
    title: 'Huainanzi, “Tianwenxun”',
    publisher: 'Liu An and others, Western Han',
    note: 'Usually regarded as the earliest extant text to record the complete names of the twenty-four solar terms. Ancient works have no authoritative online edition, so no link is supplied.',
  },
  yueling: {
    title: 'A Collective Explanation of the Seventy-two Phenologies of the Monthly Ordinances',
    publisher: 'Wu Cheng, Yuan dynasty',
    note: 'A traditional source for the three-pentad entries on this page; it explains the seventy-two phenological names term by term.',
  },
  threejs: {
    title: 'Three.js documentation · OrbitControls',
    publisher: 'three.js',
    note: 'Reference for the three-dimensional scene and for mouse and touch camera controls.',
  },
  'solar-system-scope': {
    title: 'Solar Textures',
    publisher: 'Solar System Scope (INOVE)',
    note: 'Earth day, night and cloud textures, solar surface and Milky Way background, licensed CC BY 4.0. Attribution is preserved on the page and in public/textures/CREDITS.md.',
  },
  'three-planet-textures': {
    title: 'three.js planet textures',
    publisher: 'three.js (MIT); base imagery from NASA public data',
    note: 'Earth normal and ocean specular maps.',
  },
}
