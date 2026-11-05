# Complete Information Retrieval (IR) System — SaaS Edition

A production-grade, college-level Information Retrieval (IR) platform built using **Node.js, Express.js, HTML5, CSS3, and JavaScript**, featuring a sleek **Linear / Raycast / Notion-inspired SaaS interface**.

This system implements a custom **Positional Inverted Index**, a **Permuterm Wildcard Index** supporting `*` and `?`, a **Boolean Query Processor** (with `AND`, `OR`, `NOT`, and parenthesized expressions respecting operator precedence), and a **Vector Space Model (TF-IDF with Cosine Similarity)** for ranked retrieval. It includes an automated **PDF Ingestion Engine** that extracts text from custom uploaded PDFs up to **100 GB**, validates signatures, and incrementally updates the inverted index in real-time without server restarts.

---

## 1. Project Architecture

```text
ir_system_nodejs/
├── package.json                   # Dependencies (express, multer, pdf-parse)
├── server.js                      # Express API server & routes (/api/search, /api/wildcard, /api/ranked, /api/upload, /api/documents, /api/postings)
├── test.js                        # CLI verification test suite
├── README.md                      # Documentation & Render deployment guide
│
├── documents/                     # Sample permanent corpus (.txt files)
│   ├── doc1_nlp.txt
│   ├── doc2_search_engines.txt
│   ├── doc3_information_retrieval.txt
│   ├── doc4_machine_learning.txt
│   └── doc5_wildcard_indexing.txt
│
├── uploads/                       # Dedicated directory for uploaded PDFs (up to 100 GB)
│
├── src/                           # Modular backend IR core
│   ├── documentLoader.js          # Loads sample documents and pre-existing PDFs
│   ├── tokenizer.js               # Regex-based word tokenization & position tracking
│   ├── normalizer.js              # Lowercasing, punctuation stripping & query normalization
│   ├── indexer.js                 # Custom positional inverted index (incremental add & delete)
│   ├── wildcardProcessor.js       # Permuterm index supporting *, ?, rotations & expansions
│   ├── queryProcessor.js          # Boolean Shunting-Yard parser & TF-IDF Cosine ranking
│   └── pdfProcessor.js            # PDF text extraction, signature check & scanned PDF detection
│
└── public/                        # Premium SaaS Frontend (Linear/Raycast Design)
    ├── index.html                 # 7 App Views (Overview, Search, Upload, Library, Explorer, History, Settings)
    ├── style.css                  # Dark mode default, midnight theme, glassmorphism, responsive drawer
    └── script.js                  # View router, async API bindings, index inspector, toast engine
```

---

## 2. Key Features

### Custom Positional Inverted Index
- Maps normalized vocabulary terms to document postings with exact token positions:
  ```json
  {
    "computer": {
      "doc1_nlp.txt": [2, 5],
      "doc3_information_retrieval.txt": [4]
    }
  }
  ```
- Supports **incremental indexing** (`addDocument`) and **real-time removal** (`removeDocument`) without re-indexing the whole corpus.

### Permuterm Wildcard Index
- Appends `$` sentinel symbol and indexes cyclic rotations for all vocabulary terms.
- Transforms:
  - Trailing wildcard `X*` $\to$ `$X*` (prefix lookup `$X`)
  - Leading wildcard `*X` $\to$ `X$*` (prefix lookup `X$`)
  - Internal wildcard `X*Y` $\to$ `Y$X*` (prefix lookup `Y$X`)
  - Single-character wildcard `te?t` $\to$ Regex validation `^te.t$` across candidate rotations.

### Boolean Retrieval Engine
- Full Shunting-Yard algorithm parsing infix queries to Postfix (Reverse Polish Notation).
- Operator precedence: `NOT` (3) > `AND` (2) > `OR` (1).
- Supports nested parentheses: `(computer OR science) AND retrieval`.
- Supports wildcards directly inside Boolean queries: `comput* AND science`.

### Ranked Retrieval (TF-IDF & Cosine Similarity)
- Computes Term Frequency ($\text{TF}$) and smooth Inverse Document Frequency ($\text{IDF} = \ln(1 + N/\text{DF})$).
- Normalizes vectors and calculates cosine angle between query and document vectors.
- Ranks documents by relevance score with percentage confidence.

