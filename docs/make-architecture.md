# Flowmations — Make.com Architecture for the Six Systems

This is the internal blueprint for how every service we sell actually gets built.
One copy of this stack is deployed per client. Read the "Shared Foundation" section
first — every one of the six systems sits on top of it.

---

## 1. The Shared Foundation (build this once per client)

### 1.1 The tool stack

| Layer | Tool | Why |
|---|---|---|
| Orchestration | **Make.com** | Runs every scenario (workflow). One Make organization, one folder per client. |
| Phone + SMS | **Twilio** | Provides the tracking phone number, sends/receives texts, fires webhooks on missed calls and replies. |
| Customer database | **Airtable** | The client's mini-CRM. One base per client. This is how "the system knows the individual." |
| Calendar / jobs | **Google Calendar** (or Jobber / Housecall Pro if the client has one) | Source of truth for appointments and completed jobs. |
| Invoicing | **QuickBooks Online** (or Stripe / Wave) | Source of truth for unpaid invoices. |
| Email fallback | **Gmail / SendGrid** | For customers with no mobile number, and for seasonal campaigns. |
| Alerts to the owner | **SMS to owner's phone** (or Slack) | Every system can ping the business owner when a human needs to take over. |

### 1.2 The Airtable base — how the system "knows the individual"

Everything keys off **the customer's phone number, normalized to E.164 format**
(`+15551234567`). A phone number is the one identifier that shows up in every
channel: the missed call, the SMS reply, the calendar event, the invoice.

One base per client, five tables:

**Contacts** — one row per human:
- `Phone` (E.164, primary key), `Name`, `Email`, `Address`
- `Source` (missed call / referral / imported list)
- `Tags` (e.g. `AC`, `furnace`, `repeat`)
- `SMS Opt-In` (checkbox) and `Opted Out` (checkbox) — legally required
- `Last Contacted` (date) — used to prevent spamming
- `Status` (new lead / quoted / customer / past customer)

**Jobs** — links to a Contact. `Date`, `Service type`, `Status` (scheduled /
done), `Confirmed?`.

**Quotes** — links to a Contact. `Amount`, `Status` (sent / responded / won /
lost), `Sent date`, `Touch count`.

**Invoices** — mirror of QuickBooks. `Amount`, `Due date`, `Status`,
`Nudge count`.

**Messages** — a log row for every SMS in or out. This is the audit trail and
what makes conversations feel continuous.

### 1.3 The universal lookup pattern

Every single scenario begins the same way:

```
Trigger fires (call, reply, schedule, invoice event)
  → Normalize the phone number (Make "Set variable" + replace() to E.164)
  → Airtable: Search Records (Contacts where Phone = number)
  → Router:
      Found     → we know them: use {{Name}}, history, tags, opt-out status
      Not found → Airtable: Create Record (new Contact, Source = trigger type)
```

So "how does it know who someone is?" — it doesn't guess. The caller ID /
sender number IS the identity. If the number exists in Contacts, every message
can say "Hi Mike" and reference their history. If it doesn't, the system
creates the record on the spot, and the owner fills in the name after the
first conversation (or we parse it from a reply).

### 1.4 The Inbound Message Router (one scenario that serves all six systems)

All replies to the Twilio number hit **one** Make webhook. This scenario:

1. Looks up the contact by phone (pattern above) and logs the message.
2. Runs keyword checks through a Router module:
   - `STOP` / `UNSUBSCRIBE` → set `Opted Out = true`, send confirmation, **end**.
     Every outbound scenario filters on `Opted Out = false`, so this kills all
     future messages instantly.
   - `C` / `CONFIRM` / `YES` → mark tomorrow's Job as `Confirmed`.
   - Anything else → forward the text + contact name + context to the owner's
     phone: *"Reply from Mike Danner (quoted $2,400 on 7/14): 'can you do
     Friday instead'"*. The human takes over; automation stands down by
     setting `Status = responded`.

This one scenario is why the whole thing feels like a person, not a robot:
any automated sequence stops the moment the customer engages.

### 1.5 Compliance guardrails (baked into every scenario)

- **A2P 10DLC registration** on the Twilio number (required for US business SMS
  — do this during client onboarding or messages get filtered).
- **Quiet hours filter**: outbound sends only pass between 8am–8pm client-local
  time (`formatDate(now)` filter in Make); anything triggered at night queues
  to a scheduled morning scenario.
