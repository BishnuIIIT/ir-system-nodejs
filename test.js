/**
 * Automated Verification Test Suite for Information Retrieval System
 * Tests Boolean, Wildcard (Permuterm), Ranked (TF-IDF Cosine), and Incremental PDF Indexing.
 */
const path = require('path');
const DocumentLoader = require('./src/documentLoader');
const Tokenizer = require('./src/tokenizer');
const Normalizer = require('./src/normalizer');
const Indexer = require('./src/indexer');
const WildcardProcessor = require('./src/wildcardProcessor');
const QueryProcessor = require('./src/queryProcessor');
const PdfProcessor = require('./src/pdfProcessor');

const DOCUMENTS_DIR = path.join(__dirname, 'documents');

console.log('====================================================');
console.log('   INFORMATION RETRIEVAL SYSTEM - TEST SUITE');
console.log('====================================================\n');

// 1. Initialize System
const loader = new DocumentLoader(DOCUMENTS_DIR);
const docs = loader.loadDocuments();
const tokenizer = new Tokenizer();
const normalizer = new Normalizer();
const indexer = new Indexer(tokenizer, normalizer);
indexer.buildIndex(docs);
const wildcardProcessor = new WildcardProcessor(indexer.getVocabulary(), indexer);
const queryProcessor = new QueryProcessor(indexer, wildcardProcessor, normalizer, tokenizer);
const pdfProcessor = new PdfProcessor();

let totalPassed = 0;
let totalTests = 0;

function assert(description, condition, details) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    if (details) console.log(`     → ${details}`);
    totalPassed++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    if (details) console.error(`     → Details: ${details}`);
  }
}

// ----------------------------------------------------
// TEST GROUP 1: BOOLEAN RETRIEVAL
// ----------------------------------------------------
console.log('\n--- 1. Testing Boolean Retrieval ---');

const boolTest1 = queryProcessor.processBooleanQuery('computer AND science');
assert(
  'Query: "computer AND science"',
  boolTest1.totalHits >= 4,
  `Retrieved ${boolTest1.totalHits} docs: [${boolTest1.results.map(r => r.docId).join(', ')}]`
);

const boolTest2 = queryProcessor.processBooleanQuery('computer OR retrieval');
assert(
  'Query: "computer OR retrieval"',
  boolTest2.totalHits === 5,
  `Retrieved all ${boolTest2.totalHits} docs: [${boolTest2.results.map(r => r.docId).join(', ')}]`
);

const boolTest3 = queryProcessor.processBooleanQuery('computer AND NOT machine');
assert(
  'Query: "computer AND NOT machine"',
  boolTest3.totalHits >= 1 && !boolTest3.results.some(r => r.docId === 'doc4_machine_learning.txt'),
  `Excludes machine learning doc: [${boolTest3.results.map(r => r.docId).join(', ')}]`
);

const boolTest4 = queryProcessor.processBooleanQuery('(computer OR science) AND retrieval');
assert(
  'Query: "(computer OR science) AND retrieval"',
  boolTest4.totalHits >= 3,
  `Retrieved ${boolTest4.totalHits} docs: [${boolTest4.results.map(r => r.docId).join(', ')}]`
);

// ----------------------------------------------------
// TEST GROUP 2: WILDCARD PERMUTERM RETRIEVAL
// ----------------------------------------------------
console.log('\n--- 2. Testing Wildcard Processing ---');

const wildTest1 = wildcardProcessor.processWildcardQuery('comput*');
assert(
  'Trailing Wildcard: "comput*"',
  wildTest1.expandedTerms.includes('computer') && wildTest1.expandedTerms.includes('computational'),
  `Expanded to: [${wildTest1.expandedTerms.join(', ')}]`
);

const wildTest2 = wildcardProcessor.processWildcardQuery('*tion');
assert(
  'Leading Wildcard: "*tion"',
  wildTest2.expandedTerms.includes('information') && wildTest2.expandedTerms.includes('classification'),
  `Expanded to ${wildTest2.expandedTerms.length} terms: [${wildTest2.expandedTerms.slice(0, 5).join(', ')}...]`
);

