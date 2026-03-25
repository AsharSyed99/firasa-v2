export function FooterDisclaimer() {
  return (
    <div className="text-center text-xs text-gray-600 px-4 py-3 border-t border-gray-900">
      <p>
        Firasa is for educational purposes only. Not financial advice. Trading involves risk.{' '}
        <a href="/legal/terms" className="underline hover:text-gray-400">Terms</a>
        {' · '}
        <a href="/legal/privacy" className="underline hover:text-gray-400">Privacy</a>
      </p>
    </div>
  );
}
