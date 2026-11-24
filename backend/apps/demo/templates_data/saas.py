"""Demo template: a B2B product-analytics SaaS ("Lumen Analytics")."""

SIGN = "Warm regards,\nLumen Support"

SPEC = {
    "name": "Lumen Analytics",
    "industry": "SaaS",
    "tagline": "Product analytics for modern teams",
    "agent_title": "Lumen Support",
    "visitor_name": "Avery Morgan",
    "team": [("Riya Patel", "ADMIN"), ("Jamal Brooks", "AGENT"), ("Elena Rossi", "AGENT")],
    "tone": (
        "Friendly, concise and technically precise. Talk to customers like capable colleagues: no corporate filler, "
        "no exclamation marks. Acknowledge impact first, then give the fix or the next step. Own mistakes plainly. "
        "Only promise timelines that the knowledge base states."
    ),
    "categories": [
        {"key": "billing", "name": "Billing & Plans", "description": "Invoices, refunds, failed payments, seats, plan changes.",
         "keywords": {"invoice": 3, "refund": 3, "charge": 3, "billed": 3, "payment": 2, "card": 2, "seat": 2, "plan": 1, "renewal": 2, "price": 1}},
        {"key": "incident", "name": "Bugs & Outages", "description": "Product errors, slow or stale dashboards, outages.",
         "keywords": {"error": 3, "bug": 3, "outage": 3, "down": 2, "slow": 2, "stale": 2, "dashboard": 1, "not loading": 3, "timeout": 2, "crash": 3}},
        {"key": "access", "name": "Account & Access", "description": "Login, SSO, 2FA, permissions, invites, data export and retention.",
         "keywords": {"sso": 4, "login": 3, "log in": 3, "password": 3, "2fa": 3, "okta": 3, "permission": 2, "invite": 2, "locked out": 4, "export": 2}},
        {"key": "integrations", "name": "Integrations & API", "description": "Segment, warehouses, webhooks, API keys and rate limits.",
         "keywords": {"api": 3, "segment": 3, "webhook": 3, "snowflake": 3, "bigquery": 3, "429": 4, "rate limit": 4, "sync": 2, "pipeline": 2, "sdk": 2}},
        {"key": "howto", "name": "How-to & Guidance", "description": "Questions about using features, best practices, general feedback.",
         "keywords": {"how do": 3, "how to": 3, "tutorial": 2, "best practice": 2, "funnel": 1, "cohort": 1, "feature request": 2}, "is_default": True},
    ],
    "articles": [
        {"title": "Refunds and credits", "category": "billing", "body": """
Annual plans can be refunded in full within 14 days of purchase or renewal. After 14 days we do not refund the unused term, but we can convert the remaining balance into account credit that applies to your next invoice.

Monthly plans are not refundable once the billing period has started, but you can cancel at any time and keep access until the period ends.

If you were charged twice for the same period, we refund the duplicate in full regardless of timing. Refunds go back to the original payment method and show up in 5-10 business days depending on your bank.
"""},
        {"title": "Plans, seats and overage", "category": "billing", "body": """
Starter is billed at $29 per seat per month and includes 1M tracked events per month. Growth is $49 per seat per month (or $39 per seat per month billed annually) and includes 10M events. Enterprise is custom priced.

Adding a seat mid-cycle is prorated for the remaining days of the period. Removing a seat takes effect at the next renewal; we do not prorate removals.

If you exceed your monthly event allowance, tracking continues and overage is billed at $2 per additional 100,000 events on your next invoice. We email the account owner at 80% and 100% of the allowance.
"""},
        {"title": "Resolving failed payments", "category": "billing", "body": """
When a card payment fails we retry automatically after 1, 3 and 5 days and email the billing contact each time. The workspace stays fully active during this retry window.

If all retries fail, the workspace moves to read-only after 7 days; no data is deleted. Updating the payment method in Settings > Billing triggers an immediate retry, and full access returns within minutes of a successful charge.

Invoices paid by bank transfer are due within 30 days and are not subject to automatic retries.
"""},
        {"title": "API rate limits and 429 errors", "category": "integrations", "body": """
The ingestion API accepts up to 600 requests per minute per project on Growth and 3,000 on Enterprise (Starter: 120). Each response includes X-RateLimit-Remaining and Retry-After headers.

A 429 response means the limit was exceeded; retry after the number of seconds in Retry-After and use exponential backoff. Batch up to 500 events per request to stay well within limits.

Temporary limit increases for backfills can be requested by the project owner; we typically apply them within one business day.
"""},
        {"title": "Segment and warehouse sync troubleshooting", "category": "integrations", "body": """
If events from Segment, Snowflake or BigQuery stop arriving, first check Settings > Integrations for the connection status and the last successful sync time.

Common causes: an expired credential or write key, a changed schema in the source, or hitting the ingestion rate limit. Re-authorising the integration fixes expired credentials in under a minute.

Events delayed by an incident are backfilled automatically once the connection recovers, for up to 72 hours. Beyond that window, use the replay tool or contact support for a manual backfill.
"""},
        {"title": "Single sign-on (SSO) and login issues", "category": "access", "body": """
SSO is available on Enterprise through SAML 2.0 (Okta, Azure AD, Google Workspace). If users are redirected back to the login page, the usual cause is an expired or rotated IdP signing certificate. Upload the new certificate in Settings > Security > SSO.

Locked-out admins can use the emergency login link sent to the workspace owner's email; it is valid for 30 minutes and bypasses SSO once.

For password logins, reset links expire after 60 minutes. Two-factor resets require the workspace owner to approve the request.
"""},
        {"title": "Data export and retention", "category": "access", "body": """
Owners and admins can export raw events as CSV or Parquet from Settings > Data. Exports up to 10M rows are generated within 30 minutes and the download link stays valid for 7 days.

Event data is retained for 13 months on Growth and 36 months on Enterprise. When a workspace is cancelled, data is kept for 30 days in case of reactivation and then permanently deleted.

GDPR deletion requests for individual users are processed within 30 days; use the Privacy tab or contact support.
"""},
        {"title": "Incident response and SLA targets", "category": "incident", "body": """
Our status page lists live incidents and is the first place to check. For confirmed incidents we post an update at least every 60 minutes until resolution.

First-response targets: Enterprise 1 hour for critical issues; Growth 4 hours for critical, 24 hours for high; Starter 48 hours. Critical means analytics or ingestion is down for the whole workspace.

After a major incident we publish a post-incident review within five business days, and affected Growth and Enterprise customers receive service credit proportional to the downtime.
"""},
        {"title": "Dashboard loading slowly or showing stale data", "category": "incident", "body": """
Dashboards refresh on a 5-minute cache. If numbers look stale, use the refresh button on the dashboard to bypass the cache for that view.

Slow dashboards usually come from queries spanning more than 90 days with many breakdowns. Narrow the date range, remove high-cardinality breakdowns, or save the query as a cohort to precompute it.

If a single dashboard is slow while others are fast, send us its URL and we can check the query plan.
"""},
        {"title": "Quick start: building your first funnel", "category": "howto", "body": """
Open Analyze > Funnels, add the steps in order (for example Signed up, Created project, Invited teammate) and set a conversion window. You can add up to 10 steps.

Use Breakdown to split the funnel by plan, country or acquisition channel, and save it to a dashboard so your team can follow it. Funnels recalculate automatically as new events arrive.
"""},
        {"title": "Escalation playbook (internal)", "category": "incident", "internal": True, "body": """
Critical issues: page the on-call engineer through the #oncall channel, open an incident, and set the ticket to Critical so the SLA clock reflects it. Post customer updates every 60 minutes even if there is no change.

Refunds above $2,000 need finance approval; log the approval link in an internal note before confirming to the customer.
"""},
    ],
    "macros": [
        {"title": "Ask for a reproduction", "body": "Hi {{name}},\n\nThanks for reporting this. To track it down quickly, could you share the URL of the affected dashboard and roughly when you first noticed it?\n\nWarm regards,\nLumen Support"},
        {"title": "Refund confirmed", "body": "Hi {{name}},\n\nI've issued the refund to your original payment method. It typically appears within 5-10 business days depending on your bank.\n\nWarm regards,\nLumen Support"},
    ],
    "customers": [
        {"name": "Priya Raman", "email_local": "priya.raman", "company": "Finch Labs", "days_ago": 410,
         "profile": {"plan": "Growth (annual)", "seats": 18, "region": "EU"},
         "records": [
             {"kind": "Subscription", "reference": "SUB-3112", "title": "Growth plan, annual", "status": "Active",
              "data": {"seats": 18, "price_per_seat_per_month_usd": 39, "renewal_date": "18 Dec 2026", "last_invoice": "INV-2041, $8,424, paid", "payment_method": "Visa ending 4242"}},
             {"kind": "Integration", "reference": "INT-77", "title": "Segment to Lumen pipeline", "status": "Degraded",
              "data": {"last_successful_sync": "3 hours ago", "error_rate_24h": "14%", "events_delayed": "about 120,000"}},
         ]},
        {"name": "Marcus Webb", "email_local": "marcus.webb", "company": "Orbit Retail", "days_ago": 180,
         "profile": {"plan": "Starter (monthly)", "seats": 5, "region": "US"},
         "records": [
             {"kind": "Subscription", "reference": "SUB-4408", "title": "Starter plan, monthly", "status": "Payment failed",
              "data": {"seats": 5, "price_per_seat_per_month_usd": 29, "last_invoice": "INV-5120, $145, failed on 2 days ago", "payment_method": "Mastercard ending 8821", "retries_remaining": 2}},
         ]},
        {"name": "Sofia Alvarez", "email_local": "sofia.alvarez", "company": "Brightside Health", "days_ago": 520,
         "profile": {"plan": "Enterprise", "seats": 120, "region": "US", "sso": "Okta (SAML)"},
         "records": [
             {"kind": "Subscription", "reference": "SUB-1090", "title": "Enterprise agreement", "status": "Active",
              "data": {"seats": 120, "contract_end": "30 Jun 2027", "support_tier": "Enterprise (1h critical response)"}},
         ]},
        {"name": "Tom Becker", "email_local": "tom.becker", "company": "Pixel & Pine", "days_ago": 60,
         "profile": {"plan": "Growth (monthly)", "seats": 4, "region": "UK"},
         "records": [
             {"kind": "Subscription", "reference": "SUB-5231", "title": "Growth plan, monthly", "status": "Active",
              "data": {"seats": 4, "price_per_seat_per_month_usd": 49, "last_invoice": "INV-5877, $392, paid (charged twice, one pending refund)", "payment_method": "Visa ending 1111"}},
         ]},
        {"name": "Aisha Khan", "email_local": "aisha.khan", "company": "NorthPeak Logistics", "days_ago": 300,
         "profile": {"plan": "Growth (annual)", "seats": 9, "region": "US"},
         "records": [
             {"kind": "Integration", "reference": "KEY-9", "title": "Production ingestion API key", "status": "Active",
              "data": {"rate_limit_per_minute": 600, "requests_last_hour": 41200, "rate_limited_responses_last_hour": 1980}},
         ]},
        {"name": "Daniel Okafor", "email_local": "daniel.okafor", "company": "Cobalt Fintech", "days_ago": 240,
         "profile": {"plan": "Enterprise", "seats": 60, "region": "EU"},
         "records": [
             {"kind": "Data export", "reference": "EXP-204", "title": "Full events export, Jan to Sep", "status": "Queued",
              "data": {"rows": "48M", "format": "Parquet", "requested": "26 hours ago"}},
         ]},
    ],
    "tickets": [
        {"customer": 0, "record": 1, "age_hours": 5, "status": "OPEN", "priority": "CRITICAL", "category": "integrations",
         "sentiment": "NEGATIVE", "confidence": 0.93,
         "subject": "Segment events missing since this morning",
         "description": "None of our Segment events have shown up in Lumen since about 6am UTC. Our funnels are flat and the product team has a launch review in a few hours. The integration page says Degraded. Is this on your side?",
         "summary": "Customer's Segment pipeline has stopped delivering events since 6am and they have a launch review today.",
         "reasoning": "Ingestion degraded for a production pipeline with an imminent business deadline.",
         "draft": "Hi Priya,\n\nThanks for flagging this, and I'm sorry about the timing with your launch review. I can see your Segment to Lumen pipeline is currently Degraded: the last successful sync was 3 hours ago and about 120,000 events are delayed, with a 14% error rate over the past 24 hours.\n\nDelayed events are backfilled automatically once the connection recovers, for up to 72 hours, so nothing will be lost. In the meantime, please re-authorise the integration under Settings > Integrations, which clears expired credentials in under a minute. We're checking the connection from our side now and will update you within the hour.\n\n" + SIGN,
         "citations": ["Segment and warehouse sync troubleshooting", "Incident response and SLA targets"]},
        {"customer": 1, "record": 0, "age_hours": 30, "status": "OPEN", "priority": "HIGH", "category": "billing", "mine": True,
         "sentiment": "NEUTRAL", "confidence": 0.9,
         "subject": "Payment failed and we're worried about access",
         "description": "Our card payment failed on the latest invoice and I got a warning email. Will the workspace get locked? I've already updated the card but I'm not sure whether it was retried.",
         "summary": "Customer's payment failed and they want to know whether access will be locked after updating the card.",
         "reasoning": "Failed payment with risk of read-only access, but a retry window still applies.",
         "draft": "Hi Marcus,\n\nThanks for getting in touch. Your latest invoice (INV-5120, $145) failed on your Mastercard ending 8821, and there are 2 automatic retries remaining. Your workspace stays fully active during the retry window, so nothing is locked right now.\n\nSince you've already updated the card, saving a new payment method in Settings > Billing triggers an immediate retry, and full access is confirmed within minutes of a successful charge. If all retries were to fail, the workspace would only move to read-only after 7 days and no data is ever deleted.\n\nWe'll confirm here once the charge goes through.\n\n" + SIGN,
         "citations": ["Resolving failed payments"]},
        {"customer": 3, "record": 0, "age_hours": 52, "status": "IN_PROGRESS", "priority": "HIGH", "category": "billing", "mine": True,
         "sentiment": "NEGATIVE", "confidence": 0.88,
         "subject": "Charged twice for this month's invoice",
         "description": "I can see two identical charges of $392 on my card for the same Growth plan invoice. Please refund the duplicate as soon as possible, this is hitting our small business account.",
         "summary": "Customer was charged twice ($392) for the same invoice and wants the duplicate refunded.",
         "reasoning": "Duplicate charge is our error and has direct financial impact.",
         "conversation": [
             {"from": "staff", "after_min": 41, "body": "Hi Tom,\n\nThanks for the heads-up, and sorry about the duplicate charge. I can see both $392 charges against INV-5877. I'm raising the refund for the duplicate now and will confirm as soon as it's issued.\n\nWarm regards,\nLumen Support"},
             {"from": "note", "after_min": 44, "body": "Confirmed duplicate in billing console. Refund under $2k so no finance approval needed. Waiting for processor to confirm."},
             {"from": "customer", "after_min": 1500, "body": "Thanks. Do you know roughly when it should land on my card?"},
         ],
         "draft": "Hi Tom,\n\nThanks for your patience. The duplicate $392 charge on INV-5877 is being refunded to your Visa ending 1111. Refunds typically appear within 5-10 business days depending on your bank, and I'll make sure it's closed out on our side.\n\nIf it hasn't arrived after 10 business days, reply here and I'll chase it with the payment processor directly.\n\n" + SIGN,
         "citations": ["Refunds and credits"]},
        {"customer": 2, "record": 0, "age_hours": 9, "status": "OPEN", "priority": "CRITICAL", "category": "access",
         "sentiment": "NEGATIVE", "confidence": 0.95,
         "subject": "Entire company locked out via Okta SSO",
         "description": "Since this morning every user in our org gets bounced back to the Lumen login page after authenticating with Okta. We rotated our signing certificate yesterday. 120 people can't access dashboards and clinical ops needs them today.",
         "summary": "All 120 users are locked out of Lumen after an Okta signing certificate rotation.",
         "reasoning": "Whole-organisation login failure on an Enterprise account; certificate rotation is the likely cause.",
         "draft": "Hi Sofia,\n\nI'm sorry for the disruption, and I understand how urgent this is for clinical ops. Redirect loops right after authenticating with Okta are almost always caused by a rotated signing certificate, which matches the change you made yesterday.\n\nPlease upload the new certificate under Settings > Security > SSO. If you can't reach the settings page, the workspace owner can use the emergency login link sent to their email; it is valid for 30 minutes and bypasses SSO once. As an Enterprise customer you're on our 1-hour critical response, so I'm staying on this with you until everyone is back in.\n\n" + SIGN,
         "citations": ["Single sign-on (SSO) and login issues", "Incident response and SLA targets"]},
        {"customer": 4, "record": 0, "age_hours": 14, "status": "OPEN", "priority": "HIGH", "category": "integrations", "mine": True,
         "sentiment": "NEUTRAL", "confidence": 0.91,
         "subject": "Getting 429 errors on the ingestion API",
         "description": "Our backfill job started getting 429s about an hour ago. We're sending roughly 40k requests an hour and have a 600/min limit. Can you raise the limit while we finish loading historical data?",
         "summary": "Customer's backfill is being rate limited and they ask for a temporary limit increase.",
         "reasoning": "Rate-limit errors on production ingestion with a clear, documented remedy.",
         "draft": "Hi Aisha,\n\nThanks for the detail. Your production key is limited to 600 requests per minute, and over the last hour about 1,980 responses were rate limited out of roughly 41,200 requests, so the backfill is hitting the ceiling in bursts.\n\nTwo things help straight away: retry after the number of seconds in the Retry-After header with exponential backoff, and batch up to 500 events per request. For the backfill itself, a temporary limit increase can be requested by the project owner and we typically apply it within one business day, so I'll flag your request to the team now.\n\n" + SIGN,
         "citations": ["API rate limits and 429 errors"]},
        {"customer": 5, "record": 0, "age_hours": 26, "status": "OPEN", "priority": "MEDIUM", "category": "access",
         "sentiment": "NEUTRAL", "confidence": 0.84,
         "subject": "Full data export still queued after a day",
         "description": "I requested a full events export (Jan to Sep, Parquet) yesterday and it still shows Queued. Is something wrong? We need it for an audit next week.",
         "summary": "Customer's large Parquet export has been queued for over a day and they need it for an audit.",
         "reasoning": "Export is delayed beyond the documented window but there is no immediate outage.",
         "draft": "Hi Daniel,\n\nThanks for checking in. Exports up to 10M rows normally complete within 30 minutes, and yours is much larger at about 48M rows (Parquet), which is why it has been sitting in the queue for 26 hours.\n\nI'll ask the data team to prioritise it, and I'd suggest we split it into three smaller ranges so you can start on the audit sooner. The download link stays valid for 7 days once ready. I'll update you here once it's moving.\n\n" + SIGN,
         "citations": ["Data export and retention"]},
        {"customer": 3, "record": 0, "age_hours": 3, "status": "OPEN", "priority": "MEDIUM", "category": "incident",
         "sentiment": "NEUTRAL", "confidence": 0.86,
         "subject": "Dashboard numbers look stale",
         "description": "The revenue dashboard hasn't changed since yesterday afternoon even though we've had new signups. Other dashboards look fine. Is there a delay?",
         "summary": "One dashboard shows no new data since yesterday while others are updating.",
         "reasoning": "Single-dashboard staleness is commonly a cache or query issue, not an outage.",
         "draft": "Hi Tom,\n\nThanks for the report. Dashboards refresh on a 5-minute cache, so the quickest check is the refresh button on the revenue dashboard, which bypasses the cache for that view.\n\nIf it's still flat afterwards, send me the dashboard URL and I'll check its query. When one dashboard is stale and the others are fine, it's usually a query that spans a long date range with many breakdowns.\n\n" + SIGN,
         "citations": ["Dashboard loading slowly or showing stale data"]},
        {"customer": 0, "record": 0, "age_hours": 70, "status": "OPEN", "priority": "LOW", "category": "howto",
         "sentiment": "POSITIVE", "confidence": 0.9,
         "subject": "How do I build a funnel by acquisition channel?",
         "description": "We just upgraded and want to track signup to activation split by acquisition channel. Where do I set that up? Happy to jump on a call if it's easier.",
         "summary": "Customer wants to build a funnel broken down by acquisition channel.",
         "reasoning": "Informational how-to question from a happy customer.",
         "draft": "Hi Priya,\n\nGreat to hear the upgrade is going well. Open Analyze > Funnels, add your steps in order (for example Signed up, then Activated) and set a conversion window. Then use Breakdown to split by acquisition channel.\n\nSave it to a dashboard and it recalculates automatically as new events arrive. If you'd like a walkthrough, reply with a couple of times that suit you.\n\n" + SIGN,
         "citations": ["Quick start: building your first funnel"]},
        {"customer": 1, "record": 0, "age_hours": 120, "status": "RESOLVED", "priority": "MEDIUM", "category": "billing", "mine": True,
         "sentiment": "POSITIVE", "confidence": 0.89, "overridden": True, "ai_category": "howto",
         "subject": "Can we add two more seats mid-month?",
         "description": "We'd like to add two seats before the end of the month. Will we be billed for the whole month or just the remaining days?",
         "summary": "Customer asks how mid-cycle seat additions are billed.",
         "reasoning": "Reads like a how-to, but it is a billing question about proration.",
         "conversation": [
             {"from": "staff", "after_min": 35, "body": "Hi Marcus,\n\nAdding a seat mid-cycle is prorated for the remaining days of the period, so you only pay for the days you use. You can add them under Settings > Billing and the change applies immediately.\n\nWarm regards,\nLumen Support"},
             {"from": "customer", "after_min": 90, "body": "Perfect, done. Thanks for the quick answer!"},
         ]},
    ],
    "history_count": 44,
    "history_pool": [
        {"subject": "Invoice shows the wrong company name", "category": "billing", "description": "Our latest invoice has an old company name and we need it corrected for our accounting team."},
        {"subject": "Request to cancel annual renewal", "category": "billing", "description": "We're not renewing next quarter. Can you confirm cancellation and tell me what happens to our data?"},
        {"subject": "Refund for unused annual term", "category": "billing", "description": "We switched tools two weeks after renewing. Can we get a refund for the unused months?"},
        {"subject": "Events delayed by several hours", "category": "incident", "description": "Events from our mobile SDK are showing up hours late on dashboards since this morning."},
        {"subject": "Dashboard times out on 90 day range", "category": "incident", "description": "Our retention dashboard now times out when we select 90 days. It was fine last week."},
        {"subject": "Error 500 when saving a cohort", "category": "incident", "description": "Saving a cohort with more than five filters returns a 500 error every time."},
        {"subject": "Invite emails not arriving", "category": "access", "description": "Teammates are not receiving their invitation emails, even after resending twice."},
        {"subject": "Reset 2FA for a teammate", "category": "access", "description": "A teammate lost their phone and cannot log in. Please reset their two-factor authentication."},
        {"subject": "Need a GDPR deletion for one user", "category": "access", "description": "A customer asked us to delete their data. How do we remove all events for a single user?"},
        {"subject": "Webhook retries not firing", "category": "integrations", "description": "Our webhook endpoint was down for 20 minutes and we never saw retries when it came back."},
        {"subject": "BigQuery connection expired", "category": "integrations", "description": "The BigQuery integration says authentication failed. We rotated the service account recently."},
        {"subject": "Which SDK version supports batching?", "category": "integrations", "description": "Looking for the minimum JavaScript SDK version that supports event batching."},
        {"subject": "How do I set up a retention report?", "category": "howto", "description": "I'd like a weekly retention report for new signups. Where do I start?"},
        {"subject": "Best way to name events?", "category": "howto", "description": "Are there recommended naming conventions for events and properties before we instrument everything?"},
        {"subject": "Feature request: scheduled email reports", "category": "howto", "description": "It would be great to schedule dashboards as weekly PDF emails to stakeholders."},
    ],
}
