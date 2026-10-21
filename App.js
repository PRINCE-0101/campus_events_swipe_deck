import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const EVENTS = require('./src/data/events.json');
const {
  CATEGORIES,
  applySwipe,
  createInitialDeck,
  getCountdown,
  getDateParts,
  getDiscoverEvents,
  undoLastSwipe,
} = require('./src/domain');

const STORAGE_KEY = '@campus-loop/deck-v1';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 36, 480);
const COLORS = {
  background: '#F5F5F0',
  ink: '#17231F',
  muted: '#7B817B',
  line: '#E5E7DF',
  lime: '#D9FF67',
  white: '#FFFFFF',
  coral: '#FD775D',
};

function TinyIcon({ children, color = COLORS.ink, size = 20, style }) {
  return <Text style={[{ color, fontSize: size, fontWeight: '700', lineHeight: size + 2 }, style]}>{children}</Text>;
}

function LogoMark() {
  return (
    <View style={styles.logoMark}>
      <View style={styles.logoLoopA} />
      <View style={styles.logoLoopB} />
    </View>
  );
}

function TopBar({ onOpenPlans, goingCount }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <LogoMark />
        <View>
          <Text style={styles.brandName}>campusloop</Text>
          <Text style={styles.brandLocation}>VIT · VELLORE</Text>
        </View>
      </View>
      <Pressable style={styles.avatarButton} onPress={onOpenPlans} accessibilityRole="button" accessibilityLabel="Open your plans">
        <Text style={styles.avatarInitials}>PT</Text>
        {goingCount > 0 && <View style={styles.avatarDot} />}
      </Pressable>
    </View>
  );
}

