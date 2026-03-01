/**
 * main.js
 * Application entry point
 * Bootstraps all systems and initializes the terminal
 */

// Core modules
import { eventBus } from './core/EventBus.js';
import { config } from './core/Config.js';
import { pluginManager } from './core/PluginManager.js';
import { Terminal, terminal } from './core/Terminal.js';

// Theme manager
import { themeManager } from './themes/ThemeManager.js';

// Effects
import { effectManager } from './effects/EffectManager.js';
import { ScanlineEffect } from './effects/ScanlineEffect.js';
import { CursorEffect } from './effects/CursorEffect.js';
import { GlowEffect } from './effects/GlowEffect.js';
import { TypingEffect } from './effects/TypingEffect.js';

// Section plugins
import { AboutSection } from './plugins/AboutSection.js';
import { SkillsSection } from './plugins/SkillsSection.js';
import { PublicationsSection } from './plugins/PublicationsSection.js';
import { ProjectsSection } from './plugins/ProjectsSection.js';
import { ExperienceSection } from './plugins/ExperienceSection.js';
import { ContactSection } from './plugins/ContactSection.js';

// Content adapters
import { markdownAdapter } from './adapters/MarkdownAdapter.js';
import { jsonAdapter } from './adapters/JSONAdapter.js';
import { htmlAdapter } from './adapters/HTMLAdapter.js';

/**
 * Application configuration
 */
const appConfig = {
  terminal: {
    typingSpeed: 30,
    bootDelay: 100,
    cursorChar: '█',
    promptSymbol: '❯',
    user: 'visitor',
    host: 'portfolio'
  },
  theme: {
    default: 'green-classic',
    persist: true
  },
  effects: {
    scanlines: true,
    glow: true,
    cursor: true,
    typing: true
  },
  content: {
    basePath: './content',
    cacheTTL: 300000
  },
  plugins: {
    autoInit: true
  },
  accessibility: {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    announceChanges: true
  }
};

/**
 * Register all effects
 */
function registerEffects() {
  effectManager.register('scanlines', ScanlineEffect);
  effectManager.register('cursor', CursorEffect);
  effectManager.register('glow', GlowEffect);
  effectManager.register('typing', TypingEffect);
}

/**
 * Register all section plugins
 */
function registerPlugins() {
  Terminal.registerPlugin(AboutSection);
  Terminal.registerPlugin(SkillsSection);
  Terminal.registerPlugin(PublicationsSection);
  Terminal.registerPlugin(ProjectsSection);
  Terminal.registerPlugin(ExperienceSection);
  Terminal.registerPlugin(ContactSection);
}

/**
 * Register content adapters
 */
function registerAdapters() {
  Terminal.registerAdapter('md', markdownAdapter);
  Terminal.registerAdapter('markdown', markdownAdapter);
  Terminal.registerAdapter('json', jsonAdapter);
  Terminal.registerAdapter('html', htmlAdapter);
  Terminal.registerAdapter('htm', htmlAdapter);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in form elements (safely check if target has matches method)
    if (e.target && typeof e.target.matches === 'function' && 
        e.target.matches('input, textarea, select')) {
      return;
    }
    
    // Theme toggle: T
    if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      eventBus.emit('theme:cycle');
    }
    
    // Effects toggle: E
    if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      eventBus.emit('effects:toggleAll');
    }
    
    // Section shortcuts: 1-9
    if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const sectionIndex = parseInt(e.key) - 1;
      eventBus.emit('section:activateByIndex', { index: sectionIndex });
    }
    
    // Collapse all: Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      eventBus.emit('sections:collapseAll');
    }
    
    // Help: ?
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      showHelp();
    }
  });
  
  // Listen for custom menu events from index.html buttons
  document.addEventListener('terminal:menu', (e) => {
    const action = e.detail?.action;
    if (action === 'theme') {
      eventBus.emit('theme:cycle');
    } else if (action === 'effects') {
      eventBus.emit('effects:toggleAll');
    } else if (action === 'help') {
      showHelp();
    }
  });
}

/**
 * Show keyboard shortcuts help
 */
