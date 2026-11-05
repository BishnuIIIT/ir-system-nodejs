class Indexer {
  constructor(tokenizer, normalizer) {
    this.tokenizer = tokenizer;
    this.normalizer = normalizer;
    this.invertedIndex = {};
    this.docLengths = {};
    this.documents = {};
    this.vocabulary = new Set();
  }

  buildIndex(docs) {
    this.invertedIndex = {};
    this.docLengths = {};
    this.documents = {};
    this.vocabulary.clear();

    for (const doc of docs) {
      this.documents[doc.id] = doc;
      const tokens = this.tokenizer.tokenize(doc.content);
      this.docLengths[doc.id] = tokens.length;

      for (const { token, position } of tokens) {
        const term = this.normalizer.normalizeToken(token);
        if (!term) continue;

        this.vocabulary.add(term);

        if (!this.invertedIndex[term]) {
          this.invertedIndex[term] = {};
        }
        if (!this.invertedIndex[term][doc.id]) {
          this.invertedIndex[term][doc.id] = [];
        }
        this.invertedIndex[term][doc.id].push(position);
      }
    }
    console.log(`[Indexer] Inverted Index built: ${this.vocabulary.size} terms across ${docs.length} documents.`);
  }

  getPostings(term) {
    const normTerm = this.normalizer.normalizeToken(term);
    return this.invertedIndex[normTerm] || null;
  }

  getPostingList(term) {
    const postings = this.getPostings(term);
    return postings ? Object.keys(postings) : [];
  }

  getTermFrequency(term, docId) {
    const postings = this.getPostings(term);
    if (!postings || !postings[docId]) return 0;
    return postings[docId].length;
  }

  getDocumentFrequency(term) {
    const postings = this.getPostings(term);
    return postings ? Object.keys(postings).length : 0;
  }

  getVocabulary() {
    return Array.from(this.vocabulary).sort();
  }

  getTotalDocuments() {
    return Object.keys(this.documents).length;
  }

  getAllDocIds() {
    return Object.keys(this.documents);
  }

  getDocument(docId) {
    return this.documents[docId];
  }

  getDocLength(docId) {
    return this.docLengths[docId] || 0;
  }
}

module.exports = Indexer;