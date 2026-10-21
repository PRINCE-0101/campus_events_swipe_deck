const CATEGORIES = ['All', 'Tech', 'Cultural', 'Sports', 'Workshop', 'Social'];
const CAMPUS_TIME_ZONE = 'Asia/Kolkata';

function dateStampInCampusTimeZone(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const getPart = (type) => Number(parts.find((part) => part.type === type).value);
  return Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'));
}

function createInitialDeck() {
  return { goingIds: [], skippedIds: [], lastAction: null };
}

function applySwipe(deck, eventId, decision) {
  if (!eventId || !['going', 'skipped'].includes(decision)) return deck;
  const field = decision === 'going' ? 'goingIds' : 'skippedIds';
  const otherField = decision === 'going' ? 'skippedIds' : 'goingIds';
  return {
    ...deck,
    [field]: deck[field].includes(eventId) ? deck[field] : [...deck[field], eventId],
    [otherField]: deck[otherField].filter((id) => id !== eventId),
    lastAction: { eventId, decision },
  };
}

function undoLastSwipe(deck) {
  if (!deck.lastAction) return deck;
  const field = deck.lastAction.decision === 'going' ? 'goingIds' : 'skippedIds';
  return {
    ...deck,
    [field]: deck[field].filter((id) => id !== deck.lastAction.eventId),
    lastAction: null,
  };
}

function getDiscoverEvents(events, deck, category = 'All') {
  return events.filter((event) => {
    const matchesCategory = category === 'All' || event.category === category;
    const alreadyHandled = deck.goingIds.includes(event.id) || deck.skippedIds.includes(event.id);
    return matchesCategory && !alreadyHandled;
  });
}

function getCountdown(startsAt, now = new Date()) {
  const eventDate = new Date(startsAt);
  if (Number.isNaN(eventDate.getTime())) return 'Date soon';
  if (eventDate.getTime() < now.getTime()) return 'Ended';
  const days = Math.round((dateStampInCampusTimeZone(eventDate) - dateStampInCampusTimeZone(now)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days left`;
}

function getDateParts(startsAt) {
  const date = new Date(startsAt);
  return {
    weekday: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: CAMPUS_TIME_ZONE }).format(date),
    day: new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: CAMPUS_TIME_ZONE }).format(date),
    month: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: CAMPUS_TIME_ZONE }).format(date),
    time: new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: CAMPUS_TIME_ZONE }).format(date),
  };
}

module.exports = {
  CATEGORIES,
  applySwipe,
  createInitialDeck,
  getCountdown,
  getDateParts,
  getDiscoverEvents,
  undoLastSwipe,
};
