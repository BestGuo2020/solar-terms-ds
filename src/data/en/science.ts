/**
 * The 24 Solar Terms · Science FAQ (English edition)
 *
 * The answers are written for general readers and aim to be plain in wording but
 * accurate in their claims. Where astronomical values are involved (the obliquity
 * of the ecliptic, the length of the tropical year, the dates of perihelion and
 * aphelion, the intervals between terms under the dingqi method), commonly
 * accepted values are used and the wording keeps the hedge "about".
 *
 * `id` values are copied verbatim from the Chinese source file.
 */

export interface ScienceFaqEn {
  id: string
  question: string
  answer: string // about 130–220 words, plain but accurate
  keyPoints?: string[] // same number of items as the Chinese source, each 8–18 words
}

export const SCIENCE_FAQ_EN: ScienceFaqEn[] = [
  {
    id: 'why-seasons',
    question: 'Why do we have four seasons?',
    answer:
      'The main reason is not how near or far the Earth is from the sun, but the fact that the Earth’s axis is tilted. The axis of rotation makes an angle of about 23.4° with the perpendicular to the plane of the Earth’s orbit — an angle known as the obliquity of the ecliptic — and that angle stays almost unchanged throughout the year. So as the Earth orbits the sun, the point where the sun is directly overhead travels back and forth between the Tropic of Cancer and the Tropic of Capricorn: when that point lies over the Northern Hemisphere, the sun there stands high in the sky, the days are long and each unit of area receives more solar radiation, which means summer; the Southern Hemisphere is then in exactly the opposite case. Many people assume the seasons come from the Earth’s distance from the sun, but that is not right — the Earth passes perihelion in early January, when the Northern Hemisphere is precisely in the middle of winter, and aphelion in early July, when the Northern Hemisphere is in summer instead. What really decides the seasons is the angle of the sunlight and the length of the day, not the distance between the Earth and the sun.',
    keyPoints: [
      'The tilt of the Earth’s axis, about 23.4° (the obliquity of the ecliptic), is the main cause',
      'The point of direct sunlight travels back and forth between the two tropics',
      'A common misconception: the Earth passes perihelion in early January, yet the Northern Hemisphere is in winter',
      'The deciding factors are the sun’s elevation and day length, not the Earth–sun distance',
    ],
  },
  {
    id: 'uneven-intervals',
    question: 'Why is there not a solar term every 15 days?',
    answer:
      'Because the solar terms are divided according to the sun’s position on the ecliptic, and the Earth does not move around the sun at a uniform speed. Since the Qing dynasty Shixian Calendar of 1645, the terms have been drawn up by the "fixed-qi" method (dingqi, 定气): every 15° of ecliptic longitude the sun covers marks one solar term. The Earth’s orbit is an ellipse, and by Kepler’s second law the line joining the Earth to the sun sweeps out equal areas in equal times, so the Earth moves fast when it is near the sun and slowly when it is far away. In early January the Earth passes perihelion and its orbital angular speed is at its greatest, so the intervals between Minor Cold, Major Cold, the Beginning of Spring and Rain Water are on the short side, about 14.7 days; in early July it passes aphelion and moves slowest, so the intervals from the Summer Solstice to Major Heat and from Major Heat to the Beginning of Autumn are on the long side, about 15.7 days. That is why, turning the pages of a calendar, neighbouring terms are sometimes 14 days apart, sometimes 15 or even 16: it is a natural result of the motion of the heavenly bodies, not a mistake in the calendar.',
    keyPoints: [
      'Since the Shixian Calendar of 1645, one term has been set per 15° of solar longitude',
      'At perihelion (early January) the Earth moves fast, so intervals are short, about 14.7 days',
      'At aphelion (early July) it moves slowly, so intervals are long, about 15.7 days',
      'The underlying cause is Kepler’s second law, that is, a constant areal velocity',
    ],
  },
  {
    id: 'stable-gregorian-dates',
    question: 'Why are the Gregorian dates of the solar terms fairly stable?',
    answer:
      'Because a solar term is in essence a position in the sun’s ecliptic longitude, so it has the character of a solar calendar, and the Gregorian calendar is a solar calendar too. The time the sun takes to return to the same position in ecliptic longitude is one tropical year, about 365.2422 days; the Gregorian calendar uses the rule "a leap year every four years, but not every hundred, except every four hundred" to bring its average year to 365.2425 days, a difference of only about 0.0003 days. Because the two periods are almost the same, the date of any given solar term in the Gregorian calendar normally moves by only one or two days: Qingming usually falls on 4 or 5 April, and the Winter Solstice on 21 or 22 December. By contrast, the dates of the solar terms in the Chinese lunisolar calendar vary a great deal, because that calendar is lunisolar: it has to accommodate both the phases of the moon and the tropical year, so a leap month has to be added every few years, and the dates of the terms shift back and forth with it.',
    keyPoints: [
      'The tropical year is about 365.2422 days, the Gregorian average year about 365.2425 days',
      'Because the periods are close, the terms usually move by only 1–2 days in the Gregorian calendar',
      'Qingming usually falls on 4–5 April, the Winter Solstice on 21–22 December',
      'The Chinese calendar is lunisolar and has leap months, so the terms move widely in it',
    ],
  },
  {
    id: 'opposite-hemispheres',
    question: 'Why are the seasons opposite in the two hemispheres?',
    answer:
      'The key is that the direction in which the Earth’s axis tilts stays essentially the same throughout the year. The axis always points in roughly the same direction, so when the Earth has moved to one side of its orbit and the Northern Hemisphere is leaning towards the sun, the Southern Hemisphere is leaning away from it; half a year later the situation is exactly reversed. So when the Northern Hemisphere has its Summer Solstice, the Southern Hemisphere is having its Winter Solstice; when we mark the Winter Solstice, Australia, Argentina and South Africa are in the middle of summer. The twenty-four solar terms describe how the point of direct sunlight moves relative to the Northern Hemisphere, together with the climate and phenology that go with it, so they apply mainly to the Northern Hemisphere, especially to the middle latitudes, and they fit the phenological rhythm of the middle and lower reaches of the Yellow River and of the Yangtze valley most closely. Transplant them directly to the Southern Hemisphere, or apply them to China’s high, cold and arid regions, and the seasons and phenology no longer match.',
    keyPoints: [
      'The direction of the axial tilt stays the same all year, so the hemispheres lean sunward in turn',
      'At the Northern Hemisphere’s Summer Solstice, the Southern Hemisphere is at its Winter Solstice',
      'The seasons of Australia, Argentina and South Africa are opposite to those of China',
      'The terms mainly suit the Northern Hemisphere middle latitudes, especially the Yellow River and Yangtze valleys',
    ],
  },
  {
    id: 'seventy-two-phenologies',
    question: 'What are the "seventy-two phenologies"?',
    answer:
      'The seventy-two phenologies are a finer phenological scale beneath the solar terms. The ancients divided each solar term into three phenologies (hou, 候) of about five days each; twenty-four terms of three phenologies make exactly seventy-two in a year, and each phenology is matched with a phrase describing the signs of the season at that time. The three phenologies of the Beginning of Spring, for example, are "the east wind thaws the ice, hibernating insects begin to stir, fish rise and carry the ice on their backs", and those of Qingming are "the paulownia begins to flower, field mice turn into quail, the rainbow first appears". "A Collective Explanation of the Seventy-two Phenologies of the Monthly Ordinances", written by Wu Cheng in the Yuan dynasty, gathers these names together and explains them one by one, and it is the most widely circulated ancient work on the subject. The names come mainly from observations made in the Yellow River basin and describe changes in plants, animals and weather rather than strict astronomical positions, so they are closer to an ancient phenological record and need to be localised before use elsewhere.',
    keyPoints: [
      'Each solar term is divided into three phenologies of about five days, making seventy-two in a year',
      'Most names describe phenology, such as "the east wind thaws the ice" or "the paulownia begins to flower"',
      'Wu Cheng of the Yuan explained each name in his "Collective Explanation of the Seventy-two Phenologies"',
      'The names come from Yellow River basin observations and need localising when used elsewhere',
    ],
  },
  {
    id: 'terms-vs-weather',
    question: 'Can the solar terms be used as a weather forecast?',
    answer:
      'No. The solar terms describe astronomical positions, not air temperature. A solar term is simply a definite moment — the instant at which the sun reaches a particular position in ecliptic longitude — and what it reflects is the way the solar radiation reaching the ground varies with the season, not the actual weather in any particular place. Real warmth and cold are also affected by the distribution of land and sea, by terrain and altitude, by atmospheric circulation and by the movement of cold air masses, and the ground warms and cools with a lag behind solar radiation, so the hottest time of the year usually comes not at the Summer Solstice but around Major Heat, and the coldest not at the Winter Solstice but around Minor Cold and Major Cold. China is a vast country: at the same Beginning of Spring, Guangzhou may already be warming up again while Harbin is still a world of ice and snow. So the solar terms are a framework for grasping the broad trend of the seasons; for the weather itself you still have to look at the weather forecast.',
    keyPoints: [
      'The solar terms are astronomical moments, not weather predictions',
      'Ground temperature lags behind solar radiation, so the hottest weather comes around Major Heat',
      'The distribution of land and sea, terrain and atmospheric circulation all affect actual warmth and cold',
      'The same solar term brings very different climates in different regions',
    ],
  },
]
