// Privacy policy for the website and the mobile app.
// Keep it accurate: when the site starts collecting something new or uses a new
// service (analytics, a newsletter, payments...), update this page and LAST_UPDATED.
import { Link } from 'react-router';
import { CONTACT_EMAIL } from '../components/links';
import { inlineLink, label, switchLink } from '../components/styles';

export const LAST_UPDATED = 'November 11, 2026';

const heading =
  'text-[24px] leading-[30px] lg:text-[26px] lg:leading-[33px] lg:tracking-[-0.01em]';
const body = 'text-[16px] leading-[27px] lg:text-[18px] lg:leading-[31px]';
const list = `${body} flex list-disc flex-col gap-2 pl-5 lg:pl-6`;
// Extra space above each section heading and the back link.
const sectionGap = 'mt-3 lg:mt-6';
const sectionHeading = `${heading} ${sectionGap}`;

const email = (
  <a href={`mailto:${CONTACT_EMAIL}`} className={inlineLink}>
    {CONTACT_EMAIL}
  </a>
);

export default function PrivacyPage() {
  return (
    <article className="px-4 pt-12 pb-18 lg:px-[140px] lg:pt-[104px] lg:pb-[120px]">
      <header className="mb-[22px] flex flex-col gap-2.5 lg:mb-10 lg:gap-3.5">
        <p className={`${label} text-ink-muted`}>Eisai Studio</p>
        <h1 className="text-[56px] leading-[58px] tracking-[-0.02em] lg:text-[88px] lg:leading-[88px]">
          Privacy policy
        </h1>
        <p className={`${label} text-ink-muted`}>Last updated {LAST_UPDATED}</p>
      </header>

      {/* The rule spans the full content width like Our Story; the text sits in
          a narrower ~600px column so long policy lines stay easy to read. */}
      <div className="border-t border-ink pt-7 lg:pt-14">
        <div className="flex max-w-150 flex-col gap-4 lg:gap-5">
          <p className={body}>
            Eisai Studio LLC (“Eisai”, “we”, “us”) is a matcha business in
            Orlando, Florida. This policy explains what information we collect
            through eisaistudio.com and the Eisai mobile app, how we use it, and
            the choices you have.
          </p>

          <h2 className={sectionHeading}>What we collect</h2>
          <p className={body}>
            You can browse the website and menu without an account. If you
            create one, we collect:
          </p>
          <ul className={list}>
            <li>Your first and last name and email address.</li>
            <li>
              Your password, which we store only in scrambled (hashed) form. We
              can’t see it.
            </li>
          </ul>
          <p className={body}>
            Like most websites, our server also records basic technical details
            of each visit: your IP address, the date and time, and the page
            requested. We use these to keep the service secure and working, for
            example to block repeated failed logins.
          </p>

          <h2 className={sectionHeading}>How we use it</h2>
          <ul className={list}>
            <li>To create and run your account and keep you signed in.</li>
            <li>
              To send account emails: verifying your address and resetting your
              password. We don’t send marketing emails.
            </li>
            <li>To protect the service against abuse and fix problems.</li>
          </ul>

          <h2 className={sectionHeading}>Cookies and tracking</h2>
          <p className={body}>
            We don’t use cookies, analytics, advertising pixels or any other
            tracking tools. When you log in, the website saves a sign-in token
            in your browser’s local storage, and the app saves it in your
            phone’s secure storage, so you stay signed in. Logging out removes
            it, and it stops working after one hour.
          </p>
          <p className={body}>
            Because we don’t track you across other websites, we don’t change
            how we handle data in response to “Do Not Track” or Global Privacy
            Control signals.
          </p>

          <h2 className={sectionHeading}>Who we share it with</h2>
          <p className={body}>
            We don’t sell your personal information or share it for advertising.
            We use a few service providers to run Eisai, and they handle data
            only to provide their service to us:
          </p>
          <ul className={list}>
            <li>Amazon Web Services hosts our website, app server and data.</li>
            <li>Mailtrap delivers our account emails.</li>
            <li>
              Google Fonts provides the website’s fonts, so your browser
              requests them from Google, which receives your IP address.
            </li>
          </ul>
          <p className={body}>
            We may also disclose information if the law requires it, or to
            protect the rights and safety of Eisai, our customers or others.
          </p>

          <h2 className={sectionHeading}>How long we keep it</h2>
          <ul className={list}>
            <li>
              Account information: until you ask us to delete your account.
            </li>
            <li>Server logs: about two weeks.</li>
            <li>
              Email verification and password reset links stop working after 15
              minutes.
            </li>
          </ul>

          <h2 className={sectionHeading}>Your choices</h2>
          <p className={body}>
            You can ask us for a copy of your information, ask us to correct it,
            or ask us to delete your account by emailing {email} from the
            address on your account. We’ll respond within 30 days. You can also
            delete your account yourself on your{' '}
            <Link to="/account" className={inlineLink}>
              Account page
            </Link>
            .
          </p>

          <h2 className={sectionHeading}>Security</h2>
          <p className={body}>
            We use HTTPS for every connection, store passwords only in hashed
            form, and limit who can access our systems. No service can promise
            perfect security, so please use a password you don’t use anywhere
            else.
          </p>

          <h2 className={sectionHeading}>Children</h2>
          <p className={body}>
            Eisai isn’t meant for children under 13, and we don’t knowingly
            collect their information. If you think a child has created an
            account, email us and we’ll delete it.
          </p>

          <h2 className={sectionHeading}>Changes to this policy</h2>
          <p className={body}>
            If we change this policy, we’ll update it here and change the date
            at the top.
          </p>

          <h2 className={sectionHeading}>Contact us</h2>
          <p className={body}>
            Questions about your privacy? Email {email}. Eisai Studio LLC,
            Orlando, Florida.
          </p>

          <Link to="/" className={`${sectionGap} self-start ${switchLink}`}>
            ← Back to home
          </Link>
        </div>
      </div>
    </article>
  );
}
