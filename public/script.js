/**
 * ============================================================================
 * IR SEARCH — CLIENT CONTROLLER & APPLICATION LOGIC
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // APP STATE & CONSTANTS
  // =========================================================================
  const state = {
    theme: localStorage.getItem('ir_theme') || 'dark',
    activeView: 'search',
    searchMode: localStorage.getItem('ir_default_mode') || 'boolean',
    searchScope: 'all',
    corpusFilter: 'all',
    corpusSearchFilter: '',
    resultsLimit: localStorage.getItem('ir_results_limit') || 'all',
    allDocuments: [],
    stagedFiles: [],
    queryHistory: JSON.parse(localStorage.getItem('ir_query_history') || '[]'),
    totalQueriesSession: parseInt(sessionStorage.getItem('ir_session_queries') || '0', 10),
    systemStatus: null
  };

  const modePresets = {
    boolean: [
      'computer AND science',
      'computer OR retrieval',
      'computer AND NOT machine',
      '(information OR retrieval) AND model'
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
      'vector space model',
      'search engine'
    ]
  };

  // =========================================================================
  // DOM ELEMENT SELECTORS
  // =========================================================================
  // Theme Controls
  const htmlElement = document.documentElement;
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemeLight = document.getElementById('btnThemeLight');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
  const settingThemeDarkBtn = document.getElementById('settingThemeDarkBtn');
  const settingThemeLightBtn = document.getElementById('settingThemeLightBtn');

  // Sidebar & Navigation
  const appSidebar = document.getElementById('appSidebar');
  const sidebarCollapseToggle = document.getElementById('sidebarCollapseToggle');
  const mobileDrawerOpenBtn = document.getElementById('mobileDrawerOpenBtn');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const navButtons = document.querySelectorAll('.sidebar-nav-list .nav-link-btn');
  const brandLink = document.querySelector('.sidebar-brand-header .brand-link');
  const topbarBreadcrumb = document.getElementById('topbarBreadcrumb');
  const pagePanels = document.querySelectorAll('.page-panel');
  const sidebarDocBadge = document.getElementById('sidebarDocBadge');
  const sidebarHistoryBadge = document.getElementById('sidebarHistoryBadge');
  const globalSearchTrigger = document.getElementById('globalSearchTrigger');

  // Search Engine
  const searchConsoleForm = document.getElementById('searchConsoleForm');
  const mainSearchQueryInput = document.getElementById('mainSearchQueryInput');
  const clearSearchQueryBtn = document.getElementById('clearSearchQueryBtn');
  const triggerSearchBtn = document.getElementById('triggerSearchBtn');
  const modeRadios = document.querySelectorAll('input[name="searchMode"]');
  const queryPresetsContainer = document.getElementById('queryPresetsContainer');
  const searchCorpusScopeSelect = document.getElementById('searchCorpusScopeSelect');
  const searchLoadingBox = document.getElementById('searchLoadingBox');
  const searchErrorNotice = document.getElementById('searchErrorNotice');
  const searchErrorNoticeText = document.getElementById('searchErrorNoticeText');
  const resultsSummaryHeader = document.getElementById('resultsSummaryHeader');
  const resultsCountHeader = document.getElementById('resultsCountHeader');
  const resultsLatencyHeader = document.getElementById('resultsLatencyHeader');
  const wildcardExpansionsRow = document.getElementById('wildcardExpansionsRow');
  const wildcardTagsList = document.getElementById('wildcardTagsList');
  const searchResultsCardStack = document.getElementById('searchResultsCardStack');

  // Dashboard Overview
  const dashboardRefreshBtn = document.getElementById('dashboardRefreshBtn');
  const dashTotalDocs = document.getElementById('dashTotalDocs');
  const dashVocabularyCount = document.getElementById('dashVocabularyCount');
  const dashTotalQueries = document.getElementById('dashTotalQueries');
  const dashUploadedPdfs = document.getElementById('dashUploadedPdfs');
  const dashDocsBreakdown = document.getElementById('dashDocsBreakdown');
  const dashRecentDocsContainer = document.getElementById('dashRecentDocsContainer');
  const dashGoToLibraryBtn = document.getElementById('dashGoToLibraryBtn');

  // Document Library & Upload
  const libraryDropzone = document.getElementById('libraryDropzone');
  const libraryPdfFileInput = document.getElementById('libraryPdfFileInput');
  const browsePdfFilesBtn = document.getElementById('browsePdfFilesBtn');
  const stagedQueueBox = document.getElementById('stagedQueueBox');
  const stagedQueueCount = document.getElementById('stagedQueueCount');
  const stagedQueueList = document.getElementById('stagedQueueList');
  const clearStagedQueueBtn = document.getElementById('clearStagedQueueBtn');
  const executeUploadBtn = document.getElementById('executeUploadBtn');
  const uploadProgressBarBox = document.getElementById('uploadProgressBarBox');
  const uploadProgressBarFill = document.getElementById('uploadProgressBarFill');
  const uploadProgressStepLabel = document.getElementById('uploadProgressStepLabel');
  const uploadProgressPercentLabel = document.getElementById('uploadProgressPercentLabel');
  const uploadStatusBanner = document.getElementById('uploadStatusBanner');
  const refreshCorpusTableBtn = document.getElementById('refreshCorpusTableBtn');
  const corpusFilterInput = document.getElementById('corpusFilterInput');
  const corpusFilterPills = document.querySelectorAll('.corpus-filter-pill');
  const corpusDataTableBody = document.getElementById('corpusDataTableBody');

  // Index Explorer
  const explorerQueryTermInput = document.getElementById('explorerQueryTermInput');
  const explorerLookupTermBtn = document.getElementById('explorerLookupTermBtn');
  const vocabChipsCloud = document.getElementById('vocabChipsCloud');
  const explorerResultCanvas = document.getElementById('explorerResultCanvas');
  const explorerInitialEmptyState = document.getElementById('explorerInitialEmptyState');
  const explorerActiveTermName = document.getElementById('explorerActiveTermName');
  const explorerDocFreqValue = document.getElementById('explorerDocFreqValue');
  const explorerPostingsCountValue = document.getElementById('explorerPostingsCountValue');
  const explorerPostingsListContainer = document.getElementById('explorerPostingsListContainer');

  // Query History
  const clearAllQueryHistoryBtn = document.getElementById('clearAllQueryHistoryBtn');
  const historyRowsContainer = document.getElementById('historyRowsContainer');

  // Settings
  const settingDefaultModeSelect = document.getElementById('settingDefaultModeSelect');
  const settingResultsLimitSelect = document.getElementById('settingResultsLimitSelect');

  // Document Viewer Modal
  const docViewerModal = document.getElementById('docViewerModal');
  const modalDocTitle = document.getElementById('modalDocTitle');
  const modalDocFilename = document.getElementById('modalDocFilename');
  const modalDocContent = document.getElementById('modalDocContent');
  const closeDocModalBtn = document.getElementById('closeDocModalBtn');

  // Toast Container
  const toastNotificationStack = document.getElementById('toastNotificationStack');

  // =========================================================================
  // THEME MANAGEMENT
  // =========================================================================
  function applyTheme(themeName) {
    state.theme = themeName;
    htmlElement.setAttribute('data-theme', themeName);
    localStorage.setItem('ir_theme', themeName);

    // Update Topbar buttons
    if (btnThemeDark && btnThemeLight) {
      btnThemeDark.classList.toggle('active', themeName === 'dark');
      btnThemeLight.classList.toggle('active', themeName === 'light');
    }

    // Update Settings buttons
    if (settingThemeDarkBtn && settingThemeLightBtn) {
      settingThemeDarkBtn.classList.toggle('active', themeName === 'dark');
      settingThemeLightBtn.classList.toggle('active', themeName === 'light');
    }
  }

  // Theme Event Listeners
  if (btnThemeDark) btnThemeDark.addEventListener('click', () => applyTheme('dark'));
  if (btnThemeLight) btnThemeLight.addEventListener('click', () => applyTheme('light'));
  if (settingThemeDarkBtn) settingThemeDarkBtn.addEventListener('click', () => applyTheme('dark'));
  if (settingThemeLightBtn) settingThemeLightBtn.addEventListener('click', () => applyTheme('light'));
  if (mobileThemeToggleBtn) {
    mobileThemeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
  }

  // =========================================================================
  // NAVIGATION & VIEW SWITCHING
  // =========================================================================
  const viewTitles = {
    search: 'Search Engine',
    dashboard: 'Dashboard Overview',
    library: 'Document Library & Ingestion',
    explorer: 'Inverted Index Explorer',
    history: 'Search Query History',
    settings: 'System Settings'
  };

  function switchView(viewName) {
    if (!viewTitles[viewName]) return;
    state.activeView = viewName;

    // Update Nav buttons
    navButtons.forEach(btn => {
      const btnView = btn.getAttribute('data-view');
      btn.classList.toggle('active', btnView === viewName);
    });

    // Update Topbar breadcrumb
    if (topbarBreadcrumb) {
      topbarBreadcrumb.textContent = viewTitles[viewName];
    }

    // Switch visible page panel
    pagePanels.forEach(panel => {
      const panelId = panel.id.replace('page-', '');
      panel.classList.toggle('active', panelId === viewName);
    });

    // Close mobile drawer if open
    closeMobileDrawer();

    // Trigger view-specific data loading
    if (viewName === 'dashboard') {
      loadDashboardMetrics();
    } else if (viewName === 'library') {
      loadDocumentsTable();
    } else if (viewName === 'explorer') {
      loadExplorerVocabulary();
    } else if (viewName === 'history') {
      renderQueryHistory();
    } else if (viewName === 'search') {
      setTimeout(() => mainSearchQueryInput && mainSearchQueryInput.focus(), 100);
    }
  }

  // Hook navigation buttons
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });

  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('search');
    });
  }

  if (dashGoToLibraryBtn) {
    dashGoToLibraryBtn.addEventListener('click', () => switchView('library'));
  }

  // Global search trigger
  if (globalSearchTrigger) {
    globalSearchTrigger.addEventListener('click', () => {
      switchView('search');
      mainSearchQueryInput.focus();
    });
  }

  // Sidebar Collapse Toggle (Desktop)
  if (sidebarCollapseToggle) {
    sidebarCollapseToggle.addEventListener('click', () => {
      appSidebar.classList.toggle('collapsed');
    });
  }

  // Mobile Drawer Controls
  function openMobileDrawer() {
    appSidebar.classList.add('open');
    drawerBackdrop.classList.add('active');
  }

  function closeMobileDrawer() {
    appSidebar.classList.remove('open');
    drawerBackdrop.classList.remove('active');
  }

  if (mobileDrawerOpenBtn) mobileDrawerOpenBtn.addEventListener('click', openMobileDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeMobileDrawer);

  // Keyboard Shortcuts: Ctrl+K or Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchView('search');
      mainSearchQueryInput.focus();
      mainSearchQueryInput.select();
    } else if (e.key === 'Escape') {
      closeDocModal();
    }
  });

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info', duration = 3500) {
    if (!toastNotificationStack) return;

    const toast = document.createElement('div');
    toast.className = `toast-pill ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    toastNotificationStack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Format Bytes
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let idx = 0;
    let n = parseFloat(bytes);
    while (n >= 1024 && idx < units.length - 1) {
      n /= 1024;
      idx++;
    }
    return `${n.toFixed(1)} ${units[idx]}`;
  }

  // =========================================================================
  // SEARCH ENGINE CONTROLLER
  // =========================================================================
  function renderPresetsForMode(mode) {
    if (!queryPresetsContainer) return;
    queryPresetsContainer.innerHTML = '';
    const presets = modePresets[mode] || [];

    presets.forEach(preset => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'query-preset-chip';
      chip.textContent = preset;
      chip.addEventListener('click', () => {
        mainSearchQueryInput.value = preset;
        updateClearSearchButtonVisibility();
        executeSearchQuery();
      });
      queryPresetsContainer.appendChild(chip);
    });
  }

  // Search Mode Radio Change
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.searchMode = e.target.value;
      renderPresetsForMode(state.searchMode);

      // Update placeholder
      if (state.searchMode === 'boolean') {
        mainSearchQueryInput.placeholder = 'Try: computer AND science, or information OR retrieval';
      } else if (state.searchMode === 'wildcard') {
        mainSearchQueryInput.placeholder = 'Try: comput*, *tion, c*mput*, or te?t';
      } else {
        mainSearchQueryInput.placeholder = 'Try: machine learning, information retrieval, search engine';
      }
    });
  });

  // Query Input Clear Button Visibility
  function updateClearSearchButtonVisibility() {
    if (!clearSearchQueryBtn) return;
    if (mainSearchQueryInput.value.trim().length > 0) {
      clearSearchQueryBtn.classList.add('visible');
    } else {
      clearSearchQueryBtn.classList.remove('visible');
    }
  }

  if (mainSearchQueryInput) {
    mainSearchQueryInput.addEventListener('input', updateClearSearchButtonVisibility);
  }

  if (clearSearchQueryBtn) {
    clearSearchQueryBtn.addEventListener('click', () => {
      mainSearchQueryInput.value = '';
      updateClearSearchButtonVisibility();
      mainSearchQueryInput.focus();
    });
  }

  if (searchCorpusScopeSelect) {
    searchCorpusScopeSelect.addEventListener('change', (e) => {
      state.searchScope = e.target.value;
    });
  }

  // Execute Search
  async function executeSearchQuery() {
    const rawQuery = mainSearchQueryInput.value.trim();
    if (!rawQuery) {
      showToast('Please enter a query term before searching.', 'info');
      mainSearchQueryInput.focus();
      return;
    }

    // Hide previous error, show loading
    searchErrorNotice.classList.add('hidden');
    searchLoadingBox.classList.remove('hidden');
    resultsSummaryHeader.classList.add('hidden');
    searchResultsCardStack.innerHTML = '';
    wildcardExpansionsRow.classList.add('hidden');

    const startTime = performance.now();

    try {
      let endpoint = '';
      if (state.searchMode === 'boolean') {
        endpoint = `/api/search?q=${encodeURIComponent(rawQuery)}`;
      } else if (state.searchMode === 'wildcard') {
        endpoint = `/api/wildcard?q=${encodeURIComponent(rawQuery)}`;
      } else {
        endpoint = `/api/ranked?q=${encodeURIComponent(rawQuery)}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      const endTime = performance.now();
      const latencyMs = (endTime - startTime).toFixed(2);

      searchLoadingBox.classList.add('hidden');

      if (!data.success) {
        searchErrorNoticeText.textContent = data.error || data.message || 'Error executing search query.';
        searchErrorNotice.classList.remove('hidden');
        return;
      }

      // Record query in history & telemetry
      recordQueryHistory(rawQuery, state.searchMode, (data.results || []).length);

      // Process and filter results according to scope
      let results = data.results || [];
      if (state.searchScope === 'sample') {
        results = results.filter(r => {
          const docId = r.docId || r.id;
          const matched = state.allDocuments.find(d => d.id === docId);
          return matched ? matched.isSample : (r.isSample || (r.filename && r.filename.endsWith('.txt')));
        });
      } else if (state.searchScope === 'pdf') {
        results = results.filter(r => {
          const docId = r.docId || r.id;
          const matched = state.allDocuments.find(d => d.id === docId);
          return matched ? !matched.isSample : (!r.isSample && (r.isPdf || (r.filename && r.filename.endsWith('.pdf'))));
        });
      }

      // Render Results
      renderSearchResults(results, data, latencyMs, rawQuery);

    } catch (err) {
      searchLoadingBox.classList.add('hidden');
      searchErrorNoticeText.textContent = `Server communication failure: ${err.message}`;
      searchErrorNotice.classList.remove('hidden');
    }
  }

  if (searchConsoleForm) {
    searchConsoleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      executeSearchQuery();
    });
  }

  // Render Search Results
  function renderSearchResults(results, apiData, latencyMs, queryText) {
    resultsSummaryHeader.classList.remove('hidden');
    resultsLatencyHeader.textContent = `${latencyMs} ms`;

    // Wildcard Expansions Display
    if (state.searchMode === 'wildcard' && apiData.expandedTerms && apiData.expandedTerms.length > 0) {
      wildcardExpansionsRow.classList.remove('hidden');
      wildcardTagsList.innerHTML = '';
      apiData.expandedTerms.forEach(term => {
        const tag = document.createElement('span');
        tag.className = 'wildcard-tag-pill';
        tag.textContent = term;
        wildcardTagsList.appendChild(tag);
      });
    } else {
      wildcardExpansionsRow.classList.add('hidden');
    }

    // Results Count Header
    const count = results.length;
    resultsCountHeader.textContent = `${count} ${count === 1 ? 'document' : 'documents'} found`;

    if (count === 0) {
      searchResultsCardStack.innerHTML = `
        <div class="results-empty-canvas">
          <div class="empty-canvas-art">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          </div>
          <h3>No Matching Documents Found</h3>
          <p>No documents matched the query "<strong>${escapeHtml(queryText)}</strong>". Try checking spelling, using wildcards (*), or broadening Boolean filters.</p>
        </div>
      `;
      return;
    }

    // Limit results if configured in settings
    let displayList = results;
    if (state.resultsLimit !== 'all') {
      const limit = parseInt(state.resultsLimit, 10);
      if (!isNaN(limit)) {
        displayList = results.slice(0, limit);
      }
    }

    searchResultsCardStack.innerHTML = '';

    displayList.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'result-card-premium';

      const resolvedId = item.docId || item.id;
      const matchedMeta = state.allDocuments.find(d => d.id === resolvedId);

      const isPdf = matchedMeta ? !matchedMeta.isSample : (item.isPdf || (item.filename && item.filename.endsWith('.pdf')));
      const typeLabel = isPdf ? 'PDF' : 'TXT';
      const typeIconClass = isPdf ? 'pdf' : 'txt';
      const tokenCount = matchedMeta ? (matchedMeta.tokenCount || 0) : (item.tokenCount || 0);

      // Highlight snippet terms
      const snippet = generateHighlightedSnippet(item.snippet || item.content || '', queryText);

      // Score Pill if ranked retrieval
      let scoreHtml = '';
      if (item.score !== undefined && item.score !== null) {
        const scoreVal = typeof item.score === 'number' ? item.score.toFixed(4) : item.score;
        scoreHtml = `
          <div class="relevance-score-pill" title="TF-IDF Cosine Relevance Score">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            <span>Score: ${scoreVal}</span>
          </div>
        `;
      }

      // Positions info
      let positionsHtml = '';
      if (item.positions && Array.isArray(item.positions) && item.positions.length > 0) {
        positionsHtml = `<span class="result-positions-preview" title="Token offsets in document">Pos: [${item.positions.slice(0, 10).join(', ')}${item.positions.length > 10 ? '...' : ''}]</span>`;
      } else if (item.positions && typeof item.positions === 'object') {
        const posEntries = Object.entries(item.positions).map(([w, offsets]) => `${w}: [${offsets.join(', ')}]`).join(' • ');
        positionsHtml = `<span class="result-positions-preview" title="Token offsets in document">Pos: ${escapeHtml(posEntries)}</span>`;
      }

      card.innerHTML = `
        <div class="result-card-header">
          <div class="result-doc-info">
            <div class="result-type-icon ${typeIconClass}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="result-title-group">
              <span class="result-doc-name">${escapeHtml(item.title || item.filename || `Doc #${resolvedId}`)}</span>
              <div class="result-doc-meta-row">
                <span>Doc #${resolvedId}</span>
                <span>•</span>
                <span>${typeLabel}</span>
                <span>•</span>
                <span>${tokenCount} tokens</span>
              </div>
            </div>
          </div>
          <div class="result-relevance-group">
            ${scoreHtml}
          </div>
        </div>

        <div class="result-snippet-box">
          ${snippet}
        </div>

        <div class="result-footer-actions">
          ${positionsHtml}
          <button type="button" class="btn btn-secondary btn-sm view-doc-btn" data-id="${resolvedId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>View Full Document</span>
          </button>
        </div>
      `;

      // Hook "View Full Document"
      const viewBtn = card.querySelector('.view-doc-btn');
      viewBtn.addEventListener('click', () => {
        openDocumentViewer(resolvedId);
      });

      searchResultsCardStack.appendChild(card);
    });
  }

  // Snippet Term Highlighter
  function generateHighlightedSnippet(text, query) {
    if (!text) return '<span style="color:var(--text-muted);font-style:italic;">No text preview available.</span>';

    // Extract search terms (ignoring boolean words)
    const stopWords = new Set(['and', 'or', 'not', '(', ')']);
    const rawTokens = query.toLowerCase().replace(/[^a-z0-9*?]/g, ' ').split(/\s+/).filter(t => t && !stopWords.has(t));

    // Create regex patterns for matching
    const patterns = rawTokens.map(tok => {
      const clean = tok.replace(/\*/g, '[a-zA-Z0-9]*').replace(/\?/g, '[a-zA-Z0-9]');
      return `\\b${clean}\\b`;
    });

    let safeText = escapeHtml(text.slice(0, 320)) + (text.length > 320 ? '...' : '');

    if (patterns.length > 0) {
      try {
        const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
        safeText = safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
      } catch (e) {
        // Fallback safely
      }
    }

    return safeText;
  }

  // Record Search Query in Local History & Telemetry
  function recordQueryHistory(query, mode, resultsCount) {
    state.totalQueriesSession++;
    sessionStorage.setItem('ir_session_queries', state.totalQueriesSession.toString());
    if (dashTotalQueries) dashTotalQueries.textContent = state.totalQueriesSession.toString();

    const entry = {
      query,
      mode,
      resultsCount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // Prepend to history, max 30 entries
    state.queryHistory.unshift(entry);
    if (state.queryHistory.length > 30) state.queryHistory.pop();
    localStorage.setItem('ir_query_history', JSON.stringify(state.queryHistory));

    // Update badge in sidebar
    if (sidebarHistoryBadge) {
      sidebarHistoryBadge.textContent = state.queryHistory.length.toString();
      sidebarHistoryBadge.classList.toggle('muted', state.queryHistory.length === 0);
    }
  }

  // =========================================================================
  // DASHBOARD ANALYTICS & METRICS
  // =========================================================================
  async function loadDashboardMetrics() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      state.systemStatus = data;

      const totalDocsCount = data.totalDocuments || data.documentCount || 0;
      const vocabSize = data.vocabularySize || data.vocabularyCount || 0;

      if (dashTotalDocs) dashTotalDocs.textContent = totalDocsCount.toString();
      if (dashVocabularyCount) dashVocabularyCount.textContent = vocabSize.toString();
      if (dashTotalQueries) dashTotalQueries.textContent = state.totalQueriesSession.toString();

      // Count uploaded PDFs
      const docsResp = await fetch('/api/documents');
      const docsData = await docsResp.json();
      state.allDocuments = docsData.documents || [];

      // Update sidebar badge
      if (sidebarDocBadge) sidebarDocBadge.textContent = state.allDocuments.length.toString();

      const pdfCount = state.allDocuments.filter(d => !d.isSample && (d.fileType === 'pdf' || (d.filename && d.filename.endsWith('.pdf')))).length;
      const sampleCount = state.allDocuments.length - pdfCount;

      if (dashUploadedPdfs) dashUploadedPdfs.textContent = pdfCount.toString();
      if (dashDocsBreakdown) dashDocsBreakdown.textContent = `${sampleCount} Sample Corpus • ${pdfCount} PDFs`;

      // Render recent documents list in snapshot card
      renderRecentDocsSnapshot(state.allDocuments);

    } catch (err) {
      showToast('Failed to refresh system metrics from backend.', 'error');
    }
  }

  function renderRecentDocsSnapshot(docs) {
    if (!dashRecentDocsContainer) return;
    if (!docs || docs.length === 0) {
      dashRecentDocsContainer.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">No documents in corpus.</span>';
      return;
    }

    // Take latest 4 documents
    const latest = docs.slice(0, 4);
    dashRecentDocsContainer.innerHTML = '';

    latest.forEach(doc => {
      const row = document.createElement('div');
      row.className = 'recent-doc-row';

      const isPdf = !doc.isSample && (doc.fileType === 'pdf' || (doc.filename && doc.filename.endsWith('.pdf')));

      row.innerHTML = `
        <div class="recent-doc-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span class="recent-doc-name" title="${escapeHtml(doc.title || doc.filename)}">${escapeHtml(doc.title || doc.filename)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="badge-pill ${isPdf ? 'amber' : 'violet'}">${isPdf ? 'PDF' : 'Sample'}</span>
          <span class="recent-doc-tokens">${doc.tokenCount || 0} tokens</span>
        </div>
      `;
      dashRecentDocsContainer.appendChild(row);
    });
  }

  if (dashboardRefreshBtn) {
    dashboardRefreshBtn.addEventListener('click', () => {
      loadDashboardMetrics();
      showToast('Dashboard metrics refreshed.', 'success');
    });
  }

  // =========================================================================
  // DOCUMENT LIBRARY & PDF UPLOAD CONTROLLER
  // =========================================================================
  // File Picker Trigger
  if (browsePdfFilesBtn && libraryPdfFileInput) {
    browsePdfFilesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      libraryPdfFileInput.click();
    });
  }

  if (libraryDropzone && libraryPdfFileInput) {
    libraryDropzone.addEventListener('click', () => {
      libraryPdfFileInput.click();
    });

    // Drag & Drop Events
    ['dragenter', 'dragover'].forEach(evtName => {
      libraryDropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        libraryDropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(evtName => {
      libraryDropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        libraryDropzone.classList.remove('drag-active');
      });
    });

    libraryDropzone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (files.length === 0) {
        showToast('Please select valid PDF documents.', 'error');
        return;
      }
      addFilesToStagedQueue(files);
    });
  }

  if (libraryPdfFileInput) {
    libraryPdfFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      addFilesToStagedQueue(files);
      libraryPdfFileInput.value = '';
    });
  }

  function addFilesToStagedQueue(files) {
    files.forEach(f => {
      if (!state.stagedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
        state.stagedFiles.push(f);
      }
    });

    renderStagedQueue();
  }

  function renderStagedQueue() {
    if (!stagedQueueBox || !stagedQueueList || !stagedQueueCount) return;

    if (state.stagedFiles.length === 0) {
      stagedQueueBox.classList.add('hidden');
      return;
    }

    stagedQueueBox.classList.remove('hidden');
    stagedQueueCount.textContent = `${state.stagedFiles.length} PDF ${state.stagedFiles.length === 1 ? 'file' : 'files'} selected for ingestion`;
    stagedQueueList.innerHTML = '';

    state.stagedFiles.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'queue-item-row';
      row.innerHTML = `
        <span class="queue-item-name">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--accent-danger);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          ${escapeHtml(file.name)}
        </span>
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span class="queue-item-size">${formatBytes(file.size)}</span>
          <button type="button" class="inline-link-btn danger remove-staged-btn" data-index="${index}" title="Remove file">✕</button>
        </div>
      `;

      row.querySelector('.remove-staged-btn').addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        state.stagedFiles.splice(idx, 1);
        renderStagedQueue();
      });

      stagedQueueList.appendChild(row);
    });
  }

  if (clearStagedQueueBtn) {
    clearStagedQueueBtn.addEventListener('click', () => {
      state.stagedFiles = [];
      renderStagedQueue();
    });
  }

  // Upload Execution with Progress
  if (executeUploadBtn) {
    executeUploadBtn.addEventListener('click', async () => {
      if (state.stagedFiles.length === 0) {
        showToast('No PDF files selected for upload.', 'info');
        return;
      }

      const formData = new FormData();
      state.stagedFiles.forEach(file => {
        formData.append('pdfFiles', file);
      });

      // Show Progress Bar
      uploadProgressBarBox.classList.remove('hidden');
      uploadProgressBarFill.style.width = '0%';
      uploadProgressPercentLabel.textContent = '0%';
      uploadProgressStepLabel.textContent = 'Streaming PDF bytes to server (100 GB limit supported)...';
      executeUploadBtn.disabled = true;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      // Track Progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          uploadProgressBarFill.style.width = `${percent}%`;
          uploadProgressPercentLabel.textContent = `${percent}%`;
          if (percent === 100) {
            uploadProgressStepLabel.textContent = 'Extracting PDF text, tokenizing, and constructing posting lists...';
          }
        }
      };

      xhr.onload = async () => {
        executeUploadBtn.disabled = false;
        uploadProgressBarBox.classList.add('hidden');

        try {
          const response = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300 && response.success) {
            showToast(response.message || 'PDFs successfully ingested into inverted index!', 'success');
            state.stagedFiles = [];
            renderStagedQueue();
            loadDocumentsTable();
            loadDashboardMetrics();
          } else {
            showToast(response.error || response.message || 'PDF processing completed with warnings.', 'error');
            if (response.errors && response.errors.length > 0) {
              response.errors.forEach(errItem => showToast(`${errItem.filename}: ${errItem.error}`, 'error', 6000));
            }
            loadDocumentsTable();
          }
        } catch (err) {
          showToast(`Upload failed: ${xhr.statusText || 'Server error'}`, 'error');
        }
      };

      xhr.onerror = () => {
        executeUploadBtn.disabled = false;
        uploadProgressBarBox.classList.add('hidden');
        showToast('Network error while uploading documents.', 'error');
      };

      xhr.send(formData);
    });
  }

  // Document Corpus Table Management
  async function loadDocumentsTable() {
    if (!corpusDataTableBody) return;
    corpusDataTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table-cell">
          <div class="loader-ring-pulse" style="margin: 0 auto 0.75rem;"></div>
          <span>Retrieving document corpus and index catalog...</span>
        </td>
      </tr>
    `;

    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      state.allDocuments = data.documents || [];

      // Update badge
      if (sidebarDocBadge) sidebarDocBadge.textContent = state.allDocuments.length.toString();

      renderFilteredCorpusTable();

    } catch (err) {
      corpusDataTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-cell" style="color:var(--accent-danger);">
            Failed to load documents: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  function renderFilteredCorpusTable() {
    if (!corpusDataTableBody) return;

    let filtered = state.allDocuments;

    // Filter by category pill
    if (state.corpusFilter === 'sample') {
      filtered = filtered.filter(d => d.isSample || (d.filename && d.filename.endsWith('.txt')));
    } else if (state.corpusFilter === 'pdf') {
      filtered = filtered.filter(d => !d.isSample && (d.fileType === 'pdf' || (d.filename && d.filename.endsWith('.pdf'))));
    }

    // Filter by text search
    if (state.corpusSearchFilter) {
      const q = state.corpusSearchFilter.toLowerCase();
      filtered = filtered.filter(d =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.filename && d.filename.toLowerCase().includes(q)) ||
        (d.id && String(d.id).includes(q))
      );
    }

    if (filtered.length === 0) {
      corpusDataTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-cell">
            No documents matching the active filter.
          </td>
        </tr>
      `;
      return;
    }

    corpusDataTableBody.innerHTML = '';

    filtered.forEach(doc => {
      const tr = document.createElement('tr');

      const isPdf = !doc.isSample && (doc.fileType === 'pdf' || (doc.filename && doc.filename.endsWith('.pdf')));
      const typeBadgeClass = isPdf ? 'amber' : 'violet';
      const typeLabel = isPdf ? 'PDF Document' : 'Sample Corpus';
      const formattedDate = doc.uploadDate || (doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Corpus Default');
      const formattedSize = doc.fileSize ? (typeof doc.fileSize === 'number' ? formatBytes(doc.fileSize) : doc.fileSize) : '—';
      const canDelete = doc.canDelete !== false && !doc.isSample;

      tr.innerHTML = `
        <td>
          <div class="doc-name-cell-wrap">
            <div class="doc-icon-badge ${isPdf ? 'pdf' : 'txt'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div>
              <div class="doc-name-title">${escapeHtml(doc.title || doc.filename)}</div>
              <div class="doc-name-id">ID: #${doc.id} • ${escapeHtml(doc.filename)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-pill ${typeBadgeClass}">${typeLabel}</span>
        </td>
        <td>
          <strong>${doc.tokenCount || 0}</strong>
        </td>
        <td>
          <span style="font-family:var(--font-mono);font-size:0.8rem;">${formattedSize}</span>
        </td>
        <td>
          <span style="font-size:0.82rem;color:var(--text-muted);">${formattedDate}</span>
        </td>
        <td>
          <span class="badge-tag success">Indexed</span>
        </td>
        <td class="text-right">
          <div class="table-action-btns">
            <button type="button" class="table-action-btn view-table-doc-btn" data-id="${doc.id}" title="View Document">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button
              type="button"
              class="table-action-btn danger delete-table-doc-btn"
              data-id="${doc.id}"
              data-name="${escapeHtml(doc.title || doc.filename)}"
              ${canDelete ? '' : 'disabled style="opacity:0.35;cursor:not-allowed;" title="Protected sample corpus document"'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      // Hook View Button
      tr.querySelector('.view-table-doc-btn').addEventListener('click', () => {
        openDocumentViewer(doc.id);
      });

      // Hook Delete Button
      if (canDelete) {
        tr.querySelector('.delete-table-doc-btn').addEventListener('click', async () => {
          const docId = doc.id;
          const docName = doc.title || doc.filename;

          if (confirm(`Remove "${docName}" from document corpus and inverted index?`)) {
            await deleteDocumentFromCorpus(docId);
          }
        });
      }

      corpusDataTableBody.appendChild(tr);
    });
  }

  // Delete Document Action
  async function deleteDocumentFromCorpus(id) {
    try {
      const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        showToast(data.message || 'Document deleted from corpus and inverted index.', 'success');
        loadDocumentsTable();
        loadDashboardMetrics();
      } else {
        showToast(data.error || data.message || 'Could not delete document.', 'error');
      }
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  }

  // Corpus Filter Listeners
  if (corpusFilterInput) {
    corpusFilterInput.addEventListener('input', (e) => {
      state.corpusSearchFilter = e.target.value.trim();
      renderFilteredCorpusTable();
    });
  }

  corpusFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      corpusFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.corpusFilter = pill.getAttribute('data-filter');
      renderFilteredCorpusTable();
    });
  });

  if (refreshCorpusTableBtn) {
    refreshCorpusTableBtn.addEventListener('click', () => {
      loadDocumentsTable();
      showToast('Corpus table updated.', 'success');
    });
  }

  // =========================================================================
  // INDEX EXPLORER CONTROLLER
  // =========================================================================
  async function loadExplorerVocabulary() {
    try {
      // First try fetching real vocabulary list directly from /api/postings
      const response = await fetch('/api/postings');
      const data = await response.json();

      if (!vocabChipsCloud) return;
      vocabChipsCloud.innerHTML = '';

      let terms = [];
      if (data.success && Array.isArray(data.vocabulary) && data.vocabulary.length > 0) {
        terms = data.vocabulary.slice(0, 36);
      } else {
        terms = [
          'computer', 'science', 'algorithm', 'information', 'retrieval',
          'document', 'indexing', 'query', 'boolean', 'wildcard', 'learning', 'machine'
        ];
      }

      terms.forEach(term => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'vocab-term-pill';
        pill.textContent = term;
        pill.addEventListener('click', () => {
          explorerQueryTermInput.value = term;
          inspectIndexTerm(term);
        });
        vocabChipsCloud.appendChild(pill);
      });
    } catch (err) {
      // Fallback
    }
  }

  async function inspectIndexTerm(term) {
    const cleanTerm = (term || explorerQueryTermInput.value).trim().toLowerCase();
    if (!cleanTerm) {
      showToast('Enter a term to inspect in the inverted index.', 'info');
      return;
    }

    explorerLookupTermBtn.disabled = true;

    try {
      const response = await fetch(`/api/postings?term=${encodeURIComponent(cleanTerm)}`);
      const data = await response.json();

      explorerLookupTermBtn.disabled = false;

      if (!data.success) {
        showToast(data.error || data.message || 'Term not found in vocabulary.', 'info');
        return;
      }

      // Show results canvas
      explorerInitialEmptyState.classList.add('hidden');
      explorerResultCanvas.classList.remove('hidden');

      explorerActiveTermName.textContent = `"${data.term}"`;
      explorerDocFreqValue.textContent = (data.docFrequency !== undefined ? data.docFrequency : (data.df || 0)).toString();
      explorerPostingsCountValue.textContent = (data.totalPostings !== undefined ? data.totalPostings : (data.postings || []).length).toString();

      // Render postings list
      explorerPostingsListContainer.innerHTML = '';

      if (!data.postings || data.postings.length === 0) {
        explorerPostingsListContainer.innerHTML = `
          <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            No posting entries found for term "${escapeHtml(data.term)}".
          </div>
        `;
        return;
      }

      data.postings.forEach(posting => {
        const card = document.createElement('div');
        card.className = 'posting-row-card';

        const pDocId = posting.docId || posting.id;
        const docObj = state.allDocuments.find(d => d.id === pDocId);
        const docTitle = docObj ? (docObj.title || docObj.filename) : (posting.title || `Document #${pDocId}`);

        // Offsets pills
        const offsetsHtml = (posting.positions || []).map(pos => `<span class="posting-offset-pill">offset: ${pos}</span>`).join('');
        const tfValue = posting.termFrequency !== undefined ? posting.termFrequency : (posting.tf || (posting.positions ? posting.positions.length : 1));

        card.innerHTML = `
          <div class="posting-card-top">
            <div>
              <span class="posting-doc-title">${escapeHtml(docTitle)}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);margin-left:0.5rem;font-family:var(--font-mono);">DocID: ${pDocId}</span>
            </div>
            <span class="posting-term-freq">Term Frequency (TF): ${tfValue}</span>
          </div>
          <div class="posting-offsets-stream">
            ${offsetsHtml}
          </div>
        `;

        explorerPostingsListContainer.appendChild(card);
      });

    } catch (err) {
      explorerLookupTermBtn.disabled = false;
      showToast(`Index inspection error: ${err.message}`, 'error');
    }
  }

  if (explorerLookupTermBtn) {
    explorerLookupTermBtn.addEventListener('click', () => {
      inspectIndexTerm();
    });
  }

  if (explorerQueryTermInput) {
    explorerQueryTermInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inspectIndexTerm();
      }
    });
  }

  // =========================================================================
  // QUERY HISTORY CONTROLLER
  // =========================================================================
  function renderQueryHistory() {
    if (!historyRowsContainer) return;

    if (state.queryHistory.length === 0) {
      historyRowsContainer.innerHTML = `
        <div class="history-empty-placeholder">
          <div class="empty-canvas-art">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3>No Query History Yet</h3>
          <p>Searches executed in the search console will automatically appear here for easy re-runs.</p>
        </div>
      `;
      return;
    }

    historyRowsContainer.innerHTML = '';

    state.queryHistory.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'history-item-row';

      row.innerHTML = `
        <div class="history-query-meta">
          <span class="history-mode-tag ${item.mode}">${item.mode}</span>
          <span class="history-query-text" title="${escapeHtml(item.query)}">${escapeHtml(item.query)}</span>
        </div>
        <div class="history-details-group">
          <span class="history-results-count">${item.resultsCount} docs</span>
          <span class="history-timestamp">${item.timestamp}</span>
          <button type="button" class="btn btn-secondary btn-sm rerun-query-btn" data-index="${index}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Re-run</span>
          </button>
        </div>
      `;

      row.querySelector('.rerun-query-btn').addEventListener('click', () => {
        // Switch to search view, set mode, populate query, execute
        switchView('search');

        // Select mode radio
        const modeRadio = document.querySelector(`input[name="searchMode"][value="${item.mode}"]`);
        if (modeRadio) {
          modeRadio.checked = true;
          state.searchMode = item.mode;
          renderPresetsForMode(item.mode);
        }

        mainSearchQueryInput.value = item.query;
        updateClearSearchButtonVisibility();
        executeSearchQuery();
      });

      historyRowsContainer.appendChild(row);
    });
  }

  if (clearAllQueryHistoryBtn) {
    clearAllQueryHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all search query history?')) {
        state.queryHistory = [];
        localStorage.removeItem('ir_query_history');
        if (sidebarHistoryBadge) {
          sidebarHistoryBadge.textContent = '0';
          sidebarHistoryBadge.classList.add('muted');
        }
        renderQueryHistory();
        showToast('Query history cleared.', 'info');
      }
    });
  }

  // =========================================================================
  // SETTINGS CONTROLLER
  // =========================================================================
  if (settingDefaultModeSelect) {
    settingDefaultModeSelect.value = state.searchMode;
    settingDefaultModeSelect.addEventListener('change', (e) => {
      state.searchMode = e.target.value;
      localStorage.setItem('ir_default_mode', state.searchMode);

      // Also select radio
      const radio = document.querySelector(`input[name="searchMode"][value="${state.searchMode}"]`);
      if (radio) {
        radio.checked = true;
        renderPresetsForMode(state.searchMode);
      }
      showToast(`Default search mode set to: ${state.searchMode}`, 'success');
    });
  }

  if (settingResultsLimitSelect) {
    settingResultsLimitSelect.value = state.resultsLimit;
    settingResultsLimitSelect.addEventListener('change', (e) => {
      state.resultsLimit = e.target.value;
      localStorage.setItem('ir_results_limit', state.resultsLimit);
      showToast(`Results display limit updated.`, 'success');
    });
  }

  // =========================================================================
  // DOCUMENT VIEW MODAL CONTROLLER
  // =========================================================================
  async function openDocumentViewer(docId) {
    if (!docViewerModal) return;

    modalDocTitle.textContent = 'Loading Document...';
    modalDocFilename.textContent = `ID #${docId}`;
    modalDocContent.textContent = 'Fetching document content from server memory...';
    docViewerModal.classList.remove('hidden');

    try {
      // First try single-doc endpoint
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`);
      const data = await response.json();

      if (data.success && data.document) {
        const doc = data.document;
        modalDocTitle.textContent = doc.title || doc.filename || `Document #${doc.id}`;
        modalDocFilename.textContent = `Filename: ${doc.filename} • Tokens: ${doc.tokenCount || 0}`;
        modalDocContent.textContent = doc.content || '(Document text content is empty)';
      } else {
        // Fallback to searching state.allDocuments
        const doc = (state.allDocuments || []).find(d => d.id === docId || d.docId === docId);
        if (doc) {
          modalDocTitle.textContent = doc.title || doc.filename || `Document #${doc.id}`;
          modalDocFilename.textContent = `Filename: ${doc.filename} • Tokens: ${doc.tokenCount || 0}`;
          modalDocContent.textContent = doc.content || '(Document text content is empty)';
        } else {
          modalDocTitle.textContent = 'Document Not Found';
          modalDocContent.textContent = `Could not find document with ID #${docId} in active corpus.`;
        }
      }
    } catch (err) {
      modalDocTitle.textContent = 'Error Loading Document';
      modalDocContent.textContent = err.message;
    }
  }

  function closeDocModal() {
    if (docViewerModal) {
      docViewerModal.classList.add('hidden');
    }
  }

  if (closeDocModalBtn) closeDocModalBtn.addEventListener('click', closeDocModal);
  if (docViewerModal) {
    docViewerModal.addEventListener('click', (e) => {
      if (e.target === docViewerModal) closeDocModal();
    });
  }

  // =========================================================================
  // INITIAL BOOTSTRAP
  // =========================================================================
  function initApp() {
    // 1. Set theme
    applyTheme(state.theme);

    // 2. Select default search mode
    const initialModeRadio = document.querySelector(`input[name="searchMode"][value="${state.searchMode}"]`);
    if (initialModeRadio) {
      initialModeRadio.checked = true;
    }
    renderPresetsForMode(state.searchMode);

    // 3. Update query history badge
    if (sidebarHistoryBadge) {
      sidebarHistoryBadge.textContent = state.queryHistory.length.toString();
      sidebarHistoryBadge.classList.toggle('muted', state.queryHistory.length === 0);
    }

    // 4. Initial metrics and corpus prefetch
    loadDashboardMetrics();
    loadDocumentsTable();

    // 5. Check if view was requested in URL hash (#dashboard, #library, etc.)
    const hash = window.location.hash.replace('#', '');
    if (hash && viewTitles[hash]) {
      switchView(hash);
    } else {
      switchView('search');
    }
  }

  initApp();
});
