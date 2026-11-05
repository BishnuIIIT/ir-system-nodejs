document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchForm = document.getElementById('searchForm');
  const clearBtn = document.getElementById('clearBtn');
  const resetBtn = document.getElementById('resetBtn');
  const modeRadios = document.querySelectorAll('input[name="searchMode"]');
  const queryPills = document.getElementById('queryPills');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorArea = document.getElementById('errorArea');
  const resultsSummary = document.getElementById('resultsSummary');
  const resultsCount = document.getElementById('resultsCount');
  const latencyBadge = document.getElementById('latencyBadge');
  const wildcardExpansionArea = document.getElementById('wildcardExpansionArea');
  const expansionTags = document.getElementById('expansionTags');
  const resultsContainer = document.getElementById('resultsContainer');

  const presets = {
    boolean: [
      'computer AND science',
      'computer OR retrieval',
      'computer AND NOT machine',
      '(computer OR science) AND retrieval'
    ],
    wildcard: [
      'comput*',
      '*tion',
      'c*mput*',
      'te?t'
    ],
    ranked: [
      'machine learning',
      'information retrieval',
      'search engine'
    ]
  };

  function getActiveMode() {
    return document.querySelector('input[name="searchMode"]:checked').value;
  }

  function updatePresets() {
    const mode = getActiveMode();
    queryPills.innerHTML = '';
    (presets[mode] || []).forEach(q => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'query-pill';
      btn.textContent = q;
      btn.onclick = () => {
        searchInput.value = q;
        executeSearch();
      };
      queryPills.appendChild(btn);
    });
  }

  function highlight(text, terms) {
    if (!text || !terms || terms.length === 0) return text;
    let res = text;
    terms.forEach(t => {
      if (!t || t.length < 2) return;
      const clean = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${clean}[a-z]*)\\b`, 'gi');
      res = res.replace(regex, '<mark class="highlight">$1</mark>');
    });
    return res;
  }

  async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    const mode = getActiveMode();
    errorArea.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    resultsSummary.classList.add('hidden');
    resultsContainer.innerHTML = '';

    const endpoint = mode === 'boolean'
      ? `/api/search?q=${encodeURIComponent(query)}`
      : mode === 'wildcard'
      ? `/api/wildcard?q=${encodeURIComponent(query)}`
      : `/api/ranked?q=${encodeURIComponent(query)}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      loadingIndicator.classList.add('hidden');

      if (!res.ok || !data.success) {
        errorArea.textContent = data.error || 'Search error';
        errorArea.classList.remove('hidden');
        return;
      }

      resultsSummary.classList.remove('hidden');
      resultsCount.textContent = `${data.totalHits} documents retrieved`;
      latencyBadge.textContent = data.latencyMs;

      if (mode === 'wildcard' && data.expandedTerms && data.expandedTerms.length > 0) {
        wildcardExpansionArea.classList.remove('hidden');
        expansionTags.innerHTML = data.expandedTerms.map(t => `<span class="expansion-tag">${t}</span>`).join('');
      } else {
        wildcardExpansionArea.classList.add('hidden');
      }

      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; color:#64748b; padding:1.5rem;">No matching documents found.</p>';
        return;
      }

      data.results.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'result-card';
        let highlightTerms = [];
        let scoreHtml = '';

        if (mode === 'boolean') {
          highlightTerms = doc.matchedQueryTerms || [];
        } else if (mode === 'wildcard') {
          highlightTerms = doc.matchedTerms || data.expandedTerms || [];
          scoreHtml = `<span class="score-badge">${doc.totalOccurrences} occurrences</span>`;
        } else if (mode === 'ranked') {
          highlightTerms = (doc.matchedTerms || []).map(m => m.term);
          scoreHtml = `<span class="score-badge">Score: ${doc.score} (${doc.scorePercentage})</span>`;
        }

        card.innerHTML = `
          <div class="result-card-header">
            <span class="result-title">${doc.title || doc.filename}</span>
            <div>
              <span class="doc-id-badge">${doc.docId || doc.filename}</span>
              ${scoreHtml}
            </div>
          </div>
          <p class="result-snippet">${highlight(doc.snippet || doc.content, highlightTerms)}</p>
        `;
        resultsContainer.appendChild(card);
      });
    } catch (err) {
      loadingIndicator.classList.add('hidden');
      errorArea.textContent = 'Server connection failed.';
      errorArea.classList.remove('hidden');
    }
  }

  searchForm.onsubmit = (e) => { e.preventDefault(); executeSearch(); };
  clearBtn.onclick = () => { searchInput.value = ''; searchInput.focus(); };
  resetBtn.onclick = () => {
    searchInput.value = '';
    resultsSummary.classList.add('hidden');
    resultsContainer.innerHTML = '';
  };
  modeRadios.forEach(r => r.onchange = () => { updatePresets(); if (searchInput.value.trim()) executeSearch(); });

  updatePresets();
});