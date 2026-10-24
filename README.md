# Fat2Flat Fitness

| | |
|---|---|
| [`mobile/`](mobile) | The iOS app — Expo / React Native. Start here to run it on a phone. |
| [`screenshots/`](screenshots) | Generator for the App Store screenshot set and the app icons. |

## Run the app on your iPhone

No Mac needed. Install **Expo Go** on the phone, then:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the iPhone Camera app. Full details, including how to get
to TestFlight, are in [`mobile/README.md`](mobile/README.md).

## What the app does

A workout tracker that keeps everything on the device — no account, no server of
its own. The only network use is looking up foods in Open Food Facts.

- Build a workout from your muscle group, available equipment, goal and the
  time you have, or start an empty one.
- Log sets as you go, with a rest timer and your previous best for each lift.
- Browse an exercise library with form cues for every movement.
- Track volume by week, body weight over time, personal records and your streak.
- Log meals against daily calorie and protein goals: scan a barcode, search
  common and packaged foods (calories worked out for your portion), or type
  them in.

## Repo notes

The two projects share a palette: `mobile/src/theme.ts` and
`screenshots/src/poster.css` define the same brand tokens, and the app icons are
rendered by `screenshots/make-icons.mjs` into `mobile/assets/images/`.

The screenshots in `screenshots/out/` were designed before the app existed, so
they are **mockups, not captures of the running app**. App Store Review
Guideline 2.3.3 requires screenshots to show the app in actual use — recapture
them from the real app (or update the mockups to match it) before submitting.

## Privacy policy

[`PRIVACY.md`](PRIVACY.md) is the app's privacy policy. App Store Connect needs
it at a public URL: host it on a public page (GitHub Pages, a Notion page, your
own site) after filling in the `[DATE]` and `[SUPPORT EMAIL]` placeholders. In
App Store Connect's App Privacy section, answer **"Data Not Collected"**: food
lookups send only a barcode or search term to Open Food Facts to answer that
request, which Apple doesn't count as collection. Keep the policy and those
answers in sync if that ever changes.
