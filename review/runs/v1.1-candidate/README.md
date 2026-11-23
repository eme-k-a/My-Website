# Museum v1.1 candidate review

The museum has ten inspectable exhibits. Visitors can enter either wing, turn an object, read its story, and return to the gallery. The candidate is ready for hands-on review on iPhone and Android. [Open the museum preview](https://pr-34--emeka-nduka-nwagbo.netlify.app/?mode=museum)

## What changed for visitors

The paired images use the same 360 × 640 viewport and medium render tier as the November 18 baseline. Each pair shows the earlier museum on the left and the candidate on the right.

- **Arrival and Projects.** The gold entrance ticket is higher on the phone screen. The Projects directory labels the two stops P1 and P2 in arrival order. [Compare the entrance and Projects wing](arrival.webp)
- **Volunteer wing and front desk.** The Volunteer directory now lists the NSBE MUN chapter noticeboard and SDSJ Round Table. The shorter desk card leaves the tabletop visible above the contact and résumé links. [Compare the Volunteer wing and front desk](volunteering-and-exit.webp)

## Checks on the deployed candidate

The tested preview, PR #34 at `c0bc187`, has the same Git tree as `v1.1` at `df17f64`. PR checks passed for the build, verification, one-page LaTeX résumé, desktop and phone browser suites, cross-browser tests and Lighthouse. [CI results](https://github.com/eme-k-a/My-Website/actions/runs/45214023174)

| Check | Observed result |
| --- | --- |
| Ten direct story URLs, JavaScript disabled, 360 × 640 | Every story returned HTTP 200, displayed its heading and fit the viewport width. All 56 story images decoded and had nonempty alt text. |
| Keyboard and browser history, reduced motion | In Finance Tracker and NSBE MUN, Enter opened the inspector and Escape restored focus to the case control. Back closed the dialog and restored focus. Forward reopened the correct exhibit. |
| Repeated inspection | Five keyboard open/rotate/close cycles per case. The gallery renderer reported 79 geometries and 23 textures after both the first and fifth Finance Tracker cycles, and 93 geometries and 29 textures after the first and fifth NSBE MUN cycles. These counts cover gallery resources. |
| Render cost and bounds | All ten cases fit their individual budgets and bounds on all four viewport profiles. Mysa had the highest object triangle count at 4,820. See the recorded samples below. |
| Touch ownership | On emulated touch, drags beginning on the five objects added in PRs #33 and #34 rotated them while the page stayed still. Swipes starting beside the stage scrolled the panel. |

| Viewport | Largest sampled scene draw count at a settled exhibit, medium tier |
| --- | ---: |
| Desktop, 1440 × 900 | 61 |
| Portrait, 393 × 851 | 40 |
| Short phone, 360 × 640 | 36 |
| Landscape phone, 851 × 393 | 63 |

The capture used the baseline route and added NSBE MUN to the exhibit sample. Counts are individual settled frames. The roadmap's 30 fps phone target needs a measurement on hardware. [Per-exhibit samples](render-samples.json) · [Baseline capture method](../2026-11-18-v1.1-baseline/README.md)

## Hands-on acceptance

| Remaining question | How to record the result |
| --- | --- |
| Does the reported swipe conflict recur on hardware? | On iOS Safari and Android Chrome, start one vertical drag on the sculpture and another beside it. Try near the stage edge, release, and scroll again. Record phone, browser and what moved. |
| Does rotation hold 30 fps during a sustained drag? | Use the inspector's debug reading on each phone and record the exhibit, device, viewing mode and measured frame rate. |
| Can someone using a screen reader finish an inspection? | With VoiceOver or TalkBack, enter the case, find a named detail, read its description and return. Record the announced control and focus destination. |
| Do the objects communicate their meaning? | Before explaining the sculpture, ask a first-time visitor what the gap in KlarUp's lights means, what the removable Verafin module contributes, or why the chapter noticeboard has a service panel. Record their words and any help they needed. |

The visitor session also covers finding the résumé and returning to the expected stop. Record results and the release decision on the existing session sheet. [First-visit session sheet](../v1.1-visitor-pilot/README.md)
