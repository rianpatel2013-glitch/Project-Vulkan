'use strict';

// News page: pulls articles from the Spaceflight News API (v4) and renders them.
(() => {
    const API = 'https://api.spaceflightnewsapi.net/v4/articles/';
    const PAGE_SIZE = 21; // 1 top story + 20 cards

    const leadEl = document.getElementById('newsLead');
    const gridEl = document.getElementById('newsGrid');
    const statusEl = document.getElementById('newsStatus');
    const moreBtn = document.getElementById('newsMore');
    const form = document.getElementById('newsForm');
    const searchInput = document.getElementById('newsSearch');
    const featuredBtn = document.getElementById('featuredBtn');
    if (!leadEl || !gridEl) return;

    const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    let query = '';
    let featuredOnly = false;
    let nextUrl = null;   // the API hands us the next page's link
    let busy = false;
    let requestId = 0;    // ignores answers from searches that have been replaced
    let debounce = null;

    // Elements are built with textContent, so article text can never inject markup.
    const el = (tag, cls, text) => {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    };

    function buildUrl() {
        const url = new URL(API);
        url.searchParams.set('limit', String(PAGE_SIZE));
        url.searchParams.set('ordering', '-published_at');
        if (query) url.searchParams.set('search', query);
        if (featuredOnly) url.searchParams.set('is_featured', 'true');
        return url.toString();
    }

    function setStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.classList.toggle('is-error', isError);
    }

    function makeImage(item, cls) {
        if (!item.image_url) return null;
        const img = el('img', cls);
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = item.image_url;
        img.addEventListener('error', () => img.remove());
        return img;
    }

    function makeMeta(item) {
        const meta = el('p', 'news-meta');
        const time = el('time', 'news-date');
        const date = new Date(item.published_at);
        time.dateTime = date.toISOString();
        time.textContent = dateFmt.format(date);
        meta.append(el('span', 'news-source', item.news_site), time);
        return meta;
    }

    function makeHeadline(item, tag) {
        const heading = el(tag);
        const link = el('a', '', item.title);
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        heading.append(link);
        return heading;
    }

    function renderLead(item) {
        leadEl.replaceChildren();
        const card = el('article', 'news-lead');
        const img = makeImage(item, 'news-lead-img');
        if (img) card.append(img);

        const body = el('div', 'news-lead-body');
        body.append(makeMeta(item), makeHeadline(item, 'h2'), el('p', 'news-summary', item.summary));
        card.append(body);
        leadEl.append(card);
    }

    function makeCard(item) {
        const li = el('li');
        const card = el('article', 'news-card');
        const img = makeImage(item, 'news-card-img');
        if (img) card.append(img);

        const body = el('div', 'news-card-body');
        body.append(makeMeta(item), makeHeadline(item, 'h3'), el('p', 'news-summary', item.summary));
        card.append(body);
        li.append(card);
        return li;
    }

    async function load(append = false) {
        if (append && (busy || !nextUrl)) return;

        const id = ++requestId;
        busy = true;
        moreBtn.disabled = true;
        setStatus(append ? 'Loading more stories…' : 'Loading the latest news…');

        try {
            const res = await fetch(append ? nextUrl : buildUrl());
            if (!res.ok) throw new Error('The news service returned status ' + res.status + '.');
            const data = await res.json();
            if (id !== requestId) return;

            const items = data.results || [];
            nextUrl = data.next;

            if (append) {
                items.forEach((item) => gridEl.append(makeCard(item)));
            } else {
                gridEl.replaceChildren();
                leadEl.replaceChildren();
                if (items.length === 0) {
                    setStatus(query
                        ? 'No stories match “' + query + '”. Try a different word.'
                        : 'No stories found right now. Check back soon.');
                    moreBtn.hidden = true;
                    return;
                }
                renderLead(items[0]);
                items.slice(1).forEach((item) => gridEl.append(makeCard(item)));
            }

            moreBtn.hidden = !nextUrl;
            setStatus(!append && query ? 'Showing stories about “' + query + '”.' : '');
        } catch (err) {
            if (id !== requestId) return;
            setStatus('Couldn’t load the news. ' + err.message + ' Check your connection and try again.', true);
        } finally {
            if (id === requestId) {
                busy = false;
                moreBtn.disabled = false;
            }
        }
    }

    function restart() {
        nextUrl = null;
        load(false);
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            query = searchInput.value.trim();
            restart();
        }, 350);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        clearTimeout(debounce);
        query = searchInput.value.trim();
        restart();
    });

    featuredBtn.addEventListener('click', () => {
        featuredOnly = !featuredOnly;
        featuredBtn.setAttribute('aria-pressed', String(featuredOnly));
        restart();
    });

    moreBtn.addEventListener('click', () => load(true));

    load(false);
})();