function CategoryPills({ selected, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
      {CATEGORIES.map((category) => {
        const active = selected === category;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.categoryPill, active && styles.categoryPillActive]}
          >
            <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EventArtwork({ event }) {
  const palette = event.palette;
  return (
    <View style={[styles.artwork, { backgroundColor: palette.background }]}>
      <View style={[styles.artGlow, { backgroundColor: palette.accent }]} />
      <View style={[styles.artRing, { borderColor: palette.ink }]} />
      <View style={[styles.artRingInner, { borderColor: palette.ink }]} />
      <View style={[styles.artStripe, { backgroundColor: palette.soft }]} />
      <View style={styles.artTopRow}>
        <View style={[styles.artCategory, { backgroundColor: palette.ink }]}>
          <Text style={[styles.artCategoryText, { color: palette.background }]}>{event.category.toUpperCase()}</Text>
        </View>
        <Text style={[styles.artEdition, { color: palette.ink }]}>VIT / 2026</Text>
      </View>
      <View style={styles.artTypography}>
        <Text style={[styles.artEyebrow, { color: palette.ink }]}>GOOD THINGS HAPPEN HERE</Text>
        <Text style={[styles.artWord, { color: palette.ink }]}>{event.artWord}</Text>
      </View>
      <View style={[styles.artMark, { backgroundColor: palette.ink }]}>
        <Text style={[styles.artMarkText, { color: palette.background }]}>{event.artMark}</Text>
      </View>
      <Text style={[styles.artBottomLine, { color: palette.ink }]}>MAKE A LITTLE ROOM FOR LIFE ↗</Text>
    </View>
  );
}

function EventCard({ event, cardIndex, totalCount, animatedStyle, panHandlers, panX }) {
  const dateParts = getDateParts(event.startsAt);
  const countdown = getCountdown(event.startsAt);
  const rsvpOpacity = panX.interpolate({ inputRange: [0, 65, 155], outputRange: [0, 0.35, 1], extrapolate: 'clamp' });
  const passOpacity = panX.interpolate({ inputRange: [-155, -65, 0], outputRange: [1, 0.35, 0], extrapolate: 'clamp' });
  return (
    <View style={styles.deckStage}>
      <View style={[styles.cardShadow, styles.cardShadowBack]} />
      <View style={[styles.cardShadow, styles.cardShadowMiddle]} />
      <Animated.View
        {...(cardIndex === 0 ? panHandlers : {})}
        style={[styles.eventCard, animatedStyle, cardIndex > 0 && styles.behindCard]}
      >
        <EventArtwork event={event} />
        <Animated.View pointerEvents="none" style={[styles.swipeStamp, styles.rsvpStamp, { opacity: rsvpOpacity }]}>
          <Text style={styles.rsvpStampText}>I’M IN</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.swipeStamp, styles.passStamp, { opacity: passOpacity }]}>
          <Text style={styles.passStampText}>PASS</Text>
        </Animated.View>
        <View style={styles.eventBody}>
          <View style={styles.eventMainLine}>
            <View style={styles.eventTitleBlock}>
              <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
              <Text style={styles.eventHost} numberOfLines={1}>by {event.host}</Text>
            </View>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeDay}>{dateParts.day}</Text>
              <Text style={styles.dateBadgeMonth}>{dateParts.month.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
          <View style={styles.eventMetaRow}>
            <View style={styles.metaItem}>
              <TinyIcon color={COLORS.muted} size={15}>◷</TinyIcon>
              <Text style={styles.metaText}>{dateParts.weekday}, {dateParts.time}</Text>
            </View>
            <View style={styles.metaItem}>
              <TinyIcon color={COLORS.muted} size={15}>⌖</TinyIcon>
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
            </View>
          </View>
          <View style={styles.cardBottomRow}>
            <View style={styles.countdownBadge}>
              <View style={styles.countdownDot} />
              <Text style={styles.countdownText}>{countdown === 'Ended' ? 'JUST ENDED' : countdown.toUpperCase()}</Text>
            </View>
            <Text style={styles.spotsText}>{event.spots} spots open</Text>
          </View>
        </View>
      </Animated.View>
      <View style={styles.cardPosition}>
        <Text style={styles.positionText}>{String(cardIndex + 1).padStart(2, '0')}</Text>
        <View style={styles.positionTrack}><View style={[styles.positionFill, { width: `${((cardIndex + 1) / Math.max(1, totalCount)) * 100}%` }]} /></View>
        <Text style={styles.positionText}>{String(totalCount).padStart(2, '0')}</Text>
      </View>
      <View style={styles.swipeHintRow}>
        <Text style={styles.swipeHint}>← PASS</Text>
        <Text style={styles.swipeHintCenter}>SWIPE TO DECIDE</Text>
        <Text style={styles.swipeHintRight}>I'M IN →</Text>
      </View>
    </View>
  );
}

function ActionButton({ variant, onPress, disabled }) {
  const isRsvp = variant === 'rsvp';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={isRsvp ? 'I am in, RSVP to this event' : 'Skip this event'}
      style={({ pressed }) => [
        styles.actionButton,
        isRsvp ? styles.rsvpButton : styles.skipButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <TinyIcon color={isRsvp ? COLORS.ink : COLORS.muted} size={22}>{isRsvp ? '✓' : '×'}</TinyIcon>
      <Text style={[styles.actionButtonLabel, isRsvp && styles.actionButtonLabelRsvp]}>{isRsvp ? "I'M IN" : 'PASS'}</Text>
    </Pressable>
  );
}

function DiscoverScreen({ category, setCategory, deck, onSwipe, onUndo, canUndo, onOpenPlans, onResetDeck }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const discoverEvents = useMemo(() => getDiscoverEvents(EVENTS, deck, category), [deck, category]);
  const activeEvent = discoverEvents[0];
  const swipeRef = useRef(() => {});
  const animationLock = useRef(false);

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [activeEvent?.id, pan]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const animateSwipe = (direction) => {
    if (!activeEvent || animationLock.current) return;
    animationLock.current = true;
    const currentEvent = activeEvent;
    const decision = direction === 'right' ? 'going' : 'skipped';
    Animated.timing(pan, {
      toValue: { x: direction === 'right' ? SCREEN_WIDTH * 1.35 : -SCREEN_WIDTH * 1.35, y: 12 },
      duration: 210,
      useNativeDriver: false,
    }).start(({ finished }) => {
      animationLock.current = false;
      if (!finished) return;
      pan.setValue({ x: 0, y: 0 });
      onSwipe(currentEvent.id, decision);
      const message = decision === 'going' ? 'Added to your plans' : 'Passed for now';
      setToast(message);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 1600);
    });
  };
  swipeRef.current = animateSwipe;

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 9 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 105) swipeRef.current('right');
      else if (gesture.dx < -105) swipeRef.current('left');
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start(),
  }), [pan]);

  const rotation = pan.x.interpolate({ inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp' });
  const animatedStyle = { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: rotation }] };

  const rsvpCount = deck.goingIds.length;
  const currentCategoryEvents = category === 'All' ? EVENTS : EVENTS.filter((event) => event.category === category);
  const handledInCategory = currentCategoryEvents.filter((event) => deck.goingIds.includes(event.id) || deck.skippedIds.includes(event.id)).length;

  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.discoverContent} showsVerticalScrollIndicator={false}>
      <TopBar onOpenPlans={onOpenPlans} goingCount={rsvpCount} />
      <View style={styles.introRow}>
        <View style={styles.introCopy}>
          <Text style={styles.eyebrow}>YOUR CAMPUS, IN MOTION</Text>
          <Text style={styles.headline}>Find your{ '\n' }next thing.</Text>
        </View>
        <Pressable style={styles.weekBadge} onPress={onOpenPlans} accessibilityRole="button" accessibilityLabel={`${rsvpCount} events in your plans`}>
          <Text style={styles.weekBadgeNumber}>{String(rsvpCount).padStart(2, '0')}</Text>
          <Text style={styles.weekBadgeCaption}>IN YOUR{ '\n' }PLANS</Text>
        </Pressable>
      </View>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionHeading}>The event deck</Text>
        <Pressable onPress={onUndo} disabled={!canUndo} accessibilityRole="button" accessibilityLabel="Undo last swipe" style={[styles.undoButton, !canUndo && styles.undoDisabled]}>
          <TinyIcon color={canUndo ? COLORS.ink : '#B7BCB5'} size={15}>↶</TinyIcon>
          <Text style={[styles.undoText, !canUndo && styles.undoTextDisabled]}>UNDO</Text>
        </Pressable>
      </View>
      <CategoryPills selected={category} onSelect={setCategory} />

      {activeEvent ? (
        <>
          <View style={styles.deckStageWrap}>
            <EventCard
              event={activeEvent}
              cardIndex={handledInCategory}
              totalCount={currentCategoryEvents.length}
              animatedStyle={animatedStyle}
              panHandlers={panResponder.panHandlers}
              panX={pan.x}
            />
          </View>
          <View style={styles.actionsRow}>
            <ActionButton variant="skip" onPress={() => animateSwipe('left')} />
            <ActionButton variant="rsvp" onPress={() => animateSwipe('right')} />
          </View>
          <Text style={styles.privateNote}>No account needed · Your plans stay on this device</Text>
        </>
      ) : (
        <View style={styles.emptyDeck}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✳</Text></View>
          <Text style={styles.emptyTitle}>You’re all caught up.</Text>
          <Text style={styles.emptyText}>Try another category or revisit the events you saved.</Text>
          <Pressable style={styles.emptyCta} onPress={() => { setCategory('All'); onResetDeck(); }} accessibilityRole="button">
            <Text style={styles.emptyCtaText}>RESTART THE DECK <Text style={styles.ctaArrow}>↻</Text></Text>
          </Pressable>
        </View>
      )}
      {!!toast && <View style={styles.toast}><TinyIcon color={COLORS.lime} size={16}>✓</TinyIcon><Text style={styles.toastText}>{toast}</Text></View>}
      <View style={styles.editorialNote}>
        <Text style={styles.editorialQuote}>“The best campus stories start with a yes.”</Text>
        <Text style={styles.editorialAttribution}>A FRIENDLY NUDGE FROM CAMPUSLOOP</Text>
      </View>
    </ScrollView>
  );
}

