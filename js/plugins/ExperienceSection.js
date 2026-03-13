/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/ExperienceSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Experience section displaying work history in timeline format
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class ExperienceSection extends SectionPlugin {
  static id = 'experience';
  static type = 'section';
  static command = 'cat ~/.career/history.log';
  static title = 'Experience';
  static contentFile = 'content/experience.json';
  static order = 4;

  constructor(context) {
    super(context);
    this.experienceData = null;
  }

  async init() {
    await super.init();
    if (this.content && typeof this.content === 'string') {
      try {
        this.experienceData = JSON.parse(this.content);
      } catch (e) {
        this.experienceData = this._getDefaultExperience();
      }
    } else if (this.content && typeof this.content === 'object') {
      this.experienceData = this.content;
    } else {
      this.experienceData = this._getDefaultExperience();
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'experience-content';

    // Timeline container
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    timeline.setAttribute('role', 'list');
    timeline.setAttribute('aria-label', 'Work experience timeline');

    // Get positions from experienceData - support both "positions" and "experience" keys
    const positions = this.experienceData?.positions || this.experienceData?.experience || [];
    
    if (!positions || positions.length === 0) {
      wrapper.innerHTML = '<p class="no-content">No experience data available.</p>';
      body.appendChild(wrapper);
      return;
    }

    positions.forEach((position, index) => {
      const entry = this._createTimelineEntry(position, index);
      timeline.appendChild(entry);
    });

    wrapper.appendChild(timeline);
    body.appendChild(wrapper);
  }

  _createTimelineEntry(position, index) {
    const entry = document.createElement('article');
    entry.className = `timeline-entry ${position.current ? 'current' : ''}`;
    entry.setAttribute('role', 'listitem');

    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.innerHTML = position.current ? '◉' : '○';

    const content = document.createElement('div');
    content.className = 'timeline-content';

    const header = document.createElement('header');
    header.className = 'entry-header';
    header.innerHTML = `
      <div class="entry-title-row">
        <h4 class="position-title">${position.title}</h4>
        ${position.current ? '<span class="current-badge">CURRENT</span>' : ''}
      </div>
      <div class="company-row">
        <span class="company-name">${position.company}</span>
        <span class="separator">•</span>
        <span class="location">${position.location}</span>
      </div>
      <div class="date-range">
        <span class="date-icon" aria-hidden="true">◈</span>
        <time>${position.startDate}</time>
        <span class="date-separator">→</span>
        <time>${position.endDate || 'Present'}</time>
      </div>
    `;

    const description = document.createElement('div');
    description.className = 'entry-description';
    description.innerHTML = `<p>${position.description}</p>`;

    content.appendChild(header);
    content.appendChild(description);

    // Only show achievements if array exists and is not empty
    if (position.achievements && position.achievements.length > 0) {
      const achievements = document.createElement('div');
      achievements.className = 'entry-achievements';
      achievements.innerHTML = `
        <span class="achievements-label">Key Achievements:</span>
        <ul class="achievements-list">
          ${position.achievements.map(a => `
            <li>
              <span class="bullet" aria-hidden="true">▸</span>
              <span class="achievement-text">${a}</span>
            </li>
          `).join('')}
        </ul>
      `;
      content.appendChild(achievements);
    }

    // Only show tech stack if array exists and is not empty
    if (position.technologies && position.technologies.length > 0) {
      const techStack = document.createElement('div');
      techStack.className = 'entry-tech';
      techStack.innerHTML = `
        <span class="tech-label">Stack:</span>
        <div class="tech-list">
          ${position.technologies.map(t => `<span class="tech-item">${t}</span>`).join('')}
        </div>
      `;
      content.appendChild(techStack);
    }

    entry.appendChild(marker);
    entry.appendChild(content);

    return entry;
  }

  _calculateDuration(startDate, endDate) {
    const start = this._parseDate(startDate);
    const end = endDate ? this._parseDate(endDate) : new Date();
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return `${remainingMonths} mo`;
    } else if (remainingMonths === 0) {
      return `${years} yr${years > 1 ? 's' : ''}`;
    }
    return `${years} yr${years > 1 ? 's' : ''} ${remainingMonths} mo`;
  }

  _parseDate(dateStr) {
    const [month, year] = dateStr.split(' ');
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                       .indexOf(month.substring(0, 3));
    return new Date(parseInt(year), monthIndex);
  }

  _getDefaultExperience() {
    return {
      positions: [
        {
          title: 'Senior Software Engineer',
          company: 'TechCorp Inc.',
          location: 'San Francisco, CA',
          startDate: 'Mar 2022',
          endDate: null,
          current: true,
          description: 'Leading development of core platform features and mentoring junior developers. Architecting scalable microservices and driving technical excellence.',
          achievements: [
            'Reduced API response time by 40% through caching optimization',
            'Led migration of monolith to microservices architecture',
            'Established code review guidelines adopted company-wide',
            'Mentored 5 junior developers to mid-level promotions'
          ],
          technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Kubernetes']
        },
        {
          title: 'Full Stack Developer',
          company: 'StartupXYZ',
          location: 'San Francisco, CA',
          startDate: 'Jun 2019',
          endDate: 'Feb 2022',
          current: false,
          description: 'Built and maintained customer-facing applications from concept to deployment. Collaborated with design and product teams to deliver features.',
          achievements: [
            'Developed real-time collaboration features used by 50k+ users',
            'Implemented CI/CD pipeline reducing deployment time by 60%',
            'Created component library used across 3 product teams'
          ],
          technologies: ['JavaScript', 'Vue.js', 'Python', 'Django', 'AWS']
        },
        {
          title: 'Junior Developer',
          company: 'WebAgency Co.',
          location: 'Los Angeles, CA',
          startDate: 'Aug 2017',
          endDate: 'May 2019',
          current: false,
          description: 'Developed responsive websites and web applications for diverse client portfolio. Gained strong foundation in modern web technologies.',
          achievements: [
            'Delivered 20+ client projects on time and within budget',
            'Introduced automated testing, improving code quality',
            'Received "Rising Star" award in first year'
          ],
          technologies: ['HTML/CSS', 'JavaScript', 'PHP', 'WordPress', 'MySQL']
        }
      ]
    };
  }

  _getIcon() {
    return '◉';
  }
}

export default ExperienceSection;
export { ExperienceSection };
