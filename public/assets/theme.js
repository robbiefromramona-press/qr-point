// QR Point — shared theming. The core app is brand-neutral; this file maps
// a "brand" key to a set of CSS custom properties and swaps in a logo mark.
// Pick the brand via:
//   1. ?brand=bp  or  ?brand=tst  in the URL (easiest for testing / linking), or
//   2. hostname sniffing (qrpoint.bim-press.com vs qrpoint.totalstationtech.com)
// Falls back to the BIM-Press theme as the default.

const THEMES = {
  bp: {
    name: 'BIM-Press',
    '--color-bg': '#0d0d0d',
    '--color-surface': '#171717',
    '--color-surface-2': '#212121',
    '--color-border': '#333333',
    '--color-text': '#f5f5f5',
    '--color-text-muted': '#a3a3a3',
    '--color-accent': '#ff6a00',
    '--color-accent-contrast': '#0d0d0d',
    '--logo-text': 'BP',
    '--logo-shape': '4px', // border-radius: square-ish monogram badge
  },
  tst: {
    name: 'TotalStationTech',
    '--color-bg': '#141a12',
    '--color-surface': '#1c241a',
    '--color-surface-2': '#242f22',
    '--color-border': '#3a4a36',
    '--color-text': '#fbfbf5',
    '--color-text-muted': '#b7c2b0',
    '--color-accent': '#f4c400',
    '--color-accent-contrast': '#141a12',
    '--logo-text': 'TST',
    '--logo-shape': '50%', // hexagon-ish badge, rounded stand-in
  },
  neutral: {
    name: 'QR Point',
    '--color-bg': '#0f172a',
    '--color-surface': '#1e293b',
    '--color-surface-2': '#273449',
    '--color-border': '#334155',
    '--color-text': '#f1f5f9',
    '--color-text-muted': '#94a3b8',
    '--color-accent': '#38bdf8',
    '--color-accent-contrast': '#0f172a',
    '--logo-text': 'QR',
    '--logo-shape': '10px',
  },
};

function resolveBrandKey() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('brand');
  if (fromQuery && THEMES[fromQuery]) return fromQuery;

  const host = window.location.hostname;
  if (host.includes('bim-press')) return 'bp';
  if (host.includes('totalstationtech')) return 'tst';

  return 'bp'; // default per current build
}

function applyTheme() {
  const key = resolveBrandKey();
  const theme = THEMES[key] || THEMES.bp;
  const root = document.documentElement;
  Object.entries(theme).forEach(([prop, value]) => {
    if (prop.startsWith('--')) root.style.setProperty(prop, value);
  });

  document.querySelectorAll('[data-logo-text]').forEach((el) => {
    el.textContent = theme['--logo-text'];
  });
  document.querySelectorAll('[data-brand-name]').forEach((el) => {
    el.textContent = theme.name;
  });
  document.title = `${theme.name} · QR Point`;

  return theme;
}

window.QRPointTheme = { applyTheme, resolveBrandKey, THEMES };
