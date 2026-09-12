"""The text of the legal pages, owned here rather than in Framer.

Framer used to hold the privacy policy and the terms, which meant every re-import
overwrote them and no correction could survive a sync. They are authored here now
and import-framer.py no longer fetches them, so this file is the source of truth.

Facts stated below that are not derivable from the code are limited to ones the
site already asserted before this change: the company name, the Brune Street
address and support@linkable.link. Anything else a UK notice would normally carry
and that nothing in the repo establishes, above all the Companies House
registration number, is deliberately absent rather than invented. See the TODO at
the bottom for what needs supplying.

The cookie section describes behaviour that was measured in a browser rather than
assumed from the tag names: with no choice made, or after Reject all, no
third-party request leaves the page and no cookie is set; analytics alone loads
googletagmanager.com and sets none; marketing alone loads connect.facebook.net
and sets _fbp.
"""

COMPANY = 'Linkable Ltd'
ADDRESS = ['10 Esprit Court', '21 Brune Street', 'London, England', 'E1 7ND']
CONTACT = 'support@linkable.link'
SITE = 'linkable.link'
UPDATED = '12 September 2026'

# Facts the documents would be better for, which nothing in the repo establishes.
# Left out rather than guessed; add them here and re-run tools/build-legal.py.
TODO = [
    'Companies House registration number, for the "who we are" section of both documents.',
    'Whether Linkable is registered with the ICO as a data controller, and its registration number.',
    'The subscription terms that apply to the paid plans (fees, renewal, cancellation, refunds), '
    'which the current terms do not cover at all.',
    'Confirmation that support@linkable.link is the right address for data requests, '
    'rather than a dedicated privacy contact.',
]


# --------------------------------------------------------------- privacy policy