- **Opt-out filter** (`Opted Out = false`) on every outbound module.
- **Frequency cap**: skip send if `Last Contacted` is within 24h, except
  appointment confirmations.

---

## 2. The Six Systems

### 2.1 Missed-Call Recovery ("texts back in under 60 seconds")

**How the call flow works:** the client either (a) forwards their existing
business line to a Twilio number, or (b) advertises the Twilio number directly,
which forwards to their real phone. Twilio sits in the middle either way.

**Scenario (instant/webhook-triggered):**
```
Twilio Studio / TwiML: <Dial> owner's phone, timeout 20s
  → DialCallStatus = no-answer or busy → HTTP webhook to Make (carries caller number)
  → Make: normalize phone → Contacts lookup
  → Router:
      Known contact  → SMS: "Hi {{Name}}, sorry we missed you at {{Business}} —
                        how can we help? Reply here and we'll get right back."
      Unknown number → create Contact (Source: missed call) → send generic version
  → Log to Messages table
  → SMS to owner: "Missed call from {{Name/number}} — auto-text sent."
```
The webhook fires the instant the dial attempt fails, which is how the
sub-60-second promise is honest — it's usually under 10.

Filters: skip known spam/robocall numbers (keep a small blocklist table), skip
if `Opted Out`.

### 2.2 Review Requests

**Trigger:** a job hitting "done." Depending on what the client has:
- Jobber / Housecall Pro → native "job completed" webhook into Make
- Google Calendar only → scheduled scenario every evening: events that ended today
- Nothing → owner texts a keyword like `DONE 5551234567` to the Twilio number,
  or checks a box in Airtable (Airtable "Watch Records" trigger)

**Scenario:**
```
Job completed → wait ~2 hours (Sleep, or schedule for early evening)
  → Contacts lookup → filters: Opted Out = false, no review request in last 90 days
  → SMS: "Hi {{Name}}, thanks for letting us handle your {{service}} today!
     If we did a good job it'd mean a lot if you left us a quick review: {{link}}"
  → mark Contact "Review Requested" + date
  → 3 days later (second scheduled scenario): if no reply and no review,
     send ONE gentle follow-up. Then stop forever.
```
The `{{link}}` is the client's Google review deep link
(`g.page/r/<placeid>/review`) — one tap, review box open.

**Rule we never break:** everyone who had a job done gets asked. Filtering
"only ask happy customers" is review gating and violates Google's policy.

### 2.3 Client Follow-Up (quotes that went quiet)

This one is a **state machine stored in the Quotes table**, not a chain of
delays — that's what makes it robust.

**Trigger to enter the sequence:** a Quote row is created with
`Status = sent` (from Jobber webhook, or the owner logging it in Airtable, or
forwarding the estimate email to a Make Mailhook that parses it).

**The engine — one scheduled scenario, runs every morning at ~9am:**
```
Airtable: Search Quotes where Status = "sent" AND Opted Out = false
  → for each, compute days since Sent date
  → Router on Touch count + day:
      Day 2,  touch 0 → "Hi {{Name}}, just checking you got the quote for
                         {{service}} — any questions?"
      Day 5,  touch 1 → value nudge ("that price includes…")
      Day 10, touch 2 → soft scarcity ("our schedule for {{month}} is filling up")
      Day 20, touch 3 → the breakup text ("no worries if you went another way —
                         we're here if anything changes")
  → increment Touch count, update Last Contacted
```

**How it stops:** the Inbound Message Router (1.4). Any reply sets
`Status = responded` and alerts the owner — the search filter never picks that
quote up again. Marking the quote `won` or `lost` also exits it. Nobody ever
gets a robot follow-up after they've already answered — that's the detail that
keeps this from feeling like spam.

### 2.4 Appointment Reminders

**Scenario A — nightly, 6pm:**
```
Google Calendar (or Jobber): list tomorrow's events
  → parse customer phone from the Jobs table (or event description)
  → Contacts lookup → SMS: "Hi {{Name}}, {{tech}} arrives tomorrow between
     {{window}}. Reply C to confirm or call us to reschedule."
  → mark Job "Reminder sent"
```

**Scenario B — the confirmation** is just the Inbound Router: reply `C` →
Job marked `Confirmed = true`.

