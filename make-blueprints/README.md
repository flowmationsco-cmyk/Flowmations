# Make.com Blueprints

Home for all Flowmations Make.com scenario JSONs. Import any `.blueprint.json` file into Make with **Scenarios → Create a new scenario → ⋯ (More) → Import Blueprint**.

## missed-call-instant-response.blueprint.json

The "call this number and get an instant response" demo from slide 5 of the pitch deck. Someone dials the demo number, hears a short voice message, and gets a text back within seconds — the same Missed-Call Recovery flow we sell, running live.

**How the scenario flows:**

1. **Webhook (trigger)** — Twilio hits this the moment a call comes in.
2. **Webhook Response** — replies with TwiML so the caller hears: *"Thanks for calling Flowmations. We just sent you a text…"*
3. **Twilio → Create a Message** — instantly texts the caller back from the same number, with a pitch and a reply-YES call to action.

**Setup after importing (takes ~5 minutes):**

1. You need a Twilio account with an SMS-capable phone number (this is the number that goes on slide 5).
2. Import the blueprint into Make.
3. Click the first module (Webhook) → **Add** a new webhook → copy the webhook URL Make gives you.
4. In Twilio: **Phone Numbers → your number → Voice Configuration → "A call comes in"** → choose **Webhook**, paste the Make URL, method **HTTP POST**. Save.
5. Click the Twilio module (last one) → attach your Twilio connection (Account SID + Auth Token from the Twilio console).
6. Turn the scenario **ON** (bottom-left toggle) and make sure it's set to run **immediately as data arrives**.
7. Call the number from your cell to test — you should hear the voice line and get the text within a few seconds.

**Editing the messages:**

- The voice message the caller hears lives in module 2 (Webhook Response) inside the `<Say>` tag.
- The text message lives in module 3 (Twilio → Create a Message) in the **Body** field.

**Cost note:** Twilio charges per call minute and per SMS (roughly a penny each), plus ~$1–2/month for the number. Make runs this on 3 operations per call, so the free Make tier handles hundreds of demo calls a month.
