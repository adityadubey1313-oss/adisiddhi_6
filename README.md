# adisiddhi_6

## Project identity

- Local folder and repository name: `adisiddhi_6`.
- Origin (fetch and push): `https://github.com/adityadubey1313-oss/adisiddhi_6.git`.
- Working branch: `main`, tracking `origin/main`.
- Workspace integration: registered Git submodule at `adisiddhi_6`; Git metadata is managed by the parent, not a copied nested `.git` directory.
- This is a static HTML/CSS/JavaScript project, with no package manifest, framework homepage setting or Vite base configuration. Its Pages base URL is `siteUrl` in [invitation-data.js](invitation-data.js); HTML metadata uses the same URL and assets remain project-relative.
- Deploy from this repository's [Pages workflow](.github/workflows/deploy-pages.yml), not the parent workspace's legacy bulk-publishing scripts. Pushing this repository's `main` runs its independent validated `_site` build and Pages deployment.

## Invitation version: 3H

- Post-invitation prayer: one complete Ganesh invocation and two Sanskrit verses follow the existing invitation paragraph, before the programme. The shared prayer presentation keeps Om/invocation bold, verses italic and balanced spacing/dividers without changing other invitation wording.

- Published URL: https://adityadubey1313-oss.github.io/adisiddhi_6/
- Typography refinement: [index.html](index.html) and [app.js](app.js) keep the bride/groom names at their existing heading size and bold weight while rendering their introductory titles at 70% size. [styles.css](styles.css) adds salutation spacing and increases schedule dates from 21.2px to 23.2px and timings from 14.2px to 16.2px at the default 16px root size; both use weight 700. [invitation-data.js](invitation-data.js) removes only the stray venue-heading quotation marks. Existing fonts, colors, artwork, animations, event wording and this version's family layout remain unchanged.
- Build: [deploy-pages.yml](.github/workflows/deploy-pages.yml) now validates JavaScript, checks and stages the seven site files in `_site`, then deploys that artifact. No dependencies or framework build are required.
- Authoritative source: `निमन्त्रण पत्र  तृतीय.docx`, supplied from Downloads. Wording is copied as Unicode text without translation, spelling normalization or digit substitution.
- Source scope: 2 events.
- Architecture reference: published 3H uses the original portrait/gradient cover, Hindi Noto fonts, invitation story, schedule-day timeline, venue cards, native contact dialog and WhatsApp sharing. Natural scrolling and reduced-motion behavior are retained. The corrected 3H story markup closes before the schedule; other versions keep their package architecture and applicable family sections.
- Page flow: cover, document invocation and invitation, source schedule, confirmed venue details (brief family greetings follow its schedule), then existing sharing controls. 2H retains its document schedule. The top navigation and calendar feature are removed from every Hindi version.
- Content: exact source paragraph spacing, punctuation, honorifics, matras, family relationships, traditional dates, event names and time strings are retained. Layout-only asterisks and underscore/dash separator rows are represented by existing visual separation, not spoken text.
- Event counts: 1H eight, 2H five, 3H two, 4H ten. Reception remains the documents' 8 PM; the English invitations' 7 PM is not imported. Countdown still targets 6 December 2026 at 9 AM IST and clamps at zero.
- Venues: original confirmed Kishore Kuti/Hotel Gulzar Maps URLs are reused only where the matching document includes those venues. The source groups the early rituals under Kishore Kuti; no separate Khermai temple address or map pin is inferred. 4H's Mehendi uses its explicit Hotel Gulzar assignment. Venue punctuation and phone text are preserved per document.
- Contacts: the call button and contact dialog are removed; source phone numbers remain in venue addresses.
- Music: uses the supplied project-root `wedding-song2.mp3` unchanged. The non-looping single audio element completes exactly two tracks using `ended` events, then pauses, mutes and locks further playback for the page visit. The supplied track is approximately 76.77 seconds; two full plays total approximately 153.55 seconds (user-approved over a fixed 152-second cutoff). The existing top icon immediately pauses and mutes, disabling all automatic restart. Only an explicit icon click can resume an unfinished sequence; it preserves completed cycles. Autoplay permissions, pending-play cancellation and back/forward-cache state are handled without playback timers. Run `node --test tests/music.test.cjs` for cycle, control and lifecycle tests.
- Calendar removal: download buttons, captions, translation keys, handlers, export generator and the standalone `invitation.ics` are removed. Event schedules, countdown, contacts, directions and WhatsApp sharing remain.
- Assets and isolation: original background image, soundtrack and logos are unchanged. Only this Hindi package is published to `adityadubey1313-oss/adisiddhi_6` main using `.github/workflows/deploy-pages.yml` with the validated static build described above. Do not push the parent source repository or run bulk publishing scripts.

- Visual refinement: original artwork and Devanagari fonts are retained. The cover starts at the top without header spacing and uses a viewport-height artwork treatment inspired by 2E. Restrained gold dividers, closer invitation paragraph spacing, subtle card depth and a safe-area-aware 44px music control refine the existing sections. Reduced-motion preferences disable smooth scrolling and retain the original animation opt-out.

- Current revision: user-approved couple and family wording supersedes the original document text where requested. Each family conjunction has its own line. Introductory, festivities, family and sharing captions are hidden without removing schedules or greetings. Typography is enlarged, with a prominent invitation title and bold greeting labels. The added pen name is italicized without its parentheses, and the program heading uses the requested marital-program wording. WhatsApp sharing preserves the Hindi message, ASCII suffix `_6` and the `/adisiddhi_6/` published URL.
- Audio build asset: `.github/workflows/deploy-pages.yml` stages `wedding-song2.mp3` with the six other required site files. The original `wedding-song.mp3` remains in source history but is no longer referenced or deployed.
- Supplied MP3 verification: SHA256 `66C661B83CA19EF9A0A73045987318F0D4CA15F54716946033A3E0810A4CFEC5`; Windows media metadata reports 76.773141 seconds. Preserve the supplied bytes rather than trimming the track to a fixed timeout.
