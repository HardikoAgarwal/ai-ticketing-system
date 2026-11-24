"""Demo template: a direct-to-consumer store support desk ("Tidewater Goods")."""

SIGN = "Warm regards,\nTidewater Care Team"

SPEC = {
    "name": "Tidewater Goods",
    "industry": "E-commerce",
    "tagline": "Sustainable homeware, delivered",
    "agent_title": "Tidewater Care Team",
    "visitor_name": "Morgan Ellis",
    "team": [("Priya Venkat", "ADMIN"), ("Noah Bergström", "AGENT"), ("Isla McKay", "AGENT")],
    "tone": (
        "Warm, personable and reassuring, like a friendly shop owner. Lead with empathy, then give a clear answer. "
        "Short paragraphs, plain words, no corporate phrases. Own any mistake and always offer a concrete fix."
    ),
    "categories": [
        {"key": "shipping", "name": "Shipping & Delivery", "description": "Order tracking, delays, lost parcels and delivery address changes.",
         "keywords": {"tracking": 3, "delivery": 3, "shipping": 3, "parcel": 3, "arrived": 2, "delayed": 3, "lost": 2, "courier": 3, "address": 1, "where is": 3}},
        {"key": "returns", "name": "Returns & Refunds", "description": "Returns, exchanges, refunds and cancellations.",
         "keywords": {"return": 3, "refund": 4, "exchange": 3, "cancel": 3, "money back": 3, "send back": 3}},
        {"key": "product", "name": "Product Issues", "description": "Damaged, faulty or wrong items; product care and sizing questions.",
         "keywords": {"damaged": 4, "broken": 3, "faulty": 3, "wrong item": 4, "cracked": 3, "missing": 2, "defective": 3, "size": 1}},
        {"key": "payment", "name": "Payments & Discounts", "description": "Charges, discount codes, gift cards and payment failures.",
         "keywords": {"charged": 3, "discount": 3, "code": 2, "gift card": 3, "payment": 2, "coupon": 3, "promo": 2, "invoice": 2}},
        {"key": "general", "name": "General Question", "description": "Anything else: stock, wholesale, feedback.", "is_default": True,
         "keywords": {"restock": 2, "back in stock": 3, "wholesale": 2, "feedback": 2}},
    ],
    "articles": [
        {"title": "Shipping times and tracking", "category": "shipping", "body": """
Standard delivery takes 3 to 5 business days and express delivery takes 1 to 2 business days. Orders placed before 2pm on a business day are dispatched the same day. You receive a tracking link by email as soon as your order ships.

Tracking can take up to 24 hours to update after dispatch. If a parcel shows no movement for 5 business days, contact us and we will open an investigation with the courier. Parcels not delivered within 10 business days of dispatch are treated as lost and we will send a replacement or refund.
"""},
        {"title": "Returns and refunds", "category": "returns", "body": """
You can return unused items in their original packaging within 30 days of delivery. Start a return from your order page to get a free prepaid label.

Refunds are issued to the original payment method within 5 business days of us receiving the return, and your bank may take a few extra days to show it. Sale items are exchange or store credit only. Customised or personalised items cannot be returned unless faulty.
"""},
        {"title": "Damaged or wrong items", "category": "product", "body": """
If an item arrives damaged, faulty or is not what you ordered, we will fix it at no cost to you. Send a photo of the item and packaging within 14 days of delivery and choose a replacement or a full refund, including shipping.

You do not need to return damaged ceramics or glass. For other faulty items we send a free return label and ship the replacement as soon as the return is scanned, or immediately for orders over $100.
"""},
        {"title": "Discount codes and gift cards", "category": "payment", "body": """
Only one discount code can be used per order, and codes cannot be combined with gift cards on the same order lines. Welcome codes apply to a first order over $40 and expire 30 days after they are issued.

Gift cards never expire and can be used across multiple orders. If a code fails at checkout, check the minimum spend and expiry; if it still fails, contact us and we will apply the discount manually.
"""},
        {"title": "Order changes and cancellations", "category": "shipping", "body": """
Orders can be changed or cancelled within 1 hour of being placed from the order page. After that they enter packing and cannot be edited, but you can still return them once delivered.

Delivery address changes are possible before dispatch. After dispatch, contact the courier using your tracking link to arrange redelivery.
"""},
        {"title": "Caring for ceramics and linens", "category": "product", "body": """
Stoneware is dishwasher and microwave safe. Hand-glazed pieces may have small colour variations and tiny pinholes, which are part of the craft and not a defect.

Wash linen at 40 degrees and tumble dry on low. Natural linen softens and may shrink up to 3% in the first wash.
"""},
        {"title": "Wholesale and restocks", "category": "general", "body": """
Sold-out items are restocked every 6 to 8 weeks. You can join the waitlist on the product page to be emailed the moment it returns. Wholesale accounts are available for orders over $1,500; email wholesale details and we respond within 2 business days.
"""},
        {"title": "Refund approvals (internal)", "category": "returns", "internal": True, "body": """
Agents can approve refunds up to $150 on their own. Between $150 and $500, ask a team lead and note the approval link internally. Above $500, finance must approve. For lost parcels, check the courier's lost report before confirming a replacement.
"""},
    ],
    "macros": [
        {"title": "Request a photo", "body": "Hi {{name}},\n\nI'm so sorry about this. Could you send a photo of the item and the packaging so I can fix it right away?\n\nWarm regards,\nTidewater Care Team"},
        {"title": "Refund issued", "body": "Hi {{name}},\n\nYour refund has been issued to your original payment method. It can take a few extra days to show on your bank statement.\n\nWarm regards,\nTidewater Care Team"},
    ],
    "customers": [
        {"name": "Emily Brooks", "email_local": "emily.brooks", "company": "", "days_ago": 380,
         "profile": {"loyalty_tier": "Gold", "country": "United States", "orders_to_date": 7},
         "records": [
             {"kind": "Order", "reference": "TG-20481", "title": "Stoneware dinner set (4 place settings)", "status": "In transit",
              "data": {"total_usd": 184.00, "placed": "8 days ago", "shipping_method": "Standard", "courier": "UPS", "last_scan": "6 days ago, departed warehouse hub", "dispatched": "8 days ago"}},
         ]},
        {"name": "Jamie Chen", "email_local": "jamie.chen", "company": "", "days_ago": 90,
         "profile": {"loyalty_tier": "Silver", "country": "Canada", "orders_to_date": 3},
         "records": [
             {"kind": "Order", "reference": "TG-20533", "title": "Hand-glazed serving bowl", "status": "Delivered, damaged",
              "data": {"total_usd": 62.00, "delivered": "3 days ago", "courier": "Canada Post", "item_condition": "Cracked on arrival (customer report)"}},
         ]},
        {"name": "Oliver Smith", "email_local": "oliver.smith", "company": "", "days_ago": 210,
         "profile": {"loyalty_tier": "Gold", "country": "United Kingdom", "orders_to_date": 9},
         "records": [
             {"kind": "Order", "reference": "TG-20102", "title": "Linen duvet cover, king", "status": "Delivered",
              "data": {"total_usd": 129.00, "delivered": "12 days ago", "return_window_ends": "18 days from now", "sale_item": "no"}},
         ]},
        {"name": "Fatima Hassan", "email_local": "fatima.hassan", "company": "", "days_ago": 30,
         "profile": {"loyalty_tier": "New", "country": "United States", "orders_to_date": 1},
         "records": [
             {"kind": "Order", "reference": "TG-20590", "title": "Linen napkin set (6)", "status": "Processing",
              "data": {"total_usd": 38.50, "placed": "20 minutes ago", "discount_code_attempted": "WELCOME10", "code_error": "Minimum spend $40 not met"}},
         ]},
        {"name": "Lucas Meyer", "email_local": "lucas.meyer", "company": "", "days_ago": 260,
         "profile": {"loyalty_tier": "Silver", "country": "Germany", "orders_to_date": 5},
         "records": [
             {"kind": "Order", "reference": "TG-19876", "title": "Walnut serving board", "status": "Dispatched",
              "data": {"total_usd": 96.00, "dispatched": "13 days ago", "courier": "DHL", "tracking_status": "No movement for 9 business days"}},
         ]},
        {"name": "Zoe Whitaker", "email_local": "zoe.whitaker", "company": "", "days_ago": 150,
         "profile": {"loyalty_tier": "Gold", "country": "Australia", "orders_to_date": 6},
         "records": [
             {"kind": "Order", "reference": "TG-20344", "title": "Sale: ceramic mug set (4)", "status": "Delivered",
              "data": {"total_usd": 48.00, "delivered": "5 days ago", "sale_item": "yes"}},
         ]},
    ],
    "tickets": [
        {"customer": 4, "record": 0, "age_hours": 8, "status": "OPEN", "priority": "HIGH", "category": "shipping",
         "sentiment": "NEGATIVE", "confidence": 0.91,
         "subject": "Parcel hasn't moved for two weeks",
         "description": "My serving board was dispatched almost two weeks ago and the tracking hasn't changed for days. It was meant as a gift. Has it been lost?",
         "summary": "Customer's parcel has shown no tracking movement for over a week and they fear it is lost.",
         "reasoning": "Stalled tracking on a dispatched order close to the lost-parcel threshold.",
         "draft": "Hi Lucas,\n\nI'm sorry, that's worrying when it's a gift. Your order TG-19876 was dispatched 13 days ago with DHL and the tracking has shown no movement for 9 business days.\n\nParcels not delivered within 10 business days of dispatch are treated as lost, so I'm opening an investigation with the courier now. If it can't be found, we'll send a replacement or a refund, whichever you prefer. Just reply with your choice and I'll take care of it.\n\n" + SIGN,
         "citations": ["Shipping times and tracking"]},
        {"customer": 1, "record": 0, "age_hours": 22, "status": "OPEN", "priority": "MEDIUM", "category": "product", "mine": True,
         "sentiment": "NEGATIVE", "confidence": 0.94,
         "subject": "Serving bowl arrived cracked",
         "description": "My hand-glazed serving bowl arrived with a crack through the side. The box was dented too. I'm really disappointed as it was a birthday present.",
         "summary": "Customer's serving bowl arrived cracked.",
         "reasoning": "Damaged on arrival; documented replacement or refund process applies.",
         "draft": "Hi Jamie,\n\nI'm so sorry, especially for a birthday present. We'll make this right at no cost to you. For your order TG-20533, please send a photo of the bowl and the packaging, and tell us whether you'd like a replacement or a full refund including shipping.\n\nYou don't need to send the bowl back as it's ceramic. Once I have the photo I'll sort it right away.\n\n" + SIGN,
         "citations": ["Damaged or wrong items"]},
        {"customer": 3, "record": 0, "age_hours": 1, "status": "OPEN", "priority": "LOW", "category": "payment", "overridden": True, "ai_category": "returns",
         "sentiment": "NEUTRAL", "confidence": 0.74,
         "subject": "Welcome code isn't working at checkout",
         "description": "I tried the WELCOME10 code on my first order and it says it can't be applied. Is it expired? Can you apply it anyway?",
         "summary": "First-time customer's welcome code was rejected at checkout.",
         "reasoning": "Discount code issue; staff recategorised from returns to payments.",
         "draft": "Hi Fatima,\n\nWelcome to Tidewater! Your code WELCOME10 was rejected because welcome codes apply to a first order over $40, and your order TG-20590 comes to $38.50, so the minimum spend wasn't met.\n\nYou can add a small item to bring the total over $40, or reply here and tell us what you'd prefer and we'll sort it out.\n\n" + SIGN,
         "citations": ["Discount codes and gift cards"]},
        {"customer": 0, "record": 0, "age_hours": 14, "status": "OPEN", "priority": "MEDIUM", "category": "shipping", "mine": True,
         "sentiment": "NEUTRAL", "confidence": 0.88,
         "subject": "Where is my dinner set?",
         "description": "I ordered the stoneware dinner set over a week ago and tracking shows it left the warehouse hub days ago with no update since. When will it arrive?",
         "summary": "Customer asks when their dinner set will arrive as tracking has not updated.",
         "reasoning": "Delivery status question with a slightly delayed scan.",
         "draft": "Hi Emily,\n\nThanks for checking in. Your stoneware dinner set (TG-20481) was dispatched 8 days ago with UPS on Standard delivery, which takes 3 to 5 business days, and the last scan was 6 days ago at the warehouse hub.\n\nTracking can lag, but that's a long gap. I'm asking UPS for an update today and will come back to you here. If it doesn't show movement within 5 business days of the last scan, we'll open a full courier investigation.\n\n" + SIGN,
         "citations": ["Shipping times and tracking"]},
        {"customer": 2, "record": 0, "age_hours": 40, "status": "IN_PROGRESS", "priority": "LOW", "category": "returns",
         "sentiment": "NEUTRAL", "confidence": 0.9,
         "subject": "Return a duvet cover that's too big",
         "description": "The king duvet cover is bigger than I expected for our bed. Can I return it for a refund? It's still in the packaging.",
         "summary": "Customer wants to return an unused duvet cover for a refund.",
         "reasoning": "Standard return within the window.",
         "conversation": [
             {"from": "staff", "after_min": 120, "body": "Hi Oliver,\n\nHappy to help. Since it's unused and in its original packaging, you can start the return from your order page to get a free prepaid label. Let me know if the page gives you any trouble.\n\nWarm regards,\nTidewater Care Team"},
             {"from": "customer", "after_min": 900, "body": "Got the label, thanks. How long until I get my money back once it's posted?"},
         ],
         "draft": "Hi Oliver,\n\nGreat. Refunds are issued to your original payment method within 5 business days of us receiving the return, and your bank may take a few extra days to show it. Your order TG-20102 is well within the return window, so you're all set once it's on its way.\n\n" + SIGN,
         "citations": ["Returns and refunds"]},
        {"customer": 5, "record": 0, "age_hours": 55, "status": "OPEN", "priority": "MEDIUM", "category": "returns",
         "sentiment": "NEGATIVE", "confidence": 0.87,
         "subject": "Refund for sale mugs I don't like",
         "description": "I bought the sale mug set but they don't match my kitchen. I'd like to return them for a full refund please.",
         "summary": "Customer wants a refund on a sale-priced mug set.",
         "reasoning": "Sale items are exchange or credit only, so expectation needs managing.",
         "draft": "Hi Zoe,\n\nThanks for letting us know. Your mug set (TG-20344) was a sale item, and sale items can be exchanged or returned for store credit but not refunded to the original payment method. If you'd like, we can send a free return label and issue store credit, or swap them for another set.\n\nTell me which you'd prefer and I'll set it up.\n\n" + SIGN,
         "citations": ["Returns and refunds"]},
        {"customer": 2, "record": None, "age_hours": 70, "status": "OPEN", "priority": "LOW", "category": "general",
         "sentiment": "POSITIVE", "confidence": 0.92,
         "subject": "When will the walnut boards be back in stock?",
         "description": "Love my duvet cover! Do you know when the large walnut serving boards will be back in stock? Would love to get one for my sister.",
         "summary": "Customer asks when walnut boards will be restocked.",
         "reasoning": "Friendly stock question.",
         "draft": "Hi Oliver,\n\nSo glad you love the duvet cover! Sold-out items are restocked every 6 to 8 weeks. The best way to catch the board is to join the waitlist on its product page, and we'll email you the moment it's back.\n\n" + SIGN,
         "citations": ["Wholesale and restocks"]},
        {"customer": 0, "record": 0, "age_hours": 5, "status": "OPEN", "priority": "HIGH", "category": "payment",
         "sentiment": "NEGATIVE", "confidence": 0.9,
         "subject": "I was charged but never got a confirmation",
         "description": "My card shows a charge for the dinner set but I haven't had any email confirmation and I'm worried the order didn't go through properly. Please confirm.",
         "summary": "Customer was charged but wants confirmation the order exists.",
         "reasoning": "Charge without confirmation causes anxiety, though the order record exists.",
         "draft": "Hi Emily,\n\nSorry for the worry. I can confirm your order TG-20481 for the stoneware dinner set ($184.00) went through and is in transit with UPS. I'll resend your confirmation email now, and the tracking link is included in it.\n\n" + SIGN,
         "citations": ["Shipping times and tracking"]},
        {"customer": 1, "record": 0, "age_hours": 100, "status": "RESOLVED", "priority": "MEDIUM", "category": "product", "mine": True,
         "sentiment": "POSITIVE", "confidence": 0.9,
         "subject": "Is the serving bowl microwave safe?",
         "description": "Before I use my new serving bowl, can I put it in the microwave and dishwasher?",
         "summary": "Customer asks about microwave and dishwasher safety.",
         "reasoning": "Product care question.",
         "conversation": [
             {"from": "staff", "after_min": 45, "body": "Hi Jamie,\n\nStoneware is dishwasher and microwave safe. Hand-glazed pieces can have small colour variations and tiny pinholes, which are part of the craft.\n\nWarm regards,\nTidewater Care Team"},
             {"from": "customer", "after_min": 200, "body": "Brilliant, thank you!"},
         ]},
    ],
    "history_count": 44,
    "history_pool": [
        {"subject": "Order says delivered but nothing here", "category": "shipping", "description": "The tracking says delivered yesterday but there was no parcel at my door."},
        {"subject": "Can I change my delivery address?", "category": "shipping", "description": "I've moved flats since ordering. Can the parcel go to my new address instead?"},
        {"subject": "Express shipping wasn't express", "category": "shipping", "description": "I paid for express delivery and it took four days. Can I get the shipping refunded?"},
        {"subject": "Return label not generating", "category": "returns", "description": "The return page just spins when I try to print the label for my order."},
        {"subject": "Exchange for a different colour", "category": "returns", "description": "Can I swap my linen throw for the sage green one? It's unused."},
        {"subject": "Cancel my order please", "category": "returns", "description": "I ordered by mistake an hour ago. Can you cancel it before it ships?"},
        {"subject": "Plate chipped in the box", "category": "product", "description": "One of the plates in my set has a chip on the rim. I took a photo."},
        {"subject": "Received the wrong colour", "category": "product", "description": "I ordered the charcoal napkins but got the sand ones."},
        {"subject": "Is the glaze food safe?", "category": "product", "description": "Is the glaze on your bowls food safe and lead free?"},
        {"subject": "Charged twice at checkout", "category": "payment", "description": "My card shows two charges for the same order. Please check."},
        {"subject": "Gift card balance question", "category": "payment", "description": "How do I check the balance on my gift card and can I use it across two orders?"},
        {"subject": "Discount code expired", "category": "payment", "description": "My welcome code expired before I could use it. Any chance you can extend it?"},
        {"subject": "Do you do wholesale?", "category": "general", "description": "I run a small shop and would love to stock your mugs. Do you offer wholesale pricing?"},
        {"subject": "Waitlist email never arrived", "category": "general", "description": "I joined the waitlist for the sage vase months ago and never heard back."},
        {"subject": "Love the new collection", "category": "general", "description": "Just wanted to say the new autumn range is beautiful. Will there be matching napkins?"},
    ],
}
