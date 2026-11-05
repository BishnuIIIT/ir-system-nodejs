/**
 * ============================================================================
 * IR SEARCH — CLIENT CONTROLLER & SAAS APPLICATION LOGIC
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // APP STATE & STORAGE
  // =========================================================================
  const state = {
    currentView: 'overview',
    searchMode: 'boolean',
    activeFilter: 'all',
    searchScope: 'all',
    allDocuments: [],
    vocabulary: [],
    selectedUploadFiles: [],
    totalQueriesExecuted: parseInt(localStorage.getItem('ir_query_count') || '0', 10),
    searchHistory: JSON.parse(localStorage.getItem('ir_search_history') || '[]'),
    theme: localStorage.getItem('ir_theme') || 'dark',
    defaultModePref: localStorage.getItem('ir_pref_mode') || 'boolean',
    resultsLimitPref: localStorage.getItem('ir_pref_limit') || 'all'
  };

  // Preset query suggestions per search mode
  const modePresets = {
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

  // =========================================================================
  // DOM ELEMENT SELECTIONS
  // =========================================================================
  // Navigation & Layout
  const appSidebar = document.getElementById('appSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const breadcrumbTitle = document.getElementById('breadcrumbTitle');
  const quickSearchTrigger = document.getElementById('quickSearchTrigger');
  const topbarUploadQuickBtn = document.getElementById('topbarUploadQuickBtn');
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const themeChoiceBtns = document.querySelectorAll('.btn-theme-choice');

  // Stats Elements
  const statTotalDocs = document.getElementById('statTotalDocs');
  const statDocsBreakdown = document.getElementById('statDocsBreakdown');
  const statVocabularySize = document.getElementById('statVocabularySize');
  const statUploadedPdfs = document.getElementById('statUploadedPdfs');
  const statTotalQueries = document.getElementById('statTotalQueries');
  const sidebarDocCount = document.getElementById('sidebarDocCount');
  const sidebarHistoryCount = document.getElementById('sidebarHistoryCount');
  const overviewRecentDocsList = document.getElementById('overviewRecentDocsList');
  const heroStartSearchBtn = document.getElementById('heroStartSearchBtn');
  const heroUploadBtn = document.getElementById('heroUploadBtn');
  const overviewViewAllDocsBtn = document.getElementById('overviewViewAllDocsBtn');

  // Search Elements
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const executeSearchBtn = document.getElementById('executeSearchBtn');
  const modeRadios = document.querySelectorAll('input[name="searchMode"]');
  const queryPillsContainer = document.getElementById('queryPillsContainer');
  const searchScopeSelect = document.getElementById('searchScopeSelect');
  const searchLoadingState = document.getElementById('searchLoadingState');
  const searchErrorState = document.getElementById('searchErrorState');
  const searchErrorMessage = document.getElementById('searchErrorMessage');
  const searchResultsMeta = document.getElementById('searchResultsMeta');
  const metaResultsCount = document.getElementById('metaResultsCount');
  const metaLatencyBadge = document.getElementById('metaLatencyBadge');
  const wildcardExpansionContainer = document.getElementById('wildcardExpansionContainer');
  const expansionTagsList = document.getElementById('expansionTagsList');
  const searchResultsContainer = document.getElementById('searchResultsContainer');

  // Upload Elements
  const uploadDropzone = document.getElementById('uploadDropzone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const browsePdfBtn = document.getElementById('browsePdfBtn');
  const stagingFilesArea = document.getElementById('stagingFilesArea');
  const stagingCountLabel = document.getElementById('stagingCountLabel');
  const stagingFilesList = document.getElementById('stagingFilesList');
  const clearStagingBtn = document.getElementById('clearStagingBtn');
  const startUploadBtn = document.getElementById('startUploadBtn');
  const uploadProgressBox = document.getElementById('uploadProgressBox');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const progressStepText = document.getElementById('progressStepText');
  const progressPercent = document.getElementById('progressPercent');
  const uploadAlertBanner = document.getElementById('uploadAlertBanner');

  // Library Elements
  const librarySearchInput = document.getElementById('librarySearchInput');
  const libraryFilterPills = document.querySelectorAll('.filter-pill');
  const libraryTableBody = document.getElementById('libraryTableBody');
  const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');

  // Explorer Elements
  const explorerTermInput = document.getElementById('explorerTermInput');
  const explorerLookupBtn = document.getElementById('explorerLookupBtn');
  const vocabularyChipsContainer = document.getElementById('vocabularyChipsContainer');
  const explorerResultArea = document.getElementById('explorerResultArea');
  const explorerEmptyState = document.getElementById('explorerEmptyState');
  const explorerTermName = document.getElementById('explorerTermName');
  const explorerDocFreq = document.getElementById('explorerDocFreq');
  const explorerPostingsCount = document.getElementById('explorerPostingsCount');
  const postingsContainer = document.getElementById('postingsContainer');

  // History & Settings Elements
  const historyItemsContainer = document.getElementById('historyItemsContainer');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const prefDefaultMode = document.getElementById('prefDefaultMode');
  const prefResultsLimit = document.getElementById('prefResultsLimit');
  const toastContainer = document.getElementById('toastContainer');

  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightMatches(text, terms) {
    if (!text || !terms || terms.length === 0) return escapeHtml(text);
    let output = escapeHtml(text);

    terms.forEach(term => {
      if (!term || term.trim().length < 2) return;
      const clean = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${clean}[a-zA-Z0-9]*)\\b`, 'gi');
      output = output.replace(regex, '<mark class="highlight">$1</mark>');
    });

    return output;
  }

  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconSvg = '';

    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="width:16px; height:16px; display:flex;">${iconSvg}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // =========================================================================
  // THEME MANAGEMENT
  // =========================================================================
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ir_theme', theme);

    themeChoiceBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-set-theme') === theme);
    });
  }

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(`Switched to ${nextTheme} theme`, 'info', 2000);
    });
  });

  themeChoiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = btn.getAttribute('data-set-theme');
      applyTheme(chosen);
    });
  });

  // =========================================================================
  // VIEW ROUTING & NAVIGATION
  // =========================================================================
  function switchView(viewName) {
    state.currentView = viewName;

    // Update active state in sidebar nav items
    navItems.forEach(item => {
      const match = item.getAttribute('data-view') === viewName;
      item.classList.toggle('active', match);
    });

    // Toggle panels
    viewPanels.forEach(panel => {
      const match = panel.id === `view-${viewName}`;
      panel.classList.toggle('active', match);
    });

    // Update Breadcrumb
    const titles = {
      overview: 'Overview',
      search: 'Document Search',
      upload: 'PDF Upload',
      library: 'Document Library',
      explorer: 'Index Explorer',
      history: 'Search History',
      settings: 'Settings'
    };
    breadcrumbTitle.textContent = titles[viewName] || 'Overview';

    // Close mobile drawer if open
    closeMobileSidebar();

    // Trigger view-specific data refresh
    if (viewName === 'overview') {
      refreshSystemStats();
    } else if (viewName === 'search') {
      setTimeout(() => searchInput.focus(), 100);
    } else if (viewName === 'library') {
      fetchDocuments();
    } else if (viewName === 'explorer') {
      fetchVocabulary();
    } else if (viewName === 'history') {
      renderSearchHistory();
    }
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });

  // Hero & Topbar Quick Navigation Buttons
  if (heroStartSearchBtn) heroStartSearchBtn.addEventListener('click', () => switchView('search'));
  if (heroUploadBtn) heroUploadBtn.addEventListener('click', () => switchView('upload'));
  if (topbarUploadQuickBtn) topbarUploadQuickBtn.addEventListener('click', () => switchView('upload'));
  if (overviewViewAllDocsBtn) overviewViewAllDocsBtn.addEventListener('click', () => switchView('library'));

  // Quick Command (Cmd/Ctrl + K)
  quickSearchTrigger.addEventListener('click', () => {
    switchView('search');
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchView('search');
    }
    if (e.key === 'Escape' && state.currentView === 'search') {
      searchInput.value = '';
      clearSearchBtn.classList.remove('visible');
    }
  });

  // Mobile Sidebar Toggle
  function openMobileSidebar() {
    appSidebar.classList.add('mobile-open');
    sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    appSidebar.classList.remove('mobile-open');
    sidebarBackdrop.classList.remove('active');
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // Desktop Sidebar Collapse Toggle
  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', () => {
      appSidebar.classList.toggle('collapsed');
    });
  }

  // =========================================================================
  // SYSTEM STATS & OVERVIEW
  // =========================================================================
  async function refreshSystemStats() {
    try {
      const [statusRes, docsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/documents')
      ]);

      const statusData = await statusRes.json();
      const docsData = await docsRes.json();

      if (statusData.success) {
        statTotalDocs.textContent = statusData.totalDocuments;
        statVocabularySize.textContent = statusData.vocabularySize;
        sidebarDocCount.textContent = statusData.totalDocuments;

        const sampleCount = statusData.sampleDocuments || 5;
        const uploadCount = statusData.uploadedDocuments || (statusData.totalDocuments - sampleCount);

        statDocsBreakdown.textContent = `${sampleCount} Sample + ${uploadCount} PDF`;
        statUploadedPdfs.textContent = uploadCount;
      }

      statTotalQueries.textContent = state.totalQueriesExecuted;
      sidebarHistoryCount.textContent = state.searchHistory.length;

      // Render Recent Documents Snapshot on Overview
      if (docsData.success && docsData.documents) {
        state.allDocuments = docsData.documents;
        renderOverviewRecentDocs(docsData.documents.slice(0, 5));
      }
    } catch (err) {
      console.warn('Could not refresh stats:', err.message);
    }
  }

  function renderOverviewRecentDocs(docs) {
    if (!overviewRecentDocsList) return;
    if (docs.length === 0) {
      overviewRecentDocsList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No documents indexed yet.</p>';
      return;
    }

    overviewRecentDocsList.innerHTML = '';
    docs.forEach(doc => {
      const isPdf = doc.fileType === 'pdf';
      const row = document.createElement('div');
      row.className = 'recent-doc-row';
      row.innerHTML = `
        <div class="doc-row-left">
          <div class="doc-type-icon ${isPdf ? 'pdf' : 'txt'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${isPdf
                ? '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>'
                : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>'}
            </svg>
          </div>
          <div class="doc-row-details">
            <span class="doc-row-title">${escapeHtml(doc.title || doc.filename)}</span>
            <span class="doc-row-meta">${doc.tokenCount.toLocaleString()} tokens • ${doc.isSample ? 'Sample Corpus' : 'Uploaded PDF'}</span>
          </div>
        </div>
        <button type="button" class="btn btn-outline-sm search-this-doc-btn" data-query="${escapeHtml(doc.title || doc.filename)}">
          Search
        </button>
      `;

      row.querySelector('.search-this-doc-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.value = doc.title || doc.filename;
        switchView('search');
        executeSearch();
      });

      overviewRecentDocsList.appendChild(row);
    });
  }

  // =========================================================================
  // ADVANCED DOCUMENT SEARCH ENGINE
  // =========================================================================
  function updateSearchPresets() {
    const mode = getActiveSearchMode();
    const presets = modePresets[mode] || [];
    queryPillsContainer.innerHTML = '';

    presets.forEach(q => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'query-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => {
        searchInput.value = q;
        clearSearchBtn.classList.add('visible');
        executeSearch();
      });
      queryPillsContainer.appendChild(chip);
    });

    // Update Input Placeholder
    if (mode === 'boolean') {
      searchInput.placeholder = 'Search Boolean expression... e.g. (computer OR science) AND retrieval';
    } else if (mode === 'wildcard') {
      searchInput.placeholder = 'Search Wildcard pattern... e.g. comput* or *tion or te?t';
    } else {
      searchInput.placeholder = 'Search natural language query... e.g. machine learning algorithms';
    }
  }

  function getActiveSearchMode() {
    const checked = document.querySelector('input[name="searchMode"]:checked');
    return checked ? checked.value : 'boolean';
  }

  modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateSearchPresets();
      if (searchInput.value.trim()) {
        executeSearch();
      }
    });
  });

  searchInput.addEventListener('input', () => {
    clearSearchBtn.classList.toggle('visible', searchInput.value.length > 0);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.remove('visible');
    searchInput.focus();
  });

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch();
  });

  searchScopeSelect.addEventListener('change', () => {
    state.searchScope = searchScopeSelect.value;
    if (searchInput.value.trim()) {
      executeSearch();
    }
  });

  async function executeSearch() {
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) {
      showToast('Please enter a query to search.', 'warning');
      return;
    }

    const mode = getActiveSearchMode();
    const scope = searchScopeSelect.value;

    // UI Feedback: Loading
    searchErrorState.classList.add('hidden');
    searchLoadingState.classList.remove('hidden');
    searchResultsMeta.classList.add('hidden');
    searchResultsContainer.innerHTML = '';

    let endpoint = '';
    if (mode === 'boolean') {
      endpoint = `/api/search?q=${encodeURIComponent(rawQuery)}`;
    } else if (mode === 'wildcard') {
      endpoint = `/api/wildcard?q=${encodeURIComponent(rawQuery)}`;
    } else if (mode === 'ranked') {
      endpoint = `/api/ranked?q=${encodeURIComponent(rawQuery)}`;
    }

    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      searchLoadingState.classList.add('hidden');

      if (!response.ok || !data.success) {
        searchErrorMessage.textContent = data.error || 'Failed to evaluate search query.';
        searchErrorState.classList.remove('hidden');
        return;
      }

      // Record query count & history
      state.totalQueriesExecuted++;
      localStorage.setItem('ir_query_count', state.totalQueriesExecuted.toString());
      statTotalQueries.textContent = state.totalQueriesExecuted;

      saveQueryToHistory(rawQuery, mode, data.totalHits || 0);

      // Filter by Scope if requested
      let filteredResults = data.results || [];
      if (scope === 'sample') {
        filteredResults = filteredResults.filter(r => {
          const doc = state.allDocuments.find(d => d.id === r.docId);
          return doc ? doc.isSample : !r.docId.endsWith('.pdf');
        });
      } else if (scope === 'pdf') {
        filteredResults = filteredResults.filter(r => {
          const doc = state.allDocuments.find(d => d.id === r.docId);
          return doc ? !doc.isSample : r.docId.endsWith('.pdf');
        });
      }

      renderSearchResults(rawQuery, mode, filteredResults, data);
    } catch (err) {
      searchLoadingState.classList.add('hidden');
      searchErrorMessage.textContent = `Server connection error: ${err.message}`;
      searchErrorState.classList.remove('hidden');
    }
  }

  function renderSearchResults(query, mode, results, fullResponse) {
    searchResultsMeta.classList.remove('hidden');
    metaResultsCount.textContent = `${results.length} document${results.length === 1 ? '' : 's'} found`;
    metaLatencyBadge.textContent = fullResponse.latencyMs || '0.00 ms';

    // Wildcard Expansion Tags
    if (mode === 'wildcard' && fullResponse.expandedTerms && fullResponse.expandedTerms.length > 0) {
      wildcardExpansionContainer.classList.remove('hidden');
      expansionTagsList.innerHTML = fullResponse.expandedTerms
        .map(t => `<span class="perm-tag">${escapeHtml(t)}</span>`)
        .join('');
    } else {
      wildcardExpansionContainer.classList.add('hidden');
    }

    if (results.length === 0) {
      searchResultsContainer.innerHTML = `
        <div class="empty-results-state">
          <div class="empty-icon-art">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <h3>No Matching Documents</h3>
          <p>No documents matched <strong>"${escapeHtml(query)}"</strong> in the ${state.searchScope} corpus. Try checking for typos or uploading a relevant PDF.</p>
        </div>
      `;
      return;
    }

    // Apply Results Limit Preference if set
    let displayResults = results;
    if (state.resultsLimitPref !== 'all') {
      const limit = parseInt(state.resultsLimitPref, 10);
      if (!isNaN(limit)) {
        displayResults = results.slice(0, limit);
      }
    }

    searchResultsContainer.innerHTML = '';
    displayResults.forEach(doc => {
      const card = document.createElement('article');
      card.className = 'result-card-premium';

      // Find doc info from state if available
      const docMeta = state.allDocuments.find(d => d.id === doc.docId);
      const isPdf = docMeta ? !docMeta.isSample : doc.docId.endsWith('.pdf');
      const typeBadge = isPdf
        ? `<span class="badge-pill amber">Uploaded PDF</span>`
        : `<span class="badge-pill purple">Sample Corpus</span>`;

      // Determine terms to highlight
      let highlightTerms = [];
      let scoreBadgeHtml = '';

      if (mode === 'boolean') {
        highlightTerms = doc.matchedQueryTerms || [];
      } else if (mode === 'wildcard') {
        highlightTerms = doc.matchedTerms || fullResponse.expandedTerms || [];
        scoreBadgeHtml = `<span class="score-pill-ranked">${doc.totalOccurrences || 1} hits</span>`;
      } else if (mode === 'ranked') {
        highlightTerms = (doc.matchedTerms || []).map(m => m.term);
        scoreBadgeHtml = `<span class="score-pill-ranked">Score: ${doc.score} (${doc.scorePercentage})</span>`;
      }

      const highlightedSnippet = highlightMatches(doc.snippet || doc.content || '', highlightTerms);

      // Matched terms footer
      let matchedTermsHtml = '';
      if (highlightTerms.length > 0) {
        matchedTermsHtml = `
          <div class="matched-terms-group">
            <span style="color:var(--text-muted); font-size:0.75rem;">Matched Terms:</span>
            ${highlightTerms.map(t => `<button type="button" class="matched-term-pill inspect-term-btn" data-term="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="result-card-top">
          <div class="result-title-group">
            <h4 class="result-card-title">${escapeHtml(doc.title || doc.filename)}</h4>
            <span class="result-card-filename">${escapeHtml(doc.docId || doc.filename)}</span>
          </div>
          <div class="result-badges-group">
            ${typeBadge}
            ${scoreBadgeHtml}
          </div>
        </div>
        <p class="result-snippet-text">${highlightedSnippet}</p>
        <div class="result-card-bottom">
          ${matchedTermsHtml}
          <button type="button" class="btn-link view-in-explorer-btn" data-term="${escapeHtml(highlightTerms[0] || '')}">
            Inspect in Index Explorer →
          </button>
        </div>
      `;

      // Event listener to jump into Explorer for term inspection
      card.querySelectorAll('.inspect-term-btn, .view-in-explorer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetTerm = btn.getAttribute('data-term');
          if (targetTerm) {
            switchView('explorer');
            explorerTermInput.value = targetTerm;
            lookupTermInExplorer(targetTerm);
          }
        });
      });

      searchResultsContainer.appendChild(card);
    });
  }

  // =========================================================================
  // PDF UPLOAD & PARSING
  // =========================================================================
  browsePdfBtn.addEventListener('click', () => pdfFileInput.click());
  uploadDropzone.addEventListener('click', (e) => {
    if (e.target !== browsePdfBtn) {
      pdfFileInput.click();
    }
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(ev => {
    uploadDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      uploadDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    uploadDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      uploadDropzone.classList.remove('drag-over');
    });
  });

  uploadDropzone.addEventListener('drop', (e) => {
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (dropped.length > 0) {
      handleStagedFiles(dropped);
    } else {
      showToast('Please select valid PDF files.', 'warning');
    }
  });

  pdfFileInput.addEventListener('change', (e) => {
    const selected = Array.from(e.target.files);
    handleStagedFiles(selected);
  });

  function handleStagedFiles(files) {
    const MAX_LIMIT = 100 * 1024 * 1024 * 1024; // 100 GB

    files.forEach(file => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast(`Skipped ${file.name}: Not a PDF.`, 'warning');
        return;
      }
      if (file.size > MAX_LIMIT) {
        showToast(`Skipped ${file.name}: Exceeds 100 GB.`, 'error');
        return;
      }
      if (!state.selectedUploadFiles.some(f => f.name === file.name && f.size === file.size)) {
        state.selectedUploadFiles.push(file);
      }
    });

    renderStagedFiles();
  }

  function renderStagedFiles() {
    if (state.selectedUploadFiles.length === 0) {
      stagingFilesArea.classList.add('hidden');
      stagingFilesList.innerHTML = '';
      return;
    }

    stagingFilesArea.classList.remove('hidden');
    stagingCountLabel.textContent = `${state.selectedUploadFiles.length} file${state.selectedUploadFiles.length === 1 ? '' : 's'} queued for ingestion`;
    stagingFilesList.innerHTML = '';

    state.selectedUploadFiles.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'staged-file-chip';
      chip.innerHTML = `
        <div class="file-info-col">
          <span class="file-red-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </span>
          <span class="staged-filename" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <span class="staged-filesize">(${formatBytes(file.size)})</span>
        </div>
        <button type="button" class="btn-link danger remove-staged-btn" data-index="${index}">✕</button>
      `;

      chip.querySelector('.remove-staged-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedUploadFiles.splice(index, 1);
        renderStagedFiles();
      });

      stagingFilesList.appendChild(chip);
    });
  }

  clearStagingBtn.addEventListener('click', () => {
    state.selectedUploadFiles = [];
    pdfFileInput.value = '';
    renderStagedFiles();
  });

  startUploadBtn.addEventListener('click', async () => {
    if (state.selectedUploadFiles.length === 0) return;

    uploadAlertBanner.classList.add('hidden');
    startUploadBtn.disabled = true;
    uploadProgressBox.classList.remove('hidden');
    uploadProgressBar.style.width = '20%';
    progressPercent.textContent = '20%';
    progressStepText.textContent = 'Streaming PDF bytes to server...';

    const formData = new FormData();
    state.selectedUploadFiles.forEach(file => {
      formData.append('pdfFiles', file);
    });

    try {
      setTimeout(() => {
        uploadProgressBar.style.width = '65%';
        progressPercent.textContent = '65%';
        progressStepText.textContent = 'Parsing text & updating Inverted Index...';
      }, 350);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      uploadProgressBar.style.width = '100%';
      progressPercent.textContent = '100%';

      setTimeout(() => {
        uploadProgressBox.classList.add('hidden');
        uploadProgressBar.style.width = '0%';
        startUploadBtn.disabled = false;
      }, 500);

      if (!response.ok || !data.success) {
        showUploadBanner(data.error || 'Upload error occurred.', 'danger');
        return;
      }

      // Success
      let successMsg = `Successfully indexed ${data.processed.length} PDF(s).`;
      const scannedPdfs = data.processed.filter(p => p.isScannedOrEmpty);
      if (scannedPdfs.length > 0) {
        successMsg += ` (Note: ${scannedPdfs.length} file(s) had minimal or image-only text; OCR required for scanned documents).`;
        showUploadBanner(successMsg, 'warning');
      } else {
        showUploadBanner(successMsg, 'success');
      }

      showToast(`Uploaded and indexed ${data.processed.length} PDF(s)!`, 'success');
      state.selectedUploadFiles = [];
      pdfFileInput.value = '';
      renderStagedFiles();

      // Refresh system status and documents
      refreshSystemStats();
    } catch (err) {
      uploadProgressBox.classList.add('hidden');
      startUploadBtn.disabled = false;
      showUploadBanner(`Network error: ${err.message}`, 'danger');
    }
  });

  function showUploadBanner(msg, type) {
    uploadAlertBanner.className = `alert-banner alert-${type}`;
    uploadAlertBanner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${escapeHtml(msg)}</span>
    `;
    uploadAlertBanner.classList.remove('hidden');
  }

  // =========================================================================
  // DOCUMENT LIBRARY
  // =========================================================================
  async function fetchDocuments() {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (!response.ok || !data.success) {
        libraryTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">Failed to load documents: ${escapeHtml(data.error)}</td></tr>`;
        return;
      }

      state.allDocuments = data.documents || [];
      renderLibraryTable();
    } catch (err) {
      libraryTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">Error connecting to server.</td></tr>`;
    }
  }

  function renderLibraryTable() {
    const searchTerm = (librarySearchInput.value || '').toLowerCase().trim();
    const filter = state.activeFilter;

    let filtered = state.allDocuments.filter(doc => {
      // Type Filter
      if (filter === 'sample' && !doc.isSample) return false;
      if (filter === 'pdf' && doc.isSample) return false;

      // Text Search Filter
      if (searchTerm) {
        const titleMatch = (doc.title || '').toLowerCase().includes(searchTerm);
        const fileMatch = (doc.filename || '').toLowerCase().includes(searchTerm);
        if (!titleMatch && !fileMatch) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      libraryTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">No documents found matching the filter.</td></tr>`;
      return;
    }

    libraryTableBody.innerHTML = '';
    filtered.forEach(doc => {
      const isPdf = !doc.isSample;
      const typeBadge = isPdf
        ? `<span class="badge-pill amber">Uploaded PDF</span>`
        : `<span class="badge-pill purple">Sample Corpus</span>`;

      let actionHtml = '';
      if (doc.canDelete) {
        actionHtml = `
          <button type="button" class="table-action-btn search-doc-btn" data-title="${escapeHtml(doc.title || doc.filename)}">Search</button>
          <button type="button" class="table-action-btn danger delete-doc-btn" data-id="${escapeHtml(doc.id)}" data-name="${escapeHtml(doc.originalName || doc.filename)}">Delete</button>
        `;
      } else {
        actionHtml = `
          <button type="button" class="table-action-btn search-doc-btn" data-query="${escapeHtml(doc.title || doc.filename)}">Search</button>
          <span class="protected-label">Protected</span>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="doc-name-cell">
          <strong>${escapeHtml(doc.title || doc.filename)}</strong>
          <small>${escapeHtml(doc.originalName || doc.filename)}</small>
        </td>
        <td>${typeBadge}</td>
        <td><strong>${doc.tokenCount.toLocaleString()}</strong> tokens</td>
        <td>${escapeHtml(doc.fileSize || 'N/A')}</td>
        <td>${escapeHtml(doc.uploadDate || 'Permanent')}</td>
        <td><span class="stat-badge ${doc.isSample ? 'info' : 'success'}">${escapeHtml(doc.status)}</span></td>
        <td class="text-right">
          <div class="table-actions">${actionHtml}</div>
        </td>
      `;

      // Button: Search this document
      tr.querySelectorAll('.search-doc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = btn.getAttribute('data-query') || btn.getAttribute('data-title');
          searchInput.value = q;
          switchView('search');
          executeSearch();
        });
      });

      // Button: Delete uploaded document
      const deleteBtn = tr.querySelector('.delete-doc-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const docId = deleteBtn.getAttribute('data-id');
          const docName = deleteBtn.getAttribute('data-name');
          deleteDocument(docId, docName);
        });
      }

      libraryTableBody.appendChild(tr);
    });
  }

  async function deleteDocument(docId, docName) {
    if (!confirm(`Are you sure you want to permanently delete "${docName}" from the search index?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to delete document', 'error');
        return;
      }

      showToast(`Deleted "${docName}" and updated Inverted Index`, 'success');
      fetchDocuments();
      refreshSystemStats();
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    }
  }

  librarySearchInput.addEventListener('input', renderLibraryTable);

  libraryFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      libraryFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderLibraryTable();
    });
  });

  refreshLibraryBtn.addEventListener('click', fetchDocuments);

  // =========================================================================
  // INDEX EXPLORER
  // =========================================================================
  async function fetchVocabulary() {
    try {
      const response = await fetch('/api/postings');
      const data = await response.json();

      if (data.success && data.vocabulary) {
        state.vocabulary = data.vocabulary;
        renderVocabularyChips(data.vocabulary);
      }
    } catch (err) {
      console.warn('Could not load vocabulary:', err.message);
    }
  }

  function renderVocabularyChips(vocab) {
    if (!vocabularyChipsContainer) return;
    vocabularyChipsContainer.innerHTML = '';

    vocab.slice(0, 80).forEach(term => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'vocab-chip';
      chip.textContent = term;
      chip.addEventListener('click', () => {
        explorerTermInput.value = term;
        lookupTermInExplorer(term);
      });
      vocabularyChipsContainer.appendChild(chip);
    });
  }

  async function lookupTermInExplorer(term) {
    const cleanTerm = (term || '').trim().toLowerCase();
    if (!cleanTerm) return;

    try {
      const response = await fetch(`/api/postings?term=${encodeURIComponent(cleanTerm)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast(data.error || 'Term lookup failed', 'error');
        return;
      }

      renderExplorerPostings(data);
    } catch (err) {
      showToast(`Lookup error: ${err.message}`, 'error');
    }
  }

  function renderExplorerPostings(data) {
    explorerEmptyState.classList.add('hidden');
    explorerResultArea.classList.remove('hidden');

    explorerTermName.textContent = data.term;
    explorerDocFreq.textContent = data.docFrequency;
    explorerPostingsCount.textContent = data.totalPostings;

    if (!data.postings || data.postings.length === 0) {
      postingsContainer.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Term does not appear in any document postings list.</p>';
      return;
    }

    postingsContainer.innerHTML = '';
    data.postings.forEach(item => {
      const card = document.createElement('div');
      card.className = 'posting-item-card';

      const positionsHtml = (item.positions || [])
        .map(pos => `<span class="position-chip" title="Word position in text">${pos}</span>`)
        .join('');

      card.innerHTML = `
        <div class="posting-item-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="posting-doc-name">${escapeHtml(item.title || item.docId)}</span>
            <small style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">(${escapeHtml(item.docId)})</small>
          </div>
          <span class="posting-tf-badge">${item.termFrequency} occurrence${item.termFrequency === 1 ? '' : 's'} (TF)</span>
        </div>
        <div class="positions-array-wrap">
          <span class="positions-label">Token Position Offsets:</span>
          ${positionsHtml}
        </div>
      `;

      postingsContainer.appendChild(card);
    });
  }

  explorerLookupBtn.addEventListener('click', () => {
    lookupTermInExplorer(explorerTermInput.value);
  });

  explorerTermInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      lookupTermInExplorer(explorerTermInput.value);
    }
  });

  // =========================================================================
  // SEARCH HISTORY
  // =========================================================================
  function saveQueryToHistory(query, mode, hits) {
    const item = {
      id: Date.now(),
      query: query,
      mode: mode,
      hits: hits,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepend and keep up to 30 history items
    state.searchHistory.unshift(item);
    if (state.searchHistory.length > 30) {
      state.searchHistory = state.searchHistory.slice(0, 30);
    }
    localStorage.setItem('ir_search_history', JSON.stringify(state.searchHistory));
    sidebarHistoryCount.textContent = state.searchHistory.length;
  }

  function renderSearchHistory() {
    if (!historyItemsContainer) return;

    if (state.searchHistory.length === 0) {
      historyItemsContainer.innerHTML = `
        <div class="empty-history-box">
          <div class="empty-icon-art">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3>No Search History</h3>
          <p>Execute search queries in the search console and they will appear here for one-click re-runs.</p>
        </div>
      `;
      return;
    }

    historyItemsContainer.innerHTML = '';
    state.searchHistory.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item-row';
      row.innerHTML = `
        <div class="history-item-left">
          <span class="stat-badge info" style="text-transform:uppercase; font-size:0.68rem;">${escapeHtml(item.mode)}</span>
          <span class="history-query-text">${escapeHtml(item.query)}</span>
        </div>
        <div class="history-item-right">
          <span class="history-time">${escapeHtml(item.timestamp)}</span>
          <span class="badge-pill cyan" style="font-size:0.75rem;">${item.hits} hit${item.hits === 1 ? '' : 's'}</span>
          <button type="button" class="btn btn-outline-sm rerun-query-btn" data-query="${escapeHtml(item.query)}" data-mode="${escapeHtml(item.mode)}">
            Re-run ↵
          </button>
        </div>
      `;

      row.querySelector('.rerun-query-btn').addEventListener('click', () => {
        searchInput.value = item.query;
        // Check corresponding mode radio
        const targetRadio = document.querySelector(`input[name="searchMode"][value="${item.mode}"]`);
        if (targetRadio) {
          targetRadio.checked = true;
          updateSearchPresets();
        }
        switchView('search');
        executeSearch();
      });

      historyItemsContainer.appendChild(row);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all search history?')) {
        state.searchHistory = [];
        localStorage.removeItem('ir_search_history');
        sidebarHistoryCount.textContent = '0';
        renderSearchHistory();
        showToast('Search history cleared', 'info');
      }
    });
  }

  // =========================================================================
  // SETTINGS CONTROLLER
  // =========================================================================
  if (prefDefaultMode) {
    prefDefaultMode.value = state.defaultModePref;
    prefDefaultMode.addEventListener('change', () => {
      state.defaultModePref = prefDefaultMode.value;
      localStorage.setItem('ir_pref_mode', prefDefaultMode.value);
      showToast(`Default search mode set to ${prefDefaultMode.value}`, 'success');
    });
  }

  if (prefResultsLimit) {
    prefResultsLimit.value = state.resultsLimitPref;
    prefResultsLimit.addEventListener('change', () => {
      state.resultsLimitPref = prefResultsLimit.value;
      localStorage.setItem('ir_pref_limit', prefResultsLimit.value);
      showToast(`Results display limit set to ${prefResultsLimit.value}`, 'success');
    });
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  applyTheme(state.theme);

  // Set default search mode from preferences
  const initialRadio = document.querySelector(`input[name="searchMode"][value="${state.defaultModePref}"]`);
  if (initialRadio) {
    initialRadio.checked = true;
  }

  updateSearchPresets();
  refreshSystemStats();

  // Listen to hash changes for deep linking
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['overview', 'search', 'upload', 'library', 'explorer', 'history', 'settings'].includes(hash)) {
      switchView(hash);
    }
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (['overview', 'search', 'upload', 'library', 'explorer', 'history', 'settings'].includes(hash)) {
      switchView(hash);
    }
  }
});
