'use strict';

// Navbar behavior: mobile menu, Technology dropdown, current-page highlight.
(() => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const glass = document.getElementById('navGlass');
    const toggle = document.getElementById('navToggle');
    const dropdownItems = navbar.querySelectorAll('.has-dropdown');

    // Desktop layout with a real hover pointer (mouse/trackpad). Keep in sync with the CSS breakpoint.
    const hoverDesktop = window.matchMedia('(min-width: 1061px) and (hover: hover)');

    // ── Crew: split the word into letters so each one twinkles like its own star ──
    navbar.querySelectorAll('[data-twinkle]').forEach((el) => {
        const word = el.textContent.trim();
        // Screen readers read the word, not separate letters (the link needs a name since the letters are hidden)
        (el.closest('a, button') || el).setAttribute('aria-label', word);
        el.textContent = '';
        [...word].forEach((char, i) => {
            const letter = document.createElement('span');
            letter.className = 'nav-letter';
            letter.setAttribute('aria-hidden', 'true');
            letter.style.setProperty('--i', i);
            letter.textContent = char;
            el.appendChild(letter);
        });
    });

    // ── Highlight the current page ─────────────────────────────
    const normalize = (path) => path.replace(/\/+$/, '') || '/';
    const here = normalize(window.location.pathname);

    navbar.querySelectorAll('a[href]').forEach((link) => {
        const target = normalize(new URL(link.getAttribute('href'), window.location.origin).pathname);
        if (target !== here) return;

        link.setAttribute('aria-current', 'page');

        // If it's inside the Technology dropdown, light up the Technology button too
        const parentToggle = link.closest('.has-dropdown')?.querySelector('.nav-dropdown-toggle');
        if (parentToggle) parentToggle.classList.add('is-current-parent');
    });

    // ── Dropdown ───────────────────────────────────────────────
    function setDropdown(item, open) {
        item.classList.toggle('open', open);
        item.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', String(open));
    }

    function closeDropdowns(except) {
        dropdownItems.forEach((item) => {
            if (item !== except) setDropdown(item, false);
        });
    }

    dropdownItems.forEach((item) => {
        const button = item.querySelector('.nav-dropdown-toggle');
        let closeTimer;

        button.addEventListener('click', (e) => {
            // A mouse click on an already hover-opened menu shouldn't snap it shut
            if (hoverDesktop.matches && e.detail > 0 && item.classList.contains('open')) return;
            setDropdown(item, !item.classList.contains('open'));
        });

        item.addEventListener('mouseenter', () => {
            if (!hoverDesktop.matches) return;
            clearTimeout(closeTimer);
            setDropdown(item, true);
        });

        item.addEventListener('mouseleave', () => {
            if (!hoverDesktop.matches) return;
            closeTimer = setTimeout(() => setDropdown(item, false), 160);
        });

        // Tabbing out of the menu closes it
        item.addEventListener('focusout', (e) => {
            if (!item.contains(e.relatedTarget)) setDropdown(item, false);
        });

        item.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                setDropdown(item, false);
                button.focus();
            }
        });
    });

    // ── Mobile menu ────────────────────────────────────────────
    function setMenu(open) {
        glass.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        if (!open) closeDropdowns();
    }

    toggle.addEventListener('click', () => setMenu(!glass.classList.contains('menu-open')));

    // Choosing a page closes the mobile menu
    navbar.querySelectorAll('a[href]').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && glass.classList.contains('menu-open')) {
            setMenu(false);
            toggle.focus();
        }
    });

    // Click or tap outside closes everything
    document.addEventListener('click', (e) => {
        if (navbar.contains(e.target)) return;
        setMenu(false);
        closeDropdowns();
    });

    // Resizing to the desktop layout resets the mobile state
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1060) setMenu(false);
    });

    // ── More solid once the page is scrolled ───────────────────
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();