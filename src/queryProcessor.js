class QueryProcessor {
  constructor(indexer, wildcardProcessor, normalizer, tokenizer) {
    this.indexer = indexer;
    this.wildcardProcessor = wildcardProcessor;
    this.normalizer = normalizer;
    this.tokenizer = tokenizer;
  }

  tokenizeBooleanQuery(queryString) {
    const rawTokens = [];
    const regex = /\(|\)|\bAND\b|\bOR\b|\bNOT\b|[^\s()]+/gi;
    let match;

    while ((match = regex.exec(queryString)) !== null) {
      const token = match[0].trim();
      if (!token) continue;
      const upper = token.toUpperCase();
      if (upper === 'AND' || upper === 'OR' || upper === 'NOT' || token === '(' || token === ')') {
        rawTokens.push(upper);
      } else {
        rawTokens.push(token.toLowerCase());
      }
    }

    const tokens = [];
    for (let i = 0; i < rawTokens.length; i++) {
      const current = rawTokens[i];
      tokens.push(current);
      if (i < rawTokens.length - 1) {
        const next = rawTokens[i + 1];
        const isCurrentOperand = current !== '(' && current !== 'AND' && current !== 'OR' && current !== 'NOT';
        const isNextOperand = next !== ')' && next !== 'AND' && next !== 'OR';
        if (isCurrentOperand && isNextOperand && next !== 'NOT') {
          tokens.push('AND');
        }
      }
    }
    return tokens;
  }

  infixToPostfix(tokens) {
    const output = [];
    const opStack = [];
    const precedence = { 'NOT': 3, 'AND': 2, 'OR': 1 };

    for (const token of tokens) {
      if (token === 'NOT' || token === 'AND' || token === 'OR') {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1] !== '(' &&
          precedence[opStack[opStack.length - 1]] >= precedence[token]
        ) {
          output.push(opStack.pop());
        }
        opStack.push(token);
      } else if (token === '(') {
        opStack.push(token);
      } else if (token === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          output.push(opStack.pop());
        }
        opStack.pop();
      } else {
        output.push(token);
      }
    }
    while (opStack.length > 0) {
      output.push(opStack.pop());
    }
    return output;
  }

  resolveTermPostings(term) {
    if (term.includes('*') || term.includes('?')) {
      const wildcardRes = this.wildcardProcessor.processWildcardQuery(term);
      const docIds = new Set();
      for (const expTerm of wildcardRes.expandedTerms) {
        for (const docId of this.indexer.getPostingList(expTerm)) {
          docIds.add(docId);
        }
      }
      return docIds;
    }
    const norm = this.normalizer.normalizeQueryTerm(term);
    return new Set(this.indexer.getPostingList(norm));
  }

  processBooleanQuery(queryString) {
    const allDocIds = new Set(this.indexer.getAllDocIds());
    if (!queryString || !queryString.trim()) {
      return { query: queryString, totalHits: 0, results: [] };
    }

    const tokens = this.tokenizeBooleanQuery(queryString);
    const postfix = this.infixToPostfix(tokens);
    const stack = [];

    for (const token of postfix) {
      if (token === 'NOT') {
        const operand = stack.pop() || new Set();
        const diff = new Set();
        for (const id of allDocIds) {
          if (!operand.has(id)) diff.add(id);
        }
        stack.push(diff);
      } else if (token === 'AND') {
        const right = stack.pop() || new Set();
        const left = stack.pop() || new Set();
        const intersection = new Set();
        for (const id of left) {
          if (right.has(id)) intersection.add(id);
        }
        stack.push(intersection);
      } else if (token === 'OR') {
        const right = stack.pop() || new Set();
        const left = stack.pop() || new Set();
        const union = new Set(left);
        for (const id of right) union.add(id);
        stack.push(union);
      } else {
        stack.push(this.resolveTermPostings(token));
      }
    }

    const finalDocSet = stack.pop() || new Set();
    const results = [];
    const queryTerms = tokens
      .filter(t => t !== 'AND' && t !== 'OR' && t !== 'NOT' && t !== '(' && t !== ')')
      .map(t => this.normalizer.normalizeQueryTerm(t));

    for (const docId of Array.from(finalDocSet).sort()) {
      const doc = this.indexer.getDocument(docId);
      if (!doc) continue;
      results.push({
        docId: doc.id,
        filename: doc.filename,
        title: doc.title,
        snippet: this.generateSnippet(doc.content, queryTerms),
        matchedQueryTerms: queryTerms
      });
    }

    return { query: queryString, totalHits: results.length, results };
  }

  processRankedQuery(queryString) {
    if (!queryString || !queryString.trim()) {
      return { query: queryString, totalHits: 0, results: [] };
    }

    const rawTokens = this.tokenizer.tokenize(queryString);
    const queryTerms = rawTokens
      .map(t => this.normalizer.normalizeToken(t.token))
      .filter(t => t.length > 0);

    if (queryTerms.length === 0) {
      return { query: queryString, totalHits: 0, results: [] };
    }

    const N = this.indexer.getTotalDocuments();
    const queryTermCounts = {};
    for (const term of queryTerms) {
      queryTermCounts[term] = (queryTermCounts[term] || 0) + 1;
    }

    const queryWeights = {};
    let queryLengthSq = 0;

    for (const [term, count] of Object.entries(queryTermCounts)) {
      const tf = count / queryTerms.length;
      const df = this.indexer.getDocumentFrequency(term);
      const idf = df > 0 ? Math.log(1 + N / df) : 0;
      const weight = tf * idf;
      queryWeights[term] = weight;
      queryLengthSq += weight * weight;
    }

    const queryNorm = Math.sqrt(queryLengthSq);
    if (queryNorm === 0) {
      return { query: queryString, totalHits: 0, results: [] };
    }

    const candidateDocIds = new Set();
    for (const term of Object.keys(queryWeights)) {
      for (const docId of this.indexer.getPostingList(term)) {
        candidateDocIds.add(docId);
      }
    }

    const scoredDocs = [];

    for (const docId of candidateDocIds) {
      const doc = this.indexer.getDocument(docId);
      const docTotalTokens = this.indexer.getDocLength(docId);
      if (!doc || docTotalTokens === 0) continue;

      let dotProduct = 0;
      const matchedTerms = [];

      for (const [term, qWeight] of Object.entries(queryWeights)) {
        const tfRaw = this.indexer.getTermFrequency(term, docId);
        if (tfRaw > 0) {
          const tf = tfRaw / docTotalTokens;
          const df = this.indexer.getDocumentFrequency(term);
          const idf = Math.log(1 + N / df);
          const docWeight = tf * idf;
          dotProduct += qWeight * docWeight;
          matchedTerms.push({ term, count: tfRaw });
        }
      }

      let docLengthSq = 0;
      const docTokens = this.tokenizer.tokenize(doc.content);
      const docTermFrequencies = {};

      for (const dt of docTokens) {
        const normT = this.normalizer.normalizeToken(dt.token);
        if (normT) docTermFrequencies[normT] = (docTermFrequencies[normT] || 0) + 1;
      }

      for (const [t, f] of Object.entries(docTermFrequencies)) {
        const tf = f / docTotalTokens;
        const df = this.indexer.getDocumentFrequency(t);
        const idf = df > 0 ? Math.log(1 + N / df) : 0;
        const w = tf * idf;
        docLengthSq += w * w;
      }

      const docNorm = Math.sqrt(docLengthSq);
      const cosineSim = (queryNorm * docNorm) > 0 ? (dotProduct / (queryNorm * docNorm)) : 0;

      if (cosineSim > 0) {
        scoredDocs.push({
          docId: doc.id,
          filename: doc.filename,
          title: doc.title,
          score: parseFloat(cosineSim.toFixed(5)),
          scorePercentage: (cosineSim * 100).toFixed(1) + '%',
          matchedTerms: matchedTerms,
          snippet: this.generateSnippet(doc.content, Object.keys(queryWeights))
        });
      }
    }

    scoredDocs.sort((a, b) => b.score - a.score);
    return { query: queryString, totalHits: scoredDocs.length, results: scoredDocs };
  }

  generateSnippet(content, terms) {
    if (!content) return '';
    const sentences = content.split(/(?<=[.?!])\s+/);
    let bestSentence = sentences[0] || '';
    let maxMatchCount = 0;

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      let matchCount = 0;
      for (const term of terms) {
        if (term && lower.includes(term.toLowerCase())) matchCount++;
      }
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestSentence = sentence;
      }
    }
    return bestSentence.trim();
  }
}

module.exports = QueryProcessor;