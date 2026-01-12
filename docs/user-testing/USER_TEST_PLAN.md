# Tavern Master — User Testing Plan (Full)

This is a **manual user-testing script** meant to be run against a real build of Tavern Master on macOS.  
Use it to validate the **end-to-end solo-play experience** (campaign → character → play loop → notes/export), plus the supporting reference and settings flows.

> Tip: Don’t try to “remember what you did.” Write it down. This plan is designed to produce actionable bug reports.

---

## Test Run Info (fill in)

- Tester:
- Date:
- Build/Commit:
- Build type: (dev / release)
- macOS version:
- Hardware: (Apple Silicon / Intel, RAM)
- Display: (single / multiple monitors)
- Install type: (fresh install / existing data)
- LLM runtime: (Ollama / LM Studio / other)
- LLM base URL:
- LLM model:
- Sync configured? (Y/N)
- Notes:

---

## Success Criteria (what “pass” means)

A run passes if all of these are true:
- You can **create a campaign + session**, create/select a **player character**, and reach **Play** without confusion or broken routes.
- The Play loop produces output or, if LLM is unavailable, shows **clear errors with recovery** (no stuck “loading”).
- Notes/Journal can **create/edit/search/export** without data loss.
- SRD Browser can **browse + search** reliably.
- State persists across relaunch (campaign/session/character/notes).
- No crashes; no severe UI breakage.

---

## Bug Logging Template (use for every issue)

**Issue title:**  
**Area:** (Title / Campaign Library / Character / Play / Notes / SRD / Settings / Sync / Dev Tools)  
**Steps to reproduce:**  
1.  
2.  
3.  
**Expected:**  
**Actual:**  
**Frequency:** (Once / Sometimes / Always)  
**Severity:** (Blocker / Major / Minor / Cosmetic)  
**Attachments:** (screenshots, screen recording, logs)  
**Notes / hypotheses:**  

---

## Test Data Setup (recommended)

### Clean slate between runs
- [ ] Reset local app data (if you need a clean run) — Notes:
  - Path to try: `~/Library/Application Support/com.tavernmaster/`
  - If unsure, search for `tavernmaster.db` under `~/Library/Application Support/`

### Prepare 2 campaigns for coverage
Create these so you can validate switching:
- **Campaign A:** “The Fog Coast” (simple, low content)
- **Campaign B:** “Ashes of Khar” (add more notes, more characters)

---

# 1) Smoke Test (10–15 minutes)

### ST-01 Launch + first render
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-02 Title Screen buttons present
(“New Campaign”, “Continue Campaign”, “Settings”, “Exit”)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-03 Create campaign + session
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-04 Create character + set as Player Character
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-05 Resume/Play gating works
Resume/Play blocked until party exists + player character selected.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-06 Play loop works (or fails gracefully)
Take 1–2 turns.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-07 Notes create + export (Markdown + PDF)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-08 SRD Browser search + open detail
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-09 Settings: LLM test connection
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### ST-10 Restart persistence
Quit → relaunch → verify campaign/session/character/notes still present.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 2) Title Screen & App Shell

### TS-01 Continue Campaign routes to the correct “main experience”
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
  - What screen did it open?

### TS-02 Exit button closes cleanly
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UI-01 Sidebar navigation: every visible route works
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UI-02 Window resizing (small/large)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UI-03 Timeline drawer open/close reliability
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UI-04 Context rail updates with campaign/session changes
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 3) Campaign Library (Dashboard)

### DL-01 Empty state is helpful (no campaigns)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### DL-02 Create 2 campaigns with different metadata
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### DL-03 Create sessions in each campaign
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### DL-04 Switching campaigns updates all dependent UI
(Topbar, session list, party/notes/play context)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### DL-05 Resume Play gating (3 cases)
1) no party; 2) party but no player character; 3) party + player character
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### DL-06 Quick actions
(Open AI Director / Encounter Flow / New Journal Entry)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 4) Character Screen (Party Sheets)

### CH-01 No campaign selected messaging
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-02 Create a basic character and save
(Ex: Level 1 Fighter; ability scores; equipment)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-03 Edit character, navigate away, return
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-04 Delete character safety
(no crashes; selection recovers)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-05 Player vs AI control mode behavior
(Ensure AI tools don’t treat player character as AI-controlled)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-06 Player character selection persists per campaign
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-07 Derived stats auto-calc toggle behaves
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-08 Point-buy budget validation (if present)
Try to exceed budget; attempt to save.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-09 Inventory CRUD
Add/edit/remove items; confirm persistence.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-10 Spells CRUD (if available)
Prepared toggles / slots used / persistence.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### CH-11 Character creation wizard flow (if enabled)
No dead ends; validation is clear; final sheet correct.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 5) Play (PlayView) — Core Solo Loop

