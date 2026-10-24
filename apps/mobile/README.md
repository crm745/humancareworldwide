# HumanCare WorldWide — Mobile App

React Native (Expo SDK 57) + Tailwind CSS via NativeWind 4. A screen-for-screen port of
`interactive-prototype/app.html`, still on mock data — no backend calls yet.

## Run it

```sh
cd mobile
npm install
npx expo start        # then press a (Android), i (iOS) or w (web), or scan the QR code with Expo Go
```

`npx expo lint` and `npx expo-doctor` should both pass before you commit.

## Layout

| Path | What's there |
|---|---|
| `src/app/` | One file per screen (Expo Router). `_layout.js` loads fonts and the app state. |
| `src/components/ui.js` | Basic building blocks: Text, Button, Card, Pill, Chip, Field, InfoRow… |
| `src/components/layout.js` | Screen, Body (scroll area), TopBar, BackButton, BottomNav |
| `src/components/widgets.js` | Sheet, Select, OtpInput, PasswordField, StepWizard, ServiceTile, DocRow, Toast |
| `src/state/AppContext.js` | Language, patient/vendor session, profile, request-form draft, toast |
| `src/data/` | `i18n.json` (EN, HI, MR, GU, TE, AR), `services.json`, `mock.js`, image map |
| `tailwind.config.js` | Colour and font tokens taken from the prototype |

`i18n.json`, `services.json` and the service photos in `assets/images/` were extracted
from the prototype, so the wording and images match it exactly.

## Styling notes

- Use the theme's colour names (`text-navy`, `bg-primary-soft`, `border-line`…) rather than hex values.
- Fonts: `font-inter`, `font-inter-medium`, `-semibold`, `-bold`, `-black` (800). Use these
  instead of `font-bold`, so the matching Inter file is used on Android.
- Components merge caller classes with `cx()`. A caller's `p-0` replaces the default `p-3.5`,
  because NativeWind doesn't let the last class win when two conflict.
- Size `Image`, `LinearGradient` and `ImageBackground` with `style`, not `className`.

## Next steps

- Replace `src/data/mock.js` with calls to the backend API (see `docs/ROADMAP.md` §3).
- Store the JWT securely, e.g. with `expo-secure-store`.
- Real file upload (`expo-document-picker`) and date pickers, in place of the mock toggle and
  `YYYY-MM-DD` text fields.
