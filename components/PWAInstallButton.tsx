/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallModalTrigger: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 transition-colors whitespace-nowrap shrink-0"
        title="Install Reactive Mind as an App"
      >
        <Download size={13} className="text-blue-600" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Install Reactive Mind App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <p className="text-xs text-slate-600 leading-relaxed space-y-1.5">
                <span className="block">
                  1. Tap the <strong>Share</strong> button in your Safari toolbar.
                </span>
                <span className="block">
                  2. Scroll down and select <strong>Add to Home Screen</strong>.
                </span>
              </p>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                To install Reactive Mind on your desktop or phone, open this workspace in a standalone browser tab and click the <strong>Install App</strong> icon in your browser&apos;s address bar, or choose <strong>Add to Home Screen</strong> from your browser menu.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md">
      <span>Offline Mode — Viewing your saved workspace bubbles</span>
    </div>
  );
};