### PDF Document Ingestion & Management
- Secure multi-file PDF upload with **Multer** (100 GB per file limit).
- Validates `%PDF-` file signature (magic bytes) to prevent malicious or spoofed files.
- Extracts text across multi-page PDFs using `pdf-parse`.
- Gracefully handles scanned / image-only PDFs (explaining that OCR is required).
- Uploaded PDFs are instantly searchable with Boolean, wildcard, and ranked queries.
- Interactive corpus management table allows deleting uploaded PDFs while protecting sample corpus documents.

---

## 3. How to Run Locally

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation & Startup
```bash
# 1. Navigate to project folder
cd "O:\Wsm  Project\ir_system_nodejs"

# 2. Install all dependencies (express, multer, pdf-parse)
npm install

# 3. (Optional) Run verification test suite
npm test

# 4. Start the server
npm start
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 4. How to Use the Information Retrieval Platform

1. Open the application at `http://localhost:3000`.
2. **Search Engine View**:
   - Select query mode: **Boolean Retrieval**, **Wildcard Search**, or **Ranked Retrieval (TF-IDF)**.
   - Enter your query (e.g. `computer AND science`, `comput*`, or `machine learning`).
   - Filter corpus scope: Entire Corpus, Sample Corpus Only, or Uploaded PDFs Only.
   - Click **Search** or press <kbd>Enter</kbd> (or hit <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to focus the search bar).
3. **Document Library & PDF Ingestion**:
   - Navigate to **"Document Library"** in the left sidebar.
   - Click **"Browse Files"** or drag & drop any PDF documents from your computer (supports multi-PDF upload up to **100 GB**).
   - Click **"Upload & Add to Inverted Index"**. The engine will extract the text, tokenize, and add postings to memory immediately without restarting the server.
   - View, filter, or delete uploaded documents in the indexed corpus table.
4. **Index Explorer**:
   - Navigate to **"Index Explorer"** to inspect the live inverted index.
   - Type any vocabulary word (or click a sample chip) to view its Document Frequency, exact posting list, and token offset array.
5. **Theme Switcher**:
   - Toggle between **Dark Mode** and **Light Mode** using the topbar switch or the Settings page. Preferenced is saved in localStorage.

---

## 5. Render.com Deployment & Persistent Storage Guide

### Standard Deployment on Render (Free Tier)
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Add PDF upload and incremental indexing"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ir-system-nodejs.git
   git push -u origin main
   ```
2. Log in to [Render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. Click **Deploy Web Service**.

### ⚠️ Render Storage Limitations & Persistent Disk Configuration
- **Free Tier Ephemeral Disk**:
  On Render's free tier, the local filesystem is **ephemeral**. Any uploaded PDFs stored in `uploads/` will be preserved while the instance is active, but if the web service restarts or redeploys, the `uploads/` directory will reset to empty (the pre-bundled sample corpus in `documents/` remains intact).
- **How to Configure a Render Persistent Disk (For Production)**:
  1. Upgrade the Render service to an **Individual/Starter** plan.
  2. Navigate to your Web Service in Render Dashboard $\to$ **Disks** $\to$ **Add Disk**.
  3. Set:
     - **Name**: `pdf-uploads-storage`
     - **Mount Path**: `/var/data/uploads` (or set an environment variable `UPLOADS_DIR=/var/data/uploads`)
     - **Size**: 1 GB – 10 GB
  4. In your Render environment variables, add:
     ```text
     UPLOADS_DIR=/var/data/uploads
     ```
  5. The application will store uploaded PDFs on the persistent disk, surviving all redeployments and restarts indefinitely!

---

## 6. REST API Reference

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/search` | `GET` | `?q=computer AND science` | Evaluates Boolean retrieval queries with operator precedence |
| `/api/wildcard` | `GET` | `?q=comput*` | Expands wildcard queries via Permuterm Index and retrieves matching docs |
| `/api/ranked` | `GET` | `?q=machine learning` | Ranks matching documents using TF-IDF and Cosine Similarity |
| `/api/upload` | `POST` | `multipart/form-data` (`pdfFiles`) | Securely uploads and incrementally indexes one or multiple PDF files |
| `/api/documents` | `GET` | None | Returns list of all active documents with metadata, token counts, and statuses |
| `/api/documents/:id` | `GET` | `id` (filename) | Returns full document details including text content |
| `/api/documents/:id` | `DELETE` | `id` (filename) | Deletes an uploaded PDF from disk and removes its entries from the index |
| `/api/status` | `GET` | None | Returns corpus statistics (total documents, vocabulary size) |
| `/api/postings` | `GET` | `?term=computer` | Returns inverted index postings list and token positions for the Index Explorer |
