import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session or app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
    setDismissed(true);
    setPrompt(null);
  };

  if (!prompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm animate-fade-in">
      <div className="glass-card border border-cyber-cyan/30 rounded-xl p-4 flex items-center gap-3 shadow-[0_0_20px_rgba(0,243,255,0.1)]">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20 flex items-center justify-center">
          <Download size={18} className="text-cyber-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white font-mono">Install CyberPong</p>
          <p className="text-[10px] text-gray-500">Add to home screen for the best experience</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="cyber" size="sm" onClick={handleInstall}>
            Install
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleDismiss} aria-label="Dismiss">
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
