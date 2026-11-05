document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // DOM ELEMENTS - SEARCH
  // =========================================================================
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

  // =========================================================================
  // DOM ELEMENTS - TABS & PDF UPLOAD & CORPUS
  // =========================================================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const docCountBadge = document.getElementById('docCountBadge');

  const dropZone = document.getElementById('dropZone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const choosePdfBtn = document.getElementById('choosePdfBtn');
  const selectedFilesArea = document.getElementById('selectedFilesArea');
  const selectedCount = document.getElementById('selectedCount');
  const selectedFilesList = document.getElementById('selectedFilesList');
  const clearSelectedBtn = document.getElementById('clearSelectedBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadProgressWrapper = document.getElementById('uploadProgressWrapper');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const progressStatus = document.getElementById('progressStatus');
  const uploadAlert = document.getElementById('uploadAlert');

  const corpusTableBody = document.getElementById('corpusTableBody');
  const refreshCorpusBtn = document.getElementById('refreshCorpusBtn');

  // In-memory array of selected File objects
  let selectedFiles = [];

  // =========================================================================
  // SEARCH PRESETS
  // =========================================================================
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
    const checked = document.querySelector('input[name="searchMode"]:checked');
    return checked ? checked.value : 'boolean';
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

    if (mode === 'boolean') {
      searchInput.placeholder = 'e.g., (computer OR science) AND retrieval';
    } else if (mode === 'wildcard') {
      searchInput.placeholder = 'e.g., comput* or *tion or te?t';
    } else {
      searchInput.placeholder = 'e.g., machine learning or information retrieval';
    }
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

  // =========================================================================
  // SEARCH EXECUTION
  // =========================================================================
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
        errorArea.textContent = data.error || 'Search error occurred.';
        errorArea.classList.remove('hidden');
        return;
      }

      resultsSummary.classList.remove('hidden');
      resultsCount.textContent = `${data.totalHits} document${data.totalHits === 1 ? '' : 's'} retrieved`;
      latencyBadge.textContent = data.latencyMs || '0.00 ms';

      if (mode === 'wildcard' && data.expandedTerms && data.expandedTerms.length > 0) {
        wildcardExpansionArea.classList.remove('hidden');
        expansionTags.innerHTML = data.expandedTerms.map(t => `<span class="expansion-tag">${t}</span>`).join('');
      } else {
        wildcardExpansionArea.classList.add('hidden');
      }

      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔎</div>
            <h3>No Matching Documents</h3>
            <p>No documents matched <strong>"${data.query}"</strong>. Try uploading relevant PDFs or checking search terms.</p>
          </div>
        `;
        return;
      }

      data.results.forEach(doc => {
        const card = document.createElement('article');
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
      errorArea.textContent = `Server connection error: ${err.message}`;
      errorArea.classList.remove('hidden');
    }
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'uploadTab') {
        fetchCorpus();
      }
    });
  });

  // =========================================================================
  // PDF FILE SELECTION & UPLOAD
  // =========================================================================
  choosePdfBtn.addEventListener('click', () => pdfFileInput.click());
  dropZone.addEventListener('click', (e) => {
    if (e.target !== choosePdfBtn) {
      pdfFileInput.click();
    }
  });

  // Drag and drop support
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      addFilesToSelection(files);
    } else {
      showUploadAlert('Please drop valid PDF files only.', 'warning');
    }
  });

  pdfFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    addFilesToSelection(files);
  });

  function addFilesToSelection(files) {
    hideUploadAlert();
    for (const file of files) {
      // Validate PDF extension and mime type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showUploadAlert(`Skipped non-PDF file: ${file.name}`, 'warning');
        continue;
      }
      // Check file size (20 MB)
      if (file.size > 20 * 1024 * 1024) {
        showUploadAlert(`Skipped ${file.name}: Exceeds 20 MB limit.`, 'error');
        continue;
      }
      // Prevent duplicates in selection
      if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        selectedFiles.push(file);
      }
    }
    renderSelectedFiles();
  }

  function renderSelectedFiles() {
    if (selectedFiles.length === 0) {
      selectedFilesArea.classList.add('hidden');
      uploadBtn.disabled = true;
      selectedFilesList.innerHTML = '';
      return;
    }

    selectedFilesArea.classList.remove('hidden');
    uploadBtn.disabled = false;
    selectedCount.textContent = `${selectedFiles.length} PDF file${selectedFiles.length === 1 ? '' : 's'} selected`;
    selectedFilesList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML = `
        <div class="file-chip-info">
          <span class="file-icon">📄</span>
          <span title="${file.name}"><strong>${file.name}</strong></span>
          <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <button type="button" class="text-btn" data-index="${index}">✕</button>
      `;

      chip.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderSelectedFiles();
      });

      selectedFilesList.appendChild(chip);
    });
  }

  clearSelectedBtn.addEventListener('click', () => {
    selectedFiles = [];
    pdfFileInput.value = '';
    renderSelectedFiles();
    hideUploadAlert();
  });

  // =========================================================================
  // SUBMIT PDF UPLOAD TO SERVER
  // =========================================================================
  uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    hideUploadAlert();
    uploadBtn.disabled = true;
    uploadProgressWrapper.classList.remove('hidden');
    uploadProgressBar.style.width = '20%';
    progressStatus.textContent = 'Uploading PDF files to server...';

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('pdfFiles', file);
    });

    try {
      uploadProgressBar.style.width = '60%';
      progressStatus.textContent = 'Extracting text and updating inverted index...';

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      uploadProgressBar.style.width = '100%';

      setTimeout(() => {
        uploadProgressWrapper.classList.add('hidden');
        uploadProgressBar.style.width = '0%';
      }, 500);

      if (!response.ok || !data.success) {
        showUploadAlert(data.error || 'Upload failed.', 'error');
        uploadBtn.disabled = false;
        return;
      }

      // Success
      let msg = data.message;
      if (data.processed && data.processed.length > 0) {
        const warnings = data.processed.filter(p => p.isScannedOrEmpty);
        if (warnings.length > 0) {
          msg += ` (Note: ${warnings.length} PDF had minimal/no text extracted; may be an image/scanned PDF requiring OCR).`;
        }
      }

      showUploadAlert(msg, 'success');
      selectedFiles = [];
      pdfFileInput.value = '';
      renderSelectedFiles();
      fetchCorpus();
    } catch (err) {
      uploadProgressWrapper.classList.add('hidden');
      uploadBtn.disabled = false;
      showUploadAlert(`Upload error: ${err.message}`, 'error');
    }
  });

  function showUploadAlert(msg, type = 'info') {
    uploadAlert.className = `alert-box alert-${type}`;
    uploadAlert.textContent = msg;
    uploadAlert.classList.remove('hidden');
  }

  function hideUploadAlert() {
    uploadAlert.classList.add('hidden');
    uploadAlert.textContent = '';
  }

  // =========================================================================
  // DOCUMENT CORPUS MANAGEMENT
  // =========================================================================
  async function fetchCorpus() {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (!response.ok || !data.success) {
        corpusTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Failed to load documents: ${data.error}</td></tr>`;
        return;
      }

      docCountBadge.textContent = data.totalCount || 0;
      renderCorpusTable(data.documents || []);
    } catch (err) {
      corpusTableBody.innerHTML = `<tr><td colspan="6" class="text-center">Error connecting to server.</td></tr>`;
    }
  }

  function renderCorpusTable(documents) {
    if (documents.length === 0) {
      corpusTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No documents found.</td></tr>`;
      return;
    }

    corpusTableBody.innerHTML = '';
    documents.forEach(doc => {
      const tr = document.createElement('tr');
      const typeBadge = doc.isSample
        ? `<span class="badge-sample">Sample Corpus</span>`
        : `<span class="badge-pdf">Uploaded PDF</span>`;

      let actionHtml = '';
      if (doc.canDelete) {
        actionHtml = `<button type="button" class="btn-delete" data-id="${doc.id}" data-name="${doc.originalName}">Delete</button>`;
      } else {
        actionHtml = `<span class="protected-tag">Protected</span>`;
      }

      tr.innerHTML = `
        <td>
          <strong>${doc.title || doc.originalName}</strong>
          <div style="font-size:0.75rem; color:#64748b; font-family:monospace;">${doc.originalName || doc.filename}</div>
        </td>
        <td>${typeBadge}</td>
        <td>${doc.tokenCount.toLocaleString()} words</td>
        <td>${doc.uploadDate}</td>
        <td><small style="color:${doc.isSample ? '#0369a1' : '#166534'};">${doc.status}</small></td>
        <td>${actionHtml}</td>
      `;

      if (doc.canDelete) {
        tr.querySelector('.btn-delete').addEventListener('click', (e) => {
          const docId = e.target.getAttribute('data-id');
          const docName = e.target.getAttribute('data-name');
          deleteDocument(docId, docName);
        });
      }

      corpusTableBody.appendChild(tr);
    });
  }

  async function deleteDocument(docId, docName) {
    if (!confirm(`Are you sure you want to delete "${docName}" from the search index?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error || 'Failed to delete document.');
        return;
      }

      showUploadAlert(data.message, 'success');
      fetchCorpus();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  }

  refreshCorpusBtn.addEventListener('click', fetchCorpus);

  // =========================================================================
  // SEARCH EVENT LISTENERS
  // =========================================================================
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    resultsSummary.classList.add('hidden');
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>Ready to Search</h3>
        <p>Type a query or click one of the quick test queries above.</p>
      </div>
    `;
    searchInput.focus();
  });

  modeRadios.forEach(r => {
    r.addEventListener('change', () => {
      updatePresets();
      if (searchInput.value.trim()) {
        executeSearch();
      }
    });
  });

  // INITIALIZE
  updatePresets();
  fetchCorpus();
});
