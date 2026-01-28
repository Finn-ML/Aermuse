# QA Checklist - New Features

Use this checklist to manually test all new features in Chrome. Check off each item as you verify it works correctly.

---

## 1. E-Signing for Free Users

### Prerequisites
- [ ] Log in as a **free tier** user (no active subscription)
- [ ] Have at least one contract uploaded

### Feature Access Tests
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.1 | Free user sees e-sign button | Open any contract in ContractView | "Request Signatures" button is visible (no lock icon, no "Premium" label) | |
| 1.2 | Free user can open signature modal | Click "Request Signatures" button | Signature request modal opens successfully | |
| 1.3 | Free user can send signature request | Fill in signer email and send | Request is sent, confirmation shown | |
| 1.4 | Pricing page shows e-signing in free tier | Navigate to /pricing | E-signing feature shows checkmark (✓) under Free tier | |

### Regression Tests
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.5 | Beta user still has e-signing | Log in as beta user, open contract | E-sign button works normally | |
| 1.6 | Alpha user still has e-signing | Log in as alpha user, open contract | E-sign button works normally | |
| 1.7 | Unauthenticated user cannot e-sign | Log out, try to access signature endpoint directly | Redirected to login or 401 error | |

---

## 2. Track Preview Container Removal

### Visual Tests
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.1 | No empty state on desktop | Visit artist page with music, don't select any track (desktop view) | No "Select a track to preview" dashed box appears | |
| 2.2 | Playlist displays correctly | Visit artist page with multiple tracks | Track list renders properly on left side | |
| 2.3 | Player appears on track select | Click any track in playlist | SpinningDiscPlayer slides in from right | |
| 2.4 | Player closes correctly | Click X or outside player | Player closes, empty space remains (no placeholder) | |
| 2.5 | Mobile view unchanged | View artist page on mobile (<1024px) | Playlist displays normally, no layout issues | |

### Regression Tests
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.6 | Track without cover shows icon | Have a track without cover art | Music icon fallback displays in track row | |
| 2.7 | Audio playback works | Click play on any track | Audio plays correctly | |

---

## 3. Video Container with Paywall

### Prerequisites
- [ ] Database migration applied (`npm run db:push`)
- [ ] At least one artist landing page exists
- [ ] Test videos ready (MP4/WebM, various lengths)

### Editor Tests (Dashboard)
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.1 | Video tab appears in editor | Open landing page editor | "Video" tab visible in tab list | |
| 3.2 | Upload video file | Click upload, select MP4 file | Video uploads, thumbnail generated | |
| 3.3 | Set video title | Enter title in video form | Title saves correctly | |
| 3.4 | Enable paywall toggle | Toggle "Paywall this video" on | Price input field appears | |
| 3.5 | Set fixed price | Enter price (e.g., £4.99) | Price saves, shown on video card | |
| 3.6 | Set PWYW pricing | Select PWYW, set minimum | Minimum price saves correctly | |
| 3.7 | Upload custom thumbnail | Click thumbnail upload, select image | Custom thumbnail replaces auto-generated | |
| 3.8 | Publish video | Toggle "Published" on | Video marked as published | |
| 3.9 | Reorder videos | Drag videos to reorder | Order persists after save | |
| 3.10 | Delete video | Click delete, confirm | Video removed from list | |

### Public Artist Page - Video Section
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.11 | Video section displays | Visit artist page with published videos | Horizontal video container visible | |
| 3.12 | Horizontal scroll works | Scroll container left/right | Videos scroll smoothly with snap | |
| 3.13 | Scroll buttons work | Click left/right arrows | Container scrolls to next/previous videos | |
| 3.14 | Free video shows no lock | Have a non-paywalled video | No lock icon on thumbnail | |
| 3.15 | Paywalled video shows lock | Have a paywalled video | Lock icon visible top-right of thumbnail | |
| 3.16 | Price badge displays | Paywalled video with price | Price shown on video card | |
| 3.17 | Duration badge displays | Any video with duration | Duration shown (e.g., "3:45") | |

### Video Preview & Playback
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.18 | Free video plays fully | Click free video | Full video plays without restrictions | |
| 3.19 | Paywalled video starts preview | Click paywalled video | Video starts playing | |
| 3.20 | Preview countdown shows | Watch paywalled video | Timer shows "Preview: 10s... 9s..." etc. | |
| 3.21 | Preview stops at 10 seconds | Let preview run | Video pauses at exactly 10 seconds | |
| 3.22 | Purchase overlay appears | After preview ends | "Preview ended. Purchase to watch full video" overlay | |
| 3.23 | Replay preview button works | Click "Replay Preview" | Preview plays again from start | |
| 3.24 | Video controls work | Use play/pause/mute/fullscreen | All controls function correctly | |

