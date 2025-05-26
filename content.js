// Simple Memory Button Test for Claude UI
class MemoryButtonTest {
  constructor() {
    this.isInitialized = false;
    this.testMemories = [
      { id: '1', content: 'User prefers detailed explanations', category: 'PREFERENCE' },
      { id: '2', content: 'User is a software developer', category: 'PROFESSIONAL' },
      { id: '3', content: 'User lives in San Francisco', category: 'PERSONAL' }
    ];
  }

  init() {
    if (this.isInitialized) return;
    console.log('🧠 Memory Button Test: Initializing...');
    
    this.injectMemoryStyles();
    this.waitForClaudeUI();
    this.isInitialized = true;
  }

  waitForClaudeUI() {
    // Wait for Claude's UI to fully load
    const checkForUI = () => {
      const projectsButton = document.querySelector('a[aria-label="Projects"]');
      if (projectsButton) {
        console.log('✅ Claude UI loaded, injecting Memory button...');
        this.injectMemoryButton();
      } else {
        console.log('⏳ Waiting for Claude UI to load...');
        setTimeout(checkForUI, 1000);
      }
    };
    
    setTimeout(checkForUI, 2000);
  }

  injectMemoryButton() {
    console.log('🔍 Looking for Projects button...');
    
    // Find the Projects link in the sidebar
    const projectsLink = document.querySelector('a[aria-label="Projects"]');
    
    if (!projectsLink) {
      console.log('❌ Projects button not found, retrying...');
      setTimeout(() => this.injectMemoryButton(), 2000);
      return;
    }

    console.log('✅ Projects button found:', projectsLink);

    // Get the parent container (the sidebar group)
    const sidebarContainer = projectsLink.closest('.relative.group');
    if (!sidebarContainer || !sidebarContainer.parentElement) {
      console.log('❌ Sidebar container not found');
      return;
    }

    console.log('✅ Sidebar container found, creating Memory button...');

    // Insert Memory button after the Projects container
    this.createMemoryButton(sidebarContainer.parentElement, sidebarContainer);
  }

