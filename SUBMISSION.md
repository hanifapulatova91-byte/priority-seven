# Priority Seven

**NASA Space Apps Challenge 2026 · Space Mission Design Game · Target award: Best Mission Concept**

## One-liner

Your research is worthless until the data reaches Earth, and there isn't enough antenna time.

## The gap

NASA's own *Design and Develop Science Missions* names four mission segments: Launch, Space, **Ground** and **User**. Almost every mission game models the space segment and ignores the other three. Priority Seven is built on the ground segment, and it scores only what the user segment can actually use: data that reaches Earth, before its deadline, with calibration attached.

Other mission games are additive. You collect parts, budget, upgrades and stars, and the binding constraint is mass or money. This one is subtractive. The binding constraint is antenna time on an oversubscribed network, and the scoring verb is giving up science you already designed for.

## How it works

1. **Preparation.** You fill in a printed order form: mission class (which sets the budget), cruise stage, science robots, antenna, radio band and recorder. Each robot unlocks one science objective, and you commit to all of them.
2. **Cruise.** Three short turns teach the event deck.
3. **Operations.** Twelve weeks at Mars, dated to the real Earth–Mars range from JPL Horizons. Four seats (Explorer, Researcher, Engineer, Flight Director) share 8 action points a week.
4. **Contention.** The Flight Director requests three antenna slots. Rival missions, including two prime missions, already hold or claim most of the 15 wells. When they hold what you need you must counter-propose, because a bare refusal is not allowed. The refuse button is there, permanently disabled, with the real rule printed on it.
5. **Triage.** Robots fill a recorder far faster than the downlink can empty it, and overflow is deleted. Events take passes away. When an objective cannot make its deadline you withdraw it, which frees the recorder and the downlink for the rest.
6. **Debrief.** There is no win screen. The game ends on your own objective list, with lines stamped RETURNED, DARK, UNUSABLE or WITHDRAWN, and closes with: *"Galileo kept 70%. You kept N%."*

## What's real

Every number in the game carries a visible tag: **DATA** (published NASA figure), **DERIVED** (computed from one) or **MODEL** (our balance). The in-game **Sources** frame shows the full table with links. Highlights:

| Value | What it is | Tag | Source |
|---|---|---|---|
| 13 antennas, ~40 missions, ~30% mean oversubscription | Deep Space Network size and load in 2015–16 | DATA | JPL, Shouraboura, Johnston and Tran, ICAPS 2016 |
| 12 antennas, nearly 60 missions | Network size and load in 2020–23 | DATA | NASA OIG IG-23-016 |
| ~40% at times, ~50% by the 2030s, demand ×10 | DSN oversubscription now and projected | DATA | NASA OIG IG-23-016 |
| 99.9% vs 83% | Prime missions given priority get 99.9% of requested time; total scheduled falls from 88% to 83% | DATA | JPL, ICAPS 2016 |
| >900 h in 25 days | Artemis I DSN support (the Artemis surge card) | DATA | NASA OIG IG-23-016 |
| 33 h / 151.5 h | Goldstone outage, Dec 2022 (the Goldstone card) | DATA | NASA OIG IG-23-016 |
| Counter-propose rule | No bare refusal in DSN negotiation | DATA | JPL, ICAPS 2016 |
| 82 / 88 / 91 / 83% | Equal priority, greedy least-constrained-first, best Squeaky Wheel run, prime-favouring | DATA | JPL, ICAPS 2016 |
| 1,025 kg · 1.8 kg · 3 m | Perseverance, Ingenuity, MRO high-gain antenna | DATA | NASA mission pages |
| 46.7 / 56.4 dBi, ~3 dB dust loss | X- and Ka-band gain, Ka attenuation at Mars | DATA | DSN 810-005 |
| Weekly Earth–Mars range | 2026-11-14 to 2027-01-30, 7-day steps | DATA | JPL Horizons API |
| Cards per slot | max(1, round(4 × dish × band × (dmin/d)²)) | DERIVED | From the Horizons range |
| High-gain antenna never fully opened | Galileo; link rebuilt on the low-gain antenna | DATA | JPL Mission and Spacecraft Library |
| ~70% of planned science | What planners expected Galileo to achieve afterwards (secondary summaries; no primary NASA statement found) | DATA | Secondary sources |
| Real solar flares | Title the safe-mode event card | DATA | NASA DONKI |
| Real asteroid elements | Extended-mission targets: Eros, Bennu, Psyche | DATA | JPL Small-Body Database |
| Report titles | Sources panel citations on DSN scheduling | DATA | NASA NTRS |

**Live data with a baked fallback.** Every API is tried live first, then falls back to `assets/fallback.json`, which was captured from the same APIs on 2026-11-14. A printed status strip on the board shows each source as LIVE or CACHED with its timestamp. NASA Images and DONKI answer live from a static host. JPL Horizons, SBDB and NTRS send no cross-origin headers, so a browser always reads the cached copy of those three. DONKI returned HTTP 404 for every query on build day, so its fallback holds flares recorded in the DONKI catalog.

