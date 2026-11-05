const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const DocumentLoader = require('./src/documentLoader');
const Tokenizer = require('./src/tokenizer');
const Normalizer = require('./src/normalizer');
const Indexer = require('./src/indexer');
const WildcardProcessor = require('./src/wildcardProcessor');
const QueryProcessor = require('./src/queryProcessor');
const PdfProcessor = require('./src/pdfProcessor');

const app = express();
const PORT = process.env.PORT || 3000;
const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure uploads directory exists (Render and local compatibility)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// =========================================================================
// MULTER CONFIGURATION FOR SECURE PDF UPLOADS
// =========================================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique, collision-resistant, path-safe filename
    const timestamp = Date.now();
    const sanitizedOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitizedOriginal}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB per file
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (ext !== '.pdf' || (mime !== 'application/pdf' && mime !== 'application/x-pdf')) {
      return cb(new Error('Only PDF files (.pdf) are allowed.'), false);
    }
    cb(null, true);
  }
});

// =========================================================================
// INITIALIZE IR SYSTEM CORE
// =========================================================================
console.log('=== Initializing Information Retrieval System ===');
const documentLoader = new DocumentLoader(DOCUMENTS_DIR);
const sampleDocs = documentLoader.loadDocuments();

const tokenizer = new Tokenizer();
const normalizer = new Normalizer();
const indexer = new Indexer(tokenizer, normalizer);
const pdfProcessor = new PdfProcessor();

// Index sample documents
indexer.buildIndex(sampleDocs);

// Asynchronously load any existing PDFs in uploads folder on server start
(async () => {
  try {
    const existingPdfs = await documentLoader.loadUploadedPdfDocuments(UPLOADS_DIR, pdfProcessor);
    for (const pdfDoc of existingPdfs) {
      indexer.addDocument(pdfDoc, false);
    }
    if (existingPdfs.length > 0) {
      wildcardProcessor.updateVocabulary(indexer.getVocabulary());
    }
  } catch (initErr) {
    console.warn('[Server] Note on loading existing uploads:', initErr.message);
  }
})();

const wildcardProcessor = new WildcardProcessor(indexer.getVocabulary(), indexer);
const queryProcessor = new QueryProcessor(indexer, wildcardProcessor, normalizer, tokenizer);
console.log('=== IR System Ready ===\n');

// =========================================================================
// REST API ENDPOINTS
// =========================================================================

/**
 * POST /api/upload
 * Securely uploads multiple PDF documents, extracts text, and incrementally indexes them.
 */
