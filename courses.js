// Golden Eagle Golf Club — Blue Tees
// Sourced from the club scorecards. Par is tee-independent; yardage shown is Blue.

export const COURSES = {
  north: {
    key: "north",
    name: "Golden Eagle North",
    tee: "Blue Tees",
    par: [4, 4, 5, 3, 4, 3, 5, 4, 4, 4, 5, 4, 4, 3, 4, 4, 3, 5],
    yards: [422, 353, 505, 136, 339, 165, 460, 328, 392, 370, 460, 420, 323, 132, 325, 329, 178, 504],
  },
  south: {
    key: "south",
    name: "Golden Eagle South",
    tee: "Blue Tees",
    par: [4, 4, 4, 5, 3, 4, 5, 3, 4, 4, 3, 4, 4, 4, 3, 3, 5, 4],
    yards: [346, 293, 364, 446, 146, 336, 466, 169, 382, 275, 169, 302, 372, 363, 140, 176, 459, 398],
  },
};

export function coursePar(courseKey) {
  const c = COURSES[courseKey];
  if (!c) return 72;
  return c.par.reduce((a, b) => a + b, 0);
}
