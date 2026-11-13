# Android: setup and Google Play launch

The app is the same code on Android. Differences: coach sign-in uses
**Continue with Google** instead of Sign in with Apple, and coach-note push
notifications go through Firebase.

## 1. Google Play developer account (once)
play.google.com/console → Sign up → **Personal** account → $25 one-time →
identity verification (can take a few days).

## 2. "Continue with Google" (once, ~15 min)
**Google Cloud** (console.cloud.google.com, same Google account):
1. Top bar → project picker → **New project** → name `Fat2Flat` → Create, and select it.
2. ☰ → **APIs & Services → OAuth consent screen** → Get started. App name
   `Fat2Flat Fitness`, support email yours, Audience **External**, contact
   email yours → Create. Then **Publish app** (Audience page) so anyone can sign in.
3. **APIs & Services → Credentials → + Create credentials → OAuth client ID** →
   type **Web application**, name `Supabase`. Under **Authorized redirect URIs**
   add `https://iycgmlwiglrvlyetkwzi.supabase.co/auth/v1/callback` → Create.
   Keep the Client ID and Client secret window open.

**Supabase** (project fat2flat):
4. Authentication → Sign In / Providers → **Google** → enable, paste the
   **Client ID** and **Client Secret** → Save. (The secret goes only into
   Supabase, never into the app or a chat.)
5. Authentication → **URL Configuration** → Redirect URLs → **Add URL** →
   `fat2flat://**` → Save.

## 3. Coach-note notifications on Android (Firebase, ~10 min)
Optional for testing: without it everything works, notes just don't pop up
on Android phones (they still show in the app).
1. console.firebase.google.com → Add project → choose the **Fat2Flat** Google
   Cloud project → no Analytics.
2. Add app → Android → package `com.fat2flat.fitness` → Register → download
   `google-services.json` → put it in `mobile/` and set
   `"googleServicesFile": "./google-services.json"` under `expo.android` in app.json.
3. Firebase → Project settings → Service accounts → Generate new private key
   (a JSON file). Upload it with `npx eas-cli@latest credentials` → Android →
   production → Google Service Account → FCM V1. Keep that file private.

## 4. Build
```
cd …/mobile
npx eas-cli@latest build --platform android --profile production
```
Answer **Y** to "Generate a new Android Keystore?". The result is an `.aab`
file (download link at the end).

## 5. First upload and closed test (Google requires 12 testers × 14 days)
Play Console → Create app → `Fat2Flat Fitness`, App, Free → then:
1. Fill **Dashboard → Set up your app** (privacy policy URL, app access,
   ads = No, content rating, target audience 18+, data safety — answers below).
2. **Testing → Closed testing → Create track** → Testers: create an email list
   with the 12+ testers' Gmail addresses → **Create release** → upload the
   `.aab` → release notes → **Review release → Start rollout**.
3. Send testers the **opt-in link** from the Testers tab. Each must accept and
   install, and they must stay opted in for **14 days in a row**.
4. After 14 days: Dashboard → **Apply for production** (answer the questions
   about the test), then create a production release.

## Health Connect declaration (before the first release)
The app reads Health Connect data, so Play Console requires a declaration:
Play Console → the app → **App content → Health apps** (or **Health Connect
permissions**). For each permission give the reason:
- Steps, active calories burned, exercise, sleep, resting heart rate: "Shown to
  the user as their daily activity and, if they choose, shared with their coach."
- Weight, body fat: "Imported as the user's weigh-ins for their weight trend and
  calorie coaching."
- Write exercise, write nutrition: "Saves the workouts and meals the user logs."
Approval can take up to a week, plus a few business days before access works.
Without it, Health Connect refuses to show the permission screen in the store build.

## Play Store listing

| Field | Value |
|---|---|
| App name (30) | Fat2Flat Fitness |
| Short description (80) | Workout plans, meal plans and calorie tracking, with an optional coach. |
| Category | Health & Fitness |
| Contact email | your email |
| Privacy policy | same Google Doc URL as the App Store |

**Full description (4000)**: reuse the App Store description from
`app-store-listing.md` (1.0 text + the 1.1 Transformation block), replacing
"iPhone" with "phone", and add:

```
WORK WITH YOUR COACH (OPTIONAL)
• Join your personal trainer with their code and share your progress
• Get notes and tips from your coach
• Smart reminders for workouts, check-ins and weigh-ins
```

**Graphics** (ready in `screenshots/out-play/`):
- App icon: `store/icon-512.png`
- Feature graphic: `store/feature-graphic-1024x500.png`
- Phone screenshots (1080×1920): `android-phone-1080x1920/01…06`

Regenerate the screenshots with
`node generate.mjs --real <captures> --sizes play --out out-play --logo ../mobile/assets/images/icon.png`.

## Data safety form answers
- Does your app collect or share user data? **Yes** (only when a user joins a coach).
- Is all data encrypted in transit? **Yes**. Can users request deletion? **Yes** (Profile → Delete account).
- Collected (not shared with third parties), purpose **App functionality**, **optional**:
  - Personal info: **Name**, **Email address**, **User IDs**
  - Health and fitness: **Health info** (weight, body fat, measurements, sleep, resting heart rate), **Fitness info** (workouts, steps, calories burned)
  - Photos and videos: **Photos** (progress photos, only if the user turns sharing on)
  - App activity: **Other user-generated content** (meals, coach notes)
- Not collected: location, contacts, financial info, browsing, device IDs for ads.
