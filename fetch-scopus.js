#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 * SCOPUS DATA FETCHER
 * ══════════════════════════════════════════════════════════════════
 * 
 * This script fetches your publications and metrics from Scopus API
 * and saves them to content/publications.json for use on GitHub Pages.
 * 
 * Scopus API does NOT support browser requests (CORS blocked),
 * so we need to fetch data server-side and commit the results.
 * 
 * USAGE:
 *   1. Install Node.js if you don't have it
 *   2. Create a .env file with your credentials (see below)
 *   3. Run: node fetch-scopus.js
 *   4. Commit and push the updated content/publications.json
 * 
 * .env file format:
 *   SCOPUS_API_KEY=your_api_key_here
 *   SCOPUS_AUTHOR_ID=57191481522
 *   SCHOLAR_PROFILE=https://scholar.google.com/citations?user=YOUR_ID
 *   ORCID=0000-0002-1234-5678
 * 
 * ══════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

const CONFIG = {
  apiKey: process.env.SCOPUS_API_KEY,
  authorId: process.env.SCOPUS_AUTHOR_ID,
  scholarProfile: process.env.SCHOLAR_PROFILE || null,
  orcid: process.env.ORCID || null,
  outputPath: path.join(__dirname, 'content', 'publications.json')
};

async function fetchScopusData() {
  if (!CONFIG.apiKey || !CONFIG.authorId) {
    console.error('❌ Error: Missing SCOPUS_API_KEY or SCOPUS_AUTHOR_ID');
    console.log('\nPlease create a .env file with:');
    console.log('  SCOPUS_API_KEY=your_api_key');
    console.log('  SCOPUS_AUTHOR_ID=your_author_id');
    process.exit(1);
  }

  console.log('🔬 Fetching data from Scopus API...\n');

  try {
    // Fetch author metrics
    console.log('📊 Fetching author metrics...');
    const authorUrl = `https://api.elsevier.com/content/author/author_id/${CONFIG.authorId}?view=METRICS`;
    
    const authorResponse = await fetch(authorUrl, {
      headers: {
        'Accept': 'application/json',
        'X-ELS-APIKey': CONFIG.apiKey
      }
    });

    if (!authorResponse.ok) {
      const errorText = await authorResponse.text();
      throw new Error(`Author API error ${authorResponse.status}: ${errorText}`);
    }

    const authorData = await authorResponse.json();
    console.log('   ✓ Author metrics received');

    // Fetch publications
    console.log('📚 Fetching publications...');
    const searchUrl = `https://api.elsevier.com/content/search/scopus?query=AU-ID(${CONFIG.authorId})&sort=-citedby-count&count=100`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'X-ELS-APIKey': CONFIG.apiKey
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`Search API error ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log('   ✓ Publications received');

    // Transform data
    console.log('🔄 Processing data...');
    const result = transformScopusData(authorData, searchData);
    
    // Save to file
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(result, null, 2));
    
    console.log('\n════════════════════════════════════════════');
    console.log('✅ SUCCESS! Data saved to content/publications.json');
    console.log('════════════════════════════════════════════');
    console.log(`\n📈 Metrics Summary:`);
    console.log(`   • h-index: ${result.metrics.hIndex}`);
    console.log(`   • i10-index: ${result.metrics.i10Index}`);
    console.log(`   • Total citations: ${result.metrics.totalCitations}`);
    console.log(`   • Publications: ${result.metrics.worksCount}`);
    console.log(`\n📅 Last updated: ${result.metrics.lastUpdated}`);
    console.log('\n👉 Now commit and push the changes to GitHub!');
    console.log('   git add content/publications.json');
    console.log('   git commit -m "Update publications data"');
    console.log('   git push');

  } catch (error) {
    console.error('\n❌ Error fetching Scopus data:', error.message);
    process.exit(1);
  }
}

function transformScopusData(authorData, searchData) {
  const authorProfile = authorData['author-retrieval-response']?.[0];
  const coredata = authorProfile?.coredata || {};
  
  // Extract h-index
  let hIndex = 0;
  if (authorProfile?.['h-index']) {
    hIndex = parseInt(authorProfile['h-index']) || 0;
  } else if (coredata?.['h-index']) {
    hIndex = parseInt(coredata['h-index']) || 0;
  }
  
  // Get author name
  const preferredName = authorProfile?.['author-profile']?.['preferred-name'] || {};
  const authorName = `${preferredName['given-name'] || ''} ${preferredName['surname'] || ''}`.trim();
  
  // Get affiliation
  const affiliation = authorProfile?.['author-profile']?.['affiliation-current']?.affiliation;
  const affiliationName = Array.isArray(affiliation) 
    ? affiliation[0]?.['ip-doc']?.['afdispname'] || ''
    : affiliation?.['ip-doc']?.['afdispname'] || '';
  
  // Process publications
  const entries = searchData['search-results']?.entry || [];
  
  const publications = entries.map(entry => ({
    title: entry['dc:title'] || 'Untitled',
    authors: entry['dc:creator'] || '',
    journal: entry['prism:publicationName'] || '',
    year: entry['prism:coverDate']?.substring(0, 4) || '',
    volume: entry['prism:volume'] || '',
    issue: entry['prism:issueIdentifier'] || '',
    pages: entry['prism:pageRange'] || '',
    citations: parseInt(entry['citedby-count']) || 0,
    url: entry['prism:doi'] ? `https://doi.org/${entry['prism:doi']}` : 
         entry.link?.find(l => l['@ref'] === 'scopus')?.['@href'] || '#',
    openAccess: entry['openaccess'] === '1',
    type: entry['subtypeDescription'] || 'Article'
  }));

  // Calculate i10-index
  const i10Index = publications.filter(p => p.citations >= 10).length;

  return {
    // Profile links (no sensitive data)
    scholarProfile: CONFIG.scholarProfile,
    orcidProfile: CONFIG.orcid ? `https://orcid.org/${CONFIG.orcid}` : null,
    scopusProfile: `https://www.scopus.com/authid/detail.uri?authorId=${CONFIG.authorId}`,
    
    authorName: authorName,
    affiliation: affiliationName,
    
    metrics: {
      hIndex: hIndex,
      i10Index: i10Index,
      totalCitations: parseInt(coredata['citation-count']) || 0,
      worksCount: parseInt(coredata['document-count']) || publications.length,
      lastUpdated: new Date().toISOString().split('T')[0],
      source: 'Scopus'
    },
    
    publications: publications
  };
}

// Run the script
fetchScopusData();
