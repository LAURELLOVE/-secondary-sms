// Name, colours and icon for each way the app is built (see src/appMode.js).
//   admin   -> "School Admin"   installable website / Android app, indigo
//   teacher -> "School Teacher" installable website / Android app, emerald
//   web     -> the combined site with the "Who's signing in?" chooser
export const IDENTITIES = {
  web: {
    title: 'School Management System',
    short: 'School SMS',
    description: 'Marks, attendance, fees and report cards for the school.',
    theme: '#312e81',
    background: '#f4f5fb',
    icon: 'admin',
  },
  admin: {
    title: 'School Admin',
    short: 'School Admin',
    description: 'Administrator app: students, grades, fees, attendance and teachers.',
    theme: '#312e81',
    background: '#f4f5fb',
    icon: 'admin',
  },
  teacher: {
    title: 'School Teacher',
    short: 'School Teacher',
    description: 'Teacher app: enter marks and take attendance for your classes.',
    theme: '#064e3b',
    background: '#f2f9f6',
    icon: 'teacher',
  },
};

export function manifestFor(identity) {
  return {
    name: identity.title,
    short_name: identity.short,
    description: identity.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: identity.background,
    theme_color: identity.theme,
    icons: [
      { src: `/icons/${identity.icon}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: `/icons/${identity.icon}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: `/icons/${identity.icon}.svg`, sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
