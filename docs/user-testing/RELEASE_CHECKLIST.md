# Tavern Master — Release Checklist (User QA)

This is the **short, high-signal checklist** you run before cutting a release.  
If anything marked **(Blocker)** fails, do not ship.

---

## Run Info (fill in)
- Tester:
- Date:
- Build/Commit:
- Build type: (release / rc / dev)
- macOS version:
- Hardware:
- LLM runtime + model:
- Notes:

---

## A) Install & Launch

- [ ] **A1 (Blocker)** App launches to a usable UI (no blank screen/crash) — Notes:
- [ ] A2 Title Screen shows: New Campaign / Continue / Settings / Exit — Notes:
- [ ] A3 Exit quits cleanly — Notes:
- [ ] A4 Window resize doesn’t break critical UI (buttons still reachable) — Notes:

---

## B) Core Campaign Flow

- [ ] **B1 (Blocker)** Create a campaign — Notes:
- [ ] **B2 (Blocker)** Create a session in that campaign — Notes:
- [ ] B3 Switching campaigns updates session list + context correctly — Notes:
- [ ] **B4 (Blocker)** Resume/Play is gated until prerequisites are met — Notes:

---

## C) Character Flow

- [ ] **C1 (Blocker)** Create a character and it appears in roster — Notes:
- [ ] **C2 (Blocker)** Set that character as “Player Character” — Notes:
- [ ] C3 Edit character; changes persist after navigating away — Notes:
- [ ] C4 Delete character; UI recovers safely (no crash/orphan selection) — Notes:

---

## D) Play Loop (Main Experience)

- [ ] **D1 (Blocker)** Reach Play from Title/Library without dead ends — Notes:
- [ ] **D2 (Blocker)** Take 2 turns successfully (LLM configured) — Notes:
- [ ] **D3 (Blocker)** If LLM fails/unconfigured, error is clear and recoverable (no stuck loading) — Notes:
- [ ] D4 Choice shortcuts (1–7) work when choices are visible — Notes:
- [ ] D5 Timeline (if present) updates during play and doesn’t tank responsiveness — Notes:

---

## E) Notes / Journal

- [ ] **E1 (Blocker)** Create a journal entry and it persists — Notes:
- [ ] E2 Edit journal entry; changes persist — Notes:
- [ ] E3 Search finds entries by title/body — Notes:
- [ ] **E4 (Blocker)** Export Markdown works and output is readable — Notes:
- [ ] **E5 (Blocker)** Export PDF/Print flow opens and output is readable — Notes:

---

## F) SRD Browser

- [ ] F1 SRD Browser opens and lists entries — Notes:
- [ ] **F2 (Blocker)** Search returns results; opening detail works — Notes:
- [ ] F3 Version switching (if available) doesn’t mix data or break UI — Notes:

---

## G) Settings

- [ ] G1 Settings screen loads without errors — Notes:
- [ ] **G2 (Blocker)** LLM config save + “Test connection” works (valid + invalid cases) — Notes:
- [ ] G3 Developer Mode toggle hides dev screens when off — Notes:
- [ ] G4 Tutorial controls (start/reset) do not get stuck — Notes:

---

## H) Persistence & Recovery

- [ ] **H1 (Blocker)** Quit + relaunch retains campaign/session/character/notes — Notes:
- [ ] H2 After relaunch, returning to Play shows recent state (no obvious loss) — Notes:

---

## I) Quick UX Sanity

- [ ] I1 Empty states (no campaign selected) are clear and give a next step — Notes:
- [ ] I2 No obvious “internal/dev-only” screens are reachable in non-dev mode (unless intentional) — Notes:
- [ ] I3 Toasts/errors are readable and dismissible — Notes:
- [ ] I4 Keyboard tab order reaches primary actions on at least Dashboard/Character/Play — Notes:

---

## Ship Decision

- [ ] No blockers found — Notes:
- [ ] All majors filed as tickets — Notes/links:
- [ ] Recommendation: [ ] Ship [ ] Hold — Notes:
