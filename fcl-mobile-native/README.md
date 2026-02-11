# FCL Mobile Native (React Native CLI)

This branch adds a **non-Expo React Native** application that mirrors the `fcl-webapp` flows and Firebase data model.

## Route/Screen parity

- `/` → `HomeScreen`
- `/login` → `LoginScreen`
- `/players` → `PlayersScreen`
- `/players/:playerId` → `PlayerProfileScreen`
- `/auction` → `AuctionScreen`
- `/umpire` → `UmpireScreen`
- `/profile` → `ProfileScreen`
- `/match/:matchId` → `MatchDetailsScreen`
- `/scorecard/:matchId` → `FullScorecardScreen`
- `/team/:teamId` → `TeamDetailScreen`
- `/videos` → `VideosScreen`

## Backend parity

- Same Firebase project and config used by web app.
- Same collections (`matches`, `players`, `teams`, `users`, `innings`) with realtime listeners.
- Auth persistence in RN via `@react-native-async-storage/async-storage`.

## Run

```bash
cd fcl-mobile-native
npm install
npm run android
# or
npm run ios
```

## Notes

- Design tokens keep core FCL colors and card patterns.
- Components are split for maintainability and runtime performance.
- This app is isolated and does not alter `fcl-webapp` or the existing wrapper project.
