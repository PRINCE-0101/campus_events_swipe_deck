# CampusLoop — Project Approach

## 1. Project idea and objective

CampusLoop is a mobile app that helps students discover campus events through a simple swipe deck. We focused on a common problem: event details are spread across posters, club messages, and group chats. Students may hear about an event too late, miss the venue, or forget whether they planned to attend. A long list of announcements can feel like another task to manage. We wanted event discovery to feel quick and inviting, while still giving students the practical details they need.

The main interaction is direct: swipe right to RSVP and swipe left to pass. Students can filter the deck by category before deciding. Accepted events appear in My Plans with their date, venue, and a countdown. The latest swipe can be undone. This directly covers the task brief’s core requirements: an event directory, swipe decisions, category filters, state saved across app restarts, and the bonus countdown and undo features.

## 2. Understanding the requirements

We translated the brief into a short user journey: open a card, understand the event, filter the deck, RSVP or pass, undo the latest decision, and review saved plans. Each card therefore shows the title, category, date, time, location, host, description, and available spots. A swipe must do more than move a card; it must update state and change what the student sees next.

We separated visible features from the logic that supports them. The visible features are the deck, filters, action buttons, and plans screen. The logic includes stable event IDs, state transitions, category selection, countdown calculation, and persistence. The task allows local data and does not require sign-in, so we avoided accounts and server setup. Reviewers can try the flow immediately, and the project stays focused on the requested behavior.

## 3. Technology and data choices

We chose React Native with Expo to build a mobile app in JavaScript. React Native provides touch handling and native interface components, while Expo keeps setup manageable for a student project. The app can run through Expo Go and has an EAS profile for a later Android APK build. The same interface can also support iOS without maintaining two implementations.

The local directory in `src/data/events.json` follows the brief’s allowance for mock data. Each record has an ID, title, category, start time, location, host, description, availability, and visual palette. Keeping records together makes sample updates easy. The discovery card and plans screen use the same record, so they display consistent details.

AsyncStorage saves only the device-local state: IDs marked going, IDs passed, and the latest action. Event details stay in JSON. This is enough for the required behavior without a server or account, and it keeps persistence small and understandable.

## 4. App structure

The project has three main parts. `App.js` renders Discover, My Plans, cards, navigation, and gesture animation. `src/data/events.json` is the sample directory. `src/domain.js` defines initial state, swipe actions, undo, filtering, and date labels. Keeping these rules outside visual components makes the core behavior testable without an emulator.

State contains `goingIds`, `skippedIds`, and `lastAction`. The app stores IDs rather than event copies. My Plans looks up each ID in the directory, so edits to a title or venue appear consistently. During startup, IDs for events removed from the directory are filtered out instead of creating broken rows.

Both screens read the same state. Discover filters out handled IDs; My Plans selects going IDs and sorts them by start time. One RSVP therefore has one meaning throughout the app.

## 5. Discovery and visual design

Discover opens with campus branding, a headline, and the saved-plan count. Category filters sit above the deck. One event is in focus at a time, and its card shows the title, category, host, date, time, venue, description, spots open, and countdown without requiring another screen.

The artwork uses interface shapes, typography, and event-specific palettes. It gives each card a poster-like look without remote images, keeping the demo fast and available offline. The surrounding layout stays consistent so students can learn where to find details.

The card follows horizontal movement with translation and slight rotation. An “I’m in” stamp appears during a right swipe; “Pass” appears during a left swipe. Releasing before the threshold returns the card to its place, helping avoid accidental choices while scrolling. PASS and I’M IN buttons do the same work by tap, which makes the demo easier for people who prefer buttons or cannot comfortably swipe.

## 6. Category filters and deck rules

The categories are All, Tech, Cultural, Sports, Workshop, and Social. Each event has one category. A filter changes discovery only; it never hides accepted plans. Someone can browse Tech events, switch to Cultural, and still see every RSVP in My Plans.

Handled events leave the active deck but remain in the directory. A right swipe records an ID in `goingIds`; a left swipe records it in `skippedIds`. Discovery selects the category first, then excludes IDs in either list. That gives every category the same rules without creating separate queues.

If the deck is empty, a message says the student is caught up. Restart clears passed events but leaves RSVPs intact. The counter reflects progress in the selected category, and Undo is enabled whenever a latest action exists.

## 7. RSVP, pass, and undo behavior

For an RSVP, the app adds the current event ID to `goingIds`, removes it from `skippedIds` if needed, and records the latest action as `going`. The saved count and navigation badge update from this state, and a short message confirms the choice.

