'use strict';

const hero = document.getElementById('hero');
const heroVideo = document.getElementById('heroVideo');
const heroContent = document.querySelector('.hero-content');
const soundBtn = document.getElementById('soundBtn');
const scrollCue = document.getElementById('scrollCue');
const track = document.getElementById('stageTrack');
const stage = document.getElementById('stage');
const showcase = document.getElementById('showcase');

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// ── Scroll trigger ───────────────
const ENTER_AT = 0.08;
const EXIT_AT = 0.01;  // safety net only: back at the very top always resets
// Exiting needs the same scroll distance as entering (ENTER_AT of the pinned range),
// measured from wherever the visitor is, so up and down feel identical.

// Timeline, in milliseconds after the trigger
const REVEAL_MS = 550;
const CONTROLS_MS = 600;
const START_MS = 2200;
const EXIT_MS = 600;    // on reverse: buttons fade out (0.6s, see CSS), then the cut

// Set to true once the hero video finishes, so nothing restarts it by accident
let videoEnded = false;

// ── Scroll cue visibility ──────────────────────────────────────
// The cue appears once the intro video finishes its first play-through.
// From then on it stays visible: it never hides on scroll, and it is shown right away
// on reloads within the same browser session. It is remembered in sessionStorage, so
// closing the tab/browser and reopening starts fresh (the cue waits for the video again).
const SEEN_KEY = 'vulkanIntroSeen';
let cueReady = false;

function hasSeenIntro() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; }
    catch (e) { return false; }
}

function markIntroSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); }
    catch (e) { /* storage blocked, ignore */ }
}

function refreshScrollCue() {
    if (scrollCue) scrollCue.classList.toggle('visible', cueReady);
}

function showScrollCue() {
    cueReady = true;
    refreshScrollCue();
}

if (hasSeenIntro()) showScrollCue();

// ── Hero video ─────────────────────────────────────────────────
if (heroVideo) {
    // Video always starts muted (required for autoplay)
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.setAttribute('muted', '');
    heroVideo.setAttribute('playsinline', '');

    // ── Autoplay: try as early as possible, retry if the browser says no ──
    const canAutoplay = () =>
        !videoEnded && !(showcase && showcase.classList.contains('revealed'));

    const tryPlay = () => {
        if (!canAutoplay() || !heroVideo.paused) return;
        const p = heroVideo.play();
        if (p && p.catch) p.catch(() => { /* retried below */ });
    };

    tryPlay();
    heroVideo.addEventListener('loadeddata', tryPlay);
    heroVideo.addEventListener('canplay', tryPlay);
    window.addEventListener('load', tryPlay);
    window.addEventListener('pageshow', tryPlay);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });

    // Last resort (e.g. Low Power Mode): the first touch/click/key/scroll starts it
    ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach((evt) => {
        const kick = () => {
            tryPlay();
            if (!heroVideo.paused) {
                ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll']
                    .forEach((e) => window.removeEventListener(e, kick));
            }
        };
        window.addEventListener(evt, kick, { passive: true });
    });

    // The video loops (see the `loop` attribute), so 'ended' never fires.
    // Instead, notice the moment playback wraps back to the start: that is the first
    // full play-through, and the moment the "Scroll down" cue appears (for good).
    let lastTime = 0;
    heroVideo.addEventListener('timeupdate', () => {
        if (!cueReady && heroVideo.currentTime < lastTime - 0.5) {
            showScrollCue();
            markIntroSeen();
        }
        lastTime = heroVideo.currentTime;
    });

    // Safety net in case a browser ignores `loop` and fires 'ended' anyway
    heroVideo.addEventListener('ended', () => {
        showScrollCue();
        markIntroSeen();
        heroVideo.currentTime = 0;
        heroVideo.play().catch(() => { });
    });

    // If the video can't load, don't leave the visitor without the cue
    heroVideo.addEventListener('error', showScrollCue);

    // ── Play/pause based on visibility ─────────────────────────
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!videoEnded && !(showcase && showcase.classList.contains('revealed'))) {
                    heroVideo.play().catch(() => { });
                }
            } else {
                heroVideo.pause();
            }
        });
    }, { threshold: 0.5 });

    videoObserver.observe(heroVideo);

    // ── Sound: ONLY turns on/off via the button ────────────────
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            heroVideo.muted = !heroVideo.muted;

            if (!videoEnded) {
                heroVideo.play().catch(() => {
                    // Browser refused sound, fall back to muted
                    heroVideo.muted = true;
                });
            }

            const soundOn = !heroVideo.muted;
            soundBtn.textContent = soundOn ? '🔊 Tap to mute' : '🔇 Tap for sound';
            soundBtn.setAttribute('aria-pressed', soundOn);
        });
    }

    // ── Click hero to play/pause (or replay after it ended) ────
    if (hero) {
        hero.addEventListener('click', (e) => {
            // Don't toggle if clicking on interactive elements
            if (e.target.closest('button, a, input')) return;

            if (videoEnded) {
                videoEnded = false;
                heroVideo.currentTime = 0;
                heroVideo.play().catch(() => { });
            } else if (heroVideo.paused) {
                heroVideo.play().catch(() => { });
            } else {
                heroVideo.pause();
            }
        });

        hero.style.cursor = 'pointer';
    }
}

