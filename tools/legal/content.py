"""The text of the legal pages, owned here rather than in Framer.

Framer used to hold the privacy policy and the terms, which meant every re-import
overwrote them and no correction could survive a sync. They are authored here, so
this file is the source of truth; tools/build-legal.py renders them into the
design's legal page layout.

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
# Companies House register, confirmed against the public record: LINKABLE LTD,
# active, incorporated 13 February 2023, registered office as below. The record
# also settles the address the old terms got wrong, which gave 10 York Rd SE1 7ND.
COMPANY_NUMBER = '14658892'
ADDRESS = ['10 Esprit Court', '21 Brune Street', 'London, England', 'E1 7ND']
CONTACT = 'support@linkable.link'
SITE = 'linkable.link'
UPDATED = '12 September 2026'
PRIVACY_UPDATED = '19 October 2026'  # Instagram data section added
TERMS_UPDATED = '20 October 2026'  # 6. Content usage rights added

# Nothing outstanding. support@linkable.link is confirmed as the address for data
# requests, so it is what both documents give.
#
# Two points were raised while writing these and deliberately set aside by the
# owner, recorded here so they read as decisions rather than oversights:
#
#   - ICO registration. A UK controller normally has to pay the data protection
#     fee, and whether Linkable is on that register was never confirmed. The
#     documents therefore name the ICO as the body to complain to, which is
#     accurate regardless, but claim no registration of our own.
#   - Subscription terms for the paid plans: fees, renewal, cancellation and
#     refunds are not covered by the terms below, which govern the website and
#     the collaboration model only. Anything contractual about money currently
#     rests on whatever is shown at the point of purchase.
#
# Add an entry here if something new needs supplying; build-legal.py prints the
# list on every run.
TODO = []


# --------------------------------------------------------------- privacy policy

PRIVACY = {
    'slug': 'privacy-policy',
    'updated': PRIVACY_UPDATED,
    'nav': 'Privacy Policy',
    'title': 'Privacy Policy',
    'lede': 'How we collect, use and protect personal data when you use Linkable.',
    'meta': 'How Linkable collects, uses and shares personal information, both on this '
            'website and in the Linkable app for Shopify.',
    'blocks': [
        ('h1', 'Linkable Privacy Policy'),
        ('p', f'<strong>Last updated: {PRIVACY_UPDATED}</strong>'),
        ('p', f'This policy covers two things: the {SITE} website you are reading, and the '
              'Linkable app that merchants install in Shopify. Where a section applies to only '
              'one of them it says so.'),
        ('p', f'{COMPANY} is the data controller for the information described here. We are a '
              f'company registered in England and Wales, number {COMPANY_NUMBER}, with our '
              f'registered office at {ADDRESS[0]}, {ADDRESS[1]}, {ADDRESS[2]} {ADDRESS[3]}. You '
              f'can reach us at <strong>{CONTACT}</strong>.'),

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
        ('h3', 'Information from Instagram'),
        ('p', 'A creator can connect her Instagram professional account, or sign in with it, '
              'through Meta’s Instagram API with Instagram Login. Only after she approves it on '
              'Instagram, we receive an access token for that account and read: her Instagram '
              'user ID, username, name, account type, profile picture, follower, following and '
              'post counts; the details of her latest posts (caption, type, link, date, likes and '
              'comments); her followers’ breakdown by age, gender and country, as '
              'percentages only; and the insights of posts she submits for a Linkable campaign '
              '(views, reach, likes, comments, shares, saves).'),
        ('p', 'We use this to verify that she owns the handle on her profile, to keep her '
              'profile figures and audience up to date for the brands she works with, and to '
              'report how her campaign posts performed. The token is stored '
              'encrypted, the data is refreshed daily and replaces the previous copy, and we never '
              'post, comment or message on her behalf.'),
        ('p', 'She can disconnect Instagram at any time in Settings, which deletes the token and '
              'everything read through it straight away. Removing Linkable in Instagram’s “Apps '
              'and websites” settings, or asking Meta to have the data deleted, does the same; a '
              'deletion request made through Meta returns a confirmation code she can check on '
              'our deletion status page. She can also write to us to have it deleted.'),
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
            'Data read from a connected Instagram account: while it stays connected; deleted '
            'as soon as it is disconnected, the app is removed in Instagram or a deletion request '
            'is received.',
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
    'updated': TERMS_UPDATED,
    'lede': 'The terms that apply when brands and creators use Linkable.',
    'meta': 'The terms on which you may use the Linkable website and the Linkable app '
            'for Shopify.',
    'blocks': [
        ('h1', 'Linkable Terms of Service'),
        ('p', f'<strong>Last updated: {TERMS_UPDATED}</strong>'),
        ('p', f'These terms are between you and {COMPANY}, a company registered in England and '
              f'Wales under number {COMPANY_NUMBER}, whose registered office is at '
              f'{ADDRESS[0]}, {ADDRESS[1]}, {ADDRESS[2]} {ADDRESS[3]}. They cover the {SITE} '
              'website. Where '
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
              'is paid out after the applicable returns window. What the merchant may do with '
              'the content the creator makes is set out in section 6, which forms part of '
              'their agreement.'),

        # Content usage rights: the same words as version 2026-10-20 in the app
        # (linkable repo, client/src/lib/constants/usage_rights_terms.ts), which
        # records the version each collaboration agreed. Drafted by Claude on
        # 20 October 2026; to be reviewed by a UK lawyer. Change both together,
        # and a change is a new version there.
        ('h2', '6. Content usage rights'),
        ('p', '<strong>Version 2026-10-20, effective 20 October 2026.</strong> Here “brand” means the merchant in section 5. In short:'),
        ('ul', [
            'The creator keeps ownership of the content. From approval, the brand gets a non-exclusive licence to use it.',
            'Own channels means the brand’s social accounts, website, online store, marketplace listings and emails. Not print, packaging, outdoor or TV.',
            'Ads only if the agreed option includes them, and only until its end date. Ads from the creator’s own handle need the creator’s separate permission.',
            'The brand may crop, cut, subtitle and add its logo and links. It may not change what the creator says or alter them with AI.',
            'Posts are labelled as ads. The licence stops if the fee isn’t paid or is refunded.',
        ]),
        ('p', 'This section sets out what a brand may do with the photos and videos (the “content”) a creator makes for a collaboration arranged through Linkable. It forms part of the agreement between that brand and that creator. Linkable Ltd is not a party to it: we record which terms were agreed and when, and show them to both sides.'),
        ('p', '<strong>6.1 Who owns the content.</strong> The creator owns the copyright in the content they make. Nothing in these terms transfers that ownership to the brand or to Linkable. The brand receives a licence, which is permission to use the content in the ways described below.'),
        ('p', '<strong>6.2 The three usage options.</strong> Every collaboration carries one of these options. It is shown on the campaign before a creator applies or accepts an invitation, and Linkable records the option and the version of these terms when the collaboration is accepted (“Accept”).'),
        ('ul', [
            'Own channels and ads for 12 months: use on the brand’s own channels with no end date, and in ads for 12 months from the date the content is approved.',
            'Own channels only, no ads: use on the brand’s own channels with no end date, and never in ads.',
            'Own channels and ads with no end date: use on the brand’s own channels and in ads, both with no end date.',
        ]),
        ('p', 'A later change to the campaign or to these terms does not change a collaboration that has already been accepted.'),
        ('p', '<strong>6.3 The licence.</strong> When the brand approves the content, including automatic approval at the end of the review period shown on the campaign, the creator grants the brand a non-exclusive, worldwide, royalty-free licence to copy, publish, display and share the approved content within the option agreed and these terms. The free product, fee and commission agreed for the collaboration are the full payment for this licence.'),
        ('p', 'Non-exclusive means the creator may keep using the content themselves, including on their own channels and in their portfolio. Before approval the brand may only view the content to review it.'),
        ('p', '“No end date” means the licence lasts for as long as copyright in the content lasts, unless it ends under 6.12 or 6.13.'),
        ('p', '<strong>6.4 Own channels.</strong> Own channels are channels the brand owns or controls and uses for its own business: its social media accounts (including reposts, story shares and collaborative posts), its website and online store, its listings on marketplaces, and its emails and newsletters. Use on own channels is organic: the brand does not pay to promote it.'),
        ('p', 'Own channels do not include printed materials, packaging, in-store or outdoor displays, TV, cinema or radio. Those need the creator’s separate written agreement.'),
        ('p', '<strong>6.5 Ads.</strong> Ads means paid media: the content placed or promoted in exchange for payment to a platform or publisher, for example boosted posts and ads on social networks, search engines and other online ad networks.'),
        ('p', 'Where the option includes ads, the brand may run them from its own accounts. Running ads through the creator’s own account or handle (for example Meta partnership ads, TikTok Spark Ads or “whitelisting”) needs the creator’s separate permission, given in the platform. The creator may refuse, and any permission given ends no later than the brand’s ad rights.'),
        ('p', 'With ads for 12 months, the ad rights end 12 months after the approval date (shown in Linkable as “Ads until” that date). By the end of that day the brand must stop every ad using the content, including ads it scheduled earlier.'),
        ('p', 'With no ads, the brand may not use the content in any paid placement, including boosting its own post.'),
        ('p', '<strong>6.6 Edits.</strong> The brand may make the edits needed to use the content where it is allowed to: crop, resize or reframe it; shorten it or cut it into clips; add subtitles, captions, translations, its logo, product details, prices, discount codes, links, calls to action and any label the law or a platform requires; and replace the music with music it has licensed for that use.'),
        ('p', 'The brand may not:'),
        ('ul', [
            'change what the creator says or does, or the meaning of the content;',
            'add words, claims or endorsements the creator did not make;',
            'combine the content with other material in a way that suggests the creator endorses another product, brand or cause;',
            'alter the creator’s face, body or voice, including with AI or other synthetic media tools;',
            'use the content, or the creator’s likeness or voice, to train an AI model or to generate new content;',
            'present the content in a way that is derogatory or would harm the creator’s reputation.',
        ]),
        ('p', 'Anything beyond these edits needs the creator’s separate written agreement.'),
        ('p', '<strong>6.7 Credit and moral rights.</strong> When the brand reposts the creator’s own post organically, it credits the creator, for example by tagging their handle or using a collaborative post, where the platform allows. Ads and other uses do not have to credit the creator.'),
        ('p', 'Under the Copyright, Designs and Patents Act 1988 the creator has moral rights, including the right to be identified as the author and the right to object to derogatory treatment of the work. The creator consents to the uses and edits these terms allow, and waives those moral rights, and any performer’s rights in their appearance in the content, only to that extent. In every other respect the creator keeps them.'),
        ('p', '<strong>6.8 Who else may use the content.</strong> The brand may let others use the content on its behalf and within these terms: its group companies, its agencies and contractors, and the platforms and ad networks that host or run it. The brand is responsible for what they do. The brand may not sell, license or give the content to anyone to use for their own purposes, and an agency may not use it for its other clients.'),
        ('p', '<strong>6.9 Ad labels and the law.</strong> A collaboration is advertising under UK rules, because the creator receives a product, fee or commission and the brand reviews the content. When posting, the creator labels it clearly and upfront as an ad, for example “Ad” or “#ad” at the start of the caption or the platform’s paid partnership label, as the CAP Code and the ASA and CMA guidance for influencers require. “#gifted”, “#sp” or a thank-you alone is not enough.'),
        ('p', 'The brand must not ask the creator to hide or play down the label. The brand is responsible for its own use of the content, including every ad it runs and every claim about its product, complying with the CAP Code, consumer protection law and the platform’s rules.'),
        ('p', '<strong>6.10 The creator’s promises.</strong> The creator confirms that:'),
        ('ul', [
            'the content is their own original work and they are free to grant this licence;',
            'everyone who can be identified in the content agreed to appear in it and to its use under these terms, with a parent’s or guardian’s agreement for anyone under 18;',
            'the content contains no music, artwork, footage, logos or other material belonging to someone else, unless it is licensed for the uses these terms allow;',
            'what the content says about the product is their honest opinion of it, makes no claim the brand has not supplied or approved, and is not misleading;',
            'the content does not break the law or the platform’s rules, or infringe anyone’s rights.',
        ]),
        ('p', 'Music added from a platform’s library (for example Instagram or TikTok sounds) is usually licensed for that platform only. Before using such content anywhere else or in an ad, the brand removes or replaces the music, unless the platform’s licence covers that use.'),
        ('p', '<strong>6.11 The brand’s promises.</strong> The brand confirms that it will use the content only as these terms allow, that the product information and claims it supplies in the brief are accurate and lawful, and that it will handle the personal data in the content, such as the creator’s image, in line with UK data protection law.'),
        ('p', '<strong>6.12 Ending a collaboration, refunds and non-payment.</strong>'),
        ('ul', [
            'If a collaboration ends before the content is approved, no licence is granted and the brand may not use any content it has seen.',
            'If the agreed fee or commission is not paid when due, the brand must stop using the content until it is paid. If it is still unpaid 30 days after it fell due, the creator may end the licence by notice through Linkable or by email.',
            'If a fee the brand paid is refunded to it, for example because the creator did not post as agreed, the licence ends unless the creator agrees otherwise.',
            'When a licence ends, the brand removes the content from its social media accounts, website, online store and ads within 7 days. It does not have to recall what cannot be recalled, such as emails already sent.',
            'A brand cancelling its Linkable plan, or a creator deleting their Linkable account, does not end a licence already granted.',
        ]),
        ('p', '<strong>6.13 Removal on request.</strong> Once the ad rights have ended, the creator may ask the brand to take down any ad still showing the content, and the brand does so within 5 working days.'),
        ('p', 'At any time the creator may ask the brand to stop using the content and remove it from the places the brand controls if someone who appears in it withdraws their agreement, if it puts anyone’s safety at risk, or if a credible legal claim is made about it. The brand does so within 5 working days of a request made through Linkable or by email. Otherwise, own-channel use the brand has already made under these terms does not have to be removed.'),
        ('p', 'The brand may stop using the content at any time.'),
        ('p', '<strong>6.14 Responsibility.</strong> The brand and the creator are each responsible to the other for loss caused by their own breach of these terms, as far as the law allows. Linkable is not responsible for how either side uses the content or meets these terms, but may suspend an account that breaks them and will help either side reach the other. Questions or complaints: support@linkable.link.'),
        ('p', '<strong>6.15 Versions.</strong> We may update this section. Each version has an id and an effective date. A collaboration keeps the version in force when it was accepted, and both sides can see that version and the option agreed on the collaboration in Linkable. These terms are governed by the laws of England and Wales.'),

        ('h2', '7. Privacy'),
        ('p', 'Our handling of personal data is described in the '
              '<a href="/legal/privacy-policy">Privacy Policy</a>, and the cookies this site '
              'uses in the <a href="/legal/cookie-policy">Cookie Policy</a>.'),

        ('h2', '8. Suspension and termination'),
        ('p', 'You may stop using the site at any time. We may suspend or end your access if you '
              'break these terms, if we are required to by law, or if your use threatens the '
              'security or availability of the service. Except where a breach or a legal '
              'obligation makes it impractical, we will give you notice and an opportunity to put '
              'things right first. Sections that by their nature should outlive termination, '
              'including the licence granted above, the disclaimers and the liability limits, '
              'continue to apply.'),

        ('h2', '9. Availability and disclaimers'),
        ('p', 'We work to keep the site available but do not promise it will be uninterrupted or '
              'error-free, and it is provided as is. To the extent the law allows, we exclude '
              'implied warranties. Nothing here limits any right you have as a consumer that '
              'cannot lawfully be excluded.'),

        ('h2', '10. Liability'),
        ('p', 'We do not exclude or limit liability for death or personal injury caused by our '
              'negligence, for fraud or fraudulent misrepresentation, or for anything else that '
              'cannot lawfully be limited. Subject to that, we are not liable for indirect or '
              'consequential loss, or for lost profits, revenue, goodwill or data, and our total '
              'liability arising from your use of the site is limited to the greater of the '
              'amount you paid us in the twelve months before the claim, or one hundred pounds.'),

        ('h2', '11. Governing law'),
        ('p', 'These terms are governed by the laws of England and Wales, and the courts of '
              'England and Wales have exclusive jurisdiction, except that if you are a consumer '
              'resident elsewhere in the UK or the EEA you keep the right to bring proceedings in '
              'your own country.'),

        ('h2', '12. Contact'),
        ('p', f'<strong>{CONTACT}</strong>'),
        ('address', None),
    ],
}


# ----------------------------------------------------------------- cookie policy

COOKIES = {
    'slug': 'cookie-policy',
    'nav': 'Cookie Policy',
    'title': 'Cookie Policy',
    'lede': 'The cookies this website uses, what each one does and how to change your choice.',
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
