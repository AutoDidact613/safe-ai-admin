# Integration Branch: `integration/develop-consolidation-20260831`

Consolidates open pull requests targeting `develop` whose base is current
(based on `develop`@`eb3413b`, i.e. "fresh" as of 2026-08-31) into a single branch
for review before merging back into `develop`. Base branch was `develop`@`eb3413b22b7018ded484b999b611f2c4d5d8a9f2`.

**Scope decision (per team request):** only PRs updated this month whose base commit
matches current `develop` were included. Excluded from this pass:
- Draft PRs (currently #351 — PayMe wallet integration; still WIP).
- PRs based on an older `develop` commit (#295, #294, #293, #292, #291, #285, #298, #299,
  #301, #319, #330, #333, #343 — these predate the current `develop` head and need a
  rebase/re-review by their authors before they can be folded in cleanly).

## Branches merged (in commit order)

| PR | Branch | Author | Summary |
|----|--------|--------|---------|
| #344 | `fix/search-button` | Tamar-BenChaim | Tender board: once-per-user proposals + applied filter, "view my application" screen |
| #348 | `tender-board-log-agent` | Tamar-BenChaim | Adds the standalone tender-board monitoring/log agent (Python, LangGraph) + docs |
| #349 | `feature/tender-topic-guardrail` | Tamar-BenChaim | AI guardrail: rejects free-text input to "smart tender creation" that isn't actually a tender request |
| #350 | `feature/brand-color-teal` | malky1234 | Site-wide rebrand from green to teal-blue (logo, favicon, buttons, links, page accents) |
| #352 | `feature/tender-domain-guardrail` | Tamar-BenChaim | Second AI guardrail: rejects tenders whose *subject matter* isn't software/AI development |
| #353 | `feature/contact-attachments` | malky1234 | Screenshot / screen-recording capture + file attachments on the contact form |
| #354 | `claude/sarum-227-analysis-ybyrqr` | e0527694959-arch | New landing page draft (v2) + SafeAI Hub / SafeAI Platform sub-homepages, public stats endpoint |
| #355 | `feature/news-image-markdown` | malky1234 | AI News: image upload, Markdown rendering, full editorial redesign, smart tag input |
| #356 | `feature/scrum-301-evals-manifest-docs` | e0527694959-arch | Org/Payments log agent (Python): fetch, classify, evaluate anomalies, LLM summary, evals |
| #357 | `fix/scrum-320-org-usage-duplication` | e0527694959-arch | Refactor: unify duplicated aggregation/permission logic between orgs & usage tracking into `usageRepository` / `organizationAccess` |
| #359 | `fix/block-plus-in-registration-email` | malky1234 | Blocks `+` in registration email addresses (anti-abuse) |
| #360 | `feature/dark-mode-support` | malky1234 | Adds a site-wide dark theme (`[data-theme="dark"]` + design tokens) across nearly every client page/component |

**Excluded, needs manual attention:**
- **#358 `feature/safeai-inquiry-agent`** — its branch point predates the
  `Move inquiry-agent and log-agent into apps/agents/` restructuring (commit `c2b73ed`).
  Merging it produces dozens of rename/rename and "file location" conflicts across the
  entire agent directory (not real content conflicts). Forcing a resolution here risks
  silently corrupting the production inquiry-agent. **Decision: skipped** — the author
  should rebase `feature/safeai-inquiry-agent` onto current `develop` (or `apps/agents/inquiry-agent/`)
  and reopen/update the PR; then it merges normally.

## Conflicts encountered and how they were resolved

1. **`tenderBoardAIService.ts`** (#349 vs #352) — both PRs added a distinct guardrail
   (topic vs. domain), each with its own Zod schema/error class in the same file.
   *Resolution:* kept both blocks — they are independent guardrails, both wired into
   `generateTenderData`/`assertTenderIsProgrammingRelated` and both used downstream.

2. **Dark mode (#360) vs. teal rebrand (#350)** — the largest conflict set, ~18 CSS/TSX
   files. `#350` replaced site colors with hardcoded teal hex literals; `#360` (forked
   before `#350` merged) converted many of the *same* selectors to `var(--brand-secondary)`
   tokens for theme-switching, which still resolved to the old **green** brand color.
   Naively taking either side would have either dropped dark-mode support or silently
   undone the teal rebrand.
   *Resolution:*
   - Updated `design-system.css`'s `--brand-secondary` / `--brand-secondary-hover` tokens
     to the teal palette (`#1C7AA6` / `#239AD1` light, `#4FC3E8` / `#2BA8D6` dark — the dark
     values are a judgment call, a lightened/legible teal in the same family; **flagging
     for design review**, no one specified an exact dark-mode teal).
   - Adopted the var()-based (dark-mode-aware) version wherever the incoming side used
     only CSS variables with no color literal.
   - Kept the teal hex literal where the incoming side still had a raw (non-var) color
     literal — mainly gradient stops and box-shadow tints where no matching token exists
     (e.g. `linear-gradient(135deg, #1C7AA6 0%, #135471 100%)` on the About page / landing
     hero). These specific spots will **not** invert under dark mode; a real fix means
     adding dedicated tokens for that darker teal shade, out of scope for a conflict
     resolution.
   - In `AddPostModal.tsx`'s tag-select styling, found that `#350`'s rebrand had actually
     overwritten what was originally a semantic **success/green** chip style (pre-existing
     on `develop`, unrelated to the brand color) with teal. `#360`'s `var(--color-success-*)`
     tokens restore the original semantic intent *and* add dark-mode support — took the
     incoming side there.
   - In `TenderOffers.tsx`, `#360`'s diff was based on a version of the file before the
     "highlight the applicant you just messaged" feature (from #344) existed, and its
     merge would have silently dropped that feature. *Resolution:* kept the highlight
     feature, converted its hardcoded blue (`#3498db`/`#eaf4fc`) to the existing
     `--color-info` / `--color-info-bg` tokens instead.
   - **`news-page.css`**: `#355`'s editorial redesign (merged earlier in this branch) had
     already replaced the entire page's class structure and moved to page-local CSS
     variables (`--news-fg`, `--news-bg`, `--news-accent`, …) that `#360` never saw (its
     diff targets the *old* news page structure entirely). Applying `#360`'s side would
     have reintroduced dead CSS for classnames that no longer exist while deleting the
     current design. **Decision: kept the current (post-redesign) `news-page.css` as-is.**
     The AI News page does **not** get dark-mode theming from this merge — its local
     `--news-*` tokens would need their own `[data-theme="dark"]` override block as a
     follow-up.

## Verification performed on the integration branch

- `apps/client`: `tsc -b` (typecheck) ✅, `vite build` ✅ (production build succeeds)
- `apps/server`: `tsc --noEmit` (typecheck) ✅, `npm test` ✅ — 15 suites / 125 tests passed

No UI smoke test was performed (no browser session run against the merged dark mode /
guardrails / news page in this pass) — recommend a manual pass on: dark-mode toggle
across pages (esp. the About/Landing hero gradients and AI News page, called out above),
tender creation guardrails, and the contact form's screenshot attachment flow.

## Open items before merging to `develop`

1. Sign off on the dark-mode teal color choices in `design-system.css` (`#4FC3E8` /
   `#2BA8D6` for dark theme) — invented for this merge, not specified by either PR author.
2. Decide whether `feature/safeai-inquiry-agent` (#358) should be rebased and merged
   separately, or deferred.
3. Manual/browser smoke test of dark mode + the merged guardrails + news page, per above.