### PL-01 No campaign state is clear
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### PL-02 First action produces narrative + choices (LLM configured)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### PL-03 Keyboard shortcuts (1–7) trigger choices
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### PL-04 Error handling when LLM fails
Set base URL to a dead endpoint; try action.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### PL-05 Timeline updates during play
Toggle timeline; take 3–5 turns; ensure events append correctly.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### PL-06 Persistence across relaunch
Take a few turns; quit; relaunch; verify latest state is visible.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 6) Notes (Journal)

### JR-01 No campaign selected messaging
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-02 Create entry and save
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-03 Edit entry
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-04 Search by title and body
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-05 Import narration (if feature exists)
If no logs exist, should show a helpful message.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-06 Export Markdown
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### JR-07 Export PDF (print flow)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 7) SRD Browser (Reference)

### SRD-01 Version switching (ex: SRD 5.1 ↔ 5.2.1)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SRD-02 Browse each category
(spells, monsters, equipment, etc.)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SRD-03 Search
Try common terms (“fire”, “goblin”, “armor”).
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SRD-04 Detail rendering robustness
Open complex entries; verify layout doesn’t break.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 8) Settings (System)

### SET-01 Settings screen loads reliably
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-02 LLM config save + reflected in UI
Save; confirm reflected immediately or after relaunch (intended behavior).
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-03 Test connection button (valid + invalid)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-04 Tutorial controls (start/pause/resume/restart/reset)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-05 Developer Mode toggle impacts sidebar
Dev-only screens hidden when off.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-06 Demo/sample data seeding (if present)
If run twice, either prevents duplicates or informs user.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-07 Sync status panel (no config)
Missing env vars should show a clear message (no crash loops).
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-08 Sync sign-in/out (if configured)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### SET-09 Sync conflict resolution (if applicable)
Induce conflict; verify resolution updates state and clears conflict.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 9) Global Interactions & Shortcuts

### GL-01 Topbar campaign/session dropdowns
No stale selections; switching updates dependent screens.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### GL-02 Global keyboard shortcuts (Cmd+1..9)
Should only route to user-visible screens unless Developer Mode is enabled.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### GL-03 Toast behavior
Toasts readable, non-blocking, and don’t stack off-screen.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### GL-04 Keyboard focus and tab order
Tab reaches primary actions; focus ring visible; Enter/Space works.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 10) Developer Tools (only if Developer Mode enabled)

## DEV-PW (Play Workspace)
- [ ] DEV-PW-01 Narration stream — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-PW-02 Proposals generate/approve/reject — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-PW-03 Notes save + import narration — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

## DEV-AD (AI Director)
- [ ] DEV-AD-01 No campaign messaging — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-AD-02 Stream + “Copy to Journal” — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

## DEV-CB (Combat Debugger / Encounter Flow)
- [ ] DEV-CB-01 Create encounter — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-CB-02 Initiative + persistence — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-CB-03 Turn advance + round increments — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-CB-04 Recovery snapshot after force quit — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

## DEV-LE (Logs & Exports)
- [ ] DEV-LE-01 Filter kinds + search — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-LE-02 Export transcript — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-LE-03 Export session packet — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

## DEV-MS (Map Studio)
- [ ] DEV-MS-01 Upload map (picker + drag/drop) — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:
- [ ] DEV-MS-02 Token CRUD + filters — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

# 11) Reliability, Performance, and “Feels Good” Checks

### PERF-01 Cold start time (measure)
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes (measured time):

### PERF-02 Large content handling
Very large journal entry; lots of logs; search still responsive.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UX-01 Guidance copy clarity
Missing prerequisites should have clear “what next” + a route.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

### UX-02 Naming consistency
Sidebar labels match screen titles; minimal cognitive mismatch.
- [ ] Completed — Result: [ ] Pass [ ] Fail [ ] N/A — Notes:

---

## Final Sign-off

- [ ] Smoke suite passed — Notes:
- [ ] Core suites passed (Dashboard/Character/Play/Notes/SRD/Settings) — Notes:
- [ ] Developer tools passed (if applicable) — Notes:
- [ ] All known issues recorded as tickets — Notes/links:
- [ ] Release recommendation: [ ] Yes [ ] No — Notes:
