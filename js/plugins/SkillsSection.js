/**
 * ══════════════════════════════════════════
 * 📄 FILE: js/plugins/SkillsSection.js
 * 🔌 MODULE TYPE: plugin
 * 📝 PURPOSE: Skills section displaying technical abilities with visual bars
 * ══════════════════════════════════════════
 */

import SectionPlugin from './SectionPlugin.js';

class SkillsSection extends SectionPlugin {
  static id = 'skills';
  static type = 'section';
  static command = 'cat skills.json | jq';
  static title = 'Skills & Technologies';
  static contentFile = 'content/skills.json';
  static order = 2;

  constructor(context) {
    super(context);
    this.skillsData = null;
    this.animationPlayed = false;
  }

  async init() {
    await super.init();
    // Parse JSON content if loaded
    if (this.content && typeof this.content === 'string') {
      try {
        this.skillsData = JSON.parse(this.content);
      } catch (e) {
        this.skillsData = this._getDefaultSkills();
      }
    } else if (this.content && typeof this.content === 'object') {
      this.skillsData = this.content;
    } else {
      this.skillsData = this._getDefaultSkills();
    }
  }

  async renderContent(body) {
    const wrapper = document.createElement('div');
    wrapper.className = 'skills-content';

    // Render skill categories
    for (const category of this.skillsData.categories) {
      const categoryEl = this._createCategory(category);
      wrapper.appendChild(categoryEl);
    }

    body.appendChild(wrapper);
  }

  _createCategory(category) {
    const container = document.createElement('div');
    container.className = 'skill-category';

    const header = document.createElement('h3');
    header.className = 'category-title';
    header.innerHTML = `<span class="category-icon" aria-hidden="true">${category.icon || '◆'}</span>${category.name}`;
    container.appendChild(header);

    const skillsGrid = document.createElement('div');
    skillsGrid.className = 'skills-grid';

    for (const skill of category.skills) {
      const skillEl = this._createSkillBar(skill);
      skillsGrid.appendChild(skillEl);
    }

    container.appendChild(skillsGrid);
    return container;
  }

  _createSkillBar(skill) {
    const container = document.createElement('div');
    container.className = 'skill-item';
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuenow', skill.level);
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    container.setAttribute('aria-label', `${skill.name}: ${skill.level}%`);

    const labelRow = document.createElement('div');
    labelRow.className = 'skill-label-row';
    labelRow.innerHTML = `
      <span class="skill-name">${skill.name}</span>
      <span class="skill-level">${skill.level}%</span>
    `;

    const barContainer = document.createElement('div');
    barContainer.className = 'skill-bar-container';

    const bar = document.createElement('div');
    bar.className = 'skill-bar';
    bar.style.setProperty('--skill-level', '0%');
    bar.dataset.level = skill.level;

    // Add visual blocks for terminal aesthetic
    const blocks = Math.floor(skill.level / 5);
    bar.innerHTML = '█'.repeat(blocks) + '░'.repeat(20 - blocks);

    barContainer.appendChild(bar);
    container.appendChild(labelRow);
    container.appendChild(barContainer);

    return container;
  }

  _animateSkillBars() {
    if (this.animationPlayed) return;

    const bars = this.container.querySelectorAll('.skill-bar');
    bars.forEach((bar, index) => {
      setTimeout(() => {
        const level = parseInt(bar.dataset.level, 10);
        bar.style.setProperty('--skill-level', `${level}%`);
        bar.classList.add('animated');
      }, index * 100);
    });

    this.animationPlayed = true;
  }

  onExpand() {
    // Animate skill bars when section expands
    requestAnimationFrame(() => {
      this._animateSkillBars();
    });
    this.emit('section:expanded', { id: this.constructor.id });
  }

  _getDefaultSkills() {
    return {
      categories: [
        {
          name: 'Languages',
          icon: '⟨⟩',
          skills: [
            { name: 'JavaScript/TypeScript', level: 95 },
            { name: 'Python', level: 88 },
            { name: 'Rust', level: 72 },
            { name: 'Go', level: 78 }
          ]
        },
        {
          name: 'Frontend',
          icon: '◧',
          skills: [
            { name: 'React/Next.js', level: 92 },
            { name: 'Vue.js', level: 85 },
            { name: 'CSS/Tailwind', level: 90 },
            { name: 'WebGL/Three.js', level: 68 }
          ]
        },
        {
          name: 'Backend',
          icon: '⚙',
          skills: [
            { name: 'Node.js', level: 94 },
            { name: 'PostgreSQL', level: 86 },
            { name: 'GraphQL', level: 82 },
            { name: 'Redis', level: 75 }
          ]
        },
        {
          name: 'DevOps & Tools',
          icon: '⊞',
          skills: [
            { name: 'Docker/K8s', level: 80 },
            { name: 'AWS/GCP', level: 78 },
            { name: 'CI/CD', level: 85 },
            { name: 'Git', level: 95 }
          ]
        }
      ]
    };
  }

  _getIcon() {
    return '◆';
  }
}

export default SkillsSection;
export { SkillsSection };
