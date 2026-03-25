'use client';

import { useState, useEffect } from 'react';

const DISCLAIMER_KEY = 'firasa_disclaimer_accepted';

export function DisclaimerBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!accepted) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full p-6 border border-gray-800">
        <div className="text-center mb-4">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-xl font-bold text-white mt-2">Important Disclaimer</h2>
        </div>

        <div className="text-gray-300 text-sm space-y-3 mb-6">
          <p>
            <strong>Firasa is an educational tool, not a financial advisor.</strong> The signals,
            analysis, and information provided are for informational and educational purposes only.
          </p>
          <p>
            We do not provide personalized investment advice. All trading involves risk, and past
            performance does not guarantee future results. You could lose some or all of your
            invested capital.
          </p>
          <p>
            The signals are derived from public social media posts and AI analysis. They should
            not be the sole basis for any investment decision. Always do your own research and
            consult a licensed financial advisor before making investment decisions.
          </p>
          <p className="text-yellow-400 font-medium">
            By using Firasa, you acknowledge that you are solely responsible for your own
            investment decisions and any resulting gains or losses.
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.setItem(DISCLAIMER_KEY, 'true');
            setShow(false);
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}
