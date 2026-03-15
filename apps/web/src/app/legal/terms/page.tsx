import Link from "next/link";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content:
      'By accessing or using Firasa ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. We reserve the right to update these terms at any time, and continued use constitutes acceptance of any changes.',
  },
  {
    title: "2. Description of Service",
    content:
      "Firasa is a trading intelligence platform that aggregates and analyzes signals from social media sources, including Twitter/X, to provide market insights and analytics. The Service includes dashboards, signal feeds, filtering tools, and subscription-based access tiers.",
  },
  {
    title: "3. Not Financial Advice",
    content:
      "IMPORTANT DISCLAIMER: Firasa does NOT provide financial advice, investment recommendations, or trading signals intended to guide your financial decisions. All data, analytics, and signals displayed on the platform are for INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY. You should consult a qualified financial advisor before making any investment decisions. Trading involves substantial risk of loss. Firasa, its officers, employees, and affiliates shall not be held liable for any trading losses incurred based on information obtained through the Service.",
    highlight: true,
  },
  {
    title: "4. User Accounts",
    content:
      "You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must be at least 18 years old to use the Service. Notify us immediately of any unauthorized use of your account.",
  },
  {
    title: "5. Subscription & Billing",
    content:
      "Paid features are available through subscription plans billed monthly or annually via Stripe. Subscriptions auto-renew unless cancelled before the renewal date. Refunds are handled on a case-by-case basis within 7 days of charge. We reserve the right to change pricing with 30 days' notice to active subscribers.",
  },
  {
    title: "6. Acceptable Use",
    content:
      "You agree not to: reverse-engineer, scrape, or redistribute data from the Service; use the Service to manipulate markets or engage in fraud; share account credentials; or use automated tools to access the Service beyond its intended API limits.",
  },
  {
    title: "7. Intellectual Property",
    content:
      "All content, branding, software, and analytics provided through Firasa are our intellectual property or licensed to us. You may not copy, modify, or distribute any part of the Service without written permission.",
  },
  {
    title: "8. Data Usage",
    content:
      "We collect and process data as described in our Privacy Policy. By using the Service, you consent to such processing. Signal data sourced from third-party platforms (e.g., Twitter/X) is subject to those platforms' terms of service.",
  },
  {
    title: "9. Limitation of Liability",
    content:
      'The Service is provided "AS IS" without warranties of any kind. To the maximum extent permitted by law, Firasa shall not be liable for any indirect, incidental, special, or consequential damages, including lost profits or data, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.',
  },
  {
    title: "10. Termination",
    content:
      "We may suspend or terminate your account at our discretion for violation of these terms, fraudulent activity, or extended inactivity. You may cancel your account at any time through the dashboard. Upon termination, your right to use the Service ceases immediately, though certain provisions of these terms survive termination.",
  },
  {
    title: "11. Governing Law",
    content:
      "These terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.",
  },
  {
    title: "12. Contact",
    content:
      "For questions about these Terms, contact us at legal@firasa.io.",
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-300 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
        >
          ← Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: March 2026
        </p>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white mb-2">
                {section.title}
              </h2>
              <p
                className={
                  section.highlight
                    ? "text-amber-400/90 bg-amber-400/5 border border-amber-400/20 rounded-lg p-4 text-sm leading-relaxed font-medium"
                    : "text-sm leading-relaxed"
                }
              >
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-xs text-gray-600">
          <p>
            See also our{" "}
            <Link
              href="/legal/privacy"
              className="text-gray-400 hover:text-white underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
