import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'garagem-install-dismissed';

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptGlobal = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPromptGlobal = null;
  });
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    () => deferredPromptGlobal,
  );
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isRunningStandalone() || dismissed) return;

    if (deferredPromptGlobal) {
      setPromptEvent(deferredPromptGlobal);
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      deferredPromptGlobal = evt;
      setPromptEvent(evt);
    }

    function handleInstalled() {
      deferredPromptGlobal = null;
      setPromptEvent(null);
      setShowIOSHint(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if (isIOSDevice()) {
      setShowIOSHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [dismissed]);

  function handleDismiss() {
    setDismissed(true);
    setPromptEvent(null);
    setShowIOSHint(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }

  async function handleInstallClick() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      deferredPromptGlobal = null;
      setPromptEvent(null);
    }
  }

  if (dismissed || isRunningStandalone() || (!promptEvent && !showIOSHint)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          {promptEvent ? <Download size={20} /> : <Share size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Instalar App Garagem</p>
          {promptEvent ? (
            <p className="text-xs text-slate-300 mt-0.5">
              Adicione à tela inicial para abrir como aplicativo.
            </p>
          ) : (
            <p className="text-xs text-slate-300 mt-0.5">
              Toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>

        {promptEvent && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors shrink-0"
          >
            Instalar
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          title="Fechar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}