  createMemoryButton(container, insertAfter) {
    // Remove existing button if present
    const existing = document.getElementById('claude-memory-button');
    if (existing) {
      console.log('🔄 Removing existing Memory button...');
      existing.remove();
    }

    // Create the same structure as Projects button
    const memoryContainer = document.createElement('div');
    memoryContainer.className = 'relative group';
    memoryContainer.setAttribute('data-state', 'closed');
    memoryContainer.id = 'claude-memory-container';

    const memoryLink = document.createElement('a');
    memoryLink.id = 'claude-memory-button';
    memoryLink.href = '#';
    memoryLink.setAttribute('aria-label', 'Memory');
    
    // Copy the exact classes from Projects link
    memoryLink.className = `inline-flex
      items-center
      justify-center
      relative
      shrink-0
      can-focus
      select-none
      disabled:pointer-events-none
      disabled:opacity-50
      disabled:shadow-none
      disabled:drop-shadow-none text-text-300
      border-transparent
      transition
      font-styrene
      duration-300
      ease-[cubic-bezier(0.165,0.85,0.45,1)]
      hover:bg-bg-400
      aria-pressed:bg-bg-400
      aria-checked:bg-bg-400
      aria-expanded:bg-bg-300
      hover:text-text-100
      aria-pressed:text-text-100
      aria-checked:text-text-100
      aria-expanded:text-text-100 h-9 px-4 py-2 rounded-lg min-w-[5rem] active:scale-[0.99] px-4 w-full hover:bg-bg-300 overflow-hidden min-w-0 group active:bg-bg-400 active:scale-[0.99]`.replace(/\s+/g, ' ').trim();

    // Add the memory icon and text
    memoryLink.innerHTML = `
      <span class="whitespace-nowrap text-sm w-full">
        🧠 Memory
      </span>
    `;

    // Add click handler
    memoryLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🧠 Memory button clicked!');
      this.toggleMemoryPanel();
    });

    // Assemble the structure
    memoryContainer.appendChild(memoryLink);

    // Insert after Projects container
    container.insertBefore(memoryContainer, insertAfter.nextSibling);
    
    console.log('🎉 Memory button successfully created and inserted!');
  }

  toggleMemoryPanel() {
    const existingPanel = document.getElementById('claude-memory-panel');
    
    if (existingPanel) {
      console.log('🗑️ Closing Memory panel...');
      existingPanel.remove();
      return;
    }

    console.log('📋 Opening Memory panel...');
    this.createMemoryPanel();
  }

  createMemoryPanel() {
    const panel = document.createElement('div');
    panel.id = 'claude-memory-panel';
    
    panel.innerHTML = `
      <div class="memory-panel-header">
        <h3>🧠 Memory Manager</h3>
        <button id="close-memory-panel">×</button>
      </div>
      <div class="memory-panel-content">
        <div class="memory-stats">
          <strong>${this.testMemories.length}</strong> test memories loaded
          <br><small>This is a UI test - no real memories yet</small>
        </div>
        <div class="memory-list">
          ${this.testMemories.map(memory => `
            <div class="memory-item">
              <div class="memory-category">${memory.category}</div>
              <div class="memory-content">${memory.content}</div>
              <button onclick="window.memoryButtonTest.deleteTestMemory('${memory.id}')" class="delete-btn">Delete</button>
            </div>
          `).join('')}
        </div>
        <div style="text-align: center; padding: 15px; border-top: 1px solid rgb(var(--border-400)); margin-top: 15px; color: rgb(var(--text-300));">
          <small>✅ Memory Button UI Test Successful!</small>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('close-memory-panel').onclick = () => {
      console.log('❌ Closing panel via close button');
      panel.remove();
    };
    
    // Close panel when clicking outside
    setTimeout(() => {
      const closeOnOutsideClick = (e) => {
        if (!panel.contains(e.target) && !document.getElementById('claude-memory-button').contains(e.target)) {
          console.log('❌ Closing panel via outside click');
          panel.remove();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);

    console.log('✅ Memory panel created and displayed');
  }

  deleteTestMemory(memoryId) {
    console.log('🗑️ Deleting test memory:', memoryId);
    this.testMemories = this.testMemories.filter(m => m.id !== memoryId);
    
    // Refresh panel
    const panel = document.getElementById('claude-memory-panel');
    if (panel) {
      panel.remove();
      this.createMemoryPanel();
    }
  }

  injectMemoryStyles() {
    if (document.getElementById('claude-memory-styles')) return;

    console.log('🎨 Injecting Memory button styles...');

    const styles = document.createElement('style');
    styles.id = 'claude-memory-styles';
    styles.textContent = `
      /* Memory Panel Styles */
      #claude-memory-panel {
        position: fixed;
        right: 20px;
        top: 80px;
        width: 400px;
        max-height: 600px;
        background: rgb(var(--bg-300));
        border: 1px solid rgb(var(--border-400));
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: var(--font-family-default);
        overflow: hidden;
        color: rgb(var(--text-100));
      }

      .memory-panel-header {
        padding: 16px;
        border-bottom: 1px solid rgb(var(--border-400));
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgb(var(--bg-200));
      }

      .memory-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: rgb(var(--text-100));
      }

      #close-memory-panel {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: rgb(var(--text-300));
        padding: 4px 8px;
        border-radius: 6px;
        transition: background 0.2s ease;
      }

      #close-memory-panel:hover {
        background: rgb(var(--bg-400));
        color: rgb(var(--text-100));
      }

      .memory-panel-content {
        padding: 16px;
        max-height: 500px;
        overflow-y: auto;
      }

      .memory-stats {
        margin-bottom: 16px;
        padding: 12px;
        background: rgb(var(--bg-200));
        border-radius: 8px;
        font-size: 14px;
        color: rgb(var(--text-200));
        border: 1px solid rgb(var(--border-400));
      }

      .memory-item {
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid rgb(var(--border-400));
        border-radius: 8px;
        background: rgb(var(--bg-200));
        transition: background 0.2s ease;
      }

      .memory-item:hover {
        background: rgb(var(--bg-100));
      }

      .memory-category {
        font-size: 11px;
        color: rgb(var(--text-300));
        text-transform: uppercase;
        margin-bottom: 6px;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      .memory-content {
        font-size: 14px;
        color: rgb(var(--text-100));
        margin-bottom: 10px;
        line-height: 1.5;
      }

      .delete-btn {
        font-size: 12px;
        padding: 6px 12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s ease;
        font-weight: 500;
      }

      .delete-btn:hover {
        background: #dc2626;
      }

      /* Ensure Memory button integrates seamlessly */
      #claude-memory-button {
        text-decoration: none !important;
      }

      #claude-memory-container {
        margin: 2px 0;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize the test
const memoryButtonTest = new MemoryButtonTest();

// Make it globally accessible for delete buttons
window.memoryButtonTest = memoryButtonTest;

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => memoryButtonTest.init());
} else {
  memoryButtonTest.init();
}

// Also try to initialize after a delay (in case DOM is ready but Claude UI isn't)
setTimeout(() => memoryButtonTest.init(), 3000);

console.log('🧠 Memory Button Test: Script loaded');