# One Current for sessions — companion app for psychologists and their clients

Concept document, 2026-08-08. No code in this document is built yet; the schemas reference real fields in `src/domain/` so it stays executable.

## 1. Why

One Current already holds what a therapy session spends its first twenty minutes reconstructing: which threads got louder, what the client decided or avoided, which feelings are still held, how beliefs shifted. The companion app lets a client hand that picture to their psychologist — deliberately, session by session — and lets the psychologist hand something gentle back. There is no backend and never will be: data moves only when the client performs the act of sharing. The client is also the growth channel: they invite their therapist with one link that works instantly, no account, no install.

## 2. The ritual — one loop per session

Two apps, one recurring exchange:

```
client's One Current                    therapist's companion app
       │                                          │
       │  ① session snapshot (file / link)        │
       │ ────────────────────────────────────────▶│  opens read-only,
       │                                          │  no account needed
       │            ② the session itself:         │
       │       timeline explored together         │
       │                                          │
       │  ③ prompt pack (QR shown at session end) │
       │ ◀────────────────────────────────────────│
       │                                          │
  prompts surface on the                 snapshot stored locally,
  relevant threads between               diffed against the last one
  sessions                               for next time
```

**① Client → therapist: session snapshot.** A quiet "Bring this to your session" flow in One Current. Purpose line: *"Choose what your psychologist gets to see."* The client toggles threads in or out (per-thread include/redact), picks nothing else — the app scopes moments to "since your last snapshot" automatically. Output: a small encrypted package (~2–6 KB compressed) as a file or link. The passphrase is spoken aloud in session or sent on a second channel.

**② In session.** The therapist opens the snapshot; the timeline becomes the shared object on the table. Walking a thread — its fork point, its moments, its beliefs then and now — structures the conversation instead of a blank "how was your week."

**③ Therapist → client: prompt pack.** The therapist attaches short prompts to specific threads. At session end the companion app shows a QR; the client scans it with One Current. Prompts surface softly on the matching thread between sessions. This reciprocity closes the loop and gives the client a concrete reason to bring a fresh snapshot next time.

## 3. The therapist app — three views

Read-only, local-first, static hosting (GitHub Pages), its own IndexedDB. No client data ever leaves the therapist's device either.

**Prep digest** — the "since last session" page, computed by diffing the two most recent snapshots per client (keyed by stable thread IDs, so it works even if the client exported everything):
- threads that got louder / quieter (loudness delta)
- new threads, and threads that came back (`recurrenceCount` increased)
- decisions taken vs days left undecided
- feelings still held vs reclaimed (`occupies` across open threads)
- beliefs that moved (`originalBelief` vs `currentBelief` text changed)
- merges completed, with what returned (`reclaimedQualities`, `resolution`)

**Shared timeline** — the same branching visualization One Current renders, read-only, sized for a laptop/tablet across the table. Tap a thread → its moments and beliefs. Redacted threads appear as unlabeled ghost lines (geometry stays honest; content stays private) — see open questions.

**Progress** — longitudinal, across all stored snapshots for a client: merges over months, feelings reclaimed for good, loudness trends, threads that keep recurring. The evidence-of-change view, useful to both parties.

## 4. The enticement loop

The client recruits the therapist; the design makes that cheap and rewarding:

1. **Inside One Current**: after a heavy week or a merge, a quiet suggestion — "You could bring this to your session." Never a nag; fits the one-purpose-line rule.
2. **First therapist contact costs nothing**: the client sends one link; the therapist sees an actual living timeline in under a minute. No signup, no sales page, no install. The product demo *is* the client's real data (with the client present or consenting).
3. **The QR moment**: composing a prompt pack takes the therapist two minutes and makes them a participant whose words live inside the client's app all week. Therapists who experience that reply loop have a reason to ask other clients "do you use this?"
4. The landing page gains one line for this audience later — but the primary funnel is client → therapist, never ads.

## 5. Data and privacy

**Stance:** no accounts, no server, no analytics — on both apps. The pitch to therapists: *"your client hands you a sealed page, not access to their life."*

**Envelope** (same for snapshot and prompt pack):
```
{ fmt: "oc-snap" | "oc-prompts", v: 1,
  enc: "aes-gcm" | "none", salt, iv, data }
```
- Compression: native `CompressionStream("deflate-raw")` → base64url. Realistic sizes: full snapshot 2–6 KB, prompt pack < 1.5 KB.
- Encryption **on by default**: PBKDF2 (≥300k iterations) → AES-256-GCM via WebCrypto. Turns "I emailed my mental-health data" into acceptable practice.

