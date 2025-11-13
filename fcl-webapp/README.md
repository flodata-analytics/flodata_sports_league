# Cricket League - Live Scoreboard & Bidding Web App

A comprehensive React.js web application for live cricket scoreboard updates with player bidding functionality. Built with React, Firebase/Firestore, and Tailwind CSS.

## 🏏 Features

- **Live Scoreboard**: Real-time cricket match updates
- **Player Statistics**: Comprehensive batting and bowling stats
- **Bidding System**: Users can bid on players with virtual coins
- **Admin Panel**: Complete match and player management
- **User Authentication**: Firebase Auth with email/password
- **Responsive Design**: Mobile and desktop optimized
- **Real-time Updates**: Instant updates across all users

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Firebase account
- VS Code or any code editor

### 1. Clone and Install
```bash
cd cricket-scoreboard
npm install
```

### 2. Firebase Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Authentication**:
   - In Firebase console, go to Authentication > Sign-in method
   - Enable "Email/Password" provider

3. **Create Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select your preferred location

4. **Get Firebase Configuration**:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click "Web app" icon to create a web app
   - Copy the configuration object

5. **Update Firebase Config**:
   - Open `src/firebase.js`
   - Replace the configuration object with your Firebase config

### 3. Start Development Server
```bash
npm start
```

### 4. Live Push Updates (WebSocket server)

This app can receive push updates from Firestore via a lightweight WebSocket server (reduces reads vs polling).

1) Create a Firebase service account key (JSON) from Firebase Console > Project Settings > Service accounts.
2) Save the JSON file somewhere safe (e.g., `C:\keys\firebase-admin.json`).
3) In a new terminal, start the WS server from the `ws-server` folder:

```powershell
cd ws-server
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\keys\\firebase-admin.json"
npm install
npm start
```

The server defaults to http://localhost:5001. The client will auto-connect if `REACT_APP_WS_URL` isn’t set; to override:

```powershell
cd ..\cricket-scoreboard
$env:REACT_APP_WS_URL = "ws://localhost:5001"
npm start
```

If you use the email OTP API, set `REACT_APP_API_BASE` similarly (or configure the dev proxy under `src/setupProxy.js`).

## ✨ Celebrations (Animations + Sounds)

When a ball is a Four, Six, or Wicket, the app shows a cute, mobile-friendly overlay animation and plays a short, synthesized tone. Wickets have distinct animations and tones for different dismissal types (bowled, caught, lbw, run out, stumped, hit wicket).

- Animations are implemented with CSS in `src/App.css` and the overlay UI is in `src/components/CelebrationOverlay.js`.
- Sounds are generated with the Web Audio API (no external assets).
- On first load, some browsers may block audio until a user gesture; the app will still show animations.

You can also trigger a special celebration from anywhere (e.g., milestones) by dispatching an event in the browser console:

```js
window.dispatchEvent(new CustomEvent('celebrate', { detail: { kind: 'special', title: 'Fifty up!' } }));
```


## 📱 Usage

### For Regular Users:
1. **View Live Scores**: Access without login
2. **Sign Up/Login**: Create account to participate in bidding
3. **Browse Players**: View detailed player statistics
4. **Place Bids**: Use virtual coins to bid on players
5. **Track Bids**: Monitor your active bids

### For Admins:
1. **Update Live Scores**: Real-time match updates
2. **Manage Players**: Add new players and update stats
3. **Distribute Coins**: Give coins to users
4. **Control Match Status**: Start, pause, end matches

### Player Availability (Day-specific)

- Admins can mark a player as "Unavailable today" from:
   - The Players list (row action button), or
   - A Player's Profile page (button next to the header)
- This writes the string for the current date (YYYY-MM-DD) to `players/{id}.unavailableDates` (array).
- Anywhere the roster is shown (Players page, Team Sheet, Live Scoreboard team lists), players unavailable for today are highlighted with a red pill and dimmed styling.
- Unavailable players are visually non-interactive in team views to discourage selection for the day.

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── pages/              # Main application pages
├── utils/              # Utility functions
└── firebase.js         # Firebase configuration
```

## 🔧 Firebase Configuration Required

**IMPORTANT**: Before running the app, you must:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Update `src/firebase.js` with your Firebase config
5. Set up Firestore security rules

See the detailed setup instructions in the documentation above.

---

**Happy Coding! 🏏**

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