function PlanRow({ event, onRemove }) {
  const dateParts = getDateParts(event.startsAt);
  const countdown = getCountdown(event.startsAt);
  return (
    <View style={styles.planRow}>
      <View style={[styles.planArtwork, { backgroundColor: event.palette.background }]}>
        <Text style={[styles.planArtworkMark, { color: event.palette.ink }]}>{event.artMark}</Text>
      </View>
      <View style={styles.planTextBlock}>
        <View style={styles.planCategoryLine}><Text style={styles.planCategory}>{event.category.toUpperCase()}</Text><Text style={styles.planCountdown}>{countdown.toUpperCase()}</Text></View>
        <Text style={styles.planTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.planMeta} numberOfLines={1}>{dateParts.weekday}, {dateParts.day} {dateParts.month} · {dateParts.time}</Text>
        <Text style={styles.planLocation} numberOfLines={1}>⌖  {event.location}</Text>
      </View>
      <Pressable onPress={() => onRemove(event.id)} accessibilityRole="button" accessibilityLabel={`Remove ${event.title} from plans`} style={styles.removePlanButton}>
        <Text style={styles.removePlanText}>×</Text>
      </Pressable>
    </View>
  );
}

function PlansScreen({ deck, onRemove, onDiscover }) {
  const plans = deck.goingIds.map((id) => EVENTS.find((event) => event.id === id)).filter(Boolean).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const nextUp = plans.find((event) => getCountdown(event.startsAt) !== 'Ended');
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.plansContent} showsVerticalScrollIndicator={false}>
      <TopBar onOpenPlans={() => {}} goingCount={plans.length} />
      <Text style={styles.eyebrow}>YOUR YES LIST</Text>
      <Text style={styles.plansHeadline}>Make room{ '\n' }for the good stuff.</Text>
      <View style={styles.planSummary}>
        <View>
          <Text style={styles.planSummaryLabel}>UP NEXT</Text>
          <Text style={styles.planSummaryTitle}>{nextUp ? nextUp.title : 'Your next story is waiting'}</Text>
          <Text style={styles.planSummaryMeta}>{nextUp ? `${getCountdown(nextUp.startsAt)} · ${nextUp.location}` : 'Save something from the event deck.'}</Text>
        </View>
        <View style={styles.planSummaryNumberWrap}>
          <Text style={styles.planSummaryNumber}>{String(plans.length).padStart(2, '0')}</Text>
          <Text style={styles.planSummaryNumberLabel}>GOING</Text>
        </View>
      </View>
      <View style={styles.plansSectionHeader}>
        <Text style={styles.sectionHeading}>Your upcoming plans</Text>
        <Text style={styles.planCount}>{plans.length} SAVED</Text>
      </View>
      {plans.length ? (
        <View style={styles.planList}>{plans.map((event) => <PlanRow key={event.id} event={event} onRemove={onRemove} />)}</View>
      ) : (
        <View style={styles.emptyPlans}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>↗</Text></View>
          <Text style={styles.emptyTitle}>A yes looks good on you.</Text>
          <Text style={styles.emptyText}>Swipe right on an event and it will land here, with its countdown and details.</Text>
          <Pressable style={styles.primaryCta} onPress={onDiscover} accessibilityRole="button">
            <Text style={styles.primaryCtaText}>EXPLORE THE DECK <Text style={styles.ctaArrow}>↗</Text></Text>
          </Pressable>
        </View>
      )}
      <View style={styles.privacyCard}>
        <Text style={styles.privacyIcon}>⌂</Text>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Your plans are yours.</Text>
          <Text style={styles.privacyText}>Saved only on this device. No account, no noise.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function BottomNav({ active, onChange, goingCount }) {
  return (
    <View style={styles.bottomNav}>
      <Pressable onPress={() => onChange('discover')} style={styles.navItem} accessibilityRole="button" accessibilityState={{ selected: active === 'discover' }}>
        <View style={[styles.navIconWrap, active === 'discover' && styles.navIconWrapActive]}><Text style={[styles.navIcon, active === 'discover' && styles.navIconActive]}>◉</Text></View>
        <Text style={[styles.navLabel, active === 'discover' && styles.navLabelActive]}>Discover</Text>
      </Pressable>
      <Pressable onPress={() => onChange('plans')} style={styles.navItem} accessibilityRole="button" accessibilityState={{ selected: active === 'plans' }}>
        <View style={[styles.navIconWrap, active === 'plans' && styles.navIconWrapActive]}>
          <Text style={[styles.navIcon, active === 'plans' && styles.navIconActive]}>▣</Text>
          {goingCount > 0 && <View style={styles.navCount}><Text style={styles.navCountText}>{goingCount > 9 ? '9+' : goingCount}</Text></View>}
        </View>
        <Text style={[styles.navLabel, active === 'plans' && styles.navLabelActive]}>My plans</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [deck, setDeck] = useState(createInitialDeck);
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('discover');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.goingIds) && Array.isArray(saved.skippedIds)) {
          setDeck({
            goingIds: saved.goingIds.filter((id) => EVENTS.some((event) => event.id === id)),
            skippedIds: saved.skippedIds.filter((id) => EVENTS.some((event) => event.id === id)),
            lastAction: saved.lastAction || null,
          });
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setHydrated(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deck)).catch(() => {});
  }, [deck, hydrated]);

  const handleSwipe = (eventId, decision) => setDeck((current) => applySwipe(current, eventId, decision));
  const handleUndo = () => setDeck((current) => undoLastSwipe(current));
  const removePlan = (eventId) => setDeck((current) => ({
    ...current,
    goingIds: current.goingIds.filter((id) => id !== eventId),
    lastAction: current.lastAction?.eventId === eventId ? null : current.lastAction,
  }));
  const resetPassedEvents = () => setDeck((current) => ({ ...current, skippedIds: [], lastAction: null }));

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.appRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        {!hydrated ? (
          <View style={styles.loadingState}><ActivityIndicator color={COLORS.ink} /><Text style={styles.loadingText}>Getting your campus in motion…</Text></View>
        ) : (
          <>
            <View style={styles.pageBody}>
              {activeTab === 'discover' ? (
                <DiscoverScreen
                  category={category}
                  setCategory={setCategory}
                  deck={deck}
                  onSwipe={handleSwipe}
                  onUndo={handleUndo}
                  canUndo={Boolean(deck.lastAction)}
                  onOpenPlans={() => setActiveTab('plans')}
                  onResetDeck={resetPassedEvents}
                />
              ) : (
                <PlansScreen deck={deck} onRemove={removePlan} onDiscover={() => setActiveTab('discover')} />
              )}
            </View>
            <BottomNav active={activeTab} onChange={setActiveTab} goingCount={deck.goingIds.length} />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: COLORS.background },
  pageBody: { flex: 1 },
  screenScroll: { flex: 1 },
  discoverContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },
  plansContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoLoopA: { position: 'absolute', width: 21, height: 21, borderRadius: 11, borderColor: COLORS.lime, borderWidth: 3, left: 7, top: 9 },
  logoLoopB: { position: 'absolute', width: 14, height: 14, borderRadius: 8, borderColor: '#F6F4E8', borderWidth: 3, right: 5, top: 7 },
  brandName: { color: COLORS.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.7 },
  brandLocation: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '800', marginTop: 2 },
  avatarButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E9E1', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: COLORS.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  avatarDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.coral, position: 'absolute', right: 0, top: 0, borderWidth: 2, borderColor: COLORS.background },
  introRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 },
  introCopy: { flex: 1 },
  eyebrow: { color: '#68736B', fontSize: 9, letterSpacing: 1.8, fontWeight: '900', marginBottom: 9 },
  headline: { color: COLORS.ink, fontSize: 37, lineHeight: 37, fontWeight: '900', letterSpacing: -1.8 },
  weekBadge: { width: 78, height: 78, borderRadius: 24, backgroundColor: COLORS.lime, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '4deg' }] },
  weekBadgeNumber: { color: COLORS.ink, fontSize: 25, lineHeight: 27, fontWeight: '900', letterSpacing: -1 },
  weekBadgeCaption: { color: COLORS.ink, fontSize: 8, lineHeight: 10, letterSpacing: 1.2, fontWeight: '900', textAlign: 'center' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeading: { color: COLORS.ink, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  undoButton: { minHeight: 31, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D8DBD1', flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoDisabled: { borderColor: '#E8E9E2' },
  undoText: { color: COLORS.ink, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  undoTextDisabled: { color: '#B7BCB5' },
  categoryScroll: { gap: 7, paddingBottom: 14, paddingRight: 8 },
  categoryPill: { borderRadius: 18, paddingHorizontal: 14, height: 34, borderWidth: 1, borderColor: '#DFE2D8', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  categoryPillActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  categoryText: { color: '#667068', fontSize: 11, fontWeight: '700' },
  categoryTextActive: { color: COLORS.lime, fontWeight: '900' },
  deckStageWrap: { alignItems: 'center', width: '100%' },
  deckStage: { alignItems: 'center', width: CARD_WIDTH },
  cardShadow: { width: CARD_WIDTH - 12, height: 404, borderRadius: 26, position: 'absolute', top: 7, backgroundColor: '#E4E6DB' },
  cardShadowBack: { transform: [{ rotate: '3deg' }, { translateY: 9 }], opacity: 0.45 },
  cardShadowMiddle: { transform: [{ rotate: '-1.4deg' }, { translateY: 4 }], opacity: 0.7 },
  eventCard: { width: CARD_WIDTH, minHeight: 400, borderRadius: 26, overflow: 'hidden', backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E8E9E2', shadowColor: '#1D2A21', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  swipeStamp: { position: 'absolute', top: 34, zIndex: 6, borderWidth: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  rsvpStamp: { left: 20, borderColor: '#4C833D', transform: [{ rotate: '-12deg' }] },
  passStamp: { right: 20, borderColor: '#C85442', transform: [{ rotate: '12deg' }] },
  rsvpStampText: { color: '#3D7732', fontSize: 20, fontWeight: '900', letterSpacing: 1.6 },
  passStampText: { color: '#B94434', fontSize: 20, fontWeight: '900', letterSpacing: 1.6 },
  behindCard: { position: 'absolute', opacity: 0 },
  artwork: { height: 205, overflow: 'hidden', padding: 17, justifyContent: 'space-between' },
  artGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 100, right: -31, top: 22, opacity: 0.7 },
  artRing: { position: 'absolute', width: 204, height: 204, borderRadius: 110, borderWidth: 1.4, right: -14, top: 15, opacity: 0.4 },
  artRingInner: { position: 'absolute', width: 128, height: 128, borderRadius: 70, borderWidth: 1.2, right: 24, top: 52, opacity: 0.35 },
  artStripe: { position: 'absolute', width: 7, height: 160, right: 79, top: 18, transform: [{ rotate: '30deg' }], opacity: 0.55 },
  artTopRow: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  artCategory: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  artCategoryText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  artEdition: { fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  artTypography: { zIndex: 2, alignSelf: 'flex-start', marginTop: 2 },
  artEyebrow: { fontSize: 8, letterSpacing: 1.4, fontWeight: '900', marginBottom: -1 },
  artWord: { fontSize: 65, lineHeight: 68, letterSpacing: -4, fontWeight: '900' },
  artMark: { width: 48, height: 48, borderRadius: 16, position: 'absolute', right: 19, bottom: 47, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  artMarkText: { fontSize: 17, fontWeight: '900', letterSpacing: -0.7 },
  artBottomLine: { zIndex: 1, fontSize: 8, letterSpacing: 1.5, fontWeight: '900' },
  eventBody: { paddingHorizontal: 17, paddingTop: 13, paddingBottom: 14 },
  eventMainLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitleBlock: { flex: 1, paddingRight: 10 },
  eventTitle: { color: COLORS.ink, fontSize: 20, lineHeight: 23, fontWeight: '900', letterSpacing: -0.7 },
  eventHost: { color: COLORS.muted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  dateBadge: { width: 42, height: 46, borderRadius: 13, backgroundColor: '#F3F4ED', alignItems: 'center', justifyContent: 'center' },
  dateBadgeDay: { color: COLORS.ink, fontSize: 17, fontWeight: '900', lineHeight: 19 },
  dateBadgeMonth: { color: '#68736B', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  eventDescription: { color: '#57635B', fontSize: 11, lineHeight: 15, marginTop: 9, minHeight: 30 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 9 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { color: '#68736B', fontSize: 9, fontWeight: '700', flexShrink: 1 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF0E9', marginTop: 11, paddingTop: 10 },
  countdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countdownDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#69A648' },
  countdownText: { color: '#426A39', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  spotsText: { color: '#828981', fontSize: 9, fontWeight: '700' },
  cardPosition: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', gap: 7, marginTop: 11 },
  positionText: { color: '#929991', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  positionTrack: { width: 64, height: 3, borderRadius: 2, backgroundColor: '#E0E3DA', overflow: 'hidden' },
  positionFill: { height: 3, borderRadius: 2, backgroundColor: COLORS.ink },
  swipeHintRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 7 },
  swipeHint: { color: '#929991', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  swipeHintCenter: { color: '#ACB0A7', fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },
  swipeHintRight: { color: '#4B7144', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 13 },
  actionButton: { flexDirection: 'row', minWidth: 132, height: 47, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 8 },
  skipButton: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E4DC' },
  rsvpButton: { backgroundColor: COLORS.lime },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  buttonDisabled: { opacity: 0.45 },
  actionButtonLabel: { color: '#6D746C', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  actionButtonLabelRsvp: { color: COLORS.ink },
  privateNote: { color: '#979D95', fontSize: 9, textAlign: 'center', marginTop: 11, fontWeight: '600' },
  editorialNote: { borderTopWidth: 1, borderTopColor: '#E4E6DE', marginTop: 20, paddingTop: 14, alignItems: 'center' },
  editorialQuote: { color: COLORS.ink, fontSize: 14, fontStyle: 'italic', fontWeight: '700', letterSpacing: -0.2 },
  editorialAttribution: { color: '#989E95', fontSize: 7, letterSpacing: 1.4, fontWeight: '900', marginTop: 6 },
  emptyDeck: { minHeight: 390, borderRadius: 26, backgroundColor: '#EAEDE2', alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 6 },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { color: COLORS.ink, fontSize: 26, fontWeight: '900' },
  emptyTitle: { color: COLORS.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  emptyText: { color: '#768077', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 250 },
  emptyCta: { marginTop: 18, backgroundColor: COLORS.ink, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 14 },
  emptyCtaText: { color: COLORS.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  ctaArrow: { fontSize: 13 },
  toast: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, position: 'absolute', bottom: 48, backgroundColor: COLORS.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  toastText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  plansHeadline: { color: COLORS.ink, fontSize: 35, lineHeight: 36, fontWeight: '900', letterSpacing: -1.7, marginBottom: 20 },
  planSummary: { backgroundColor: COLORS.ink, minHeight: 136, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  planSummaryLabel: { color: COLORS.lime, fontSize: 8, letterSpacing: 1.7, fontWeight: '900', marginBottom: 8 },
  planSummaryTitle: { color: COLORS.white, fontSize: 19, lineHeight: 22, maxWidth: 220, fontWeight: '900', letterSpacing: -0.5 },
  planSummaryMeta: { color: '#B5BFB5', fontSize: 10, lineHeight: 15, marginTop: 6, maxWidth: 220 },
  planSummaryNumberWrap: { width: 67, height: 67, borderRadius: 23, backgroundColor: COLORS.lime, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  planSummaryNumber: { color: COLORS.ink, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  planSummaryNumberLabel: { color: COLORS.ink, fontSize: 7, letterSpacing: 1, fontWeight: '900' },
  plansSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 12 },
  planCount: { color: '#858D83', fontSize: 8, letterSpacing: 1.2, fontWeight: '900' },
  planList: { borderRadius: 23, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E6E8E1', overflow: 'hidden' },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#ECEEE8', gap: 11 },
  planArtwork: { width: 52, height: 58, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  planArtworkMark: { fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  planTextBlock: { flex: 1, minWidth: 0 },
  planCategoryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  planCategory: { color: '#718074', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  planCountdown: { color: '#4F7A47', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  planTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '900', marginTop: 3, letterSpacing: -0.25 },
  planMeta: { color: '#798178', fontSize: 9, marginTop: 3, fontWeight: '600' },
  planLocation: { color: '#98A097', fontSize: 8, marginTop: 3, fontWeight: '600' },
  removePlanButton: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4EF' },
  removePlanText: { color: '#747C73', fontSize: 21, lineHeight: 22, fontWeight: '400', marginTop: -2 },
  emptyPlans: { backgroundColor: '#EAEDE2', borderRadius: 24, alignItems: 'center', paddingVertical: 27, paddingHorizontal: 22 },
  primaryCta: { marginTop: 16, backgroundColor: COLORS.ink, minHeight: 43, paddingHorizontal: 17, borderRadius: 14, justifyContent: 'center' },
  primaryCtaText: { color: COLORS.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ECEDE7', borderRadius: 18, padding: 14, marginTop: 19 },
  privacyIcon: { color: COLORS.ink, fontSize: 21, fontWeight: '900' },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '900' },
  privacyText: { color: '#798178', fontSize: 9, marginTop: 3 },
  bottomNav: { height: 69, flexDirection: 'row', backgroundColor: '#FCFCF9', borderTopWidth: 1, borderTopColor: '#E5E7DF', alignItems: 'center', justifyContent: 'center', gap: 54, paddingBottom: 3 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 68, gap: 3 },
  navIconWrap: { width: 34, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navIconWrapActive: { backgroundColor: COLORS.lime },
  navIcon: { color: '#849087', fontSize: 17, fontWeight: '900' },
  navIconActive: { color: COLORS.ink },
  navLabel: { color: '#879087', fontSize: 8, fontWeight: '700' },
  navLabelActive: { color: COLORS.ink, fontWeight: '900' },
  navCount: { width: 15, height: 15, borderRadius: 8, backgroundColor: COLORS.coral, position: 'absolute', top: -3, right: -6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCFCF9' },
  navCountText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
});
