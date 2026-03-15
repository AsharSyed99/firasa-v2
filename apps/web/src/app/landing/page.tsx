import Link from 'next/link';

const FEATURES = [
  { icon: '🧠', title: 'AI-Powered Analysis', desc: 'Every tweet is analyzed by AI to extract tickers, sentiment, and confidence scores.' },
  { icon: '⚡', title: 'Real-Time Alerts', desc: 'Get push notifications and WhatsApp alerts within seconds of a guru posting.' },
  { icon: '📊', title: 'Trade Tracker', desc: 'Track entry prices, current prices, and outcomes across all timeframes.' },
  { icon: '🏆', title: 'Guru Leaderboard', desc: 'See which gurus have the best track records with transparent win rates.' },
  { icon: '🔔', title: 'Smart Filtering', desc: 'Set score thresholds, quiet hours, and ticker watchlists to only get signals that matter.' },
  { icon: '📱', title: 'Works Everywhere', desc: 'Web, Android, and iPhone. One subscription, all devices.' },
];

const STEPS = [
  { step: '1', title: 'Pick Your Gurus', desc: 'Follow top trading experts from Twitter/X' },
  { step: '2', title: 'AI Analyzes Tweets', desc: 'Our AI extracts tickers, sentiment, and scores each signal' },
  { step: '3', title: 'Get Alerted Instantly', desc: 'Receive real-time notifications via push, WhatsApp, or email' },
  { step: '4', title: 'Track Performance', desc: 'See which calls win and which gurus deliver results' },
];

const PRICING = [
  { tier: 'Free', price: '$0', period: 'forever', features: ['3 gurus', '5 alerts/day', '7-day history', 'Push notifications'], cta: 'Get Started', highlight: false },
  { tier: 'Pro', price: '$9.99', period: '/month', features: ['20 gurus', '50 alerts/day', '90-day history', 'Trade tracker', 'WhatsApp alerts', 'API access'], cta: 'Start Pro Trial', highlight: true },
  { tier: 'Premium', price: '$29.99', period: '/month', features: ['100 gurus', '200 alerts/day', '1-year history', 'Portfolio tracking', 'Priority support', 'Email digest', 'Custom alerts'], cta: 'Go Premium', highlight: false },
];

const TESTIMONIALS = [
  { name: 'Alex K.', role: 'Day Trader', quote: 'Firasa catches signals I would have missed. The AI analysis saves me hours of scrolling Twitter.' },
  { name: 'Maria S.', role: 'Swing Trader', quote: "The trade tracker is incredible. I can finally see which gurus actually deliver and which ones don't." },
  { name: 'James R.', role: 'Options Trader', quote: 'The WhatsApp alerts are a game changer. I get notified before the market even reacts.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold">🔥 Firasa</span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">Dashboard</Link>
            <Link href="/onboarding" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-block bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          Powered by AI · Real-time signals
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          Trading Signals<br />
          <span className="text-emerald-400">From Twitter to You</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Follow top trading gurus on X. Our AI analyzes every tweet, scores each signal,
          and alerts you in real-time. Track performance. Make informed decisions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/onboarding" className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-xl text-lg font-semibold transition shadow-lg shadow-emerald-500/20">
            Start Free →
          </Link>
          <a href="#how-it-works" className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-xl text-lg transition">
            How It Works
          </a>
        </div>
        <p className="text-xs text-gray-600 mt-6">No credit card required · Free forever plan available</p>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-900/50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-gray-400 text-center mb-12">Start free. Upgrade when you&apos;re ready.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING.map((p) => (
            <div key={p.tier} className={`rounded-2xl p-6 ${p.highlight ? 'bg-emerald-500/10 border-2 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-gray-900 border border-gray-800'}`}>
              {p.highlight && <div className="text-emerald-400 text-xs font-bold mb-3">⭐ MOST POPULAR</div>}
              <h3 className="text-xl font-bold">{p.tier}</h3>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-gray-400 text-sm">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding" className={`block text-center py-3 rounded-lg font-medium transition ${p.highlight ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-900/50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Traders Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-300 mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Trade Smarter?</h2>
        <p className="text-gray-400 mb-8">Join thousands of traders using AI-powered signals from top Twitter gurus.</p>
        <Link href="/onboarding" className="inline-block bg-emerald-600 hover:bg-emerald-500 px-10 py-4 rounded-xl text-lg font-semibold transition shadow-lg shadow-emerald-500/20">
          Start Free Today →
        </Link>
      </section>

      {/* Disclaimer */}
      <section className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400/80 text-xs">
            ⚠️ <strong>Disclaimer:</strong> Firasa is not a financial advisor. All signals and analysis
            are for informational purposes only and do not constitute financial advice.
            Trading involves risk. Past performance does not guarantee future results.
            Always do your own research before making investment decisions.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-gray-500 text-sm">© 2026 Firasa. All rights reserved.</span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/legal/terms" className="hover:text-gray-300 transition">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-gray-300 transition">Privacy</Link>
            <a href="mailto:support@firasa.app" className="hover:text-gray-300 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