PRIVACY = {
    'slug': 'privacy-policy',
    'nav': 'Privacy Policy',
    'title': 'Privacy Policy',
    'meta': 'How Linkable collects, uses and shares personal information, both on this '
            'website and in the Linkable app for Shopify.',
    'blocks': [
        ('h1', 'Linkable Privacy Policy'),
        ('p', f'<strong>Last updated: {UPDATED}</strong>'),
        ('p', f'This policy covers two things: the {SITE} website you are reading, and the '
              'Linkable app that merchants install in Shopify. Where a section applies to only '
              'one of them it says so.'),
        ('p', f'{COMPANY} is the data controller for the information described here. You can '
              f'reach us at <strong>{CONTACT}</strong> or at the address at the end of this page.'),

        ('h2', 'The website'),
        ('h3', 'What we collect when you visit'),
        ('p', 'Our hosting provider records the usual technical information needed to serve and '
              'protect the site: IP address, browser and device type, the pages requested and '
              'when. This happens for every visitor because a web server cannot deliver a page '
              'without it, and we use it only to run the site and investigate abuse.'),
        ('p', 'Beyond that, nothing is measured unless you allow it. We ask on your first visit '
              'and load no analytics or advertising until you answer. Refusing means no '
              'third-party request is made at all, and ignoring the banner counts as refusing. '
              'The detail of each cookie, and how to change your mind, is in our '
              '<a href="/legal/cookie-policy">Cookie Policy</a>.'),
        ('h3', 'If you contact us'),
        ('p', 'The contact form and the newsletter box send us the details you type, which reach '
              f'us by email through Resend, our email provider. We use them to answer you and, '
              'for the newsletter, to send what you asked for until you unsubscribe.'),
        ('h3', 'Legal basis'),
        ('p', 'Serving and securing the site, and replying to you, rest on our legitimate '
              'interest in operating a business and responding to the people who approach us. '
              'Analytics and advertising cookies rest on your consent, which you can withdraw at '
              'any time without affecting anything that happened before.'),

        ('h2', 'The Linkable app'),
        ('h3', 'Information from Shopify'),
        ('p', 'When a merchant installs the app we receive, through Shopify’s APIs and '
              'limited to the permissions granted:'),
        ('ul', [
            '<strong>Store information</strong>: name, URL, currency and time zone.',
            '<strong>Products</strong>: titles, descriptions, images, variants and inventory, '
            'to build campaigns from.',
            '<strong>Orders</strong>: order IDs, timestamps, SKUs, fulfilment status, shipping '
            'country and order value, used to attribute and validate creator-driven sales. We do '
            'not request full buyer names, email addresses, phone numbers or street addresses '
            'unless a commission dispute requires it and the merchant grants it.',
            '<strong>Discount codes</strong>, to run and attribute affiliate campaigns.',
            '<strong>Installation data</strong>, to keep the app synchronised with the store.',
        ]),
        ('h3', 'Information merchants and creators give us'),
        ('ul', [
            '<strong>Merchants</strong>: name, business email, store address, billing details for '
            'the subscription, and the details of any colleague given access.',
            '<strong>Creators</strong>: name, email, social media handles, links to content, '
            'audience figures, country of residence, and payout details, which are collected and '
            'held by Stripe rather than by us.',
        ]),
        ('h3', 'What we do with it'),
        ('ul', [
            'Run the service: sync products, track clicks and conversions, validate commissions.',
            'Process creator payouts through Stripe Connect.',
            'Send transactional and support messages about your account and campaigns.',
            'Diagnose faults and improve how the product works.',
            'Detect and prevent fraud and misuse.',
        ]),
        ('p', 'We do not sell, rent or otherwise monetise merchant, creator or shopper data.'),
        ('h3', 'Legal basis'),
        ('p', 'Providing the service to a merchant or creator is performance of our contract with '
              'them. Fraud prevention and product improvement rest on our legitimate interests. '
              'Marketing email to people who are not customers rests on consent. Some retention '
              'is a legal obligation, described below.'),

        ('h2', 'Who we share it with'),
        ('ul', [
            '<strong>Stripe</strong>, to process creator payouts through Stripe Connect.',
            '<strong>Suppliers who run our infrastructure</strong>: cloud hosting, databases, '
            'error reporting and the email provider that delivers our messages. They act on our '
            'instructions and may not use the data for their own purposes.',
            '<strong>The other side of a collaboration</strong>: when a merchant accepts a '
            'creator, each sees what the collaboration requires, such as the product and the '
            'shipping details needed to send a sample.',
            '<strong>Google and Meta</strong>, but only for website visitors who allowed '
            'analytics or marketing cookies, and only what those tags collect. They are separate '
            'controllers for that data. See the '
            '<a href="/legal/cookie-policy">Cookie Policy</a>.',
            '<strong>Authorities</strong>, where we are obliged to respond to a lawful request, '
            'or where disclosure is necessary to establish or defend a legal claim.',
        ]),

        ('h2', 'Transfers outside the UK and EEA'),
        ('p', 'Some of our suppliers operate outside the UK and the EEA, including in the United '
              'States. Where personal data goes to a country without an adequacy decision, it is '
              'covered by the International Data Transfer Agreement, the UK Addendum to the EU '
              'Standard Contractual Clauses, or the Standard Contractual Clauses, as applicable.'),

        ('h2', 'How long we keep it'),
        ('ul', [
            'Merchant and campaign data: for as long as the store uses Linkable.',
            'Commission and payout records: six years after the transaction, to meet UK tax and '
            'accounting requirements.',
            'Contact and newsletter messages: two years from our last exchange, or until you '
            'unsubscribe.',
            'Website server logs: kept short-term by our host for security and diagnostics.',
        ]),
        ('p', 'If a merchant uninstalls the app, their store data is deleted or anonymised within '
              '90 days, except records we are required to keep for longer. You may ask us to '
              'delete your data sooner.'),

        ('h2', 'Your rights'),
        ('p', 'If you are in the UK or the EEA you have the right to access the personal data we '
              'hold about you, to have it corrected or erased, to restrict or object to how we '
              'use it, to receive it in a portable form, and to withdraw consent where our use '
              'rests on consent. Where a decision rests on legitimate interests you may object '
              'to it.'),
        ('p', f'Write to <strong>{CONTACT}</strong> and we will respond within one month. If you '
              'are unhappy with the outcome you can complain to a data protection authority. In '
              'the UK that is the Information Commissioner’s Office, ico.org.uk or 0303 123 '
              '1113; in the EEA it is the authority for the country you live in.'),

        ('h2', 'Children'),
        ('p', 'Linkable is not intended for anyone under 18 and we do not knowingly collect data '
              'from children. If you believe a child has given us personal data, contact us and '
              'we will delete it.'),

        ('h2', 'Changes'),
        ('p', 'When this policy changes we update the date at the top. If a change materially '
              'affects how we use personal data we will tell affected merchants and creators '
              'directly rather than relying on you to notice.'),

        ('h2', 'Contact'),
        ('p', f'<strong>{CONTACT}</strong>'),
        ('address', None),
    ],
}


# ------------------------------------------------------------ terms of service

