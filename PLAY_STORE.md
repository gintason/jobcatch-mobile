# Publishing JobCatch to Google Play (internal testing)

Package name: `com.jobcatchonline.app` · Version 1.0.0 · EAS project `gintason/jobcatch`

The production build is an **Android App Bundle (.aab)** that talks to the live API
(`https://api.jobcatchonline.com`). EAS numbers each build automatically (versionCode).

---

## 1. Build the production app bundle

From the `jobcatch-mobile` folder:

```bash
eas build --platform android --profile production
```

- When asked about the Android keystore, **use the existing one** (the same key the preview
  builds use — Google sign-in is registered against it). Never generate a new one.
- When the build finishes, download the **.aab** from the link EAS prints (or expo.dev → Builds).

## 2. Create the app in Play Console (one time)

1. https://play.google.com/console → **Create app**
   - App name: **JobCatch** · Default language: English (United Kingdom) or English (United States)
   - App or game: **App** · Free or paid: **Free**
   - Accept the declarations → **Create app**.

## 3. Upload the first build to Internal testing

The **first** upload must be done by hand in Play Console (Google doesn't allow the API to
create the first release).

1. **Test and release → Testing → Internal testing → Create new release.**
2. Play App Signing: accept **"Use Google-generated key"** (recommended).
3. Upload the **.aab** from step 1. Release name: `1.0.0 (1)`.
4. Release notes: `First internal test of the JobCatch app.`
5. **Next → Save → Start rollout to Internal testing.**
6. **Testers** tab → **Create email list** → add the testers' **Gmail addresses** → Save.
7. Copy the **"Join on the web"** opt-in link and send it to the testers. They open it on their
   Android phone, tap **Accept invitation**, then install JobCatch from the Play Store.

## 4. ⚠️ Google sign-in after Play App Signing

Google re-signs the app with its own key, so Google sign-in needs that key registered too.

1. Play Console → **Test and release → Setup → App signing** → copy the **SHA-1** under
   **"App signing key certificate"**.
2. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Android**
   - Name: `JobCatch Android (Play)`
   - Package name: `com.jobcatchonline.app`
   - SHA-1: paste the Play **app signing** SHA-1 → **Create**.
3. Keep the existing Android client (EAS upload key) — both must exist.
   No app or backend change is needed.

## 5. Later updates: upload from the terminal (optional)

1. Google Cloud → **IAM & Admin → Service accounts → Create service account** (e.g. `eas-submit`)
   → **Keys → Add key → JSON** → download.
2. Rename it `google-play-service-account.json` and put it in the `jobcatch-mobile` folder
   (it is git-ignored — **never commit or share it**).
3. Play Console → **Users and permissions → Invite new users** → the service account's email →
   give **Release** permissions for JobCatch.
4. Then each update is:
   ```bash
   eas build --platform android --profile production
   eas submit --platform android --profile production --latest
   ```
   This uploads to **Internal testing** as a draft; open Play Console and **Start rollout**.

---

## 6. App content forms (Policy → App content)

| Form | Answer |
|---|---|
| **Privacy policy** | `https://jobcatchonline.com/privacy` |
| **App access** | "All or some functionality is restricted" → add a **test login** (email + password of a test account, plus "Sign in with email on the welcome screen"). |
| **Ads** | No, the app does not contain ads. |
| **Content rating** | Category: **Utility, productivity, communication or other**. Answer **No** to violence, sexual content, profanity, drugs, gambling content. **Yes** to "users can interact / exchange information" (in-app chat) and "shares user location". See the **betting** note in section 9. |
| **Target audience** | **18 and over**. |
| **News app** | No. |
| **Data safety** | See section 7. |
| **Government app** | No. |
| **Financial features** | Yes → the app offers **mobile payments / digital wallet**, **money transfers** and **bill payments** (processed by licensed partners Paystack, Flutterwave and VTU.ng). |
| **Health** | No health features. |
| **Account deletion** | In-app: **Account → Delete my account**. Web link: `https://jobcatchonline.com/delete-account` |

## 7. Data safety answers