app.post('/api/upload', (req, res) => {
  upload.array('pdfFiles', 10)(req, res, async (err) => {
    // Handle Multer upload errors
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds maximum 20MB limit.'
        : err.message || 'File upload failed.';
      return res.status(400).json({ success: false, error: message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files were provided for upload.' });
    }

    const processedDocuments = [];
    const uploadErrors = [];

    for (const file of req.files) {
      const filePath = file.path;
      try {
        // Validate PDF signature
        if (!pdfProcessor.isValidPdfSignature(filePath)) {
          // Delete unsafe file immediately
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          uploadErrors.push({
            filename: file.originalname,
            error: 'Invalid PDF signature (corrupted or spoofed file).'
          });
          continue;
        }

        // Extract text and metadata
        const extraction = await pdfProcessor.extractText(filePath);
        const cleanTitle = path.basename(file.originalname, '.pdf').replace(/[^a-zA-Z0-9 ]/g, ' ');

        const docRecord = {
          id: file.filename, // Unique filename stored in uploads/
          filename: file.filename,
          originalName: file.originalname,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          content: extraction.text,
          path: filePath,
          isSample: false,
          canDelete: true,
          fileType: 'pdf',
          numPages: extraction.numPages,
          uploadDate: new Date().toLocaleDateString(),
          fileSize: file.size,
          isScannedOrEmpty: extraction.isScannedOrEmpty,
          statusMessage: extraction.statusMessage
        };

        // Incrementally add to inverted index without server restart
        const indexResult = indexer.addDocument(docRecord);

        processedDocuments.push({
          id: docRecord.id,
          originalName: docRecord.originalName,
          title: docRecord.title,
          tokenCount: indexResult.tokenCount,
          pages: docRecord.numPages,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          isScannedOrEmpty: extraction.isScannedOrEmpty,
          status: extraction.statusMessage
        });
      } catch (procErr) {
        // Clean up file if processing failed
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        uploadErrors.push({
          filename: file.originalname,
          error: procErr.message
        });
      }
    }

    // Update Permuterm Index with newly added terms for wildcard support
    if (processedDocuments.length > 0) {
      wildcardProcessor.updateVocabulary(indexer.getVocabulary());
    }

    const statusCode = processedDocuments.length > 0 ? 200 : 400;
    return res.status(statusCode).json({
      success: processedDocuments.length > 0,
      message: `Successfully processed ${processedDocuments.length} PDF(s).`,
      processed: processedDocuments,
      errors: uploadErrors,
      totalDocuments: indexer.getTotalDocuments(),
      vocabularySize: indexer.getVocabulary().length
    });
  });
});

/**
 * GET /api/documents
 * Returns list of all indexed documents (both sample corpus and uploaded PDFs).
 */
app.get('/api/documents', (req, res) => {
  try {
    const allDocs = indexer.getAllDocuments().map(d => ({
      id: d.id,
      filename: d.filename,
      originalName: d.originalName || d.filename,
      title: d.title,
      isSample: !!d.isSample,
      canDelete: !d.isSample,
      fileType: d.fileType || 'txt',
      tokenCount: indexer.getDocLength(d.id),
      uploadDate: d.uploadDate || 'Permanent',
      fileSize: d.fileSize ? `${(d.fileSize / 1024).toFixed(1)} KB` : 'N/A',
      status: d.statusMessage || (d.isSample ? 'Sample Corpus' : 'Indexed')
    }));

    return res.status(200).json({
      success: true,
      totalCount: allDocs.length,
      documents: allDocs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/documents/:id
 * Removes an uploaded PDF from index and filesystem.
 * Protects original sample corpus from deletion.
 */
app.delete('/api/documents/:id', (req, res) => {
  try {
    const rawId = req.params.id;
    // Prevent path traversal
    const sanitizedId = path.basename(rawId);
    const doc = indexer.getDocument(sanitizedId);

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found in index.' });
    }

    // Safety check: Never delete sample corpus documents
    if (doc.isSample) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Original sample corpus documents cannot be deleted.'
      });
    }

    // 1. Remove postings from Inverted Index
    const removedFromIndex = indexer.removeDocument(sanitizedId);

    // 2. Delete physical PDF file from uploads directory
    const targetFilePath = path.join(UPLOADS_DIR, sanitizedId);
    if (fs.existsSync(targetFilePath)) {
      try {
        fs.unlinkSync(targetFilePath);
      } catch (fileErr) {
        console.warn(`[Server] Note: Could not delete physical file ${targetFilePath}: ${fileErr.message}`);
      }
    }

    // 3. Update Permuterm Wildcard Index
    wildcardProcessor.updateVocabulary(indexer.getVocabulary());

    return res.status(200).json({
      success: true,
      message: `Document "${doc.originalName || sanitizedId}" successfully deleted and removed from index.`,
      remainingDocuments: indexer.getTotalDocuments(),
      vocabularySize: indexer.getVocabulary().length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/search?q=computer AND science
 * Returns Boolean query results.
 */
app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }
    const startTime = process.hrtime();
    const result = queryProcessor.processBooleanQuery(query);
    const diff = process.hrtime(startTime);
    const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: 'boolean',
      query: query,
      totalHits: result.totalHits,
      latencyMs: `${latencyMs} ms`,
      results: result.results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/wildcard?q=comput*
 * Returns wildcard expansion and matching documents.
 */
app.get('/api/wildcard', (req, res) => {
  try {
    const query = req.query.q;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }
    const startTime = process.hrtime();
    const result = wildcardProcessor.processWildcardQuery(query);
    const diff = process.hrtime(startTime);
    const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: 'wildcard',
      query: query,
      expandedTerms: result.expandedTerms,
      totalHits: result.totalHits,
      latencyMs: `${latencyMs} ms`,
      results: result.matchingDocs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ranked?q=machine%20learning
 * Returns TF-IDF Cosine Similarity ranked results.
 */
app.get('/api/ranked', (req, res) => {
  try {
    const query = req.query.q;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }
    const startTime = process.hrtime();
    const result = queryProcessor.processRankedQuery(query);
    const diff = process.hrtime(startTime);
    const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    return res.status(200).json({
      success: true,
      mode: 'ranked',
      query: query,
      totalHits: result.totalHits,
      latencyMs: `${latencyMs} ms`,
      results: result.results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/status
 * Returns system statistics.
 */
app.get('/api/status', (req, res) => {
  return res.status(200).json({
    success: true,
    totalDocuments: indexer.getTotalDocuments(),
    vocabularySize: indexer.getVocabulary().length
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` IR System Server running at: http://localhost:${PORT}`);
  console.log(` Uploads directory: ${UPLOADS_DIR}`);
  console.log(`=======================================================`);
});