## What's modelled

- Robot masses: the heavy rover (1,000 kg), light rover (180 kg) and helicopter (2 kg) are rounded from Perseverance (1,025 kg), Spirit and Opportunity (about 185 kg) and Ingenuity (1.8 kg), and are tagged DERIVED. The orbiter camera (120 kg) and weather station (50 kg) are game-scale, tagged MODEL. Costs, cruise-stage capacities, data yields, objective sizes and deadlines are all MODEL, tuned by simulation.
- The board abstracts the network to 15 passes a week across three complexes, with five scripted rival missions. The real network is larger: 13 antennas and about 40 missions in 2016, 12 antennas and nearly 60 missions in the 2023 audit.
- The ~70% Galileo figure is what planners expected, from secondary summaries. We did not find a primary NASA statement of the final result.
- No group playtests have been run. The claim that players abandon objectives around week 5 or 6 is the design intent (the first deadlines fall in weeks 5 and 6), supported only by simulation.
- Pure inverse-square overstates the swing in data rate across twelve weeks. Real missions adapt their coding.
- CubeSat 101 deliberately omits data rates and link budgets. Those come from DSN 810-005 Module 103, not from it.
- Rival behaviour is scripted, not a negotiating agent.
- MODEL values are balance, not physics. They include the 8-point action pool, robot costs and yields, objective sizes and deadlines, 3–5 rival claims a week, and one request per mission per week.
- The small cruise stage costs 24 units instead of 40, so that a Discovery-class mission can fly at all.
- The solar conjunction card is dealt to teach. The real next Mars conjunction is January 2028.

**Balance.** `tools/balance-sim.js` plays 1,200 games straight from the shipped `index.html` (150 per build and policy).

| Build | Smart play (retained, pts) | Naive play (retained) | Spec target, smart / naive |
|---|---|---|---|
| Flagship: heavy rover + orbiter camera, Ka | 48%, 6.6 pts, range 0–50% | 0% | ~44%, 3.7 pts / ~3% |
| Breadth: four light robots, Ka | 68%, 5.5 pts | 20% | ~73%, 4.3 pts / ~14% |
| Cheap: 1.5 m dish, X-band | 62%, 3.6 pts | 10% | ~43%, 1.7 pts / ~5% |
| Overbuilt: heavy robots on a small dish | 0%; naive play loses ~155 cards to overflow | 0% | 0%, ~215 cards lost |

Points include the 2-point bonus objective when the Target of Opportunity card is dealt, which is why they sit above the spec's figures; the retained percentage does not count the bonus. Overbuilt fails completely and naive play scores clearly less than smart play. Flagship and breadth sit close to target. Cheap is more forgiving than the target, and flagship never completes both objectives, so its variance is narrower than intended.

## The cards and the crew

The game ships with a printed-style deck of **34 cards**: 5 robots, 3 cruise stages, 2 antennas and the Ka-band upgrade, 5 objectives, 14 events and 4 crew. Robots are chosen by flipping through the deck (the reverse shows a real NASA photo and facts), hardware is picked from shelves of cards, each week begins with everyone drawing the top card of the face-down event deck (the same card for all four seats, applied only once it is drawn), and **The Cards** screen shows the whole box.

The line drawings come from the team's card set (`design/original-cards/`). Every number and rule on a card is set from the game's own data, so the cards cannot disagree with the rules. The original PNGs printed different figures from the game (a 300 kg heavy rover, "1 card per slot") and described moving between map locations, which this game does not have, so only the artwork is reused. The Weather Station card and the four crew portraits were drawn to match.

All 14 event cards are playable. Twelve are dealt per game, and safe mode and solar conjunction never appear in weeks 1 and 2. Good news cards (Extended Mission, Closest Approach, Rival Mission Ends, Target of Opportunity) are balanced against the bad ones in the same 1,200-game simulation.

The four seats are played by a fictional crew: Jun Okada (Explorer, rover driver), Priya Raman (Researcher, science lead), Tomás Reyes (Engineer, spacecraft engineer) and Amara Cole (Flight Director). Their portraits appear on the seat panels and on their own cards.

## Accessibility

Revised Section 508 incorporates WCAG by reference, and conformance is mandatory for federal agencies. Priority Seven can be played start to finish from the keyboard, with a visible focus ring and arrow-key movement between antenna wells. A polite live region announces every change. No state is shown by colour alone: tokens carry mission codes, contested wells carry a hatch and a ring, and objectives carry worded stamps. All text meets 4.5:1 contrast on the paper stock. **Audio-only mode** sonifies the board. Pitch tracks the data rate, a drone thins as the recorder fills, each granted slot ticks, and speech reads the log. The screen can be blanked to play by ear. The sound mapping is published in the Sources frame, following the practice of Space Apps 2023 Global Connection winner Arcobaleno and of NASA Chandra's sonifications.

## Attribution

Independent student project for NASA Space Apps Challenge 2026. Not a NASA product and not endorsed by NASA. Hardware photographs come from the NASA Image and Video Library.