TERMS = {
    'slug': 'terms-of-service',
    'nav': 'Terms of Service',
    'title': 'Terms of Service',
    'meta': 'The terms on which you may use the Linkable website and the Linkable app '
            'for Shopify.',
    'blocks': [
        ('h1', 'Linkable Terms of Service'),
        ('p', f'<strong>Last updated: {UPDATED}</strong>'),
        ('p', f'These terms are between you and {COMPANY}. They cover the {SITE} website. Where '
              'you subscribe to a paid plan or run collaborations through the Linkable app, the '
              'plan terms presented at the point of purchase apply as well, and prevail over '
              'these terms if the two conflict.'),

        ('h2', '1. Accepting these terms'),
        ('p', 'Using the site means accepting these terms. If you do not accept them, do not use '
              'the site.'),

        ('h2', '2. Changes'),
        ('p', 'We may change these terms. When we do we update the date above, and material '
              'changes affecting an existing subscription will be notified to the account holder '
              'rather than left for you to discover. Continuing to use the site after a change '
              'means accepting the revised terms.'),

        ('h2', '3. Using the site'),
        ('p', '<strong>Eligibility.</strong> You must be at least 18 to use Linkable, and if you '
              'act for a company you confirm you are authorised to bind it.'),
        ('p', '<strong>Accounts.</strong> Where a feature needs an account, give accurate details '
              'and keep them current. You are responsible for what happens under your account and '
              'for keeping your credentials to yourself.'),
        ('p', '<strong>Acceptable use.</strong> Do not attempt to disrupt or gain unauthorised '
              'access to the site, scrape it at a scale that degrades it for others, upload '
              'malware, or use it to break the law or infringe anyone’s rights.'),

        ('h2', '4. Content'),
        ('p', '<strong>Your content.</strong> You keep ownership of what you submit. You grant us '
              'a non-exclusive, worldwide, royalty-free licence to host, store, reproduce and '
              'display it for as long as is necessary to operate and promote the service, '
              'including the right to have our suppliers do so on our behalf. The licence ends '
              'when you remove the content, except where we must retain a copy to meet a legal '
              'obligation or where it has already been shared with a collaboration partner.'),
        ('p', '<strong>Our content.</strong> The site, its text, design, and the Linkable name '
              'and logo are ours or our licensors’ and are protected by copyright and trade '
              'mark law. You may not copy or reuse them beyond what these terms allow without our '
              'written permission.'),

        ('h2', '5. Collaborations between merchants and creators'),
        ('p', 'Linkable introduces merchants and creators and provides the tools to run and '
              'measure a collaboration. The agreement about what is delivered and what is paid is '
              'between the merchant and the creator. We are not a party to it, we do not '
              'guarantee that either side will perform, and we do not guarantee any level of '
              'sales, reach or return. Where a campaign includes a gifted product, sending it is '
              'the merchant’s responsibility. Affiliate commission tracked through Linkable '
              'is paid out after the applicable returns window.'),

        ('h2', '6. Privacy'),
        ('p', 'Our handling of personal data is described in the '
              '<a href="/legal/privacy-policy">Privacy Policy</a>, and the cookies this site '
              'uses in the <a href="/legal/cookie-policy">Cookie Policy</a>.'),

        ('h2', '7. Suspension and termination'),
        ('p', 'You may stop using the site at any time. We may suspend or end your access if you '
              'break these terms, if we are required to by law, or if your use threatens the '
              'security or availability of the service. Except where a breach or a legal '
              'obligation makes it impractical, we will give you notice and an opportunity to put '
              'things right first. Sections that by their nature should outlive termination, '
              'including the licence granted above, the disclaimers and the liability limits, '
              'continue to apply.'),

        ('h2', '8. Availability and disclaimers'),
        ('p', 'We work to keep the site available but do not promise it will be uninterrupted or '
              'error-free, and it is provided as is. To the extent the law allows, we exclude '
              'implied warranties. Nothing here limits any right you have as a consumer that '
              'cannot lawfully be excluded.'),

        ('h2', '9. Liability'),
        ('p', 'We do not exclude or limit liability for death or personal injury caused by our '
              'negligence, for fraud or fraudulent misrepresentation, or for anything else that '
              'cannot lawfully be limited. Subject to that, we are not liable for indirect or '
              'consequential loss, or for lost profits, revenue, goodwill or data, and our total '
              'liability arising from your use of the site is limited to the greater of the '
              'amount you paid us in the twelve months before the claim, or one hundred pounds.'),

        ('h2', '10. Governing law'),
        ('p', 'These terms are governed by the laws of England and Wales, and the courts of '
              'England and Wales have exclusive jurisdiction, except that if you are a consumer '
              'resident elsewhere in the UK or the EEA you keep the right to bring proceedings in '
              'your own country.'),

        ('h2', '11. Contact'),
        ('p', f'<strong>{CONTACT}</strong>'),
        ('address', None),
    ],
}


