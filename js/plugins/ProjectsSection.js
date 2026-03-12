/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/ProjectsSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Projects section displaying portfolio items with details
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class ProjectsSection extends SectionPlugin {
  static id = 'projects';
  static type = 'section';
  static command = 'ls -la ~/projects/';
  static title = 'Scientific Collaborations and Projects';
  static contentFile = 'content/projects.json';
  static order = 3;

  constructor(context) {
    super(context);
    this.projectsData = null;
    this.activeProject = null;
  }

  async init() {
    await super.init();
    if (this.content && typeof this.content === 'string') {
      try {
        this.projectsData = JSON.parse(this.content);
      } catch (e) {
        this.projectsData = this._getDefaultProjects();
      }
    } else if (this.content && typeof this.content === 'object') {
      this.projectsData = this.content;
    } else {
      this.projectsData = this._getDefaultProjects();
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'projects-content';

    // Projects list (file browser style)
    const fileList = this._createFileList();
    wrapper.appendChild(fileList);

    // Project details panel
    const details = document.createElement('div');
    details.className = 'project-details';
    details.id = 'project-details';
    details.innerHTML = '<p class="select-prompt">Select a project to view details...</p>';
    wrapper.appendChild(details);

    body.appendChild(wrapper);
  }

  _createFileList() {
    const container = document.createElement('div');
    container.className = 'file-list';
    container.setAttribute('role', 'listbox');
    container.setAttribute('aria-label', 'Project list');

    // Header row
    const header = document.createElement('div');
    header.className = 'file-list-header';
    header.innerHTML = `
      <span class="col-perms">Permissions</span>
      <span class="col-size">Size</span>
      <span class="col-date">Date</span>
      <span class="col-name">Name</span>
    `;
    container.appendChild(header);

    // Project entries
    this.projectsData.projects.forEach((project, index) => {
      const entry = this._createFileEntry(project, index);
      container.appendChild(entry);
    });

    return container;
  }

  _createFileEntry(project, index) {
    const entry = document.createElement('div');
    entry.className = 'file-entry';
    entry.setAttribute('role', 'option');
    entry.setAttribute('tabindex', '0');
    entry.setAttribute('aria-selected', 'false');
    entry.dataset.projectId = project.id;

    const typeIcon = project.type === 'dir' ? 'd' : '-';
    const perms = `${typeIcon}rwxr-xr-x`;
    const size = project.size || '4.0K';
    const date = project.date || 'Jan 15';

    entry.innerHTML = `
      <span class="col-perms">${perms}</span>
      <span class="col-size">${size}</span>
      <span class="col-date">${date}</span>
      <span class="col-name">
        <span class="file-icon" aria-hidden="true">${project.type === 'dir' ? '📁' : '📄'}</span>
        <span class="file-name ${project.type === 'dir' ? 'directory' : 'file'}">${project.name}/</span>
      </span>
    `;

    entry.addEventListener('click', () => this._selectProject(project, entry));
    entry.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._selectProject(project, entry);
      }
    });

    return entry;
  }

  _selectProject(project, element) {
    // Update selection state
    const entries = this.container.querySelectorAll('.file-entry');
    entries.forEach(e => {
      e.classList.remove('selected');
      e.setAttribute('aria-selected', 'false');
    });
    element.classList.add('selected');
    element.setAttribute('aria-selected', 'true');

    this.activeProject = project;

    // Update details panel
    const details = this.container.querySelector('#project-details');
    details.innerHTML = this._renderProjectDetails(project);

    this.emit('project:selected', { project });
  }

  _renderProjectDetails(project) {
    const techTags = project.technologies.map(t => 
      `<span class="tech-tag">${t}</span>`
    ).join('');

    const links = [];
    if (project.github) {
      links.push(`<a href="${project.github}" target="_blank" rel="noopener" class="project-link">
        <span class="link-icon">◈</span> GitHub
      </a>`);
    }
    if (project.demo) {
      links.push(`<a href="${project.demo}" target="_blank" rel="noopener" class="project-link">
        <span class="link-icon">◉</span> Live Demo
      </a>`);
    }

    return `
      <div class="detail-header">
        <h4 class="project-title">${project.title}</h4>
        <span class="project-status ${project.status}">${project.status}</span>
      </div>
      <p class="project-description">${project.description}</p>
      <div class="project-tech">
        <span class="label">Technologies:</span>
        <div class="tech-tags">${techTags}</div>
      </div>
      ${project.highlights ? `
        <div class="project-highlights">
          <span class="label">Highlights:</span>
          <ul class="highlights-list">
            ${project.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div class="project-links">${links.join('')}</div>
    `;
  }

  _getDefaultProjects() {
    return {
      projects: [
        {
          id: 'quantum-dashboard',
          name: 'quantum-dashboard',
          title: 'Quantum Analytics Dashboard',
          type: 'dir',
          size: '24.5M',
          date: 'Feb 01',
          status: 'active',
          description: 'Real-time analytics dashboard with WebSocket streaming, interactive charts, and customizable widgets. Handles millions of data points with smooth 60fps rendering.',
          technologies: ['React', 'D3.js', 'WebSocket', 'Redis', 'PostgreSQL'],
          highlights: [
            'Processes 100k+ events/second',
            'Custom virtualized data grid',
            'Dark/light theme support'
          ],
          github: 'https://github.com',
          demo: 'https://demo.example.com'
        },
        {
          id: 'neural-cli',
          name: 'neural-cli',
          title: 'Neural CLI Framework',
          type: 'dir',
          size: '8.2M',
          date: 'Jan 28',
          status: 'active',
          description: 'Extensible command-line framework with plugin architecture, intelligent auto-completion, and beautiful terminal UI components.',
          technologies: ['Node.js', 'TypeScript', 'Ink', 'Commander'],
          highlights: [
            'Plugin-based architecture',
            'Fuzzy command matching',
            'Cross-platform support'
          ],
          github: 'https://github.com'
        },
        {
          id: 'pixel-forge',
          name: 'pixel-forge',
          title: 'PixelForge Engine',
          type: 'dir',
          size: '156M',
          date: 'Jan 15',
          status: 'completed',
          description: '2D game engine with ECS architecture, WebGL renderer, and visual editor. Optimized for retro-style games with modern performance.',
          technologies: ['TypeScript', 'WebGL', 'Web Workers', 'WASM'],
          highlights: [
            'Entity Component System',
            'Sprite batching renderer',
            'Integrated level editor'
          ],
          github: 'https://github.com',
          demo: 'https://demo.example.com'
        },
        {
          id: 'sync-wave',
          name: 'sync-wave',
          title: 'SyncWave Collaboration',
          type: 'dir',
          size: '42M',
          date: 'Dec 20',
          status: 'completed',
          description: 'Real-time collaborative document editor with CRDT-based synchronization, supporting rich text, images, and embeds.',
          technologies: ['Vue.js', 'Yjs', 'ProseMirror', 'Hocuspocus'],
          highlights: [
            'Conflict-free sync',
            'Offline-first design',
            'Version history'
          ],
          github: 'https://github.com'
        }
      ]
    };
  }

  _getIcon() {
    return '◇';
  }
}

export default ProjectsSection;
export { ProjectsSection };
