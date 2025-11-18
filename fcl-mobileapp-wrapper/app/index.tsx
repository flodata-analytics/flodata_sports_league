import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Alert, Linking, BackHandler, StatusBar as RNStatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const WEBSITE_URL = 'https://flodata-tournaments.web.app/';
const TEST_URL = 'https://example.com'; // Simple test site

// Injected script: report lifecycle, SPA route changes, and console/error logs back to React Native.
// Enhanced: unregister service workers, clear caches & storage, then trigger a single forced reload (once) to fetch fresh assets.
// Additionally hide any footer/login button by text content ('Login' / 'Log in').
const INJECTED_BEFORE = `
(function() {
  function send(type, payload){
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload })); } catch(e) {}
  }
  try {
    // Prevent pinch-to-zoom and double-tap zoom: enforce a strict viewport and block gesture events
    try {
      var _vp = document.querySelector('meta[name=viewport]');
      var _vpContent = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no';
      if (_vp) { _vp.setAttribute('content', _vpContent); } else {
        var _m = document.createElement('meta'); _m.name = 'viewport'; _m.content = _vpContent; document.head && document.head.appendChild(_m);
      }
      function _stopGesture(e){ try{ e.preventDefault && e.preventDefault(); } catch(_){} }
      try { document.addEventListener('gesturestart', _stopGesture, { passive: false }); } catch(e){}
      try { document.addEventListener('gesturechange', _stopGesture, { passive: false }); } catch(e){}
      try { document.addEventListener('gestureend', _stopGesture, { passive: false }); } catch(e){}
      // prevent quick double-tap zoom
      (function(){ var t=0; document.addEventListener('touchend', function(ev){ var now = Date.now(); if (now - t <= 300) { try{ ev.preventDefault(); } catch(_){} } t = now; }, { passive: false }); })();
    } catch(e) {}

    send('ready', { ua: navigator.userAgent, href: location.href });
    document.addEventListener('DOMContentLoaded', function(){ send('domcontentloaded', { href: location.href }); });
    window.addEventListener('load', function(){ send('load', { href: location.href }); });

    // Attempt to unregister service workers, clear caches & storage, then reload once.
    // Also hide login button(s) that appear in nav/footer.
    try {
      var alreadyReloaded = sessionStorage.getItem('__fcl_cache_cleared');
      function hideLogin(){
        try {
          var candidates = Array.from(document.querySelectorAll('a,button'));
          candidates.forEach(function(el){
            var txt = (el.textContent||'').trim().toLowerCase();
            if (txt === 'login' || txt === 'log in') {
              el.style.display='none';
              el.setAttribute('data-login-hidden','1');
            }
          });
        } catch(e){}
      }
      hideLogin();
      try { new MutationObserver(hideLogin).observe(document.documentElement, { childList:true, subtree:true }); } catch(e){}

      // Force bottom nav to be fixed and non-moving when scrolling
      function enforceBottomBar(){
        try {
          var selectors = [
            'footer',
            '.bottom-nav',
            '.bottom-navigation',
            '.site-footer',
            '.app-bottom-bar',
            'nav.bottom',
            '.navbar-bottom',
            '.mobile-bottom-nav',
            '[data-testid="bottom-nav"]',
            '[role="navigation"]'
          ];
          var maxH = 0;
          selectors.forEach(function(sel){
            Array.from(document.querySelectorAll(sel)).forEach(function(el){
              try{
                el.style.position = 'fixed';
                el.style.left = '0';
                el.style.right = '0';
                el.style.bottom = '0';
                el.style.zIndex = '2147483647';
                el.style.transform = 'none';
                el.style.transition = 'none';
                el.style.willChange = 'auto';
                el.style.pointerEvents = 'auto';
                // prevent layout shift from translateY
                el.style.webkitTransform = 'none';
                var h = el.offsetHeight || 0; if (h > maxH) maxH = h;
              }catch(e){}
            });
          });
          if (maxH > 0 && document && document.body) {
            try {
              var currentPad = 0; try { currentPad = parseInt(getComputedStyle(document.body).paddingBottom)||0; } catch(e){}
              if (currentPad < maxH) { document.body.style.paddingBottom = maxH + 'px'; }
            } catch(e){}
          }
        } catch(e){}
      }
      enforceBottomBar();
      try { new MutationObserver(enforceBottomBar).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['style','class'] }); } catch(e){}
      Promise.resolve().then(function(){
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          return navigator.serviceWorker.getRegistrations().then(function(regs){
            regs.forEach(function(r){ try { r.unregister(); } catch(e){} });
            send('sw_unregistered', { count: regs.length });
          });
        }
      }).then(function(){
        if (window.caches && caches.keys) {
          return caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
          .then(function(res){ send('caches_cleared', { resultCount: res.length }); });
        }
      }).then(function(){
        try { localStorage.clear(); sessionStorage.removeItem('__persisted'); send('storage_cleared', {}); } catch(e){}
      }).then(function(){
        if (!alreadyReloaded) {
          try { sessionStorage.setItem('__fcl_cache_cleared', '1'); } catch(e){}
          // Give postMessages time to flush then reload to fetch fresh assets
          setTimeout(function(){ try { location.replace(location.href.split('#')[0] + (location.href.includes('?') ? '&' : '?') + 'hard_reload_ts=' + Date.now()); } catch(e){} }, 300);
        }
      }).catch(function(err){ send('cache_clear_error', { msg: String(err) }); });
    } catch(e) { send('sw_clear_exception', { message: String(e) }); }

    // Observe SPA route changes (history API + hash + popstate)
    (function() {
      var push = history.pushState;
      var replace = history.replaceState;
      function notify(){ send('route', { href: location.href }); }
      history.pushState = function(){ var r = push.apply(this, arguments); try { notify(); } catch(_) {} return r; };
      history.replaceState = function(){ var r = replace.apply(this, arguments); try { notify(); } catch(_) {} return r; };
      window.addEventListener('hashchange', notify);
      window.addEventListener('popstate', notify);
    })();

    // Proxy console logs
    var origLog = console.log;
    console.log = function(){ try { send('log', { args: Array.from(arguments).map(String) }); } catch(e) {} try { origLog.apply(console, arguments); } catch(e) {} };
    // Global error trap
    window.onerror = function(msg, src, line, col, err){ send('error', { msg: String(msg), src, line, col }); };
  } catch(e) { send('injection_error', { message: String(e) }); }
})();
`;

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  // Removed in-app loader overlay per request
  const [error, setError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const START_TS = useRef(Date.now());
  const [currentUrl, setCurrentUrl] = useState(`${WEBSITE_URL}${WEBSITE_URL.includes('?') ? '&' : '?'}app_ts=${START_TS.current}`);
  const [isTestMode, setIsTestMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Starting...');
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<number | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Loader overlay removed

  // On web, redirect to the website directly (WebView isn't supported reliably on web)
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        // Open in same tab
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.location.assign(currentUrl);
        setDebugInfo('Redirected in browser');
      } catch (e) {
        setDebugInfo('Redirect failed, showing open button');
      }
    }
  }, [currentUrl]);

  // Android hardware back button handling
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // handled
      }
      return false; // let OS handle (exit app)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleLoadStart = () => {
    console.log('WebView: Starting to load', currentUrl);
    setDebugInfo(`Loading: ${isTestMode ? 'Test Site' : 'Tournament Site'}`);
    setLoading(true);
    setError(false);
    setLoadingProgress(0);

    // Use a generous timeout to accommodate first loads / cold starts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      console.log('WebView: Load timeout after 45 seconds');
      setDebugInfo('Timeout: Taking too long to load');
      setLoading(false);
      setError(true);
    }, 45000) as any; // 45 second timeout
  };

  const handleLoadEnd = () => {
    console.log('WebView: Load completed successfully');
    setDebugInfo('Loaded successfully!');
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleLoadProgress = ({ nativeEvent }: any) => {
    const progress = Math.round(nativeEvent.progress * 100);
    setLoadingProgress(nativeEvent.progress);
    setDebugInfo(`Loading: ${progress}%`);
    console.log('WebView: Loading progress:', progress + '%');
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log('WebView error:', nativeEvent);
    setDebugInfo(`Error: ${nativeEvent.description || 'Unknown error'}`);
    setLoading(false);
    setError(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log('WebView HTTP error:', nativeEvent);
    setDebugInfo(`HTTP Error: ${nativeEvent.statusCode}`);
    if (nativeEvent.statusCode >= 400) {
      setLoading(false);
      setError(true);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data || '{}');
      if (data?.type === 'domcontentloaded' || data?.type === 'load' || data?.type === 'route') {
        setDebugInfo(`Event: ${data.type}`);
        setLoading(false);
        setError(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (data?.type === 'log') {
        setDebugInfo(`Log: ${(data.payload?.args || []).join(' ')}`);
      } else if (data?.type === 'error') {
        setDebugInfo(`Page Error: ${data.payload?.msg || 'unknown'}`);
      } else if (data?.type === 'ready') {
        setDebugInfo('Page ready...');
      }
    } catch (e) {
      // ignore malformed messages
    }
  };

  const handleNavChange = (navState: any) => {
    try {
      if (navState?.url && navState.url !== currentUrl) {
        // Update current URL for UI state only
        setCurrentUrl(navState.url);
      }
      if (typeof navState?.canGoBack === 'boolean') {
        setCanGoBack(navState.canGoBack);
      }
      // For SPA navigations, ensure we don't keep the overlay
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } catch (_) { }
  };

  const retryLoad = () => {
    console.log('WebView: Retrying load');
    setError(false);
    setLoading(true);
    setDebugInfo('Retrying...');
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const switchToTest = () => {
    console.log('WebView: Switching to test site');
    setIsTestMode(true);
    setCurrentUrl(TEST_URL);
    setError(false);
    setLoading(true);
    setDebugInfo('Switching to test site...');
  };

  const switchToMain = () => {
    console.log('WebView: Switching to main site');
    setIsTestMode(false);
    setCurrentUrl(WEBSITE_URL);
    setError(false);
    setLoading(true);
    setDebugInfo('Switching to tournament site...');
  };

  const showDebugAlert = () => {
    Alert.alert(
      'Debug Info',
      `Current URL: ${currentUrl}\nStatus: ${debugInfo}\nProgress: ${Math.round(loadingProgress * 100)}%\nMode: ${isTestMode ? 'Test' : 'Main'}`,
      [{ text: 'OK' }]
    );
  };

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText type="title">Connection Issue</ThemedText>
        <ThemedText style={styles.errorText}>
          {isTestMode
            ? 'Test site also failed to load. Check your internet connection.'
            : 'Unable to load the tournament website.'
          }
        </ThemedText>
        <ThemedText style={styles.debugText}>
          Status: {debugInfo}
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>

          {!isTestMode ? (
            <TouchableOpacity style={[styles.retryButton, styles.testButton]} onPress={switchToTest}>
              <ThemedText style={styles.retryButtonText}>Test Simple Site</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.retryButton, styles.testButton]} onPress={switchToMain}>
              <ThemedText style={styles.retryButtonText}>Back to Tournament</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.debugButton} onPress={showDebugAlert}>
          <ThemedText style={styles.debugButtonText}>Show Debug Info</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, Platform.OS === 'android' ? { paddingTop: RNStatusBar.currentHeight || 0 } : null]}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl, headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onLoadProgress={handleLoadProgress}
        onError={handleError}
        onHttpError={handleHttpError}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        // Use default user agent to avoid site blocking
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={false}
        incognito={true}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={true}
        allowsFullscreenVideo={true}
        androidLayerType="hardware"
        injectedJavaScriptBeforeContentLoaded={INJECTED_BEFORE}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url || '';

          // Open map links externally (Google Maps, geo:, maps.app.goo.gl, comgooglemaps, waze)
          const isMapLink = (
            url.startsWith('geo:') ||
            url.startsWith('comgooglemaps://') ||
            url.startsWith('waze://') ||
            url.includes('://maps.app.goo.gl') ||
            url.includes('://goo.gl/maps') ||
            url.includes('://www.google.com/maps') ||
            url.includes('://maps.google.com')
          );

          // Other external intents
          const isExternalIntent = url.startsWith('intent://') || url.startsWith('tel:') || url.startsWith('mailto:');

          if (isMapLink || isExternalIntent) {
            Linking.openURL(url).catch(() => { /* ignore */ });
            return false; // Prevent opening inside WebView
          }

          return true; // Allow normal in-app navigation
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  // Removed loader styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  errorList: {
    textAlign: 'left',
    marginTop: 15,
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 25,
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
  },
  fallbackButton: {
    backgroundColor: '#28a745',
  },
  debugText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#28a745',
  },
  debugButton: {
    marginTop: 15,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  debugButtonText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  // Removed cancel button styles
});
