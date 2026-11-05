class WildcardProcessor {
  constructor(vocabulary, indexer) {
    this.indexer = indexer;
    this.permutermIndex = [];
    this.buildPermutermIndex(vocabulary);
  }

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

  processWildcardQuery(wildcardQuery) {
    const cleanPattern = wildcardQuery.toLowerCase().trim();
    if (!cleanPattern) {
      return { query: wildcardQuery, expandedTerms: [], matchingDocs: [] };
    }

    const matchedTermsSet = new Set();

    if (cleanPattern.includes('*') && !cleanPattern.includes('?')) {
      const starCount = (cleanPattern.match(/\*/g) || []).length;
      if (starCount === 1) {
        let rotationPrefix = '';
        const starIdx = cleanPattern.indexOf('*');
        const prefix = cleanPattern.slice(0, starIdx);
        const suffix = cleanPattern.slice(starIdx + 1);

        if (prefix && !suffix) {
          rotationPrefix = '$' + prefix;
        } else if (!prefix && suffix) {
          rotationPrefix = suffix + '$';
        } else if (prefix && suffix) {
          rotationPrefix = suffix + '$' + prefix;
        }

        for (const item of this.permutermIndex) {
          if (item.rotation.startsWith(rotationPrefix)) {
            matchedTermsSet.add(item.originalTerm);
          }
        }
      }
    }

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