# ----------------------------------------------------------------- cookie policy

COOKIES = {
    'slug': 'cookie-policy',
    'nav': 'Cookie Policy',
    'title': 'Cookie Policy',
    'meta': 'The cookies and browser storage used on linkable.link, what each one does, '
            'and how to change what you allow.',
    'blocks': [
        ('h1', 'Linkable Cookie Policy'),
        ('p', f'<strong>Last updated: {UPDATED}</strong>'),
        ('p', f'This policy explains the cookies and similar storage used on '
              f'<strong>{SITE}</strong>, this website. It does not cover the Linkable app inside '
              'Shopify, which is described in our '
              '<a href="/legal/privacy-policy">Privacy Policy</a>.'),
        ('p', 'Cookies are small files a site asks your browser to keep. Some are needed for the '
              'site to function; the rest are optional and we only set them if you say yes. We '
              'also use your browser’s local storage, which works the same way and is '
              'covered here too.'),

        ('h2', 'Your choice'),
        ('p', 'When you first arrive we ask what you are willing to allow. Nothing optional is '
              'loaded before you answer, and choosing to refuse is one click, exactly like '
              'accepting. If you refuse, or simply ignore the banner, no analytics or advertising '
              'request leaves your browser at all.'),
        ('p', 'You can change your mind whenever you like using the '
              '<a href="#cookie-settings">Cookie settings</a> link in the footer of every page. '
              'Clearing your browser storage also resets the question. We ask again after six '
              'months in any case.'),

        ('h2', 'What we use'),

        ('h3', 'Strictly necessary — always on'),
        ('p', 'One entry, set by us, recording the choice you made so we do not ask on every '
              'page. It is kept in your browser’s local storage rather than sent to us, '
              'contains only the categories you allowed and the date you chose, and is never used '
              'to identify or track you. There is no opt-out because without it we cannot honour '
              'your decision.'),
        ('ul', [
            '<strong>lk-consent</strong> — local storage, set by linkable.link, holds your '
            'consent categories and the date. Treated as expired after six months.',
        ]),

        ('h3', 'Analytics — off unless you allow it'),
        ('p', 'Google Tag Manager, which loads our measurement tags, so we can see which pages '
              'are read, which are ignored, and where people give up. We look at this in '
              'aggregate to decide what to write and what to fix.'),
        ('ul', [
            '<strong>Google Tag Manager</strong> (container GTM-535WR8K4), loaded from '
            'googletagmanager.com. The container itself set no cookies when we last checked, but '
            'it is the mechanism through which measurement tags are added, and those can set '
            'their own. Anything loaded through it inherits the consent you gave here.',
        ]),

        ('h3', 'Marketing — off unless you allow it'),
        ('p', 'The Meta pixel, which tells us whether our advertising on Facebook and Instagram '
              'brings anyone to the site, and allows Meta to show our ads to people who have '
              'visited before.'),
        ('ul', [
            '<strong>_fbp</strong> — cookie set by linkable.link for Meta, identifying a '
            'browser across visits so a visit can be matched to an ad. Expires after about three '
            'months.',
            '<strong>lastExternalReferrer</strong> and <strong>lastExternalReferrerTime</strong> '
            '— local storage written by the Meta pixel, recording which site you arrived '
            'from and when.',
        ]),
        ('p', 'Allowing this category means data about your visit is shared with Meta Platforms, '
              'which processes it as described in its own privacy policy. Refusing it means the '
              'pixel is never loaded, so nothing is sent.'),

        ('h2', 'Third parties'),
        ('p', 'The optional cookies above are set on behalf of Google and Meta, who act as '
              'separate controllers for what they receive. Their handling of it is governed by '
              'their own policies, not ours. Our other suppliers, such as the hosting that serves '
              'these pages and the service that delivers form submissions to us, do not set '
              'cookies for advertising or analytics.'),

        ('h2', 'Changes'),
        ('p', 'If we add, remove or repurpose a cookie we will update this page and, where the '
              'change needs your permission, ask for it again rather than assume your previous '
              'answer still applies.'),

        ('h2', 'Contact'),
        ('p', f'Questions about this policy, or about the data behind it, can go to '
              f'<strong>{CONTACT}</strong>. If you are in the UK or the EU you also have the '
              'right to complain to a data protection authority; in the UK that is the '
              'Information Commissioner’s Office at ico.org.uk.'),
        ('address', None),
    ],
}

PAGES = [PRIVACY, TERMS, COOKIES]