// ── Scroll helpers for the pinned stage ────────────────────────
function scrollRange() {
    return track.offsetHeight - window.innerHeight;
}

function scrollProgress() {
    const range = scrollRange();
    if (range <= 0) return 0;
    return clamp01(-track.getBoundingClientRect().top / range);
}

// ── Scroll down cue ────────────────────────────────────────────
if (scrollCue && track) {
    scrollCue.addEventListener('click', () => {
        const trackTop = track.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: trackTop + scrollRange() * (ENTER_AT + 0.04),
            behavior: 'smooth'
        });
    });
}

// ══ SHOWCASE: slideshow + shrinking rocket ═════════════════════
if (showcase && track) {
    const SLIDE_MS = 2500;   // time each image stays on screen
    const MIN_SCALE = 0.15;  // rocket size at the very end (1 = size at the end of the video)

    const slides = showcase.querySelectorAll('.slide');
    const dots = showcase.querySelectorAll('.slide-dot');
    const rocket = document.getElementById('rocket');
    const total = slides.length;

    let current = 0;
    let anim = null;        // the rocket animation for the current slide
    let inView = false;     // buttons are in place, so the slideshow may run
    let userPaused = false; // did the visitor click to pause?
    let showReady = false;  // transition finished, so the slideshow may run
    let inShow = false;     // transition triggered (hero → slideshow)
    let timers = [];

    // Rocket size at the START of slide i. It shrinks steadily across all slides,
    // so slide i ends at the same size slide i+1 starts at.
    const scaleAt = (i) => 1 - (1 - MIN_SCALE) * (i / total);

    // Play only while the buttons are in place and the visitor hasn't paused it
    function sync() {
        if (!anim) return;
        if (inView && !userPaused) anim.play();
        else anim.pause();
    }

    function goTo(index) {
        current = (index + total) % total;

        slides.forEach((s, i) => s.classList.toggle('active', i === current));
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === current);
            d.setAttribute('aria-current', i === current ? 'true' : 'false');
        });

        if (anim) {
            anim.onfinish = null;
            anim.cancel();
        }

        // The rocket animation doubles as the timer: when it finishes, the next slide starts.
        // Pausing the animation therefore pauses the whole slideshow.
        anim = rocket.animate(
            [{ scale: scaleAt(current) }, { scale: scaleAt(current + 1) }],
            { duration: SLIDE_MS, easing: 'linear', fill: 'forwards' }
        );
        anim.onfinish = () => goTo(current + 1);
        sync();
    }

    document.getElementById('slidePrev').addEventListener('click', () => goTo(current - 1));
    document.getElementById('slideNext').addEventListener('click', () => goTo(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    // Click anywhere else on the slideshow to pause/resume
    showcase.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        userPaused = !userPaused;
        sync();
    });

    // ── Timed transition, triggered by scrolling ───────────────
    // 1. Hero text fades out.
    // 2. The hero video cuts to the slideshow (no fade, it just appears, paused).
    // 3. The slideshow buttons fade in.
    // 4. Once the buttons are fully in place, the slideshow starts.
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    // The slideshow runs only once the transition is done AND the stage is still mostly on screen
    function updateInView() {
        const stageBottom = track.getBoundingClientRect().bottom;
        inView = showReady && stageBottom > window.innerHeight * 0.5;
    }

    function enterShow() {
        inShow = true;
        clearTimers();

        stage.classList.add('text-out');                                   // 1

        later(() => {                                                      // 2
            showcase.classList.add('revealed');
            if (heroVideo) heroVideo.pause();
        }, REVEAL_MS);

        later(() => stage.classList.add('controls-in'), CONTROLS_MS);      // 3

        later(() => { showReady = true; updateInView(); sync(); }, START_MS); // 4
    }

    function exitShow() {
        inShow = false;
        clearTimers();

        showReady = false;
        updateInView();
        sync();                                  // freeze the slideshow
        stage.classList.remove('controls-in');   // buttons fade out first

        later(() => {
            showcase.classList.remove('revealed');
            stage.classList.remove('text-out');  // hero text fades back in
            if (heroVideo && !videoEnded) heroVideo.play().catch(() => { });
        }, EXIT_MS);
    }

    let lastY = window.scrollY;
    let upDist = 0;   // how far the visitor has scrolled up in a row

    function onScroll() {
        const progress = scrollProgress();

        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        upDist = dy < 0 ? upDist - dy : 0;   // reset whenever they scroll down

        // Enter only while scrolling down, so it can't instantly re-trigger on the way back up
        if (!inShow && progress >= ENTER_AT && dy >= 0) {
            enterShow();
        } else if (inShow && (progress < EXIT_AT || (upDist > ENTER_AT * scrollRange() && progress < 1))) {
            exitShow();
        }

        // Stop the slideshow once the stage has scrolled mostly out of view
        updateInView();
        sync();

        refreshScrollCue();
    }

    let scrollTicking = false;
    const requestScrollUpdate = () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;
            onScroll();
        });
    };

    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate);

    goTo(0);
    onScroll();
}