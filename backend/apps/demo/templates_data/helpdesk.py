"""Demo template: an internal IT helpdesk ("Northstar IT Helpdesk") for a mid-size company."""

SIGN = "Thanks,\nNorthstar IT"

SPEC = {
    "name": "Northstar IT Helpdesk",
    "industry": "IT helpdesk",
    "tagline": "Internal IT support for Northstar Group employees",
    "agent_title": "Northstar IT",
    "visitor_name": "Sam Whitfield",
    "team": [("Dana Kowalski", "ADMIN"), ("Luis Ortega", "AGENT"), ("Mei Tanaka", "AGENT")],
    "tone": (
        "Calm, practical and jargon-light. Employees are busy and not technical: give the shortest path to a fix, "
        "numbered steps when they must do something, and say plainly what IT will handle. No blame, no lectures about policy."
    ),
    "categories": [
        {"key": "hardware", "name": "Hardware & Devices", "description": "Laptops, monitors, phones, peripherals, repairs and replacements.",
         "keywords": {"laptop": 3, "screen": 2, "keyboard": 2, "monitor": 2, "battery": 3, "charger": 3, "broken": 2, "replacement": 2, "dock": 2, "phone": 1}},
        {"key": "software", "name": "Software & Licences", "description": "Application installs, licences, updates and crashes.",
         "keywords": {"install": 3, "licence": 3, "license": 3, "software": 2, "figma": 2, "adobe": 2, "update": 1, "crash": 2, "excel": 1, "app": 1}},
        {"key": "access", "name": "Accounts & Access", "description": "Passwords, MFA, VPN, shared drives and permission requests.",
         "keywords": {"password": 4, "mfa": 4, "vpn": 4, "locked out": 4, "access": 2, "permission": 3, "sharepoint": 2, "login": 3, "log in": 3, "reset": 2}},
        {"key": "network", "name": "Network & Wi-Fi", "description": "Wi-Fi, office network, printers and connectivity problems.",
         "keywords": {"wifi": 3, "wi-fi": 3, "network": 3, "internet": 2, "printer": 3, "slow": 1, "connection": 2, "ethernet": 2}},
        {"key": "general", "name": "General Request", "description": "Onboarding, offboarding, how-to questions and anything else.",
         "keywords": {"onboarding": 3, "new starter": 3, "how do": 2, "how to": 2, "question": 1}, "is_default": True},
    ],
    "articles": [
        {"title": "Password resets and MFA", "category": "access", "body": """
Passwords can be reset yourself at the Northstar sign-in page using "Forgot password". The reset link is valid for 30 minutes. If self-service fails, IT can issue a temporary password after confirming your identity with your manager.

Accounts lock for 15 minutes after 5 failed attempts. Multi-factor authentication uses the Authenticator app. If you lose or replace your phone, IT can reset your MFA enrolment; this requires a quick video call or approval from your manager and is normally done within one hour during business hours.
"""},
        {"title": "VPN setup and troubleshooting", "category": "access", "body": """
Remote work requires the Northstar VPN client. Sign in with your normal work email and approve the MFA prompt. The most common failure is an expired client certificate, shown as "Authentication failed". Reinstalling the VPN profile from the Company Portal renews it.

If the VPN connects but internal sites do not load, disconnect, wait 30 seconds and reconnect. If the problem continues, send IT the time of the attempt and the error text. Critical outages affecting many people are posted on the IT status page.
"""},
        {"title": "Laptop refresh and repairs", "category": "hardware", "body": """
Laptops are replaced on a 4-year cycle. Employees whose device is within 6 months of refresh can request an early replacement if it is unreliable.

Broken devices are repaired or swapped. Battery, charger and keyboard faults are covered and a loan laptop can be collected the same day from the IT desk. Repairs usually take 3 to 5 business days. Accidental damage is covered once per device; repeated damage is reviewed by your manager.
"""},
        {"title": "Software requests and licences", "category": "software", "body": """
Standard software (Microsoft 365, Slack, Zoom, Chrome) can be installed from the Company Portal with no approval. Specialist software such as Figma, Adobe Creative Cloud and Tableau needs manager approval and a cost centre.

Approved licences are usually assigned within one business day. Licences unused for 60 days are reclaimed automatically; you can request them again at any time.
"""},
        {"title": "Wi-Fi and office network", "category": "network", "body": """
Connect to "Northstar-Staff" with your work account. "Northstar-Guest" is for visitors only and has no access to internal systems. If the Wi-Fi shows connected but pages do not load, forget the network and reconnect.

Printers are found under Settings > Printers & scanners. Floor 3 and Floor 4 printers are managed by IT and the toner is replaced within one business day of a report.
"""},
        {"title": "Access requests and shared drives", "category": "access", "body": """
Access to shared drives and applications is granted by the data owner. IT submits the request on your behalf; owners respond within two business days. Access to finance and HR systems also requires your manager's approval.

Contractors receive access only for the length of their contract and it is removed automatically on their end date.
"""},
        {"title": "New starter and leaver checklist", "category": "general", "body": """
New starters receive a laptop on day one, provided HR has submitted the starter form at least 5 business days before the start date. Accounts and standard software are prepared in advance.

For leavers, IT disables accounts at the end of the last working day and collects devices within 3 business days. Managers can request mailbox forwarding for up to 30 days.
"""},
        {"title": "Security incident handling (internal)", "category": "access", "internal": True, "body": """
Suspected phishing or compromised accounts are Critical. Disable the account immediately, force a sign-out of all sessions, and open a security incident in the #sec-ops channel. Do not tell the employee the account is "hacked" until security confirms; say we are doing a protective review.

Laptop replacements over the standard cycle need sign-off from the IT manager; log the approval in an internal note.
"""},
    ],
    "macros": [
        {"title": "Request more details", "body": "Hi {{name}},\n\nThanks for letting us know. Could you tell us when this started and, if you can, send a screenshot of any error message?\n\nThanks,\nNorthstar IT"},
        {"title": "Loan laptop ready", "body": "Hi {{name}},\n\nYour loan laptop is ready at the IT desk. Bring your badge and we'll get you set up in a few minutes.\n\nThanks,\nNorthstar IT"},
    ],
    "customers": [
        {"name": "Hannah Fischer", "email_local": "hannah.fischer", "company": "Finance", "days_ago": 900,
         "profile": {"department": "Finance", "location": "Berlin office", "manager": "Karl Weiss"},
         "records": [
             {"kind": "Device", "reference": "LT-4471", "title": "MacBook Pro 14 (2022)", "status": "Faulty battery",
              "data": {"purchased": "Mar 2022", "refresh_due": "Mar 2026", "warranty": "Active until Mar 2026", "battery_health": "62%"}},
         ]},
        {"name": "Raj Mehta", "email_local": "raj.mehta", "company": "Sales", "days_ago": 400,
         "profile": {"department": "Sales", "location": "Remote", "manager": "Olivia Grant"},
         "records": [
             {"kind": "Access", "reference": "ACC-902", "title": "VPN profile", "status": "Certificate expired",
              "data": {"last_successful_login": "6 days ago", "certificate_expiry": "Expired 6 days ago"}},
         ]},
        {"name": "Chloe Dubois", "email_local": "chloe.dubois", "company": "Design", "days_ago": 650,
         "profile": {"department": "Design", "location": "Paris office", "manager": "Anton Reyes"},
         "records": [
             {"kind": "Software licence", "reference": "LIC-318", "title": "Figma Professional", "status": "Reclaimed (unused 60 days)",
              "data": {"cost_centre": "DSG-210", "reclaimed_on": "2 days ago"}},
         ]},
        {"name": "Ben Carter", "email_local": "ben.carter", "company": "Engineering", "days_ago": 1200,
         "profile": {"department": "Engineering", "location": "London office", "manager": "Priya Nair"},
         "records": [
             {"kind": "Access request", "reference": "REQ-5513", "title": "Read access to the Analytics shared drive", "status": "Pending data owner",
              "data": {"submitted": "3 business days ago", "data_owner": "Analytics team"}},
         ]},
        {"name": "Grace Okoye", "email_local": "grace.okoye", "company": "HR", "days_ago": 300,
         "profile": {"department": "HR", "location": "London office", "manager": "Tom Hale"},
         "records": [
             {"kind": "Device", "reference": "LT-5120", "title": "Dell Latitude 7440", "status": "Healthy",
              "data": {"purchased": "Jan 2025", "refresh_due": "Jan 2029"}},
         ]},
        {"name": "Victor Lindgren", "email_local": "victor.lindgren", "company": "Operations", "days_ago": 150,
         "profile": {"department": "Operations", "location": "Stockholm office", "manager": "Ingrid Berg"},
         "records": [
             {"kind": "Device", "reference": "PRT-F3", "title": "Floor 3 shared printer", "status": "Toner low",
              "data": {"location": "Floor 3, near kitchen", "last_toner_report": "1 day ago"}},
         ]},
    ],
    "tickets": [
        {"customer": 1, "record": 0, "age_hours": 3, "status": "OPEN", "priority": "HIGH", "category": "access",
         "sentiment": "NEGATIVE", "confidence": 0.92,
         "subject": "VPN says authentication failed before a client demo",
         "description": "I can't connect to the VPN this morning, it just says 'Authentication failed'. I have a client demo at 2pm and need the internal demo environment. Worked fine last week.",
         "summary": "Employee's VPN fails with authentication errors ahead of a client demo today.",
         "reasoning": "Expired VPN certificate on a remote worker blocks demo preparation.",
         "draft": "Hi Raj,\n\nSorry about the timing. Your VPN profile shows an expired certificate, which is the usual cause of the \"Authentication failed\" message.\n\n1. Open the Company Portal.\n2. Reinstall the VPN profile, which renews the certificate.\n3. Connect and approve the MFA prompt.\n\nIf the VPN connects but internal sites do not load, disconnect, wait 30 seconds and reconnect. Reply here with the time and error text if it still fails and we'll jump on it straight away.\n\n" + SIGN,
         "citations": ["VPN setup and troubleshooting"]},
        {"customer": 0, "record": 0, "age_hours": 26, "status": "OPEN", "priority": "MEDIUM", "category": "hardware", "mine": True,
         "sentiment": "NEUTRAL", "confidence": 0.9,
         "subject": "Laptop battery dies within an hour",
         "description": "My MacBook only lasts about an hour on battery now and the charger has to stay plugged in. It is affecting my work in meetings. Can it be replaced?",
         "summary": "Employee's laptop battery drains within an hour and they ask for a replacement.",
         "reasoning": "Degraded battery on a device near refresh; covered repair or early replacement.",
         "draft": "Hi Hannah,\n\nThanks for reporting this. Your MacBook Pro 14 (LT-4471) shows a battery health of 62%, which explains the short battery life. Battery faults are covered, and a loan laptop can be collected the same day from the IT desk while it is repaired. Repairs usually take 3 to 5 business days.\n\nThe device is also due for refresh in Mar 2026, so we can look at an early replacement instead. Let us know whether you prefer the repair or the replacement.\n\n" + SIGN,
         "citations": ["Laptop refresh and repairs"]},
        {"customer": 2, "record": 0, "age_hours": 20, "status": "OPEN", "priority": "LOW", "category": "software", "overridden": True, "ai_category": "access",
         "sentiment": "NEUTRAL", "confidence": 0.7,
         "subject": "Figma licence disappeared",
         "description": "I tried opening Figma today and it says I don't have a licence any more. I use it every week for design reviews. Can you restore it?",
         "summary": "Employee lost their Figma licence and wants it restored.",
         "reasoning": "Licence problem; AI first saw it as access but staff recategorised it as software.",
         "draft": "Hi Chloe,\n\nYour Figma Professional licence (LIC-318) was reclaimed 2 days ago because licences unused for 60 days are reclaimed automatically. You can request it again at any time, and approved licences are usually assigned within one business day.\n\nSince it is already linked to cost centre DSG-210, I'll re-request it for you now and confirm here once it is active.\n\n" + SIGN,
         "citations": ["Software requests and licences"]},
        {"customer": 3, "record": 0, "age_hours": 80, "status": "IN_PROGRESS", "priority": "MEDIUM", "category": "access", "mine": True,
         "sentiment": "NEGATIVE", "confidence": 0.86,
         "subject": "Still no access to the Analytics shared drive",
         "description": "I asked for read access to the Analytics drive days ago and nothing has happened. I need it to finish a report that is due Friday. Who is holding this up?",
         "summary": "Employee is waiting on drive access for a Friday deadline.",
         "reasoning": "Pending request beyond the normal two-day window with a deadline.",
         "conversation": [
             {"from": "staff", "after_min": 55, "body": "Hi Ben,\n\nThanks for flagging it. REQ-5513 is waiting on the Analytics team as the data owner. I'm chasing them directly now and will update you today.\n\nThanks,\nNorthstar IT"},
             {"from": "note", "after_min": 60, "body": "Pinged the Analytics owner in Slack and added the Friday deadline to the request."},
             {"from": "customer", "after_min": 1700, "body": "Any news? I'm now blocked on the report."},
         ],
         "draft": "Hi Ben,\n\nSorry for the wait. Your request REQ-5513 for read access to the Analytics shared drive was submitted 3 business days ago and is still pending with the Analytics team. Data owners should respond within two business days, so we are escalating it and I'll update you as soon as it is granted.\n\n" + SIGN,
         "citations": ["Access requests and shared drives"]},
        {"customer": 5, "record": 0, "age_hours": 30, "status": "OPEN", "priority": "LOW", "category": "network",
         "sentiment": "POSITIVE", "confidence": 0.93,
         "subject": "Floor 3 printer is running out of toner",
         "description": "Just a heads-up that the printer by the kitchen on floor 3 prints faintly. Looks like it needs toner.",
         "summary": "Employee reports the Floor 3 printer prints faintly, likely low toner.",
         "reasoning": "Routine low-priority printer maintenance report.",
         "draft": "Hi Victor,\n\nThanks for the heads-up. The Floor 3 printer near the kitchen (PRT-F3) is showing low toner from a report made 1 day ago. Toner on Floor 3 is replaced within one business day of a report, so it should be fixed by tomorrow.\n\n" + SIGN,
         "citations": ["Wi-Fi and office network"]},
        {"customer": 4, "record": None, "age_hours": 12, "status": "OPEN", "priority": "MEDIUM", "category": "general",
         "sentiment": "NEUTRAL", "confidence": 0.88,
         "subject": "Laptop for a new starter joining next week",
         "description": "We have a new starter joining HR next Monday. Will a laptop be ready for them on day one? The starter form went in a few days ago.",
         "summary": "HR asks whether a new starter's laptop will be ready on day one.",
         "reasoning": "Onboarding question; depends on the starter form lead time.",
         "draft": "Hi Grace,\n\nNew starters receive a laptop on day one as long as HR submits the starter form at least 5 business days before the start date. Accounts and standard software are prepared in advance.\n\nCould you confirm the date the form was submitted? If it is inside that window we can still try, and I'll check what we have in stock.\n\n" + SIGN,
         "citations": ["New starter and leaver checklist"]},
        {"customer": 1, "record": 0, "age_hours": 6, "status": "OPEN", "priority": "HIGH", "category": "access",
         "sentiment": "NEGATIVE", "confidence": 0.9,
         "subject": "Locked out after changing my phone, no MFA codes",
         "description": "I got a new phone and the Authenticator app doesn't have my work account. I'm locked out of email and can't approve anything. Please help, I'm travelling.",
         "summary": "Employee is locked out because their MFA was lost after a phone change.",
         "reasoning": "Complete lockout while travelling; MFA reset needed.",
         "draft": "Hi Raj,\n\nNo problem, this is a common one after a phone change. IT can reset your MFA enrolment; it needs a quick video call or approval from your manager, and it is normally done within one hour during business hours.\n\nReply with a good time for a short video call and we'll reset it, then you can enrol the new phone in the Authenticator app.\n\n" + SIGN,
         "citations": ["Password resets and MFA"]},
        {"customer": 0, "record": 0, "age_hours": 7, "status": "OPEN", "priority": "CRITICAL", "category": "access",
         "sentiment": "NEGATIVE", "confidence": 0.95,
         "subject": "I clicked a link in a suspicious email",
         "description": "I think I just entered my password on a fake sign-in page from an email that looked like it came from payroll. I closed it straight away. What should I do?",
         "summary": "Employee may have entered their password on a phishing page.",
         "reasoning": "Possible credential compromise requires immediate protective action.",
         "draft": "Hi Hannah,\n\nThank you for telling us straight away, that really helps. We are doing a protective review of your account now, which will sign you out of all sessions and require a password reset. Please do not use that password anywhere else.\n\nWe'll message you as soon as the review is done and walk you through signing back in.\n\n" + SIGN,
         "citations": ["Password resets and MFA", "Security incident handling (internal)"]},
        {"customer": 2, "record": 0, "age_hours": 110, "status": "RESOLVED", "priority": "MEDIUM", "category": "software", "mine": True,
         "sentiment": "POSITIVE", "confidence": 0.9,
         "subject": "Need Adobe Creative Cloud for a campaign",
         "description": "I need Adobe Creative Cloud for the spring campaign. How do I get it approved?",
         "summary": "Employee requests Adobe Creative Cloud for a campaign.",
         "reasoning": "Specialist software request with a manager approval path.",
         "conversation": [
             {"from": "staff", "after_min": 30, "body": "Hi Chloe,\n\nAdobe Creative Cloud needs manager approval and a cost centre. Ask Anton to approve the request in the portal and we'll assign the licence, usually within one business day.\n\nThanks,\nNorthstar IT"},
             {"from": "customer", "after_min": 400, "body": "Approved and it's installed, thank you!"},
         ]},
    ],
    "history_count": 44,
    "history_pool": [
        {"subject": "Monitor flickering at my desk", "category": "hardware", "description": "My external monitor flickers every few minutes. I've tried a different cable already."},
        {"subject": "Keyboard keys sticking", "category": "hardware", "description": "Several keys on my laptop keyboard stick and repeat letters. Could it be repaired?"},
        {"subject": "Charger stopped working", "category": "hardware", "description": "My laptop charger has stopped charging the machine. I need a replacement as soon as possible."},
        {"subject": "Install Zoom plugin for Outlook", "category": "software", "description": "Could you install the Zoom plugin for Outlook on my laptop?"},
        {"subject": "Excel crashes on a large file", "category": "software", "description": "Excel crashes every time I open the monthly finance workbook, about 80MB."},
        {"subject": "Tableau licence request", "category": "software", "description": "I need a Tableau licence for the new reporting project. My manager has agreed."},
        {"subject": "Forgot my password", "category": "access", "description": "I forgot my password after a holiday and the reset link in the email expired."},
        {"subject": "Cannot access HR portal", "category": "access", "description": "I get a permissions error when I open the HR portal since moving teams."},
        {"subject": "Account locked after failed attempts", "category": "access", "description": "I mistyped my password too many times and now I'm locked out."},
        {"subject": "Wi-Fi drops in meeting room 4", "category": "network", "description": "The Wi-Fi in meeting room 4 keeps dropping during video calls."},
        {"subject": "Printer won't connect", "category": "network", "description": "I can't add the Floor 4 printer on my laptop. It says the driver is unavailable."},
        {"subject": "Guest Wi-Fi access for a visitor", "category": "network", "description": "We have a client visiting tomorrow, how do they get on the guest Wi-Fi?"},
        {"subject": "How do I book a loan laptop?", "category": "general", "description": "My laptop is going for repair next week. How do I arrange a loan device?"},
        {"subject": "Offboarding a contractor", "category": "general", "description": "A contractor finishes on Friday. What do I need to do about their access and equipment?"},
        {"subject": "Where do I find the IT status page?", "category": "general", "description": "Is there a page that shows current IT outages? I couldn't find the link."},
    ],
}
