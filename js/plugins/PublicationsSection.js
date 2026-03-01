/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/PublicationsSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Publications section with live data from Scopus or OpenAlex API
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class PublicationsSection extends SectionPlugin {
  static id = 'publications';
  static type = 'section';
  static command = 'fetch --publications --metrics';
  static title = 'Publications';
  static contentFile = 'content/publications.json';
  static order = 5;

  constructor(context) {
    super(context);
    this.publicationsData = null;
    this.isExpanded = false;
    this.initialDisplayCount = 5;
    this.isLoading = false;
    this.error = null;
    this.dataSource = null;
  }

  async init() {
    await super.init();
    
    let config = {};
    if (this.content && typeof this.content === 'string') {
      try {
        config = JSON.parse(this.content);
      } catch (e) {
        config = {};
      }
    } else if (this.content && typeof this.content === 'object') {
      config = this.content;
    }

    // Priority: Scopus > OpenAlex > Static data
    if (config.scopusApiKey && config.scopusAuthorId) {
      await this._fetchFromScopus(config);
    } else if (config.openAlexId || config.orcid) {
      await this._fetchFromOpenAlex(config);
    } else if (config.publications) {
      this.publicationsData = config;
      this.dataSource = 'Local';
      this._sortPublications();
    } else {
      this.publicationsData = this._getDefaultPublications();
    }
  }

  // ═══════════════════════════════════════════
  // SCOPUS API INTEGRATION
  // ═══════════════════════════════════════════

  async _fetchFromScopus(config) {
    this.isLoading = true;
    this.dataSource = 'Scopus';
    
    try {
      const apiKey = config.scopusApiKey;
      const authorId = config.scopusAuthorId;
      
      // Fetch author metrics with METRICS view to get h-index
      const authorUrl = `https://api.elsevier.com/content/author/author_id/${authorId}?view=METRICS`;
      
      const authorResponse = await fetch(authorUrl, {
        headers: {
          'Accept': 'application/json',
          'X-ELS-APIKey': apiKey
        }
      });

      if (!authorResponse.ok) {
        const errorText = await authorResponse.text();
        throw new Error(`Scopus API error: ${authorResponse.status} - ${errorText.substring(0, 100)}`);
      }

      const authorData = await authorResponse.json();

      // Fetch publications sorted by citation count
      const searchUrl = `https://api.elsevier.com/content/search/scopus?query=AU-ID(${authorId})&sort=-citedby-count&count=50`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'X-ELS-APIKey': apiKey
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`Scopus Search API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();

      // Transform Scopus data to our format
      this.publicationsData = this._transformScopusData(authorData, searchData, config);
      
    } catch (error) {
      console.error('[Publications] Failed to fetch from Scopus:', error);
      this.error = error.message;
      
      // Try OpenAlex as fallback
      if (config.openAlexId || config.orcid) {
        console.log('[Publications] Falling back to OpenAlex...');
        await this._fetchFromOpenAlex(config);
        return;
      }
      
      // Use static data if available
      if (config.publications) {
        this.publicationsData = config;
        this.dataSource = 'Local';
        this._sortPublications();
      } else {
        this.publicationsData = this._getDefaultPublications();
        this.publicationsData.error = error.message;
      }
    }
    
    this.isLoading = false;
  }

  _transformScopusData(authorData, searchData, config) {
    const authorProfile = authorData['author-retrieval-response']?.[0];
    const coredata = authorProfile?.coredata || {};
    
    // Extract h-index from multiple possible locations in Scopus response
    let hIndex = 0;
    
    // Try different paths where h-index might be located
    if (authorProfile?.['h-index']) {
      hIndex = parseInt(authorProfile['h-index']) || 0;
    } else if (coredata?.['h-index']) {
      hIndex = parseInt(coredata['h-index']) || 0;
    } else if (authorProfile?.['author-profile']?.['h-index']) {
      hIndex = parseInt(authorProfile['author-profile']['h-index']) || 0;
    } else if (authorProfile?.metrics?.['h-index']) {
      hIndex = parseInt(authorProfile.metrics['h-index']) || 0;
    }
    
    // Debug: log the structure to console if h-index is still 0
    if (hIndex === 0) {
      console.log('[Publications] Scopus author data structure:', JSON.stringify(authorProfile, null, 2).substring(0, 2000));
    }
    
    // Get preferred name
    const preferredName = authorProfile?.['author-profile']?.['preferred-name'] || {};
    const authorName = `${preferredName['given-name'] || ''} ${preferredName['surname'] || ''}`.trim();
    
    // Get affiliation
    const affiliation = authorProfile?.['author-profile']?.['affiliation-current']?.affiliation;
    const affiliationName = Array.isArray(affiliation) 
      ? affiliation[0]?.['ip-doc']?.['afdispname'] || ''
      : affiliation?.['ip-doc']?.['afdispname'] || '';
    
    // Get publications from search results
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
      openAccess: entry['openaccess'] === '1' || entry['openaccessFlag'] === true,
      type: entry['subtypeDescription'] || entry['prism:aggregationType'] || 'Article',
      scopusId: entry['dc:identifier']?.replace('SCOPUS_ID:', '') || null
    }));

    // Calculate i10-index from publications
    const i10Index = publications.filter(p => p.citations >= 10).length;

    return {
      scholarProfile: config.scholarProfile || null,
      orcidProfile: config.orcid ? `https://orcid.org/${config.orcid}` : null,
      scopusProfile: `https://www.scopus.com/authid/detail.uri?authorId=${config.scopusAuthorId}`,
      openAlexProfile: config.openAlexId ? `https://openalex.org/authors/${config.openAlexId}` : null,
      authorName: authorName,
      affiliation: affiliationName,
      metrics: {
        hIndex: parseInt(hIndex) || 0,
        i10Index: i10Index,
        totalCitations: parseInt(coredata['citation-count']) || 0,
        worksCount: parseInt(coredata['document-count']) || publications.length,
        lastUpdated: new Date().toISOString().split('T')[0],
        source: 'Scopus'
      },
      publications: publications
    };
  }

  // ═══════════════════════════════════════════
  // OPENALEX API INTEGRATION
  // ═══════════════════════════════════════════

  async _fetchFromOpenAlex(config) {
    this.isLoading = true;
    this.dataSource = 'OpenAlex';
    
    try {
      let authorUrl;
      if (config.openAlexId) {
        authorUrl = `https://api.openalex.org/authors/${config.openAlexId}`;
      } else if (config.orcid) {
        authorUrl = `https://api.openalex.org/authors/orcid:${config.orcid}`;
      }

      const authorResponse = await fetch(authorUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!authorResponse.ok) {
        throw new Error(`OpenAlex API error: ${authorResponse.status}`);
      }

      const authorData = await authorResponse.json();

      const worksUrl = `https://api.openalex.org/works?filter=author.id:${authorData.id}&sort=cited_by_count:desc&per_page=50`;
      
      const worksResponse = await fetch(worksUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!worksResponse.ok) {
        throw new Error(`OpenAlex Works API error: ${worksResponse.status}`);
      }

      const worksData = await worksResponse.json();
      this.publicationsData = this._transformOpenAlexData(authorData, worksData, config);
      
    } catch (error) {
      console.error('[Publications] Failed to fetch from OpenAlex:', error);
      this.error = error.message;
      
      if (config.publications) {
        this.publicationsData = config;
        this.dataSource = 'Local';
        this._sortPublications();
      } else {
        this.publicationsData = this._getDefaultPublications();
        this.publicationsData.error = error.message;
      }
    }
    
    this.isLoading = false;
  }

  _transformOpenAlexData(authorData, worksData, config) {
    const publications = worksData.results.map(work => ({
      title: work.title || 'Untitled',
      authors: work.authorships?.map(a => a.author?.display_name).filter(Boolean) || [],
      journal: work.primary_location?.source?.display_name || 
               work.host_venue?.display_name || 
               work.type || '',
      year: work.publication_year,
      volume: work.biblio?.volume || '',
      issue: work.biblio?.issue || '',
      pages: work.biblio?.first_page ? 
        (work.biblio.last_page ? 
          `${work.biblio.first_page}-${work.biblio.last_page}` : 
          work.biblio.first_page) : '',
      citations: work.cited_by_count || 0,
      url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : 
           work.primary_location?.landing_page_url || 
           work.id || '#',
      openAccess: work.open_access?.is_oa || false,
      type: work.type_crossref || work.type || 'article'
    }));

    return {
      scholarProfile: config.scholarProfile || null,
      orcidProfile: config.orcid ? `https://orcid.org/${config.orcid}` : null,
      openAlexProfile: authorData.id,
      authorName: authorData.display_name,
      affiliation: authorData.last_known_institutions?.[0]?.display_name || '',
      metrics: {
        hIndex: authorData.summary_stats?.h_index || 0,
        i10Index: authorData.summary_stats?.i10_index || 0,
        totalCitations: authorData.cited_by_count || 0,
        worksCount: authorData.works_count || 0,
        lastUpdated: new Date().toISOString().split('T')[0],
        source: 'OpenAlex'
      },
      publications: publications
    };
  }

  // ═══════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════

  _sortPublications() {
    if (this.publicationsData?.publications) {
      this.publicationsData.publications.sort((a, b) => 
        (b.citations || 0) - (a.citations || 0)
      );
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'publications-content';

    if (this.isLoading) {
      wrapper.innerHTML = `
        <div class="publications-loading">
          <span class="loading-spinner">◐</span>
          <span>Fetching publications from ${this.dataSource || 'API'}...</span>
        </div>
      `;
      body.appendChild(wrapper);
      return;
    }

    if (this.error && !this.publicationsData?.publications?.length) {
      wrapper.innerHTML = `
        <div class="publications-error">
          <span class="error-icon">⚠</span>
          <span>Failed to fetch live data: ${this.error}</span>
          <p class="error-hint">Check your API credentials in publications.json</p>
        </div>
      `;
      body.appendChild(wrapper);
      return;
    }

    const metrics = this._createMetricsPanel();
    wrapper.appendChild(metrics);

    const pubList = this._createPublicationsList();
    wrapper.appendChild(pubList);

    const links = this._createProfileLinks();
    wrapper.appendChild(links);

    body.appendChild(wrapper);
  }

  _createMetricsPanel() {
    const panel = document.createElement('div');
    panel.className = 'metrics-panel';

    const metrics = this.publicationsData?.metrics || {};
    const source = metrics.source || 'Local';
    
    const metricsData = [
      { 
        label: 'h-index', 
        value: metrics.hIndex ?? '—',
        icon: 'H',
        description: 'Hirsch index'
      },
      { 
        label: 'i10-index', 
        value: metrics.i10Index ?? '—',
        icon: 'i₁₀',
        description: 'Publications with 10+ citations'
      },
      { 
        label: 'Citations', 
        value: this._formatNumber(metrics.totalCitations) ?? '—',
        icon: '∑',
        description: 'Total citations'
      },
      { 
        label: 'Works', 
        value: metrics.worksCount ?? this.publicationsData?.publications?.length ?? '—',
        icon: '📄',
        description: 'Total publications'
      }
    ];

    panel.innerHTML = `
      <div class="metrics-header">
        <span class="metrics-title">Bibliometric Indicators</span>
        <span class="metrics-source" title="Data source">
          <span class="source-badge ${source.toLowerCase()}">${source}</span>
          <span class="metrics-updated">${metrics.lastUpdated || 'N/A'}</span>
        </span>
      </div>
      <div class="metrics-grid">
        ${metricsData.map(m => `
          <div class="metric-card" title="${m.description}">
            <span class="metric-icon">${m.icon}</span>
            <span class="metric-value">${m.value}</span>
            <span class="metric-label">${m.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    return panel;
  }

  _formatNumber(num) {
    if (num === undefined || num === null) return null;
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  _createPublicationsList() {
    const container = document.createElement('div');
    container.className = 'publications-list-container';

    const publications = this.publicationsData?.publications || [];
    
    if (publications.length === 0) {
      container.innerHTML = '<p class="no-content">No publications available.</p>';
      return container;
    }

    const header = document.createElement('div');
    header.className = 'publications-header';
    header.innerHTML = `
      <span class="pub-col-title">Publication</span>
      <span class="pub-col-year">Year</span>
      <span class="pub-col-citations">Cited</span>
    `;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'publications-list';
    list.id = 'publications-list';

    publications.forEach((pub, index) => {
      const item = this._createPublicationItem(pub, index);
      list.appendChild(item);
    });

    container.appendChild(list);

    if (publications.length > this.initialDisplayCount) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'publications-expand-btn';
      expandBtn.id = 'publications-expand-btn';
      expandBtn.innerHTML = `
        <span class="expand-icon">▼</span>
        <span class="expand-text">Show ${publications.length - this.initialDisplayCount} more publications</span>
      `;
      expandBtn.addEventListener('click', () => this._toggleExpand());
      container.appendChild(expandBtn);
    }

    return container;
  }

  _createPublicationItem(pub, index) {
    const item = document.createElement('article');
    item.className = 'publication-item';
    item.dataset.index = index;
    
    if (index >= this.initialDisplayCount) {
      item.classList.add('hidden');
    }

    let rankBadge = '';
    if (index === 0) rankBadge = '<span class="citation-rank rank-1">🥇</span>';
    else if (index === 1) rankBadge = '<span class="citation-rank rank-2">🥈</span>';
    else if (index === 2) rankBadge = '<span class="citation-rank rank-3">🥉</span>';

    const authors = this._formatAuthors(pub.authors);
    const journal = pub.journal || pub.venue || pub.source || '';
    const oaBadge = pub.openAccess ? '<span class="oa-badge" title="Open Access">OA</span>' : '';

    item.innerHTML = `
      <div class="pub-main">
        <div class="pub-title-row">
          ${rankBadge}
          <a href="${pub.url || '#'}" target="_blank" rel="noopener noreferrer" class="pub-title">
            ${pub.title}
          </a>
          ${oaBadge}
        </div>
        <div class="pub-authors">${authors}</div>
        <div class="pub-venue">
          <span class="venue-name">${journal}</span>
          ${pub.volume ? `<span class="venue-detail">Vol. ${pub.volume}</span>` : ''}
          ${pub.pages ? `<span class="venue-detail">pp. ${pub.pages}</span>` : ''}
        </div>
      </div>
      <div class="pub-year">${pub.year || '—'}</div>
      <div class="pub-citations">
        <span class="citation-count">${pub.citations || 0}</span>
      </div>
    `;

    return item;
  }

  _formatAuthors(authors) {
    if (!authors) return '';
    
    if (Array.isArray(authors)) {
      if (authors.length > 4) {
        return `${authors.slice(0, 3).join(', ')} <span class="et-al">et al.</span>`;
      }
      return authors.join(', ');
    }
    
    return authors;
  }

  _createProfileLinks() {
    const container = document.createElement('div');
    container.className = 'profile-links-container';

    const links = [];
    
    if (this.publicationsData?.scopusProfile) {
      links.push({
        url: this.publicationsData.scopusProfile,
        icon: '🔬',
        text: 'Scopus'
      });
    }
    
    if (this.publicationsData?.openAlexProfile) {
      links.push({
        url: this.publicationsData.openAlexProfile,
        icon: '📊',
        text: 'OpenAlex'
      });
    }
    
    if (this.publicationsData?.orcidProfile) {
      links.push({
        url: this.publicationsData.orcidProfile,
        icon: '🆔',
        text: 'ORCID'
      });
    }
    
    if (this.publicationsData?.scholarProfile) {
      links.push({
        url: this.publicationsData.scholarProfile,
        icon: '🎓',
        text: 'Google Scholar'
      });
    }

    if (links.length === 0) return container;

    container.innerHTML = `
      <div class="profile-links">
        ${links.map(link => `
          <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="profile-link">
            <span class="link-icon">${link.icon}</span>
            <span class="link-text">${link.text}</span>
            <span class="link-arrow">→</span>
          </a>
        `).join('')}
      </div>
    `;

    return container;
  }

  _toggleExpand() {
    this.isExpanded = !this.isExpanded;
    
    const list = this.container.querySelector('#publications-list');
    const btn = this.container.querySelector('#publications-expand-btn');
    
    if (!list || !btn) return;

    const hiddenItems = list.querySelectorAll('.publication-item.hidden');

    if (this.isExpanded) {
      hiddenItems.forEach((item, i) => {
        setTimeout(() => {
          item.classList.remove('hidden');
          item.classList.add('fade-in');
        }, i * 50);
      });
      
      btn.innerHTML = `
        <span class="expand-icon rotated">▼</span>
        <span class="expand-text">Show fewer publications</span>
      `;
    } else {
      const allItems = list.querySelectorAll('.publication-item');
      allItems.forEach((item, index) => {
        if (index >= this.initialDisplayCount) {
          item.classList.add('hidden');
          item.classList.remove('fade-in');
        }
      });
      
      const remaining = this.publicationsData.publications.length - this.initialDisplayCount;
      btn.innerHTML = `
        <span class="expand-icon">▼</span>
        <span class="expand-text">Show ${remaining} more publications</span>
      `;
    }
  }

  _getDefaultPublications() {
    return {
      metrics: {
        hIndex: 0,
        i10Index: 0,
        totalCitations: 0,
        worksCount: 0,
        lastUpdated: new Date().toISOString().split('T')[0],
        source: 'Local'
      },
      publications: []
    };
  }

  _getIcon() {
    return '📚';
  }
}

export default PublicationsSection;
export { PublicationsSection };
