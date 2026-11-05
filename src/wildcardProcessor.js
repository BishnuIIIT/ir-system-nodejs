class WildcardProcessor {
  /**
   * @param {string[]} vocabulary - Array of all unique vocabulary terms
   * @param {import('./indexer')} indexer - Indexer instance
   */
  constructor(vocabulary, indexer) {
    this.indexer = indexer;
    this.permutermIndex = [];
    this.buildPermutermIndex(vocabulary);
  }

  /**
   * Rebuilds the Permuterm Index from the vocabulary.
   * Appends '$' to each term and stores all cyclic rotations.
   * @param {string[]} vocabulary
   */
  buildPermutermIndex(vocabulary) {
    this.permutermIndex = [];
    for (const term of vocabulary) {
      const termWithSentinel = term + '$';
      const len = termWithSentinel.length;
      for (let i = 0; i < len; i++) {
        const rotation = termWithSentinel.slice(i) + termWithSentinel.slice(0, i);
        this.permutermIndex.push({
          rotation: rotation,
          originalTerm: term
        });
      }
    }
    this.permutermIndex.sort((a, b) => a.rotation.localeCompare(b.rotation));
  }

  /**
   * Updates the Permuterm index when vocabulary changes after document upload/delete.
   * @param {string[]} vocabulary
   */
  updateVocabulary(vocabulary) {
    this.buildPermutermIndex(vocabulary);
    console.log(`[WildcardProcessor] Permuterm Index updated with ${this.permutermIndex.length} rotations for ${vocabulary.length} terms.`);
  }

  /**
   * Converts a wildcard pattern into a regex and searches the Permuterm Index.
   * Supports '*' (zero or more characters) and '?' (exactly one character).
   * @param {string} wildcardQuery
   * @returns {{ query: string, expandedTerms: string[], totalHits: number, matchingDocs: Array }}
   */
  processWildcardQuery(wildcardQuery) {
    const cleanPattern = wildcardQuery.toLowerCase().trim();
    if (!cleanPattern) {
      return { query: wildcardQuery, expandedTerms: [], totalHits: 0, matchingDocs: [] };
    }

    const matchedTermsSet = new Set();

    // Strategy 1: Classical Permuterm Rotation Search for single '*' patterns
    if (cleanPattern.includes('*') && !cleanPattern.includes('?')) {
      const starCount = (cleanPattern.match(/\*/g) || []).length;
      if (starCount === 1) {
        let rotationPrefix = '';
        const starIdx = cleanPattern.indexOf('*');
        const prefix = cleanPattern.slice(0, starIdx);
        const suffix = cleanPattern.slice(starIdx + 1);

        if (prefix && !suffix) {
          // X* -> $X*
          rotationPrefix = '$' + prefix;
        } else if (!prefix && suffix) {
          // *X -> X$*
          rotationPrefix = suffix + '$';
        } else if (prefix && suffix) {
          // X*Y -> Y$X*
          rotationPrefix = suffix + '$' + prefix;
        }

        for (const item of this.permutermIndex) {
          if (item.rotation.startsWith(rotationPrefix)) {
            matchedTermsSet.add(item.originalTerm);
          }
        }
      }
    }

    // Strategy 2: General Regex Matching for complex patterns (e.g. c*mput*, te?t, multiple *)
    if (matchedTermsSet.size === 0 || cleanPattern.includes('?') || (cleanPattern.match(/\*/g) || []).length > 1) {
      let regexStr = '^';
      for (let i = 0; i < cleanPattern.length; i++) {
        const char = cleanPattern[i];
        if (char === '*') regexStr += '.*';
        else if (char === '?') regexStr += '.';
        else if (/[\\^$+.[\]{}()|]/.test(char)) regexStr += '\\' + char;
        else regexStr += char;
      }
      regexStr += '$';

      const regex = new RegExp(regexStr);
      for (const term of this.indexer.getVocabulary()) {
        if (regex.test(term)) {
          matchedTermsSet.add(term);
        }
      }
    }

    const expandedTerms = Array.from(matchedTermsSet).sort();
    const docOccurrences = {};

    for (const term of expandedTerms) {
      const postings = this.indexer.getPostings(term);
      if (!postings) continue;

      for (const [docId, positions] of Object.entries(postings)) {
        if (!docOccurrences[docId]) {
          const docObj = this.indexer.getDocument(docId);
          docOccurrences[docId] = {
            docId: docId,
            filename: docObj ? docObj.filename : docId,
            title: docObj ? docObj.title : docId,
            content: docObj ? docObj.content : '',
            matchedTerms: [],
            totalOccurrences: 0,
            positions: []
          };
        }
        docOccurrences[docId].matchedTerms.push(term);
        docOccurrences[docId].totalOccurrences += positions.length;
        docOccurrences[docId].positions.push(...positions);
      }
    }

    const matchingDocs = Object.values(docOccurrences).sort(
      (a, b) => b.totalOccurrences - a.totalOccurrences
    );

    return {
      query: wildcardQuery,
      expandedTerms: expandedTerms,
      totalHits: matchingDocs.length,
      matchingDocs: matchingDocs
    };
  }
}

module.exports = WildcardProcessor;
