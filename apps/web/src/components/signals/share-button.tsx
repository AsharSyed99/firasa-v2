'use client';

import { useState, useCallback } from 'react';
import type { SignalDto } from '@firasa/shared';

interface Props {
  signal: SignalDto;
}

const SHARE_BASE = 'https://firasa.app/s';

export function ShareButton({ signal }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${SHARE_BASE}/${signal.id}`;
  const ticker = signal.tickers[0] ?? '';
  const shareText = `${signal.action} $${ticker} — signal from @${signal.guruHandle} on Firasa`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    setShowModal(false);
  }, [shareText, shareUrl]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: shareText, url: shareUrl });
    } catch {
      // User cancelled or unsupported
    }
    setShowModal(false);
  }, [shareText, shareUrl]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        aria-label="Share signal"
      >
        ↗ Share
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-100 mb-1">Share Signal</h3>

            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-750 text-left transition-colors"
            >
              <span className="text-lg">📋</span>
              <div className="flex-1">
                <span className="text-sm text-gray-200">
                  {copied ? 'Copied!' : 'Copy link'}
                </span>
                {copied && (
                  <span className="block text-xs text-green-400 mt-0.5">Link copied to clipboard</span>
                )}
              </div>
            </button>

            <button
              onClick={handleTwitter}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-750 text-left transition-colors"
            >
              <span className="text-lg">𝕏</span>
              <span className="text-sm text-gray-200">Share to X / Twitter</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-750 text-left transition-colors"
              >
                <span className="text-lg">📤</span>
                <span className="text-sm text-gray-200">More sharing options</span>
              </button>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