**Transport tiers:**
| Tier | Use | Limit |
|---|---|---|
| `.oc` file | canonical; share-sheet, email, chat | none |
| link `companion/#s=<blob>` | convenience; fragment never reaches the server | fine up to ~60 KB; note it lands in browser history + the chat app |
| QR | prompt packs, tiny scoped snapshots | ~2.5 KB practical |

**Therapist-side storage:** the companion's IndexedDB is a multi-client mental-health record on a personal device, so:
- passphrase-gate the app; one PBKDF2-derived key encrypts snapshot blobs at rest (only header metadata plaintext, for the client list)
- idle auto-lock
- per-client "delete everything" (honors a client withdrawing consent)
- explicit warning against shared/practice computers
- clients are pseudonymous in data: snapshots carry a random `clientId` UUID; the display name exists only in the therapist's local table

## 6. Schemas

### Session snapshot (`oc-snap` payload)

```
header:  clientId, clientLabel?, snapshotId, createdAt, coversFrom
threads: per included branch —
  id, title, type, orientation, status, forkDate, forkLabel,
  loudness, lastDecisionOn, leftOn, anxieties, occupies,
  originalBelief, currentBelief, controllability,
  mergeDate, recurrenceCount, firstCreatedAt,
  moments: commits filtered to date >= coversFrom
           (id, date, title, description, type, beliefAdded,
            emotionalImpact, effect),
  momentCountBefore          — so the viewer knows history exists
redacted: [{ id, redacted: true }]           — ghost-line stubs
merges:  BranchMerge records since coversFrom
         (stillValid, outdatedBeliefs, outsideControl,
          reclaimedQualities, conflicts, resolution,
          contributionKind, contribution, released, resultStatus)
```

Deliberately **excluded** from `exportAll`'s scope: `drafts`, `preserveRelease`, `diffSelections` — in-progress private sorting, not for sharing. Thread IDs (`br_<ts36>_<uuid8>`, `src/domain/ids.ts`) are stable across exports, which is what makes longitudinal diffing work.

### Prompt pack (`oc-prompts` payload)

```
forClient, createdAt,
prompts: [{ id, branchId?, text,
            feeling?, anxiety?,        — indices into the fixed vocabularies
            trigger?: "on-open" | "when-loud" | "weekly",
            expiresOn? }]
```

One Current import behavior: prompts attach to the matching thread and appear as a soft card ("from your session"); `when-loud` hooks the existing loudness-drift logic; a `branchId` that no longer matches (redacted, merged) degrades to an unattached session note. Expired prompts vanish silently.

## 7. Repo and architecture

- **New repo** (e.g. `one-current-companion`), same stack (Vite + React + TS), GitHub Pages push-to-main like this repo.
- `src/domain/` and `src/visualization/` are pure and dependency-free — **plain-copy them** into the new repo. No npm package, no submodule; revisit a workspace only if a third consumer appears.
- The contract that must not drift is not the copied code but the **snapshot schema**: a single `snapshot-schema.ts` (types + encode/decode + envelope + version checks) written once and copied verbatim to both repos, versioned by the `v` field. Old viewers refuse newer `v` politely.
- Companion app's own Dexie DB: `clients { clientId, displayName }`, `snapshots { snapshotId, clientId, createdAt, blob }` (blob encrypted at rest).

## 8. Future work in One Current (not built yet)

- "Bring this to your session" export flow (per-thread include/redact, remembers last snapshot date for `coversFrom`)
- Dexie v4: `prompts` table + QR/`#p=` import handler + soft prompt cards on threads
- optional `loudnessLog` (small dated log when loudness is set/drifts past integer marks) so the companion can draw trend lines — today only current loudness is stored
- pseudonymous `clientId` generated once and kept in settings

## 9. Open questions

- **Name** for the companion (working: "One Current — Sessions").
- **Redacted threads**: ghost line (honest geometry, therapist knows *something* is withheld) vs full omission (client comfort). Possibly the client chooses per thread.
- **Clinical boundary wording**: the apps support conversation between a client and *their own* clinician; they are not a diagnostic tool, a medical record, or a crisis channel. Exact disclaimer text and where it appears (companion first-run? snapshot flow?) to be decided — `needs-support` status display in the therapist app deserves special care.
- Should the prep digest flag "no decision for N days" threads explicitly, or is that too surveillance-flavored? Default leaning: show drift only as the same visual language One Current uses (distance from Now), never as a compliance metric.
- Multiple therapists / couples settings: out of scope for v1.
