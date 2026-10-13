# Design: Blog post — "Rubrics: A Lightweight Decision Framework"

**Date:** 2026-10-13
**Status:** Approved by user (design conversation 2026-10-13)
**Source material:** `/Users/lewiscowles/Downloads/Rubric Versus Quantitative Scoring Pipelines.md` (Gemini conversation distillation)

## Goal

Create a new blog post for LewisCowles1986.github.io that:

1. Clarifies what a rubric is, for a general engineering audience.
2. Positions rubrics as a lightweight framework for making engineering decisions — expressing and refining ideas formally without needing PhD mathematics or frontier-lab engineering experience.
3. Gives a worked example using sequence diagrams (too many participants/columns), contrasting a "less ideal" wide diagram with a "good" narrow one.
4. Closes by asking readers what rubrics they might use.

## Scope decisions (user-confirmed)

- **Lead with AI** (topical), then move quickly onto rubrics as formal expression of ideas. Stay on rubrics throughout.
- **No LLM prompt examples** — the AI angle is framing only; prompt engineering is out of scope.
- **Diagrams:** two static SVG images generated from mermaid source, committed under the post folder. No mermaid.js or any JS dependency (site is offline-first, hand-crafted). Explicitly marked good vs less ideal.
  - Wide diagram: 5 participants (less ideal).
  - Narrow diagram: 3 participants (good); the wider interaction becomes a separate diagram — showing "split the diagram" as the fix.
- **No code/DSL snippets** — worked example is verbal + diagrams.
- **Reference the tagged installer file? No** — keep the post purely conceptual.
- **Depth-vs-width opinion:** explicit "my opinion" hedging, verbal first; single short parenthetical on mechanics (hops add linearly; participants compound — reliability ~multiplies, interaction edges grow roughly N(N−1)). No formulas on the page, no Brooks citation.
- **Include a small criteria×levels rubric table** for the sequence-diagram evaluation.
- **Deliverable:** full post at `blog/rubrics-lightweight-decision-framework/index.html` following existing post conventions + `<img>` references; `blog/index.html` entry **added only after the user reviews the rendered post in the browser**.

## Non-goals

- No changes to CSS, JS, service worker, or tests.
- No new vocabulary dump from the source (MCDA, MAUF, etc.) beyond one short contrast between scoring pipelines and rubrics.
- No DSL/code section, no installer example.

## Content plan

### Structure (top to bottom)

1. **Lead — AI made "rubric" a word you can't escape.** Rubrics are topical because LLM-as-judge made them the vocabulary of the day. Strip the hype: a rubric is a written, shared standard — what good looks like, described in words, agreed in advance. Their engineering value: expressing and refining ideas formally, without a mathematics detour. One short note: the word comes from assessment/education; in ML circles it drifted to mean "any scoring rig," and that conflation gets one paragraph of contrast here, then out of the way.
2. **What makes a rubric a rubric.** Plain definition (explicit criteria; described performance levels; agreed in advance). A criteria×levels table as the concrete artifact. One sentence contrast: numbers + weighting + threshold = scoring pipeline; the rubric is the words upstream. A rubric is useful with zero code and zero formulas.
3. **Worked example: the sequence diagram with too many columns.** Reviewing sequence diagrams is common; "too many participants" is real but squishy. Wide diagram (5 participants, e.g. Checkout → Cart → Inventory → Payments → Notifications, captioned less ideal). Apply the rubric levels in words. Narrow diagram (3 participants, e.g. Checkout → Order Service → Warehouse), captioned good; the wide-world interaction is now a separate diagram. Same rubric; different verdict.
4. **Depth vs width — marked as opinion.** Verbal principle: depth is essential work doing one thing at a time; each added participant multiplies failure modes and cognitive surface. Short parenthetical on mechanics (linear vs compounding). Invite pushback.
5. **Closing question.** "What rubrics would you consider?" with a few seeds (code review, PR size, incident reports, design docs). One question, open to readers.

### Example rubric table (drafted content)

| Criterion | Weak | Good | Penalised |
| --- | --- | --- | --- |
| Participants in one flow | 1–2 (probably several flows hiding as one) | 3–5 | 6+ (sprawl; split the diagram) |
| Hops (depth) | — | Any, if each hop earns its place | Grows cost linearly — keep steps meaningful |
| Actor ownership | Roles blurred / one thing "talks to everything" | Each participant owns one concern | Mixed responsibilities |

(Single-row depth entry: depth is not "weak/good/penalised" — it is a cost that scales gently; width compounds. This asymmetry is the opinion section's seed.)

## Technical plan

- **Files created:**
  - `blog/rubrics-lightweight-decision-framework/index.html`
  - `blog/rubrics-lightweight-decision-framework/img/too-wide.svg`
  - `blog/rubrics-lightweight-decision-framework/img/good.svg`
- **Files modified (after user approval only):** `blog/index.html` (new `<li>` entry in the post list, dated 2026-10-13, matching existing markup exactly).
- **Post conventions:** copy head/nav/footer structure from `blog/jwt-act-claim-rfc-8693/index.html` (most recent post): meta description, canonical `https://www.lewiscowles.co.uk/blog/rubrics-lightweight-decision-framework/`, JSON-LD Person + Organization, webmention links, `h-entry` microformats, `<time class="dt-published" datetime="2026-10-13">`, title "Web log - … , by Lewis Cowles".
- **Diagrams:** authored as mermaid `sequenceDiagram` source for clarity, rendered once to standalone SVG (mermaid CLI via npx), then committed. Mermaid source kept out of the page or in an HTML comment for readers who want to reproduce.
- **No JS/CSS changes.**

## Validation

- Post renders correctly via local browser review (user reviews before index entry is added).
- HTML sanity check: balanced tags; microformat classes present.
- SVGs render crisply at site width and have alt text.
- Grep-level check: no mermaid/JS references in the final HTML.
- Final `blog/index.html` entry matches the exact markup pattern of existing entries; commit after approval.

## Risks / open questions

- Mermaid CLI rendering requires network/npx at author time only — acceptable since output is committed static SVG.
- Date: today, 2026-10-13.
- Slug: `rubrics-lightweight-decision-framework` (user-selected).