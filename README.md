# JobCatch mobile app

The JobCatch app for Android and iOS, built with Expo (SDK 58), Expo Router and TypeScript. It talks to the same API as jobcatchonline.com.

## What's in it

**Signing in**
- Email sign-up with an OTP code, sign-in and password reset.
- Continue with Google.

**Main tabs**
- **Home:** greeting, wallet, quick bill services, live delivery tracker, featured jobs and top artisans.
- **Pay bills:** airtime, data, electricity, cable TV, betting, exam PINs (WAEC/JAMB), recharge ePINs, buying and selling gift cards, and Pay China (¥). Pay from the wallet or by card. Receipts show tokens and PINs with copy and share.
- **Wallet:** balance, top-up through Paystack checkout, and transaction history.
- **Delivery:** send a package or a food/errand run, priced up front, with live status. You pay at pickup, then share a 4-digit code with the rider, then rate the rider.
- **Rider:** onboarding (vehicle, ID upload, payout bank account), go online or offline, nearby requests, accept, picked up and deliver with the code, plus earnings.
- **Jobs:** search and filter roles, apply with a CV, my applications, and CV upload and management.

**Artisans:** browse, view profiles and book a time and address, then my bookings and reviews.

**Account:**
- Notifications.
- Links to the help, complaints and legal pages.
- Log out.
- **Delete account**, which Apple and Google require.

Employer and artisan management tools (posting jobs, managing services) open the website for now.

## Run it

```bash
npm install
cp .env.example .env          # public values only
npx expo start                # scan the QR code with a development build
```

The app uses native modules: secure storage, location, image and document pickers, and Google auth. Use a **development build**, not Expo Go:

```bash
npx eas-cli@latest build --profile development --platform android
```

## Build for the stores

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform android   # and/or ios
```

- Bundle ID / package: `com.jobcatchonline.app`.
- Set the `EXPO_PUBLIC_*` values as EAS environment variables (or in `.env`) before building.

## Google sign-in on phones

1. In Google Cloud Console (the same project as the web client), create OAuth client IDs:
   - **Android:** package `com.jobcatchonline.app` plus the SHA-1 from `npx eas-cli credentials`.
   - **iOS:** bundle ID `com.jobcatchonline.app`.
2. Put them in `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
3. On Render, add both IDs to the backend's `GOOGLE_CLIENT_IDS`, comma-separated, next to the web ID.

The Google button stays hidden on a platform until its client ID is set, so the app ships safely without it.

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
