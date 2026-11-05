const express = require('express');
const path = require('path');

const DocumentLoader = require('./src/documentLoader');
const Tokenizer = require('./src/tokenizer');
const Normalizer = require('./src/normalizer');
const Indexer = require('./src/indexer');
const WildcardProcessor = require('./src/wildcardProcessor');
const QueryProcessor = require('./src/queryProcessor');

const app = express();
const PORT = process.env.PORT || 3000;
const DOCUMENTS_DIR = path.join(__dirname, 'documents');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

console.log('=== Initializing Information Retrieval System ===');
const documentLoader = new DocumentLoader(DOCUMENTS_DIR);
const documents = documentLoader.loadDocuments();

const tokenizer = new Tokenizer();
const normalizer = new Normalizer();
const indexer = new Indexer(tokenizer, normalizer);
indexer.buildIndex(documents);

const wildcardProcessor = new WildcardProcessor(indexer.getVocabulary(), indexer);
const queryProcessor = new QueryProcessor(indexer, wildcardProcessor, normalizer, tokenizer);
console.log('=== IR System Ready ===\n');

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});