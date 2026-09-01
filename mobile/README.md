# Fat2Flat Fitness — iOS app

An Expo (React Native) workout tracker. Everything is stored on the device —
no accounts, no server, nothing uploaded.

## Get it running on your iPhone

You do **not** need a Mac for this.

1. Install **Expo Go** from the App Store on your iPhone.
2. On your computer:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Scan the QR code in the terminal with the iPhone Camera app.

The phone and the computer need to be on the same Wi-Fi. If your network blocks
device-to-device traffic (common on office and hotel Wi-Fi), run
`npx expo start --tunnel` instead.

Edit a file, save, and the app reloads on the phone straight away.

## Getting to TestFlight and the App Store

Still no Mac required — EAS builds on Expo's macOS machines.

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

You'll need an **Apple Developer Program** membership ($99/yr) for this part,
and the bundle identifier `com.fat2flat.fitness` registered in App Store
Connect. Change that identifier in `app.json` if you want a different one.

`eas build --profile preview` produces an install you can share with testers
before you commit to a store submission.

## Layout

```
src/
  app/                 file-based routes (expo-router)
    (tabs)/            Home, Workouts, Meals, Progress, Profile
    workout/active     set logging + rest timer
    workout/library    exercise browser and picker
    exercise/[id]      form guide for one exercise
  data/
    exercises.ts       the exercise catalogue and its form cues
    generator.ts       turns filters into a workout plan
    stats.ts           volume, streaks, PRs, weekly rollups
    store.tsx          app state + AsyncStorage persistence
    types.ts
  ui/kit.tsx           shared components (cards, pills, charts, buttons)
  theme.ts             brand tokens, shared with the marketing screenshots
```

## Checks

```bash
npm run typecheck   # tsc, including expo-router's typed routes
npm run check       # runs the generator and stats logic assertions
npx expo export --platform ios    # full Metro + Hermes bundle
```

`npm run check` exercises `data/generator.ts` and `data/stats.ts` directly.
Those modules import nothing from React Native, so the assertions run on any
machine — including Linux CI, where the app itself cannot be built.

## Notes

- The app is light-mode only (`userInterfaceStyle: "light"` in `app.json`).
  Dark mode would need a second palette in `theme.ts`.
- iPad is disabled (`supportsTablet: false`). Turning it on means designing for
  the wider layout and supplying iPad screenshots for the App Store.
- App icons are generated from `../screenshots/make-icons.mjs`, so the icon and
  the marketing artwork share one brand.