function showHelp() {
  const helpText = `
╔═══════════════════════════════════════╗
║          KEYBOARD SHORTCUTS           ║
╠═══════════════════════════════════════╣
║  1-5    Open section by number        ║
║  T      Cycle theme                   ║
║  E      Toggle effects                ║
║  ESC    Collapse all sections         ║
║  ?      Show this help                ║
╚═══════════════════════════════════════╝
  `.trim();
  
  terminal.writeLine(helpText, 'help-output');
}

/**
 * Setup theme switcher UI
 */
function setupThemeSwitcher() {
  const switcher = document.querySelector('.theme-switcher');
  if (!switcher) return;
  
  const themes = themeManager.getAllThemes();
  
  themes.forEach(theme => {
    const btn = document.createElement('button');
    btn.className = `theme-btn theme-btn--${theme.id}`;
    btn.title = theme.name;
    btn.setAttribute('aria-label', `Switch to ${theme.name} theme`);
    
    btn.addEventListener('click', () => {
      themeManager.setTheme(theme.id);
      updateThemeSwitcherUI();
    });
    
    switcher.appendChild(btn);
  });
  
  // Update active state
  eventBus.on('theme:changed', updateThemeSwitcherUI);
  updateThemeSwitcherUI();
}

/**
 * Update theme switcher button states
 */
function updateThemeSwitcherUI() {
  const currentTheme = themeManager.currentTheme;
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const isActive = btn.classList.contains(`theme-btn--${currentTheme}`);
    btn.classList.toggle('active', isActive);
  });
}

/**
 * Initialize accessibility features
 */
function initAccessibility() {
  // Create live region for announcements
  const announcer = document.createElement('div');
  announcer.id = 'terminal-announcer';
  announcer.className = 'visually-hidden';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(announcer);
  
  // Listen for theme changes
  eventBus.on('theme:changed', ({ theme }) => {
    announce(`Theme changed to ${theme.name}`);
  });
  
  // Listen for section changes
  eventBus.on('section:expanded', ({ id }) => {
    const plugin = pluginManager.get(id);
    if (plugin) {
      announce(`${plugin.constructor.title} section expanded`);
    }
  });
  
  eventBus.on('section:collapsed', ({ id }) => {
    const plugin = pluginManager.get(id);
    if (plugin) {
      announce(`${plugin.constructor.title} section collapsed`);
    }
  });
}

/**
 * Announce message to screen readers
 */
function announce(message) {
  if (!config.get('accessibility.announceChanges', true)) return;
  
  const announcer = document.getElementById('terminal-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Handle errors gracefully
 */
function setupErrorHandling() {
  window.addEventListener('error', (e) => {
    console.error('Terminal Error:', e.error);
    eventBus.emit('error:global', { error: e.error, message: e.message });
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);
    eventBus.emit('error:promise', { reason: e.reason });
  });
  
  // Subscribe to error events
  eventBus.on('error:*', ({ error, message }) => {
    terminal.writeLine(`[ERROR] ${message || error?.message || 'Unknown error'}`, 'error-output text-error');
  });
}

/**
 * Main initialization
 */
async function init() {
  try {
    // Load configuration
    await config.load(appConfig);
    
    // Initialize theme manager first (for visual consistency)
    themeManager.init();
    
    // Register components
    registerEffects();
    registerAdapters();
    registerPlugins();
    
    // Initialize effect manager
    await effectManager.init();
    
    // Initialize terminal (starts boot sequence)
    await terminal.init();
    
    // Setup UI components
    setupThemeSwitcher();
    setupKeyboardShortcuts();
    
    // Setup accessibility
    initAccessibility();
    
    // Setup error handling
    setupErrorHandling();
    
    // Emit ready event
    eventBus.emit('app:ready', { timestamp: Date.now() });
    
    console.log('Terminal Landing Page initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize terminal:', error);
    
    // Show fallback error message
    const container = document.querySelector('.terminal-body');
    if (container) {
      container.innerHTML = `
        <div class="error-fallback">
          <p class="text-error">[FATAL ERROR] Failed to initialize terminal</p>
          <p class="text-dim">${error.message}</p>
          <p class="text-muted">Please check the console for more details.</p>
        </div>
      `;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for external access if needed
export { terminal, config, eventBus, themeManager, effectManager, pluginManager };
