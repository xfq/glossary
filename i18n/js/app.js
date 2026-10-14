(() => {
  const search = document.getElementById('search');
  const rows = Array.from(document.querySelectorAll('#filter tbody tr'));
  const status = document.getElementById('results-status');
  const noResults = document.getElementById('no-results');
  const canHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS;

  // Case-, diacritic- and width-insensitive form used for matching, e.g. "Kūfī" -> "kufi".
  const fold = text => text
    .normalize('NFKD')
    .replace(/[\p{M}\u2018\u2019\u02BB\u02BC\u02BE\u02BF']/gu, '')
    .toLowerCase();

  const index = rows.map(row => fold(row.textContent));

  rows.forEach(row => {
    if (!row.id) return;
    const link = document.createElement('a');
    link.className = 'self-link';
    link.href = `#${row.id}`;
    link.textContent = '#';
    link.setAttribute('aria-label', '此术语的链接');
    row.cells[0].append(link);
  });

  const highlight = (query, visibleRows) => {
    if (!canHighlight) return;
    CSS.highlights.delete('search');
    if (!query) return;
    const ranges = [];
    visibleRows.forEach(row => {
      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.nodeValue;
        let folded = '';
        const starts = [];
        const ends = [];
        for (let i = 0; i < text.length;) {
          const char = String.fromCodePoint(text.codePointAt(i));
          const piece = fold(char);
          for (let k = 0; k < piece.length; k++) {
            starts.push(i);
            ends.push(i + char.length);
          }
          folded += piece;
          i += char.length;
        }
        for (let pos = folded.indexOf(query); pos !== -1; pos = folded.indexOf(query, pos + query.length)) {
          const range = new Range();
          range.setStart(node, starts[pos]);
          range.setEnd(node, ends[pos + query.length - 1]);
          ranges.push(range);
        }
      }
    });
    CSS.highlights.set('search', new Highlight(...ranges));
  };

  const applyFilter = () => {
    const raw = search.value.trim();
    const query = fold(raw);
    const visibleRows = rows.filter((row, i) => {
      const match = index[i].includes(query);
      row.hidden = !match;
      return match;
    });

    noResults.hidden = visibleRows.length > 0;
    status.textContent = raw
      ? `找到 ${visibleRows.length} 个结果（共 ${rows.length} 个术语）`
      : `共 ${rows.length} 个术语`;
    highlight(query, visibleRows);
  };

  const syncUrl = () => {
    const url = new URL(location.href);
    if (search.value.trim()) {
      url.searchParams.set('q', search.value.trim());
      url.hash = '';
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState(null, '', url);
  };

  const clearSearch = () => {
    search.value = '';
    applyFilter();
    syncUrl();
  };

  // Make sure the target of an in-page link is not hidden by the current filter.
  const revealTarget = id => {
    const target = document.getElementById(id);
    if (target && target.closest('tr[hidden]')) clearSearch();
  };

  search.addEventListener('input', () => {
    applyFilter();
    syncUrl();
  });

  search.addEventListener('keydown', event => {
    if (event.key === 'Escape' && search.value) {
      event.preventDefault();
      clearSearch();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    search.focus();
    search.select();
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) revealTarget(decodeURIComponent(link.hash.slice(1)));
  });

  window.addEventListener('hashchange', () => revealTarget(decodeURIComponent(location.hash.slice(1))));

  search.value = new URLSearchParams(location.search).get('q') || '';
  applyFilter();
  if (location.hash) {
    revealTarget(decodeURIComponent(location.hash.slice(1)));
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }
})();
