import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.Capacitor?.isNativePlatform?.() ||
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

// "Install app" button. Android/Chrome fires beforeinstallprompt; iPhones have
// no such event, so they get a short how-to instead.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowHelp((v) => !v);
    }
  }

  return (
    <div className="install-prompt no-print">
      <button className="btn-secondary" onClick={install}>📲 Install app on your phone</button>
      {showHelp && (
        <p className="muted install-help">
          {isIos()
            ? 'Tap the Share button in Safari, then "Add to Home Screen".'
            : 'Open your browser menu (⋮) and choose "Install app" or "Add to Home screen".'}
        </p>
      )}
    </div>
  );
}
