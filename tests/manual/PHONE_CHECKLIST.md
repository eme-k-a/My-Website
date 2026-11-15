# Phone checklist (WP-32, gate G5)

Emeka runs this once on his own phone, against the preview build R0 names for G5, before release. It covers what headless Chromium cannot prove: real touch scrolling, the address bar, app switching, rotation and the real GPU's frame rate (EXPERIENCE §9, ARCHITECTURE §10.3). Every step has a pass condition you can see; tick **Pass** or **Fail**, and write what you saw under any Fail.

- Phone model: [placeholder: Emeka's phone model]
- OS and version: ______________________
- Browser and version: ______________________
- Preview URL tested: ______________________
- Low Power Mode or Battery Saver on? Yes / No (run with it off; note it if it was on)

Before you start: close other tabs, set brightness and volume as usual, and hold the phone upright (portrait) unless a step says otherwise. Do not add `?test=1` to any URL.

## The ten steps

**1. Open the link from a message, as a recruiter would.** Paste the preview URL into a LinkedIn message (or any chat app) to yourself and tap it there, so it opens the way a recruiter's tap would (in-app browser or the default browser).
Pass when, without scrolling, you can read your name, the role line, the education line and the three buttons "Resume (PDF)", "Email" and "Classic view", and the gallery then appears behind them.
[ ] Pass [ ] Fail Notes: ______________________

**2. Swipe through every main stop, one stop per swipe.** From the lobby, make one ordinary upward swipe at a time until the front desk. The main stops, in order: lobby, 01 Nasdaq Verafin, the Projects door, 02 Mysa, the Volunteer & Leadership door, 03 Wailo, 04 Canadian Food Inspection Agency, Memorial University of Newfoundland, Certifications, the front desk.
Pass when each swipe lands on the next stop (its card settles at the bottom of the screen), none is skipped, the camera never stops between two stops, and every stop's object is visible above its card.
[ ] Pass [ ] Fail Notes: ______________________

**3. Step into and out of each wing.** At the Projects door, tap "Step inside"; swipe through the wing's two exhibits; tap "Return to the aisle". Go back into the wing, then leave it with the browser's Back gesture or button instead. Repeat both ways at the Volunteer & Leadership door (one exhibit).
Pass when "Step inside" glides you into the room, "Return to the aisle" appears at the top left inside the wing, and both "Return to the aisle" and Back bring you to the same door in the main aisle, with the page still working.
[ ] Pass [ ] Fail Notes: ______________________

**4. Open a story, step through it, close it two ways.** At 01 Nasdaq Verafin, tap "Read the story". Tap "Older", then "Newer". Close with "Back to the aisle". Open the story again and close it with the browser's Back.
Pass when the story fills the screen, "Older" and "Newer" change the story each time, both ways of closing return you to the Verafin stop with the gallery showing, and no second Back is needed.
[ ] Pass [ ] Fail Notes: ______________________

**5. Collapse and expand the address bar.** At any stop, scroll the story or page a little so the browser's address bar shrinks, then scroll back so it grows again. Do this three times.
Pass when the gallery picture never flashes black or blank, and never jumps or rescales while the bar moves.
[ ] Pass [ ] Fail Notes: ______________________

**6. Switch apps for 30 seconds.** At any stop, switch to another app (or the home screen), wait 30 seconds by a clock, and return to the browser.
Pass when the gallery is drawn at the same stop within 5 seconds of returning, with no "Restoring the gallery" message left on screen and no reload to the lobby.
[ ] Pass [ ] Fail Notes: ______________________

**7. Rotate to landscape and back.** At any exhibit stop, turn the phone to landscape, wait 3 seconds, then back to portrait.
Pass when in both orientations the exhibit and its card are fully visible and do not overlap the top buttons, you are still at the same stop, and nothing is cut off or stretched.
[ ] Pass [ ] Fail Notes: ______________________

**8. The 3-minute frame-rate check.** Open the preview URL with `?debug` added (for example `https://<preview-host>/?debug`). A small performance panel (r3f-perf) appears. Walk the gallery normally for 3 minutes by a clock: swipe between stops, step into a wing, open and close a story. During minute 3, keep walking and read the FPS number on the panel at least five times.
Pass when every FPS reading in minute 3 is 30 or more. Write the lowest reading here: ______ fps
[ ] Pass [ ] Fail Notes: ______________________

**9. Download the PDF.** From the lobby, tap "Resume (PDF)" and open the downloaded file.
Pass when the PDF opens, has exactly one page, and shows no phone number anywhere.
[ ] Pass [ ] Fail Notes: ______________________

**10. Classic view.** Tap "Classic view" (in the lobby or at the top right).
Pass when the classic resume loads, every section is readable without zooming or scrolling sideways, and it lists Nasdaq Verafin, Mysa, Wailo and the Canadian Food Inspection Agency.
[ ] Pass [ ] Fail Notes: ______________________

## Result

Steps passed: ____ of 10. G5 needs 10 of 10; send any Fail with its notes (and a screenshot or screen recording if you can) to R0, and run this checklist again after the fix.

Signed: ______________________ (Emeka Nduka-Nwagbo)

Date: ______________________