### Purchase Flow
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.25 | Purchase modal opens | Click "Buy Now" on preview overlay | Purchase modal appears with video details | |
| 3.26 | Fixed price displays | Video with fixed price | Correct price shown, checkout button | |
| 3.27 | PWYW input works | Video with PWYW | Custom amount input, minimum enforced | |
| 3.28 | Stripe checkout opens | Click checkout button | Redirected to Stripe checkout page | |
| 3.29 | Purchase success | Complete Stripe payment | Success modal, full video access granted | |
| 3.30 | Purchased video plays fully | Return to artist page, click video | Full video plays (no preview limit) | |

### Mobile Tests
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.31 | Touch scroll works | Swipe video container on mobile | Smooth horizontal scroll | |
| 3.32 | Video cards sized correctly | View on mobile | Cards appropriately sized, not cut off | |
| 3.33 | Video player mobile | Tap video on mobile | Player opens, controls accessible | |

---

## 4. Music Player Scrubbing

### Prerequisites
- [ ] Artist page with playable tracks
- [ ] Tracks of various lengths (short <30s, medium 3-5min, long >10min)

### Basic Scrubbing
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.1 | Progress bar visible | Open SpinningDiscPlayer | Progress bar displays below disc | |
| 4.2 | Click to seek | Click anywhere on progress bar | Playhead jumps to clicked position | |
| 4.3 | Time updates on seek | Seek to middle of track | Current time display updates correctly | |

### Drag Scrubbing (Desktop)
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.4 | Thumb appears on hover | Hover over progress bar | Circular thumb/handle appears | |
| 4.5 | Time tooltip on hover | Hover over different positions | Tooltip shows time at hover position | |
| 4.6 | Drag to seek | Click and drag thumb | Playhead follows drag smoothly | |
| 4.7 | Audio follows drag | Drag while playing | Audio position updates after release | |
| 4.8 | Drag beyond bounds | Drag past start/end | Clamps to 0:00 / duration | |
| 4.9 | No jitter during drag | Drag while audio plays | No jumping/jittering of playhead | |

### Touch Scrubbing (Mobile)
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.10 | Touch to seek | Tap progress bar on mobile | Seeks to tapped position | |
| 4.11 | Touch drag works | Touch and drag on progress bar | Smooth seeking follows finger | |
| 4.12 | Touch target adequate | Try to grab progress bar | Easy to touch (44px+ hit area) | |
| 4.13 | No page scroll during drag | Drag on progress bar | Page doesn't scroll while seeking | |

### Visual Indicators
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.14 | Played progress shows | Play track partway | Filled portion shows played time | |
| 4.15 | Buffered progress shows | Start playing, observe | Lighter fill shows buffered portion | |
| 4.16 | Colors match theme | Check on different artist pages | Progress bar uses artist's primaryColor | |
| 4.17 | Time display accurate | Compare displayed time to actual | Current time and duration are correct | |

### Keyboard Navigation
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.18 | Focus progress bar | Tab to progress bar | Focus indicator visible | |
| 4.19 | Left arrow seeks back | Press Left Arrow | Seeks back 5 seconds | |
| 4.20 | Right arrow seeks forward | Press Right Arrow | Seeks forward 5 seconds | |
| 4.21 | Home key seeks to start | Press Home | Seeks to 0:00 | |
| 4.22 | End key seeks to end | Press End | Seeks to end of track | |

### Accessibility
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.23 | Screen reader announces | Use screen reader on progress bar | Announces "audio progress", current/total time | |
| 4.24 | ARIA attributes present | Inspect element | role="slider", aria-valuemin/max/now present | |

### Edge Cases
| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.25 | Very short track | Play track <10 seconds | Scrubbing still works accurately | |
| 4.26 | Very long track | Play track >1 hour | Time displays correctly (1:05:30 format) | |
| 4.27 | Seek while paused | Pause, then seek | Seeks correctly, stays paused | |
| 4.28 | Seek while loading | Try to seek before fully loaded | Handles gracefully (no errors) | |
| 4.29 | Rapid seeking | Quickly seek multiple times | No crashes, audio recovers | |

---

## Cross-Feature Tests

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| C.1 | All features load together | Visit artist page with music + videos | Both sections render without conflict | |
| C.2 | Music and video don't conflict | Play music, then click video | Music stops, video plays (or vice versa) | |
| C.3 | Editor saves all content | Edit music, videos, links in editor | All changes persist after save | |
| C.4 | Page performance | Load artist page with many tracks/videos | Page loads in reasonable time (<3s) | |

---

## Browser Compatibility

Test critical paths in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

---

## Notes Section

Use this space to document any bugs, issues, or observations:

```
Date: ___________
Tester: ___________

Issues Found:
1.
2.
3.

Notes:


```

---

## Sign-Off

| Feature | QA Complete | Date | Tester |
|---------|-------------|------|--------|
| E-Signing for Free Users | [ ] | | |
| Track Preview Removal | [ ] | | |
| Video Container with Paywall | [ ] | | |
| Music Player Scrubbing | [ ] | | |

**All Features Approved:** [ ] Yes / [ ] No - Requires fixes

---

*Generated for Aervival Artist Launcher - January 2026*
