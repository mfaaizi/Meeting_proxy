import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import PageShell from '../components/PageShell'

const faqs = [
  {
    q: 'How does MeetingProxy join meetings?',
    a: 'It uses your configured automation stack with OBS virtual camera and browser automation.',
  },
  {
    q: 'How are answers generated?',
    a: 'Questions are transcribed, matched with your library, and answered with your context-aware AI model.',
  },
  {
    q: 'Can I customize expected questions?',
    a: 'Yes. Add custom Q&A in the Custom Questions page and generate videos for them.',
  },
  {
    q: 'Is my data secure?',
    a: 'Authentication is handled by Firebase and backend sessions are secured with cookies.',
  },
  {
    q: 'Can I stop a meeting anytime?',
    a: 'Yes. Use the Stop Meeting button from the Active Meeting page.',
  },
]

export default function HelpPage() {
  return (
    <PageShell title="How It Works">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-xl font-semibold">Step by Step Guide</h2>
        <ol className="list-decimal space-y-2 pl-5 text-gray-700 dark:text-gray-300">
          <li>Sign in with Google through Firebase.</li>
          <li>Upload your photo and add your context.</li>
          <li>Generate your default and custom library videos.</li>
          <li>Start your avatar bot and monitor active meetings.</li>
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-xl font-semibold">FAQ</h2>
        <div className="space-y-2">
          {faqs.map((item) => (
            <Disclosure key={item.q}>
              {({ open }) => (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <DisclosureButton className="flex w-full items-center justify-between px-4 py-3 text-left">
                    <span>{item.q}</span>
                    <ChevronDownIcon className={`h-5 w-5 ${open ? 'rotate-180' : ''}`} />
                  </DisclosureButton>
                  <DisclosurePanel className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-300">
                    {item.a}
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-semibold">System Requirements</h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>OBS Studio</li>
            <li>VB-Audio Cable</li>
            <li>Chrome browser</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-semibold">Contact & Support</h2>
          <p className="text-gray-700 dark:text-gray-300">Email: support@meetingproxy.ai</p>
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Video tutorial placeholder
          </div>
        </div>
      </section>
    </PageShell>
  )
}
