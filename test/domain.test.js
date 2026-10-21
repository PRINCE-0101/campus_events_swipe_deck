const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applySwipe,
  createInitialDeck,
  getCountdown,
  getDiscoverEvents,
  undoLastSwipe,
} = require('../src/domain');

test('right swipe RSVPs, removes the card from discovery and can be undone', () => {
  const initial = createInitialDeck();
  const going = applySwipe(initial, 'build-with-ai', 'going');

  assert.deepEqual(going.goingIds, ['build-with-ai']);
  assert.equal(getDiscoverEvents([{ id: 'build-with-ai', category: 'Tech' }], going).length, 0);
  assert.deepEqual(undoLastSwipe(going), initial);
});

test('left swipe skips only the current event and category filtering still works', () => {
  const events = [
    { id: 'one', category: 'Tech' },
    { id: 'two', category: 'Sports' },
  ];
  const skipped = applySwipe(createInitialDeck(), 'one', 'skipped');

  assert.deepEqual(skipped.skippedIds, ['one']);
  assert.deepEqual(getDiscoverEvents(events, skipped, 'Tech'), []);
  assert.deepEqual(getDiscoverEvents(events, skipped, 'Sports').map((event) => event.id), ['two']);
});

test('countdown labels today, tomorrow, days left and past events', () => {
  const now = new Date('2026-10-21T12:00:00Z');
  assert.equal(getCountdown('2026-10-21T18:00:00Z', now), 'Today');
  assert.equal(getCountdown('2026-10-22T12:00:00Z', now), 'Tomorrow');
  assert.equal(getCountdown('2026-10-24T12:00:00Z', now), '3 days left');
  assert.equal(getCountdown('2026-10-20T12:00:00Z', now), 'Ended');
});

test('countdown uses the campus timezone and marks already-started events as ended', () => {
  const now = new Date('2026-10-21T20:00:00Z'); // 1:30 AM in Vellore on October 22
  assert.equal(getCountdown('2026-10-22T23:30:00+05:30', now), 'Today');
  assert.equal(getCountdown('2026-10-22T00:30:00+05:30', now), 'Ended');
});
