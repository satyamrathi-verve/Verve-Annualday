# Design Brief — "Operation Prompt & Co." (Verve Advisory Anniversary 2026)

> Hand this to a design assistant alongside screenshots of each screen. The ask: **redefine the visual scheme and inject quirky, sarcastic on-screen copy** to make the experience more attractive and fun, without losing the spy-thriller premise.

---

## 1. What this is (in one breath)

An **office team-building game** disguised as a spy/ARG mission, built for Verve Advisory's anniversary event. Employees "crack a code," pass a vibe check, sign in, get a mission briefing, then play **"Guess Your Crew"** — a live, shared wheel where you identify scrambled cross-functional teammates from personal clues (hobbies, quirks, fun facts). A teammate's "canister" only turns **green** when you *both* guess each other. It's trust-building gamified as espionage.

**Audience:** Verve Advisory employees (India-based; Hindi-English code-mixing is part of the charm).
**Vibe wanted:** Premium but cheeky. Spy-thriller meets office in-jokes. Sarcastic, self-aware, a little chaotic — never corporate-bland.

---

## 2. The 5 screens (the funnel) + admin

Linear flow. Each is a centered card on a dark backdrop.

1. **Landing** — Cold open. "Access granted." Sets the tone and sends you in.
2. **Vibe Check** — Tap-to-react to absurd office rumours (Hindi-English). Pure mood-setter, no data captured.
3. **Sign In** — Verve Google / email OTP gate. "Who goes there."
4. **Brief** — Mission video + "Captain Wanderlust" monologue explaining the game.
5. **Guess Your Crew** — THE GAME. A circular wheel of teammate nodes; read clue → name the colleague → node goes **yellow** (you guessed) → **green** (mutual). Live standings of all teams below. Managers get a "God-Mode" override panel.
6. **Admin Dashboard** (super-admins only) — real-time view of all teams' wheels.

---

## 3. Current visual scheme (the starting point to evolve)

- **Mode:** Permanent dark.
- **Background:** `#0a0f1c` base with a faint radial gradient (Verve blue top, gold bottom).
- **Colors:**
  - Verve Blue `#3d77ff` (primary CTAs, focus)
  - Gold `#e0a436` (accents, eyebrows, secondary CTAs)
  - Text: near-white `#eef2fb` / muted `#9fadc6` / faint `#6d7c98`
  - Cards: `#131c30` surface, borders `#27314c`
  - Wheel node states: **grey** (untouched) → **yellow** (you guessed) → **green** (mutual)
- **Type:** Sora (display/headings), Inter (body), JetBrains Mono (eyebrow labels — uppercase, wide letter-spacing, the "·" separators).
- **Motion:** Framer Motion everywhere — screen fades, button hover/tap springs, ripple + pulse on wheel nodes.
- **Layout:** Mobile-first, single centered column, big headline → eyebrow → subtitle → CTA pattern repeated on every screen.

**Tech (so suggestions stay implementable):** Next.js 16 + React 19, Tailwind v4 (semantic tokens via `@theme`), Framer Motion, Supabase realtime.

---

## 4. The voice (keep & amplify)

Spy-mission jargon + office sarcasm + Hindi-English. Examples of the **current** copy:

- Landing: *"Welcome to the only project at Verve that will never be audited."* / *"You cracked the code — but can you guess what happens next?"* / CTA **"Begin the Guess →"**
- Vibe eyebrows: *"Suna hai…" / "Rumour has it…" / "Whispers say…"*
- Vibe reactions: *"Sach hai! 🔥" / "Ho sakta hai… 🤔" / "Arre nahi yaar 😅"*
- Vibe rumour: *"Suna hai humari agli team meeting Mars pe hone wali hai, Elon Musk ki sponsorship ke saath?"*
- Brief (Captain Wanderlust): *"Your crew isn't who you sit with every day — I've scrambled finance, HR, ops and IT into something new… find them not by their desk, but by what makes them them."*
- Guess: *"A correct call marks them yellow — but a canister only turns green when you and that teammate guess each other."*
- States: *"Your share is in. ✨"*, *"Crew assembled."*, *"Not quite — read the clue again and try another name."*

Recurring jargon to lean into: **access granted, eyes only, recruit, transmission, briefing, canister, crew, mission**.

---

## 5. What I want from you (Claude Design)

Using the brief above and the attached screenshots, please:

1. **Redefine the design scheme** — propose a refreshed dark palette, type pairing, card/wheel treatment, and motion ideas that feel more premium *and* more playful. Keep Verve blue + gold recognizable but elevate it (gradients, glow, texture, grain, dossier/redacted-file motifs, etc.). Give concrete hex values and Tailwind-token suggestions.
2. **Add quirky, sarcastic on-screen copy** — for each screen, rewrite or add micro-copy (eyebrows, headlines, button labels, loading/empty/error/success states, hover tooltips, the wheel center text) that's funnier and more self-aware while staying on-brand and bilingual where it fits. Give me ready-to-paste alternatives, ideally 2–3 options per spot.
3. **Per-screen makeover notes** — for each of the 5 screens, a short "keep / change / add" with the highest-impact tweaks.
4. **Small delight ideas** — micro-interactions, easter eggs, sound/haptic cues, confetti/celebration moments, especially for the green "mutual match" payoff and the "Crew assembled" finale.

Constraints: stay dark-mode, mobile-first, implementable in Tailwind + Framer Motion, and don't break the spy/ARG premise or the yellow→green wheel logic.
