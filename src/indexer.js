class Indexer {
  /**
   * @param {import('./tokenizer')} tokenizer
   * @param {import('./normalizer')} normalizer
   */
  constructor(tokenizer, normalizer) {
    this.tokenizer = tokenizer;
    this.normalizer = normalizer;
    // Positional Inverted Index:
    // { "computer": { "doc1_nlp.txt": [2, 5], "doc3_information_retrieval.txt": [4] } }
    this.invertedIndex = {};
    // Document lengths (total token count per docId)
    this.docLengths = {};
    // Document store: docId -> document metadata object
    this.documents = {};
    // Unique vocabulary set
    this.vocabulary = new Set();
  }

  /**
   * Builds the inverted index from an array of document objects.
   * @param {Array<{ id: string, filename: string, title: string, content: string }>} docs
   */
  buildIndex(docs) {
    this.invertedIndex = {};
    this.docLengths = {};
    this.documents = {};
    this.vocabulary.clear();

    for (const doc of docs) {
      this.addDocument(doc, false); // Add without logging individual document
    }

    console.log(`[Indexer] Inverted Index built: ${this.vocabulary.size} terms across ${docs.length} documents.`);
  }

  /**
   * Incrementally adds a single document to the existing index without rebuilding from scratch.
   * Preserves existing documents and postings.
   * @param {{ id: string, filename: string, title: string, content: string }} doc
   * @param {boolean} [log=true]
   * @returns {{ docId: string, tokenCount: number, uniqueTerms: number }}
   */
  addDocument(doc, log = true) {
    this.documents[doc.id] = doc;
    const tokens = this.tokenizer.tokenize(doc.content || '');
    this.docLengths[doc.id] = tokens.length;

    let addedTerms = 0;

    for (const { token, position } of tokens) {
      const term = this.normalizer.normalizeToken(token);
      if (!term) continue;

      if (!this.vocabulary.has(term)) {
        this.vocabulary.add(term);
        addedTerms++;
      }

      if (!this.invertedIndex[term]) {
        this.invertedIndex[term] = {};
      }
      if (!this.invertedIndex[term][doc.id]) {
        this.invertedIndex[term][doc.id] = [];
      }
      this.invertedIndex[term][doc.id].push(position);
    }

    if (log) {
      console.log(`[Indexer] Incrementally indexed document "${doc.id}" (${tokens.length} tokens, ${this.vocabulary.size} total vocabulary).`);
    }

    return {
      docId: doc.id,
      tokenCount: tokens.length,
      vocabularySize: this.vocabulary.size
    };
  }

  /**
   * Removes a document and all its postings from the inverted index.
   * Cleans up empty term postings and vocabulary entries.
   * @param {string} docId
   * @returns {boolean} True if removed, false if not found
   */
  removeDocument(docId) {
    if (!this.documents[docId]) {
      return false;
    }

    // Remove document metadata and length
    delete this.documents[docId];
    delete this.docLengths[docId];

    // Remove postings from inverted index
    for (const term of Object.keys(this.invertedIndex)) {
      if (this.invertedIndex[term][docId]) {
        delete this.invertedIndex[term][docId];

        // If no documents contain this term anymore, delete the term and remove from vocabulary
        if (Object.keys(this.invertedIndex[term]).length === 0) {
          delete this.invertedIndex[term];
          this.vocabulary.delete(term);
        }
      }
    }

    console.log(`[Indexer] Removed document "${docId}" from index. Remaining documents: ${Object.keys(this.documents).length}`);
    return true;
  }

  /**
   * Returns postings object for a term: { [docId]: number[] }
   * @param {string} term
   * @returns {Object|null}
   */
  getPostings(term) {
    const normTerm = this.normalizer.normalizeToken(term);
    return this.invertedIndex[normTerm] || null;
  }

  /**
   * Returns list of document IDs containing the term.
   * @param {string} term
   * @returns {string[]}
   */
  getPostingList(term) {
    const postings = this.getPostings(term);
    return postings ? Object.keys(postings) : [];
  }

  /**
   * Returns term frequency (count of term occurrences in docId).
   * @param {string} term
   * @param {string} docId
   * @returns {number}
   */
  getTermFrequency(term, docId) {
    const postings = this.getPostings(term);
    if (!postings || !postings[docId]) return 0;
    return postings[docId].length;
  }

  /**
   * Returns document frequency (count of documents containing term).
   * @param {string} term
   * @returns {number}
   */
  getDocumentFrequency(term) {
    const postings = this.getPostings(term);
    return postings ? Object.keys(postings).length : 0;
  }

  /**
   * Returns all unique vocabulary terms sorted alphabetically.
   * @returns {string[]}
   */
  getVocabulary() {
    return Array.from(this.vocabulary).sort();
  }

  /**
   * Returns total count of indexed documents.
   * @returns {number}
   */
  getTotalDocuments() {
    return Object.keys(this.documents).length;
  }

  /**
   * Returns list of all document IDs.
   * @returns {string[]}
   */
  getAllDocIds() {
    return Object.keys(this.documents);
  }

  /**
   * Returns document by ID.
   * @param {string} docId
   * @returns {Object|undefined}
   */
  getDocument(docId) {
    return this.documents[docId];
  }

  /**
   * Returns array of all stored document objects.
   * @returns {Array<Object>}
   */
  getAllDocuments() {
    return Object.values(this.documents);
  }

  /**
   * Returns total token length of document.
   * @param {string} docId
   * @returns {number}
   */
  getDocLength(docId) {
    return this.docLengths[docId] || 0;
  }
}

module.exports = Indexer;