**Scenario C — morning of, 7:30am:**
```
Jobs today where Confirmed = false
  → SMS the owner a digest: "2 unconfirmed today: Mike D (9–11), Sarah K (1–3)"
```
The owner calls those two personally — automation surfaces the risk, the human
saves the truck roll.

### 2.5 Seasonal Campaigns

This is where the Contacts table's `Tags` and job history pay off.

**Setup:** import the client's past-customer list once (CSV → Airtable) during
onboarding. Every completed job thereafter tags contacts automatically
(system 2.2's trigger also stamps `Tags` and `Last service date`).

**Scenario — scheduled for campaign dates (e.g. April 1 and October 1):**
```
Airtable: Search Contacts where
    Tags contains "AC" (spring) / "furnace" (fall)
    AND Last service date > 10 months ago
    AND SMS Opt-In = true AND Opted Out = false
  → Iterator + Sleep (throttle ~1 msg/sec — Twilio rate limits, and it keeps
     replies staggered so the owner isn't flooded)
  → SMS: "Hi {{Name}}, it's {{Business}} — we tuned up your AC last
     {{month/year}}. Spring slots are open; want us to get you on the
     schedule before the first heat wave?"
  → update Last Contacted, log to Messages
```
Replies land in the Inbound Router → owner books them. Contacts with only an
email get the Gmail/SendGrid branch of the same scenario instead.

Campaigns are just **saved audience filters + a template + a date** — so adding
a new one for a client is a 10-minute clone, not a new build.

### 2.6 Payment Nudges

**Sync scenario:** QuickBooks "Watch Invoices" → mirror new/updated invoices
into the Invoices table with due date and status. (Stripe or Wave modules swap
in identically.) A second watch on payments flips `Status = paid` — that's the
kill switch.

**Nudge engine — scheduled daily, 10am (inside quiet hours by design):**
```
Invoices where Status = "overdue-ish" (due date passed, not paid)
  → Contacts lookup → Router on days overdue + Nudge count:
      Day 3  → "Hi {{Name}}, friendly reminder — invoice #{{n}} for {{amount}}
                was due {{date}}. Pay here: {{payment link}}"
      Day 10 → firmer, still polite
      Day 20 → final notice + alert the owner to make a personal call
  → increment Nudge count
```
The payment link comes straight from QuickBooks/Stripe, so paying is one tap —
which is most of why reminded invoices get paid ~2x faster. The moment the
payment webhook fires, the invoice exits the search filter and (nice touch) an
automatic "Got it — thanks {{Name}}!" goes out.

---

## 3. How it all fits together

```
                        ┌─────────────────────────┐
   Missed call ─────────►                         │
   SMS reply ───────────►        TWILIO           ◄──── outbound SMS (all 6 systems)
                        └───────────┬─────────────┘
                                    │ webhooks
                        ┌───────────▼─────────────┐
   Calendar/Jobber ─────►                         ◄──── QuickBooks/Stripe
   (jobs, appts)        │        MAKE.COM         │     (invoices, payments)
                        │  1 folder per client    │
                        │  ~8 scenarios           │
                        └───────────┬─────────────┘
                                    │ read/write every run
                        ┌───────────▼─────────────┐
                        │        AIRTABLE         │
                        │  Contacts · Jobs ·      │
                        │  Quotes · Invoices ·    │
                        │  Messages               │
                        └─────────────────────────┘
```

Per client you deploy roughly **8 Make scenarios**: missed-call handler,
inbound router, review request + follow-up, quote follow-up engine, nightly
reminder + morning digest, campaign sender, invoice sync + nudge engine. The
Starter tier is just the first two; Growth turns on three more; the full plan
runs all of them against the same shared Airtable base.

## 4. Client onboarding checklist

1. Create the Airtable base from our template; import their customer CSV.
2. Buy a Twilio number (local area code), register A2P 10DLC, set up call
   forwarding with the client's carrier.
3. Connect their Google Calendar / Jobber / QuickBooks to Make (OAuth — they
   click "authorize" on a screen-share, we never hold their passwords).
4. Clone the scenario folder from the master template; swap in their
   Airtable base ID, Twilio number, business name, review link, templates.
5. Customize message wording with the owner (their voice, not ours).
6. Test end-to-end with the owner's own phone before go-live.
7. Turn systems on one at a time, starting with Missed-Call Recovery.
