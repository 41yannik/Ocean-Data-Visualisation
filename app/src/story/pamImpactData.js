// Cyclone Pam (2015): reported impact locations and attribution used only by the
// Pam evidence beat. Country totals/shares still come from events.json.
//
// Each record deliberately exposes only one representative island marker. The
// detailed island lists from the source records are not drawn: they made Tuvalu
// and Kiribati look like several independent observations. Mechanism/attribution
// follows the IFRC regional appeal and WMO post-season report.

export const PAM_IMPACTS = [
  {
    iso3: 'VUT',
    popupNote: 'Near Pam’s core; destructive wind.',
    label: { coordinates: [168.30, -18.45], dx: -10, dy: 0, anchor: 'end' },
  },
  {
    iso3: 'SLB',
    popupNote: 'Near Pam’s core; wind, rain and surge.',
    label: { coordinates: [169.34, -11.95], dx: -12, dy: -5, anchor: 'end' },
  },
  {
    iso3: 'TUV',
    popupNote: 'Remote effects: swell and storm surge.',
    label: { coordinates: [177.42, -7.05], dx: -16, dy: -2, anchor: 'end' },
  },
  {
    iso3: 'KIR',
    popupNote: 'Remote effects: swell and coastal flooding.',
    label: { coordinates: [175.64, -1.72], dx: -16, dy: -3, anchor: 'end' },
  },
  {
    iso3: 'PNG',
    popupNote: 'Mixed attribution: Pam and Cyclone Nathan.',
    label: { coordinates: [148.00, -5.38], dx: 14, dy: -5, anchor: 'start' },
  },
];
