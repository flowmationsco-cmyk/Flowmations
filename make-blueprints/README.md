# Make.com Blueprints

Home for all Flowmations Make.com scenario JSONs. Import any `.blueprint.json` file into Make with **Scenarios → Create a new scenario**, then drag the file onto the canvas (or **⋯ → Import Blueprint**).

Both blueprints below do the same slide-5 demo: someone dials the demo number, hears a short voice message, and gets a text back within seconds — the same Missed-Call Recovery flow we sell, running live.

## missed-call-instant-response-telnyx.blueprint.json ← start here (free)

Runs on **Telnyx**, which gives roughly **$10 of free signup credit with no credit card**. The phone number (~$1/mo), inbound call minutes, and outbound texts all come out of that credit, so the demo line runs for months at $0 out of pocket. Uses only Make's built-in Webhook and HTTP modules — no paid connectors.

**Scenario flow:**

1. **Webhook (trigger)** — Telnyx hits this the moment a call comes in.
2. **Webhook Response** — replies with TeXML so the caller hears: *"Thanks for calling Flowmations. We just sent you a text…"*
3. **HTTP → Telnyx Messages API** — instantly texts the caller back from the same number.

**Setup after importing (~10 minutes):**

1. Sign up at telnyx.com (free credit, no card). Buy an **SMS + Voice capable US number** — it's paid from the free credit. This is the number that goes on slide 5.
2. In Telnyx, create an API key: **Account → API Keys → Create**. Copy it.
3. Import the blueprint into Make. Click the first module (Webhook) → **Add** a new webhook → copy the URL Make gives you.
4. In Telnyx: **Voice → TeXML Applications → Create**. Paste the Make webhook URL as the **Voice webhook URL** (method **POST**). Save.
5. In Telnyx: **Numbers → your number → Voice settings** → assign it to that TeXML application.
6. In Telnyx: **Messaging → Messaging Profiles** → make sure your number is attached to a messaging profile (create the default one if asked).
7. Back in Make, open the last module (HTTP) and replace `PASTE_YOUR_TELNYX_API_KEY_HERE` in the Authorization header with your API key — keep the word `Bearer` and the space in front of it.
8. Turn the scenario **ON** (set to run **immediately as data arrives**) and call the number from your cell to test.

**Heads up on US texting:** US carriers require a quick (free) 10DLC registration in the Telnyx portal before a local number can text reliably. Telnyx walks you through it under Messaging → 10DLC. Do this once, early — texts can be blocked until it's done. A toll-free number + free toll-free verification is an alternative that also works.

## missed-call-instant-response.blueprint.json (Twilio version)

Same demo on Twilio's official Make modules. Kept as a backup for when there's budget — Twilio's *free trial* can't be used for this demo because trial accounts only text **verified** numbers, so a prospect calling the line would never get the text.

Setup is in the git history / module notes: webhook URL goes in Twilio's **Voice Configuration → "A call comes in"**, attach the Twilio connection on the last module.

## Editing the messages (either version)

- The voice message the caller hears lives in module 2 (Webhook Response) inside the `<Say>` tag.
- The text message lives in module 3 — the **Body** field (Twilio version) or the JSON `text` field (Telnyx version).
