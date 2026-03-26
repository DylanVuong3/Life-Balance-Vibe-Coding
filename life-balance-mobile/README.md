# Life Balance — Mobile (Expo)

A React Native / Expo port of the Life Balance web app.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- For iOS: Xcode 15+ (macOS only)
- For Android: Android Studio with an emulator configured

## Setup

```bash
# Install dependencies
npm install

# Start the dev server
npm start

# Or target a specific platform
npm run ios
npm run android
```

Scan the QR code with the **Expo Go** app (iOS/Android) for instant on-device testing without a simulator.

## Project structure

```
src/
├── types.ts          # Domain types — identical to web version
├── engine.ts         # Priority algorithm — identical to web version
├── db.ts             # SQLite via expo-sqlite (replaces Dexie)
├── store.ts          # Zustand store
├── seed.ts           # First-run demo data
├── notifications.ts  # Push notifications (deadline + neglect alerts)
├── App.tsx           # Root: font loading, splash, boot sequence
├── theme/
│   └── index.ts      # Design tokens (replaces index.css)
├── navigation/
│   └── index.tsx     # Bottom tabs + native stack
└── screens/
    ├── QueueScreen.tsx       # Priority queue (FlatList)
    ├── TreeScreen.tsx        # Goal tree (recursive ScrollView)
    ├── BalanceScreen.tsx     # Pie charts + breakdown
    ├── PlacesScreen.tsx      # Place management
    ├── TaskDetailScreen.tsx  # Task detail (stack card)
    └── TaskFormScreen.tsx    # Add / edit (modal)
```

## What's shared with the web version (zero changes)

| File | Why |
|------|-----|
| `types.ts` | Pure TypeScript interfaces |
| `engine.ts` | Pure functions, no browser/native APIs |

## Key differences from the web version

| Concern | Web | Mobile |
|---------|-----|--------|
| Persistence | Dexie + IndexedDB | `expo-sqlite` |
| Styles | CSS (`index.css`) | `StyleSheet.create()` in `theme/index.ts` |
| Navigation | `useState` view switch | React Navigation bottom tabs + stack |
| Charts | Recharts | `victory-native` |
| Task complete | Click handler | Haptic feedback + `completeTask()` |
| Notifications | — | `expo-notifications` (deadline + neglect) |

## Adding a missing dependency

If `@react-native-community/slider` is missing:
```bash
npx expo install @react-native-community/slider
```

## Building for production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your project
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Build for Android
eas build --platform android
```

## Notes

- All data is stored locally in SQLite — no backend required
- Notification permissions are requested on first launch
- The priority algorithm in `engine.ts` is the same pure function
  used in the web version — no changes needed regardless of platform
