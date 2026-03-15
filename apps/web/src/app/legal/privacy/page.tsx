import Link from "next/link";

const sections = [
  {
    title: "1. Information We Collect",
    content:
      "We collect information you provide directly: name, email address, and payment details when you register or subscribe. We automatically collect usage data including IP address, browser type, pages visited, and feature interactions. We also process publicly available trading signal data sourced from the Twitter/X API.",
  },
  {
    title: "2. How We Use Your Information",
    content:
      "We use your data to: provide and improve the Service; process payments via Stripe; authenticate your identity via Firebase Auth; send service-related communications; analyze usage patterns to improve our product; and comply with legal obligations.",
  },
  {
    title: "3. Third-Party Services",
    content:
      "We integrate with the following third-party services: Firebase Authentication (Google) for account management and login; Stripe for secure payment processing — we never store your full card details; and the Twitter/X API for sourcing public trading signal data. Each provider has its own privacy policy governing their handling of your data.",
  },
  {
    title: "4. Data Sharing",
    content:
      "We do not sell your personal information. We may share data with: service providers who assist in operating the platform (under strict data processing agreements); law enforcement when required by law; and in connection with a merger or acquisition, with prior notice to users.",
  },
  {
    title: "5. Data Retention",
    content:
      "Account data is retained for the lifetime of your account plus 30 days after deletion. Payment records are retained for 7 years to comply with tax and financial regulations. Usage analytics are retained in anonymized form for up to 2 years. Signal data and cached tweets are retained for up to 90 days.",
  },
  {
    title: "6. Cookies & Tracking",
    content:
      "We use essential cookies for authentication and session management. We use analytics cookies (e.g., Google Analytics) to understand usage patterns. You can control cookie preferences through your browser settings. The Service does not respond to Do Not Track signals at this time.",
  },
  {
    title: "7. Your Rights (GDPR / CCPA)",
    content:
      "Depending on your jurisdiction, you may have the right to: access and receive a copy of your personal data; correct inaccurate data; request deletion of your data; object to or restrict processing; data portability; and withdraw consent. California residents may also request disclosure of data sold or shared. To exercise these rights, contact privacy@firasa.io.",
  },
  {
    title: "8. Security",
    content:
      "We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, regular security audits, and access controls. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    title: "9. Children's Privacy",
    content:
      "The Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete it promptly.",
  },
  {
    title: "10. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on the Service at least 14 days before changes take effect. Your continued use after changes constitutes acceptance.",
  },
  {
    title: "11. Contact Us",
    content:
      "For privacy-related inquiries, contact our Data Protection team at privacy@firasa.io. For general support, visit our help center or email support@firasa.io.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-300 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
        >
          ← Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: March 2026
        </p>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white mb-2">
                {section.title}
              </h2>
              <p className="text-sm leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-xs text-gray-600">
          <p>
            See also our{" "}
            <Link
              href="/legal/terms"
              className="text-gray-400 hover:text-white underline"
            >
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