For a pass, the app adds the ID to `skippedIds` and removes it from `goingIds`. It leaves discovery without appearing as an RSVP. IDs are used instead of card positions because filtering can change list order. A confirmation message explains the result.

Undo removes the latest ID from the matching decision list and clears `lastAction`. Undoing either choice returns the event to discovery. Only the latest swipe can be reversed, as requested. That action is persisted, so it remains undoable after restart until a new swipe replaces it. Removing an RSVP separately clears a matching undo record.

The gesture handler locks during the exit animation to prevent duplicate decisions from quick repeated taps. It captures the event ID at the start, so the completed animation applies to the card the student moved.

## 8. My Plans and countdowns

My Plans is reachable from the bottom navigation or saved count. Accepted events are sorted by start time. A summary highlights the next plan and total saved; each row shows its category, title, date, time, venue, countdown, and a remove control. An empty state links back to discovery.

Countdowns are calculated from timestamps instead of stored labels. The app shows Today, Tomorrow, days left, or Ended after an event’s start time. Formatting uses Asia/Kolkata because the sample events are for VIT Vellore. A phone set to another time zone should not change the campus date the student sees.

Date logic lives in the domain layer so boundary cases are testable without the screen. If a timestamp changes in JSON, both the card and plans list use it automatically rather than showing stale text.

## 9. Persistence and privacy

On launch, the app reads state from AsyncStorage and shows a loading view until it finishes. It validates the saved ID arrays and drops IDs missing from the current directory. Once loaded, each state change is written to the same key. This avoids a brief first render that ignores the student’s previous choices.

There is no sign-in because it is not required. Students can explore immediately. RSVPs stay on one device; they are not sent to a club and do not reserve a real seat. The interface explains that plans are local. The prototype stores event IDs and the latest decision, not profiles, credentials, or payment details.

This suits a screening demo but not a complete campus service. Organizers would need shared storage to publish updates, count RSVPs, handle cancellations, and avoid overbooking. We state this limit clearly instead of suggesting local choices sync between students.

## 10. Accessibility and usability

The visual system uses a warm background, dark text, and lime for the RSVP action. Event colours add character, while labels explain the choices so colour is not the only signal. Swipe hints appear under the card, stamps show during movement, and buttons have accessible roles and names.

Tap alternatives make the main actions available without a gesture. Spacing and rounded controls suit phone screens; concise descriptions leave room for date and venue. The bottom navigation stays fixed while lists scroll. Empty states explain what happened and provide a next action instead of leaving a blank screen.

Before a real release, we would test text scaling, screen-reader announcements, contrast for every palette, and touch behavior across Android sizes. The current design includes accessible controls, but those checks need device testing.

## 11. Testing and verification

The important decision rules are pure functions, so they are covered by Node’s built-in test runner without an emulator. Tests check that an RSVP hides the event and can be undone, a pass affects only the chosen event, category filters return matching items, and countdown labels handle Today, Tomorrow, several days away, ended events, and a campus-time-zone boundary.

We also validated the event JSON and app configuration. The check confirms eight sample events have unique IDs, required details, known categories, and valid timestamps. GitHub Actions runs the logic suite on pushes and pull requests. The suite passes in the repository. The next useful validation step is running the app with Expo Go on Android and testing gestures, taps, category changes, restart persistence, and scrolling on a small display. The configured EAS preview profile can then produce an installable APK.

## 12. Trade-offs and next steps

Local data and RSVPs keep the demo predictable and meet the brief, but they cannot coordinate attendance or guarantee that a spot remains available. A production version could connect to an event API, add organizer tools, and send RSVP changes to a database. That would require identity, permissions, server validation, and clear handling when events fill or are cancelled.

Other useful additions include search, calendar export, reminders, saved categories, and richer imagery. Notifications should be opt-in. A real data source should publish cancellations so students do not rely on outdated information. These are future ideas, not features claimed in the current prototype.

Because data, logic, and presentation are separate, these changes can be introduced gradually. An API can replace the JSON while keeping the event shape. Tests can cover new cases, and the interface can add loading, error, full-capacity, or cancelled states without changing what the existing swipe actions mean.

## Conclusion

CampusLoop turns the brief into a complete student flow: browse campus events, filter them, RSVP or pass with a gesture or tap, undo the latest swipe, and review saved plans with countdowns. Choices persist on the device, while the code keeps the event directory, decision rules, and screens understandable as separate parts. We chose this scope to make the app practical to demonstrate, straightforward to test, and ready to connect to real campus event data later.
