/* RobloxGlop UI refresh — favorites, sharing, archive controls and accessibility. */
(() => {
  'use strict';

  const FAVORITES_KEY = 'robloxglop:favorites:v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let favorites = readFavorites();
  let archiveLetter = 'all';
  let favoritesOnly = false;
  let archiveSort = 'az';
  let refreshQueued = false;

  function readFavorites() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.filter(value => typeof value === 'string') : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    } catch (_) {
      notify('Favorites could not be saved on this device.');
    }
  }

  function notify(message) {
    const toast = $('#toast');
    const toastMessage = $('#toastMsg');
    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.style.display = 'flex';
      window.clearTimeout(notify.timer);
      notify.timer = window.setTimeout(() => { toast.style.display = 'none'; }, 3000);
      return;
    }
    let fallback = $('#glopToast');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'glopToast';
      fallback.setAttribute('role', 'status');
      fallback.style.cssText = 'position:fixed;z-index:999999;left:50%;bottom:22px;transform:translateX(-50%);padding:12px 18px;border-radius:14px;background:#17112c;color:white;box-shadow:0 10px 30px #0007;font-weight:700;max-width:90vw;text-align:center;';
      document.body.appendChild(fallback);
    }
    fallback.textContent = message;
    fallback.hidden = false;
    window.clearTimeout(notify.fallbackTimer);
    notify.fallbackTimer = window.setTimeout(() => { fallback.hidden = true; }, 2800);
  }

  function scriptMeta(card) {
    const access = $('button[onclick*="startFlow"]', card);
    const raw = access ? (access.getAttribute('onclick') || '') : '';
    const match = raw.match(/startFlow\(\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*'([^']*)'/);
    const title = $('h3', card)?.textContent?.trim() || 'Roblox script';
    const fallback = 'name:' + title.toLocaleLowerCase();
    return {
      id: match?.[1] || fallback,
      slug: match?.[2] || '',
      title
    };
  }

  function favoriteButton(meta) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glop-icon-action';
    button.dataset.favoriteId = meta.id;
    button.setAttribute('aria-label', 'Save ' + meta.title + ' to favorites');
    button.title = 'Save to favorites';
    button.innerHTML = '<i class="far fa-heart" aria-hidden="true"></i>';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (favorites.has(meta.id)) {
        favorites.delete(meta.id);
        notify('Removed from saved scripts.');
      } else {
        favorites.add(meta.id);
        notify('Saved to your favorites.');
      }
      writeFavorites();
      updateFavoriteButtons();
      applyArchiveControls();
      updateOverview();
    });
    return button;
  }

  function shareButton(meta) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'glop-icon-action';
    button.setAttribute('aria-label', 'Copy link for ' + meta.title);
    button.title = 'Copy script link';
    button.innerHTML = '<i class="fas fa-share-alt" aria-hidden="true"></i>';
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!meta.slug || meta.id.startsWith('name:')) {
        notify('A shareable page link is not available for this script.');
        return;
      }
      const url = location.origin + '/' + encodeURIComponent(meta.slug) + '/script/' + encodeURIComponent(meta.id);
      try {
        await navigator.clipboard.writeText(url);
        notify('Script link copied.');
      } catch (_) {
        notify('Copy is unavailable in this browser. Link: ' + url);
      }
    });
    return button;
  }

  function decorateCard(card) {
    if (!card || !card.classList.contains('glass-card')) return;
    const header = $('.flex.justify-between.items-start', card);
    if (!header) return;
    const badge = $('.badge', header);
    if (badge && /verified/i.test(badge.textContent || '')) {
      badge.innerHTML = '<i class="fas fa-users" aria-hidden="true"></i> Community';
      badge.setAttribute('aria-label', 'Community-submitted script');
      badge.classList.remove('badge-success');
    }
    if (!$('.glop-card-tools', header)) {
      const meta = scriptMeta(card);
      const tools = document.createElement('div');
      tools.className = 'glop-card-tools';
      tools.append(favoriteButton(meta), shareButton(meta));
      header.appendChild(tools);
    }
    $$('iframe', card).forEach(frame => {
      frame.loading = 'lazy';
      if (!frame.title) frame.title = 'Embedded script preview';
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    });
    const access = $('button[onclick*="startFlow"]', card);
    if (access && !access.getAttribute('aria-label')) {
      access.setAttribute('aria-label', 'Open ' + scriptMeta(card).title);
    }
  }

  function updateFavoriteButtons() {
    $$('.glop-card-tools [data-favorite-id]').forEach(button => {
      const isSaved = favorites.has(button.dataset.favoriteId);
      button.setAttribute('aria-pressed', String(isSaved));
      button.setAttribute('aria-label', isSaved ? 'Remove from favorites' : 'Save to favorites');
      button.title = isSaved ? 'Remove from favorites' : 'Save to favorites';
      button.innerHTML = isSaved
        ? '<i class="fas fa-heart" aria-hidden="true"></i>'
        : '<i class="far fa-heart" aria-hidden="true"></i>';
    });
  }

  function ensureOverview() {
    const main = $('#mainPage');
    const hero = main?.firstElementChild;
    if (!hero || $('#glopOverview')) return;
    const overview = document.createElement('section');
    overview.id = 'glopOverview';
    overview.className = 'glop-overview';
    overview.setAttribute('aria-label', 'Script library overview');
    overview.innerHTML = `
      <div class="glop-stat"><span class="glop-stat-label">Library size</span><strong class="glop-stat-value" id="glopTotalScripts">—</strong><span class="glop-stat-note">Community scripts</span></div>
      <div class="glop-stat"><span class="glop-stat-label">Your collection</span><strong class="glop-stat-value" id="glopSavedScripts">—</strong><span class="glop-stat-note">Saved on this device</span></div>
      <div class="glop-stat"><span class="glop-stat-label">Find something</span><strong class="glop-stat-value">A–Z</strong><span class="glop-stat-note">Browse the complete library</span></div>`;
    hero.insertAdjacentElement('afterend', overview);
  }

  function ensureArchiveControls() {
    const search = $('#archiveSearch');
    const grid = $('#archiveScriptGrid');
    if (!search || !grid || $('#glopArchiveToolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'glopArchiveToolbar';
    toolbar.className = 'glop-library-toolbar';
    toolbar.innerHTML = `
      <div class="glop-toolbar-group">
        <label class="glop-toolbar-label" for="glopArchiveSort">Sort</label>
        <select id="glopArchiveSort" class="glop-select" aria-label="Sort scripts">
          <option value="az">Name: A to Z</option>
          <option value="za">Name: Z to A</option>
        </select>
        <button id="glopFavoritesOnly" class="glop-filter-toggle" type="button" aria-pressed="false"><i class="far fa-heart" aria-hidden="true"></i> Saved only</button>
      </div>
      <span id="glopArchiveCount" class="glop-result-count" role="status" aria-live="polite"></span>`;
    search.parentElement.insertAdjacentElement('afterend', toolbar);

    const alphabet = document.createElement('div');
    alphabet.id = 'glopAlphabet';
    alphabet.className = 'glop-alphabet';
    alphabet.setAttribute('aria-label', 'Filter scripts by first letter');
    const letters = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    alphabet.innerHTML = letters.map(letter => {
      const label = letter === 'all' ? 'All' : letter;
      return '<button type="button" class="glop-letter" data-letter="' + letter + '" aria-pressed="' + String(letter === 'all') + '">' + label + '</button>';
    }).join('');
    toolbar.insertAdjacentElement('afterend', alphabet);

    $('#glopArchiveSort').addEventListener('change', event => {
      archiveSort = event.target.value;
      applyArchiveControls();
    });
    $('#glopFavoritesOnly').addEventListener('click', () => {
      favoritesOnly = !favoritesOnly;
      $('#glopFavoritesOnly').setAttribute('aria-pressed', String(favoritesOnly));
      applyArchiveControls();
    });
    alphabet.addEventListener('click', event => {
      const button = event.target.closest('button[data-letter]');
      if (!button) return;
      archiveLetter = button.dataset.letter;
      $$('.glop-letter', alphabet).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applyArchiveControls();
    });
  }

  function applyArchiveControls() {
    const grid = $('#archiveScriptGrid');
    if (!grid) return;
    const cards = $$('.glass-card', grid);
    const ordered = cards.slice().sort((a, b) => {
      const an = scriptMeta(a).title;
      const bn = scriptMeta(b).title;
      const result = an.localeCompare(bn, undefined, { sensitivity: 'base' });
      return archiveSort === 'za' ? -result : result;
    });
    if (ordered.some((card, index) => card !== cards[index])) {
      ordered.forEach(card => grid.appendChild(card));
    }

    let visible = 0;
    $$('.glass-card', grid).forEach(card => {
      const meta = scriptMeta(card);
      const startsWithLetter = archiveLetter === 'all' || meta.title.trim().charAt(0).toLocaleUpperCase() === archiveLetter;
      const saved = favorites.has(meta.id);
      const show = startsWithLetter && (!favoritesOnly || saved);
      card.hidden = !show;
      if (show) visible++;
    });
    const total = $$('.glass-card', grid).length;
    const count = $('#glopArchiveCount');
    if (count) count.textContent = visible + ' of ' + total + ' scripts shown';
    const empty = $('#glopArchiveEmpty');
    if (visible === 0 && total > 0) {
      if (!empty) {
        const note = document.createElement('p');
        note.id = 'glopArchiveEmpty';
        note.className = 'glop-empty-filter';
        note.textContent = 'No scripts match these filters. Try another letter or turn off Saved only.';
        grid.appendChild(note);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  function updateOverview() {
    const total = $('#archiveScriptGrid') ? $$('.glass-card', $('#archiveScriptGrid')).length : 0;
    const totalNode = $('#glopTotalScripts');
    const savedNode = $('#glopSavedScripts');
    if (totalNode) totalNode.textContent = String(total);
    if (savedNode) savedNode.textContent = String(favorites.size);
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      ensureOverview();
      ensureArchiveControls();
      ['#homeScriptGrid', '#archiveScriptGrid'].forEach(selector => {
        const grid = $(selector);
        if (grid) $$('.glass-card', grid).forEach(decorateCard);
      });
      updateFavoriteButtons();
      applyArchiveControls();
      updateOverview();
    });
  }

  function setupObservers() {
    ['#homeScriptGrid', '#archiveScriptGrid'].forEach(selector => {
      const grid = $(selector);
      if (grid) new MutationObserver(scheduleRefresh).observe(grid, { childList: true, subtree: true });
    });
  }

  function setupSearchShortcuts() {
    document.addEventListener('keydown', event => {
      const active = document.activeElement;
      const typing = active && (active.matches('input, textarea, select') || active.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const target = $('#archivePage')?.style.display === 'block' ? $('#archiveSearch') : $('#homeSearch');
        target?.focus();
      } else if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const target = $('#archivePage')?.style.display === 'block' ? $('#archiveSearch') : $('#homeSearch');
        target?.focus();
      } else if (event.key === 'Escape' && typing && active.matches('#homeSearch, #archiveSearch')) {
        active.value = '';
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.blur();
      }
    });
    ['#homeSearch', '#archiveSearch'].forEach(selector => {
      const input = $(selector);
      if (input) input.setAttribute('aria-label', 'Search Roblox scripts');
    });
  }

  function boot() {
    ensureOverview();
    ensureArchiveControls();
    setupObservers();
    setupSearchShortcuts();
    scheduleRefresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();