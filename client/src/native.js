import { Capacitor, SystemBars, SystemBarType, SystemBarsStyle } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

const ROOT_PATHS = ['/', '/login', '/teacher/login', '/dashboard', '/teacher'];

// Runs once at start-up. Does nothing in a normal browser.
export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native');

  // Light icons on the brown app bar.
  SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar }).catch(() => {});

  // Android back button: go back a screen, or leave the app from a home screen.
  NativeApp.addListener('backButton', () => {
    const { pathname, search } = window.location;
    if (ROOT_PATHS.includes(pathname) && !search.includes('open=')) NativeApp.exitApp();
    else window.history.back();
  });
}
