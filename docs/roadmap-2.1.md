# Fat2Flat 2.1 plan

Start after 2.0 is submitted to Apple. Order: AI assistant + badges → custom
workouts → paid coaching + weekly coach summary.

## 1. AI assistant ("Ask Fat2Flat")
- Chat for **every user**, with a daily message limit (like meal photos).
- Knows the user's own context: plan, targets, recent workouts, meals, weight
  trend, diet. Sent per request; nothing extra stored server-side beyond the chat.
- **Friendly coach voice**: short, practical, encouraging.
- Clearly labelled AI; never claims to be the coach. "Ask my coach" button turns
  the question into a chat message to the coach (clients who joined a coach).
- Safety: no medical advice; injuries, pain, eating disorders, pregnancy,
  medications → see a doctor / speak to your coach.
- **Coach can read clients' AI chats only if the client turns sharing on**
  (same pattern as photo / health sharing).
- Built on the existing Supabase edge function + Anthropic key; Claude via the
  official SDK; per-user daily limit in `ai_usage`.

## 2. Badges + share card
- Milestones: first workout, 10/25/50 workouts, streaks, 5/10/20 lb (or kg)
  down, waist milestones, Transformation phases and finish.
- Celebration screen when earned; badge shelf on Progress.
- Shareable progress image (weeks, weight change, waist change, logo).

## 3. Custom workouts from the coach
- On a client's page: swap exercises, change sets/reps per session, or build a
  plan. Client app follows the coach's plan instead of the default template.

## 4. Paid coaching
- Monthly subscription via Stripe (Apple guideline 3.1.3(d) allows outside
  payment for real-time one-to-one fitness training). Coach sees who's paid.
- Needs: Stripe account, pricing, refund policy.

## 5. Weekly coach summary
- Monday digest (email and/or push): who's on track, who needs a call.
- Needs: an email service (e.g. Resend) and a scheduled function.
