/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/ProjectsSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Scientific collaborations and projects, rendered as an
 *             `ls -la` listing grouped by directory, with inline,
 *             accessible accordions for each collaboration.
 * ══════════════════════════════════════════
 *
 * Content schema (content/projects.json):
 * {
 *   "intro": "optional one-line description",
 *   "groups": [{
 *     "id": "teaching", "dir": "teaching", "title": "Teaching & Training",
 *     "entries": [{
 *       "id": "unique-slug",                 // also shown as the directory name
 *       "partners": ["Prof. Name Surname"],  // person(s) or institution
 *       "units": [{ "name": "Lab / topic", "activities": ["...", "..."] }],
 *       "tags": ["UAV", "GIS"]               // optional
 *     }]
 *   }]
 * }
 */

import SectionPlugin from './SectionPlugin.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

class ProjectsSection extends SectionPlugin {
  static id = 'projects';
  static type = 'section';
  static command = 'ls -la ~/collaborations/';
  static title = 'Scientific Collaborations and Projects';
  static contentFile = 'content/projects.json';
  static order = 3;

  constructor(context) {
    super(context);
    this.data = { intro: '', groups: [] };
  }

  async init() {
    await super.init();
    let raw = this.content;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        console.warn('[projects] Invalid JSON in content/projects.json', e);
        raw = null;
      }
    }
    this.data = this._normalize(raw);
  }

  /** Keep only well-formed groups/entries so a typo in the JSON never breaks the page. */
  _normalize(raw) {
    const groups = Array.isArray(raw?.groups) ? raw.groups : [];
    return {
      intro: typeof raw?.intro === 'string' ? raw.intro : '',
      groups: groups
        .map((group) => ({
          id: group.id || group.dir || 'group',
          dir: group.dir || group.id || 'group',
          title: group.title || '',
          entries: (Array.isArray(group.entries) ? group.entries : [])
            .filter((entry) => entry && entry.id && Array.isArray(entry.units))
            .map((entry) => ({
              id: entry.id,
              partners: Array.isArray(entry.partners) ? entry.partners : [],
              units: entry.units.map((unit) => ({
                name: unit.name || '',
                activities: Array.isArray(unit.activities) ? unit.activities : []
              })),
              tags: Array.isArray(entry.tags) ? entry.tags : []
            }))
        }))
        .filter((group) => group.entries.length > 0)
    };
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'projects-content collab';

    const { groups, intro } = this.data;
    if (groups.length === 0) {
      wrapper.innerHTML = '<p class="collab-empty">ls: cannot access \'~/collaborations/\': No such file or directory</p>';
      body.appendChild(wrapper);
      return;
    }

    const entries = groups.flatMap((g) => g.entries);
    const units = entries.reduce((n, e) => n + e.units.length, 0);

    wrapper.innerHTML = `
      ${intro ? `<p class="collab-intro">${escapeHtml(intro)}</p>` : ''}
      <div class="collab-toolbar">
        <span class="collab-total">total ${entries.length} collaborations &middot; ${units} labs &amp; activities</span>
        <button type="button" class="collab-toggle-all" aria-pressed="false">[ expand all ]</button>
      </div>
      ${groups.map((group) => this._renderGroup(group)).join('')}
    `;

    body.appendChild(wrapper);
    this._bindEvents(wrapper);
  }

  _renderGroup(group) {
    const headingId = `collab-group-${escapeHtml(group.id)}`;
    return `
      <section class="collab-group" aria-labelledby="${headingId}">
        <h3 class="collab-group-title" id="${headingId}">
          <span class="collab-dir">${escapeHtml(group.dir)}/</span>
          ${group.title ? `<span class="collab-group-label">${escapeHtml(group.title)}</span>` : ''}
          <span class="collab-count">${group.entries.length}</span>
        </h3>
        <ul class="collab-list">
          ${group.entries.map((entry) => this._renderEntry(entry)).join('')}
        </ul>
      </section>
    `;
  }

  _renderEntry(entry) {
    const panelId = `collab-panel-${escapeHtml(entry.id)}`;
    // ls -la link count of a directory = 2 + its subdirectories (one per lab/activity)
    const links = 2 + entry.units.length;
    const partners = entry.partners.map(escapeHtml).join('<span class="collab-sep"> &middot; </span>');
    const unitNames = entry.units.map((u) => escapeHtml(u.name)).join(', ');

    return `
      <li class="collab-entry">
        <button type="button" class="collab-row" aria-expanded="false" aria-controls="${panelId}">
          <span class="collab-perms" aria-hidden="true">drwxr-xr-x</span>
          <span class="collab-links" aria-hidden="true">${links}</span>
          <span class="collab-main">
            <span class="collab-partners">${partners}</span>
            <span class="collab-units">${unitNames}</span>
          </span>
          <span class="collab-caret" aria-hidden="true">&#9656;</span>
        </button>
        <div class="collab-panel" id="${panelId}" hidden>
          ${entry.units.map((unit) => `
            <div class="collab-unit">
              <h4 class="collab-unit-name">${escapeHtml(unit.name)}</h4>
              <ul class="collab-activities">
                ${unit.activities.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
          ${entry.tags.length ? `
            <div class="collab-tags" aria-label="Topics">
              ${entry.tags.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </li>
    `;
  }

  _bindEvents(wrapper) {
    // Single delegated listener; <button> gives Enter/Space handling for free.
    wrapper.addEventListener('click', (event) => {
      const row = event.target.closest('.collab-row');
      if (row) {
        const open = row.getAttribute('aria-expanded') !== 'true';
        this._setOpen(row, open);
        this._syncToggleAll(wrapper);
        return;
      }

      const toggleAll = event.target.closest('.collab-toggle-all');
      if (toggleAll) {
        const open = toggleAll.getAttribute('aria-pressed') !== 'true';
        wrapper.querySelectorAll('.collab-row').forEach((r) => this._setOpen(r, open));
        this._syncToggleAll(wrapper);
      }
    });
  }

  _setOpen(row, open) {
    row.setAttribute('aria-expanded', String(open));
    row.closest('.collab-entry').classList.toggle('open', open);
    const panel = this.container.querySelector(`#${CSS.escape(row.getAttribute('aria-controls'))}`);
    if (panel) panel.hidden = !open;
    if (open) this.emit('project:selected', { id: row.getAttribute('aria-controls') });
  }

  _syncToggleAll(wrapper) {
    const btn = wrapper.querySelector('.collab-toggle-all');
    if (!btn) return;
    const rows = [...wrapper.querySelectorAll('.collab-row')];
    const allOpen = rows.length > 0 && rows.every((r) => r.getAttribute('aria-expanded') === 'true');
    btn.setAttribute('aria-pressed', String(allOpen));
    btn.textContent = allOpen ? '[ collapse all ]' : '[ expand all ]';
  }

  _getIcon() {
    return '◇';
  }
}

export default ProjectsSection;
export { ProjectsSection };