const wildTest3 = wildcardProcessor.processWildcardQuery('c*mput*');
assert(
  'Internal/Multiple Wildcard: "c*mput*"',
  wildTest3.expandedTerms.includes('computer') && wildTest3.expandedTerms.includes('computation'),
  `Expanded to: [${wildTest3.expandedTerms.join(', ')}]`
);

const wildTest4 = wildcardProcessor.processWildcardQuery('te?t');
assert(
  'Single Character Wildcard: "te?t"',
  wildTest4.expandedTerms.includes('test') && wildTest4.expandedTerms.includes('text'),
  `Expanded to: [${wildTest4.expandedTerms.join(', ')}]`
);

// ----------------------------------------------------
// TEST GROUP 3: RANKED RETRIEVAL (TF-IDF & COSINE)
// ----------------------------------------------------
console.log('\n--- 3. Testing Ranked Retrieval (TF-IDF & Cosine Similarity) ---');

const rankTest1 = queryProcessor.processRankedQuery('machine learning');
assert(
  'Ranked Query: "machine learning"',
  rankTest1.results.length > 0 && rankTest1.results[0].docId === 'doc4_machine_learning.txt',
  `Top document: ${rankTest1.results[0].docId} with Cosine Score: ${rankTest1.results[0].score}`
);

const rankTest2 = queryProcessor.processRankedQuery('information retrieval');
assert(
  'Ranked Query: "information retrieval"',
  rankTest2.results.length > 0 && rankTest2.results[0].docId === 'doc3_information_retrieval.txt',
  `Top document: ${rankTest2.results[0].docId} with Cosine Score: ${rankTest2.results[0].score}`
);

const rankTest3 = queryProcessor.processRankedQuery('search engine');
assert(
  'Ranked Query: "search engine"',
  rankTest3.results.length > 0 && rankTest3.results[0].docId === 'doc2_search_engines.txt',
  `Top document: ${rankTest3.results[0].docId} with Cosine Score: ${rankTest3.results[0].score}`
);

// ----------------------------------------------------
// TEST GROUP 4: INCREMENTAL INDEXING & DELETION
// ----------------------------------------------------
console.log('\n--- 4. Testing Incremental Indexing & Document Deletion ---');

const testPdfDoc = {
  id: 'test_uploaded_quantum.pdf',
  filename: 'test_uploaded_quantum.pdf',
  originalName: 'Quantum_Computing_Overview.pdf',
  title: 'Quantum Computing Overview',
  content: 'Quantum computing harnesses quantum mechanics to perform computational calculations exponentially faster than classical computers.',
  isSample: false,
  canDelete: true,
  uploadDate: 'Test'
};

// Add incrementally
indexer.addDocument(testPdfDoc);
wildcardProcessor.updateVocabulary(indexer.getVocabulary());

const testSearch = queryProcessor.processBooleanQuery('quantum AND computing');
assert(
  'Incremental Document Search: "quantum AND computing"',
  testSearch.totalHits === 1 && testSearch.results[0].docId === 'test_uploaded_quantum.pdf',
  `Found newly indexed document: ${testSearch.results[0].docId}`
);

const testWildcard = wildcardProcessor.processWildcardQuery('quant*');
assert(
  'Wildcard on Uploaded Term: "quant*"',
  testWildcard.expandedTerms.includes('quantum'),
  `Expanded to: [${testWildcard.expandedTerms.join(', ')}]`
);

// Remove incrementally
const removeSuccess = indexer.removeDocument('test_uploaded_quantum.pdf');
wildcardProcessor.updateVocabulary(indexer.getVocabulary());

const testSearchAfterDelete = queryProcessor.processBooleanQuery('quantum AND computing');
assert(
  'Search After Deletion: "quantum AND computing"',
  removeSuccess && testSearchAfterDelete.totalHits === 0,
  `Correctly removed from index (hits = ${testSearchAfterDelete.totalHits})`
);

// Verify sample documents remain searchable
const sampleVerify = queryProcessor.processBooleanQuery('computer AND science');
assert(
  'Sample Documents Integrity Check',
  sampleVerify.totalHits >= 4,
  `Sample documents intact (hits = ${sampleVerify.totalHits})`
);

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(` TEST SUMMARY: ${totalPassed} / ${totalTests} PASSED`);
console.log('====================================================\n');