- **Does the app collect or share user data?** Yes. **Encrypted in transit?** Yes (HTTPS).
  **Can users request deletion?** Yes (`https://jobcatchonline.com/delete-account`).
- **Collected** (not sold; "shared" only with payment/ID-check processors as noted):

| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Name, email, phone number, user IDs | Yes | Account management, app functionality, fraud prevention | Required |
| Approximate & precise location | Yes | App functionality (delivery pickup/drop-off, nearby artisans, rider jobs) | Optional |
| Photos | Yes | App functionality (profile photo, portfolio, gift-card photos, verification selfie) | Optional |
| Files and docs | Yes | App functionality (CVs, ID and business documents for verification) | Optional |
| Messages (in-app chat) | Yes | App functionality | Optional |
| Purchase history / financial info | Yes | App functionality (wallet, bills, transfers). Card details are entered on Paystack/Flutterwave, never stored by JobCatch. Shared with payment processors to complete payments. | Required for payments |
| Government ID numbers (NIN, CAC, TIN) | Yes (Personal info → Other) | Fraud prevention, verification. Shared with ID-verification providers. | Optional (only for verification) |
| App interactions / crash logs | No (not collected) | — | — |

---

## 8. Store listing (Grow → Store presence → Main store listing)

**App name:** JobCatch

**Short description (max 80):**
Pay bills, send packages, hire artisans and find verified jobs in Nigeria.

**Full description:**
JobCatch brings the everyday services you need into one trusted Nigerian app.

PAY BILLS IN SECONDS
• Airtime and data for MTN, Airtel, Glo and 9mobile
• Electricity tokens, DStv, GOtv and StarTimes
• Recharge PINs and exam PINs (WAEC, NECO, JAMB)
• Fund your JobCatch wallet and pay with one tap. Failed purchases are refunded to your wallet automatically.

SEND PACKAGES & RUN ERRANDS
• Book a nearby rider — motorbike, tricycle, car or van — with the price shown up front
• Track your delivery and share a secure delivery code with the recipient

HIRE TRUSTED ARTISANS
• Plumbers, electricians, cleaners, carpenters and more near you
• See ratings, reviews and work photos, book in minutes and chat in the app
• Look for the Verified Artisan badge

FIND JOBS FROM VERIFIED EMPLOYERS
• Browse roles from employers who passed business verification
• Upload your CV and apply in a few taps, and get WhatsApp job alerts

FOR ARTISANS, EMPLOYERS AND RIDERS
• Artisans: list your services, showcase your work and get booked
• Employers: verify your business, post jobs and manage applicants
• Riders: earn by delivering packages in your city

SEND MONEY & EARN
• Send money to other JobCatch users or to any Nigerian bank account
• Invite friends and earn wallet credit

Need help? Chat with our support team on WhatsApp right from the app.

JobCatch is a product of Spotlight Investments Limited.

**Graphics** (in the `play-store` folder delivered with this guide):
- App icon: `icon-512.png` (512 × 512)
- Feature graphic: `feature-graphic-1024x500.png` (1024 × 500)
- Phone screenshots: `01-home.png` … `07-wallet.png` (1080 × 2160) — upload 2 to 8.

**Category:** Business (or Finance) · **Contact email:** your support email ·
**Website:** `https://jobcatchonline.com`

---

## 9. Good to know

- **⚠️ Betting top-ups.** Pay bills includes funding betting accounts (Bet9ja etc.). Google Play
  treats apps that facilitate real-money gambling strictly (licence and country approval needed),
  and this can get the app rejected or limited. Before going to **production**, either remove
  betting from the app or be ready to show Google a licence. Internal testing isn't reviewed the
  same way, so it's fine for testing now. Ask your developer to hide betting in the app if needed.

- **Internal testing** (up to 100 testers) is available immediately and isn't held up by the
  production checklist.
- If your Play developer account is a **personal** account created after November 2023, Google
  requires a **closed test with at least 12 testers for 14 days** before you can apply for
  **production**. Organisation accounts (registered with a D-U-N-S number) don't have this rule.
- Every new build must have a higher versionCode — EAS handles this automatically
  (`autoIncrement`). To change the visible version (e.g. 1.0.1), edit `"version"` in `app.json`.
