# FCL 2025 - Official FLOdata Tournaments App

A cross-platform mobile application built with React Native and Expo that wraps the [FLOdata Tournaments](https://flodata-tournaments.web.app/) web platform into a native Android APK experience.

---

## 📱 Overview

This project provides a mobile-optimized wrapper around the FLOdata tournaments website, delivering a seamless native app experience with enhanced features like hardware back button support, cache management, and UI customizations.

**Live Website:** [https://flodata-tournaments.web.app/](https://flodata-tournaments.web.app/)

---

## ✨ Features

- **Native WebView Integration** - Wraps the web platform using `react-native-webview` for smooth performance
- **Smart Cache Management** - Automatic cache clearing and service worker management to ensure latest content
- **Android Back Button Support** - Native hardware back navigation with WebView history integration
- **Status Bar Safe Area** - Proper padding to show system status (time, battery, network)
- **Zoom Disabled** - Prevents pinch-to-zoom and double-tap zoom for consistent UI
- **Fixed Bottom Navigation** - Keeps bottom nav bar stable during scrolling
- **Custom Branding** - High-resolution app icon (1024x1024) and splash screen
- **Login Button Hidden** - Automatically hides login elements for streamlined in-app experience
- **Offline-First Ready** - Handles network errors gracefully with retry mechanisms

---

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) (React Native)
- **WebView:** [react-native-webview](https://github.com/react-native-webview/react-native-webview) v13.15.0
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/)
- **Build System:** [EAS Build](https://docs.expo.dev/build/introduction/)
- **Language:** TypeScript

---

## 📦 Project Structure

```
FCL_Apk/
├── app/
│   ├── _layout.tsx           # Root navigation layout
│   ├── index.tsx             # Main WebView screen
│   └── modal.tsx             # Modal screen (if needed)
├── assets/
│   └── images/
│       ├── fclIcon-1024.png  # App icon (1024x1024)
│       └── ...
├── components/               # Reusable UI components
├── constants/                # Theme and app constants
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for building APKs)

### Installation

1. **Clone the repository**
    https://expo.dev/artifacts/eas/fcl2025.apk
   git clone https://github.com/yourusername/fcl-2025-app.git
   cd fcl-2025-app
   ```

2. **Install dependencies**
   ```bash
   npm install

3. **Start the development server**
   ```bash
   npx expo start
   ```


## 📲 Building for Production
```bash
# Login to Expo account
eas build -p android --profile preview

# Build AAB (for Google Play Store)
eas build -p android --profile production
```

The build will be uploaded to EAS servers. Once complete, you'll receive a download link for the APK/AAB.

### Download and Install

1. After the build completes, EAS provides an artifact URL:
   ```
   https://expo.dev/artifacts/eas/xxxxx.apk
   ```

2. Download the APK to your Android device

3. Enable "Install from Unknown Sources" in your device settings

4. Install the APK

---

## 🔧 Configuration

### Key Files
#### `app.json`
- App name, version, and slug
- Icon and splash screen paths
- Android permissions and package name
- Adaptive icon configuration

#### `eas.json`
- Build profiles (preview, production)
- Platform-specific build settings
- Version management strategy

#### `app/index.tsx`
- WebView source URL configuration
- Injected JavaScript for customizations
- Event handlers and navigation logic

### Customization

**Change Website URL:**
```typescript
**Update App Name & Icon:**
```json
// app.json
    "icon": "./assets/images/your-icon-1024.png"
}
```

**Adjust Cache Behavior:**
```typescript
// app/index.tsx - modify INJECTED_BEFORE script
// Control service worker clearing, localStorage, etc.
```

---

## 🎨 Features Implementation

### WebView Integration

The core of the app uses `react-native-webview` to embed the website:

```typescript
  source={{ uri: websiteUrl, headers: { 'Cache-Control': 'no-cache' } }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  cacheEnabled={false}
  // ... additional props
/>
```

- Clears Cache Storage API
- Removes localStorage data
- Reloads with cache-busting timestamps

### UI Enhancements

- **Zoom Prevention:** Viewport meta tag enforcement + gesture blocking
- **Fixed Bottom Nav:** CSS injection to keep navigation stable

## 🧪 Testing

### Development Testing
```bash
npx expo start --tunnel
```
Use Expo Go app to scan QR code and test on physical device.

### Production Testing
1. Build APK using EAS
2. Install on physical Android device
3. Test all features:
   - Navigation (back button)
   - Cache updates (website changes)
   - UI elements (zoom, bottom nav)
   - Network handling (offline scenarios)

---

## 📝 Troubleshooting

### Website Updates Not Reflecting

**Problem:** Changes to the website don't appear in the app immediately.
- Cache Storage is cleared on load
- WebView caching is disabled (`cacheEnabled={false}`)

If issues persist, clear app data from Android settings.

### Bottom Navigation Moves on Scroll

**Problem:** Bottom navigation bar scrolls with content.

**Solution:** This is fixed via injected JavaScript that:
- Forces `position: fixed` on the nav element
- Adds body padding to prevent content overlap

Check `INJECTED_BEFORE` script in `app/index.tsx`.

### Blurry App Icon


**Solution:** Use a 1024x1024 PNG icon:
```json
      "image": "./assets/images/your-icon-1024.png"
  }
}
```

### QR Code Not Working in Expo Go
**Problem:** Can't scan QR code or connection fails.

**Solution:**


## 🤝 Contributing


2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native WebView Docs](https://github.com/react-native-webview/react-native-webview)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [FLOdata Tournaments Website](https://flodata-tournaments.web.app/)

---

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

## 🙏 Acknowledgments

- **Expo Team** - Amazing framework for React Native development
- **react-native-webview** maintainers - Robust WebView component
- **FLOdata** - Tournament management platform

---

**Made with ❤️ using React Native & Expo**

- **Status Bar Padding:** Dynamic padding based on Android status bar height

---

## 🧪 Testing

### Development Testing
```bash
npx expo start --tunnel
```
Use Expo Go app to scan QR code and test on physical device.

### Production Testing
1. Build APK using EAS
2. Install on physical Android device
3. Test all features:
   - Navigation (back button)
   - Network handling (offline scenarios)

---

## 📝 Troubleshooting

### Common Issues

1. **"Unable to load website"**: Check internet connection and ensure the website URL is correct
2. **Build failures**: Make sure all dependencies are installed with `npm install`
3. **QR code not working**: Ensure your mobile device and computer are on the same WiFi network

### Network Issues

If you encounter network-related issues:
1. Check that your website is accessible from a regular browser
2. Ensure your firewall isn't blocking the connection
3. Try using a VPN if there are regional restrictions

## App Store Deployment

### Android (Google Play Store)

1. Build an app bundle: `expo build:android -t app-bundle`
2. Create a Google Play Console account
3. Upload the generated AAB file
4. Fill out store listing information
5. Submit for review

### iOS (Apple App Store)

1. Build for iOS: `expo build:ios`
2. Create an Apple Developer account
3. Use Xcode to upload to App Store Connect
4. Fill out app information
5. Submit for review

## Support

For issues specific to this WebView wrapper:
- Check the Expo documentation: https://docs.expo.dev/
- React Native WebView documentation: https://github.com/react-native-webview/react-native-webview

## License

This project is private and proprietary.