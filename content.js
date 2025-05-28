// @ts-nocheck
// Enhanced Memory Button with Claude Web App Endpoint Integration
// Uses Claude's internal web endpoints (not official API) - same as content1.js

class MemoryButtonTest {
  constructor() {
    this.isInitialized = false;
    this.isExtracting = false;
    this.memories = new Map();
    
    // Claude web app endpoints (from content1.js)
    this.CLAUDE_BACKEND_BASE = 'https://claude.ai/api/organizations';
    this.CLAUDE_HOST = 'claude.ai';
    this.REQUIRED_COOKIES = ['sessionKey']; // Main auth cookie
    this.MAX_RETRIES = 3;
    this.INITIAL_DELAY = 1000;
    
    // Session data extracted from browser
    this.db = null;
    this.organizationId = null;
    this.sessionCookies = [];
    
    // Memory extraction patterns
    this.memoryPatterns = {
      PREFERENCE: [
        /I prefer ([^.!?]+)/gi,
        /I like ([^.!?]+)/gi,
        /I don't like ([^.!?]+)/gi,
        /My preference is ([^.!?]+)/gi,
        /I usually ([^.!?]+)/gi,
        /I typically ([^.!?]+)/gi,
        /I always ([^.!?]+)/gi,
        /I never ([^.!?]+)/gi
      ],
      PROFESSIONAL: [
        /I work as ([^.!?]+)/gi,
        /I'm a ([^.!?]*(?:developer|engineer|designer|manager|analyst|consultant|teacher|doctor|lawyer)[^.!?]*)/gi,
        /My job ([^.!?]+)/gi,
        /At work ([^.!?]+)/gi,
        /I'm working on ([^.!?]+)/gi,
        /My company ([^.!?]+)/gi,
        /I use ([^.!?]*(?:Python|JavaScript|React|Node|Java|C\+\+|SQL|AWS|Docker)[^.!?]*)/gi
      ],
      PERSONAL: [
        /I live in ([^.!?]+)/gi,
        /I'm from ([^.!?]+)/gi,
        /My name is ([^.!?]+)/gi,
        /I have ([^.!?]*(?:children|kids|family|pets?|dogs?|cats?)[^.!?]*)/gi,
        /I'm ([^.!?]*(?:married|single|studying|learning)[^.!?]*)/gi,
        /I was born ([^.!?]+)/gi,
        /I grew up ([^.!?]+)/gi
      ]
    }
  }

  setupMemoryItemListeners(panel) {
    // Set up delete button listeners (CSP-compliant)
    const deleteButtons = panel.querySelectorAll('.delete-memory-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const memoryId = button.getAttribute('data-memory-id');
        if (memoryId) {
          this.deleteMemory(memoryId);
        }
      });
    });

    
    this.addTestMemories();
  }

  addTestMemories() {
    const testMemories = [
      { id: '1', content: 'User prefers detailed explanations', category: 'PREFERENCE', source: 'test', confidence: 1.0, timestamp: Date.now() },
      { id: '2', content: 'User is a software developer', category: 'PROFESSIONAL', source: 'test', confidence: 1.0, timestamp: Date.now() },
      { id: '3', content: 'User lives in San Francisco', category: 'PERSONAL', source: 'test', confidence: 1.0, timestamp: Date.now() }
    ];
    
    testMemories.forEach(memory => {
      this.memories.set(memory.id, memory);
    });
  }

  async init() {
    if (this.isInitialized) return;
    console.log('🧠 Memory System: Initializing...');
    
    await this.initializeDatabase();
    await this.extractClaudeSessionData();
    this.waitForClaudeUI();
    this.isInitialized = true;
    
    console.log('✅ Memory System: Fully initialized');
  }

  // ============================================================================
  // CLAUDE SESSION DATA EXTRACTION (Like content1.js)
  // ============================================================================

  async extractClaudeSessionData() {
    try {
      console.log('🔍 Extracting Claude session data...');
      
      // Extract organization ID from current page URL
      this.organizationId = this.extractOrganizationIdFromPage();
      
      // Get session cookies from browser
      this.sessionCookies = await this.getClaudeSessionCookies();
      
      if (this.organizationId && this.sessionCookies.length > 0) {
        console.log('✅ Claude session data extracted successfully');
        console.log(`📍 Organization ID: ${this.organizationId}`);
        console.log(`🍪 Found ${this.sessionCookies.length} session cookies`);
        
        // Test the connection
        await this.testClaudeConnection();
      } else {
        console.warn('⚠️ Claude session data incomplete');
        console.log('📍 Org ID:', this.organizationId);
        console.log('🍪 Cookies:', this.sessionCookies.length);
      }
    } catch (error) {
      console.error('❌ Failed to extract Claude session data:', error);
    }
  }

  extractOrganizationIdFromPage() {
    // Extract from current page URL (same as content1.js approach)
    const currentUrl = window.location.href;
    const orgIdMatch = currentUrl.match(/organizations\/([a-f0-9-]{36})/);
    
    if (orgIdMatch && orgIdMatch[1]) {
      return orgIdMatch[1];
    }
    
    // Alternative: look for organization data in page scripts or elements
    try {
      // Check if there's organization data in any script tags
      const scriptTags = document.querySelectorAll('script');
      for (const script of scriptTags) {
        if (script.textContent && script.textContent.includes('organization')) {
          const orgMatch = script.textContent.match(/organization[^"]*"([a-f0-9-]{36})"/);
          if (orgMatch && orgMatch[1]) {
            return orgMatch[1];
          }
        }
      }
      
      // Check localStorage for stored organization ID
      const stored = localStorage.getItem('claude_org_id');
      if (stored && stored.match(/^[a-f0-9-]{36}$/)) {
        return stored;
      }
    } catch (e) {
      console.warn('Error checking for organization ID:', e);
    }
    
    console.warn('⚠️ Could not extract organization ID from page');
    return null;
  }

  async getClaudeSessionCookies() {
    // In a real browser extension, this would use chrome.cookies API
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: this.CLAUDE_HOST });
        console.log(`🍪 Retrieved ${cookies ? cookies.length : 0} cookies from browser`);
        return cookies || [];
      } catch (error) {
        console.error('❌ Failed to get cookies from Chrome API:', error);
        return [];
      }
    } else {
      // For testing in browser console (not extension context)
      console.log('🍪 Using document.cookie fallback (limited functionality)');
      return this.parseCookiesFromDocument();
    }
  }

  parseCookiesFromDocument() {
    // Fallback for testing - parse cookies from document.cookie
    const cookies = [];
    const cookieString = document.cookie;
    
    if (cookieString) {
      const cookiePairs = cookieString.split(';');
      for (const pair of cookiePairs) {
        const [name, value] = pair.trim().split('=');
        if (name && value) {
          cookies.push({ name, value });
        }
      }
    }
    
    return cookies;
  }

  async testClaudeConnection() {
    try {
      console.log('🔗 Testing connection to Claude backend...');
      const conversations = await this.makeClaudeRequest('chat_conversations');
      
      if (conversations && conversations.items) {
        console.log(`✅ Connection successful! Found ${conversations.items.length} conversations`);
        return true;
      } else {
        console.warn('⚠️ Connection successful but unexpected response format');
        return false;
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }

  // ============================================================================
  // CLAUDE WEB APP REQUESTS (Exact same pattern as content1.js)
  // ============================================================================

  async makeClaudeRequest(endpoint, method = 'GET', body = null) {
    if (!this.organizationId) {
      throw new Error('No organization ID found. Please visit Claude.ai first.');
    }
    
    if (!this.sessionCookies || !this.sessionCookies.length) {
      throw new Error('No session cookies found. Please visit Claude.ai first.');
    }
    
    // Check for required cookies (same validation as content1.js)
    const hasRequiredCookies = this.REQUIRED_COOKIES.every(cookieName => 
      this.sessionCookies.some(cookie => cookie && cookie.name === cookieName)
    );
    
    if (!hasRequiredCookies) {
      throw new Error(`Missing required cookies: ${this.REQUIRED_COOKIES.join(', ')}`);
    }
    
    // Build cookie string (same format as content1.js)
    const cookieString = this.sessionCookies
      .filter(cookie => cookie && cookie.name && cookie.value) // Filter out invalid cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    
    if (!cookieString) {
      throw new Error('No valid cookies available');
    }
    
    // Build request URL (same pattern as content1.js)
    const url = `${this.CLAUDE_BACKEND_BASE}/${this.organizationId}/${endpoint}`;
    
    console.log(`🌐 Making request to: ${endpoint}`);
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Extension-Request': '1', // Same header as content1.js
          'User-Agent': navigator.userAgent
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include' // Important for cookie handling
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Claude API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const jsonResponse = await response.json();
      return jsonResponse;
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - check your connection to Claude.ai');
      }
      throw error;
    }
  }

  // Exact same retry logic as content1.js
  async fetchWithRetry(endpoint, maxRetries = this.MAX_RETRIES, initialDelay = this.INITIAL_DELAY) {
    let delay = initialDelay;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeClaudeRequest(endpoint);
      } catch (error) {
        console.warn(`🔄 Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff (same as content1.js)
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  async getClaudeConversations() {
    return this.makeClaudeRequest('chat_conversations');
  }

  async getClaudeConversation(conversationId) {
    return this.makeClaudeRequest(`chat_conversations/${conversationId}`);
  }

  // ============================================================================
  // MEMORY EXTRACTION FROM CONVERSATIONS
  // ============================================================================

  async extractMemoriesFromConversations() {
    if (this.isExtracting) {
      console.log('⏳ Memory extraction already in progress...');
      return;
    }

    if (!this.organizationId || !this.sessionCookies || !this.sessionCookies.length) {
      console.error('❌ Cannot extract memories - Claude session not available');
      this.updateExtractionStatus('Error: Claude session not available');
      return;
    }

    this.isExtracting = true;
    console.log('🔍 Starting memory extraction from Claude conversations...');

    try {
      this.updateExtractionStatus('Fetching conversations...');
      
      const conversationsResponse = await this.getClaudeConversations();
      const conversations = (conversationsResponse && conversationsResponse.items) ? conversationsResponse.items : [];
      
      console.log(`📚 Found ${conversations.length} conversations to analyze`);
      
      if (conversations.length === 0) {
        this.updateExtractionStatus('No conversations found');
        return;
      }
      
      let extractedCount = 0;
      const batchSize = 3; // Smaller batches to be respectful to Claude's servers
      const maxConversations = Math.min(conversations.length, 15); // Limit to 15 conversations
      
      for (let i = 0; i < maxConversations; i += batchSize) {
        const batch = conversations.slice(i, i + batchSize);
        
        this.updateExtractionStatus(`Processing conversations ${i + 1}-${Math.min(i + batchSize, maxConversations)}...`);
        
        // Process batch with retry logic
        for (const conv of batch) {
          try {
            if (!conv || !conv.uuid) {
              console.warn('⚠️ Invalid conversation object:', conv);
              continue;
            }
            
            console.log(`🔍 Analyzing conversation: ${conv.name || 'Untitled'}`);
            
            const fullConversation = await this.fetchWithRetry(`chat_conversations/${conv.uuid}`);
            
            if (fullConversation && fullConversation.chat_messages && Array.isArray(fullConversation.chat_messages)) {
              const memories = this.extractMemoriesFromMessages(
                fullConversation.chat_messages, 
                conv.uuid, 
                conv.name || 'Untitled Conversation'
              );
              
              console.log(`💭 Extracted ${memories.length} memories from: ${conv.name}`);
              
              // Save memories
              for (const memory of memories) {
                await this.saveMemory(memory);
                extractedCount++;
              }
            } else {
              console.warn('⚠️ No chat messages found in conversation:', conv.uuid);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to process conversation ${conv.uuid}:`, error.message);
          }
        }
        
        // Respectful delay between batches
        if (i + batchSize < maxConversations) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`✅ Memory extraction complete! Found ${extractedCount} new memories`);
      this.updateExtractionStatus(`Complete! Extracted ${extractedCount} memories`);
      
      this.refreshMemoryPanel();
      
    } catch (error) {
      console.error('❌ Memory extraction failed:', error);
      this.updateExtractionStatus(`Failed: ${error.message}`);
    } finally {
      this.isExtracting = false;
      setTimeout(() => this.updateExtractionStatus(null), 3000);
    }
  }

  // Exact same message extraction logic as content1.js
  extractMessagesFromConversation(conversation) {
    const messages = [];
    const chatMessages = conversation.chat_messages || [];
    
    for (const message of chatMessages) {
      const sender = message.sender;
      const content = message.text;
      
      if ((sender === 'human' || sender === 'assistant') && content && content.length > 0) {
        messages.push({
          id: message.uuid,
          role: sender,
          content: this.cleanText(content)
        });
      }
    }
    
    return messages;
  }

  extractMemoriesFromMessages(chatMessages, conversationId, conversationTitle) {
    const memories = [];
    
    if (!chatMessages || !Array.isArray(chatMessages)) {
      console.warn('⚠️ Invalid chat messages array:', chatMessages);
      return memories;
    }
    
    for (const message of chatMessages) {
      // Only extract from human messages (user's own words)
      if (message && message.sender === 'human' && message.text && typeof message.text === 'string') {
        const extractedMemories = this.extractMemoriesFromText(
          message.text, 
          conversationId, 
          conversationTitle
        );
        if (extractedMemories && Array.isArray(extractedMemories)) {
          memories.push(...extractedMemories);
        }
      }
    }
    
    return memories;
  }

  extractMemoriesFromText(text, source, sourceTitle = '') {
    const memories = [];
    const cleanText = this.cleanText(text);
    
    // Extract memories for each category
    for (const [category, patterns] of Object.entries(this.memoryPatterns)) {
      for (const pattern of patterns) {
        const matches = [...cleanText.matchAll(pattern)];
        
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 3) {
            const memoryContent = this.formatMemoryContent(category, match[0], match[1]);
            const confidence = this.calculateConfidence(match[0], category);
            
            if (!this.isDuplicateMemory(memoryContent)) {
              memories.push({
                id: this.generateMemoryId(),
                content: memoryContent,
                category,
                source,
                sourceTitle,
                confidence,
                timestamp: Date.now(),
                rawMatch: match[0]
              });
            }
          }
        }
      }
    }
    
    return memories;
  }

  formatMemoryContent(category, fullMatch, extractedPart) {
    const cleaned = extractedPart.trim().replace(/\s+/g, ' ');
    
    switch (category) {
      case 'PREFERENCE':
        return `User ${fullMatch.toLowerCase().includes('don\'t') || fullMatch.toLowerCase().includes('never') ? 'dislikes' : 'prefers'} ${cleaned}`;
      case 'PROFESSIONAL':
        if (fullMatch.toLowerCase().includes('work as') || fullMatch.toLowerCase().includes('i\'m a')) {
          return `User works as ${cleaned}`;
        }
        return `Professional context: ${cleaned}`;
      case 'PERSONAL':
        if (fullMatch.toLowerCase().includes('live') || fullMatch.toLowerCase().includes('from')) {
          return `User location: ${cleaned}`;
        }
        return `Personal info: ${cleaned}`;
      default:
        return cleaned;
    }
  }

  calculateConfidence(match, category) {
    let confidence = 0.5;
    
    if (match.toLowerCase().includes('always') || match.toLowerCase().includes('never')) {
      confidence += 0.3;
    }
    if (match.toLowerCase().includes('prefer') || match.toLowerCase().includes('like')) {
      confidence += 0.2;
    }
    if (match.length > 20) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  isDuplicateMemory(content) {
    const normalizedContent = content.toLowerCase().trim();
    
    for (const [id, existingMemory] of this.memories) {
      const existingNormalized = existingMemory.content.toLowerCase().trim();
      if (this.calculateSimilarity(normalizedContent, existingNormalized) > 0.8) {
        return true;
      }
    }
    
    return false;
  }

  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  async initializeDatabase() {
    try {
      await this.setupDatabase();
      console.log('✅ Memory Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  async setupDatabase() {
    return new Promise((resolve, reject) => {
      const dbName = 'ClaudeMemoryDB';
      const dbVersion = 1;
      
      const request = indexedDB.open(dbName, dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
          memoryStore.createIndex('categoryIndex', 'category', { unique: false });
          memoryStore.createIndex('confidenceIndex', 'confidence', { unique: false });
          memoryStore.createIndex('timestampIndex', 'timestamp', { unique: false });
          memoryStore.createIndex('sourceIndex', 'source', { unique: false });
        }
      };
    });
  }

  async saveMemory(memory) {
    this.memories.set(memory.id, memory);
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');
        await new Promise((resolve, reject) => {
          const request = store.put(memory);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to save memory to database:', error);
      }
    }
  }

  async deleteMemory(memoryId) {
    console.log('🗑️ Deleting memory:', memoryId);
    
    this.memories.delete(memoryId);
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');
        await new Promise((resolve, reject) => {
          const request = store.delete(memoryId);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('Failed to delete memory from database:', error);
      }
    }
    
    this.refreshMemoryPanel();
  }

  async loadMemoriesFromDatabase() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.getAll();
      
      const memories = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      memories.forEach(memory => {
        this.memories.set(memory.id, memory);
      });
      
      console.log(`📚 Loaded ${memories.length} memories from database`);
    } catch (error) {
      console.warn('Failed to load memories from database:', error);
    }
  }

  // ============================================================================
  // UI COMPONENTS (Your existing UI code)
  // ============================================================================

  waitForClaudeUI() {
    const checkForUI = () => {
      const projectsButton = document.querySelector('a[aria-label="Projects"]');
      if (projectsButton) {
        console.log('✅ Claude UI loaded, injecting Memory button...');
        this.injectMemoryButton();
        this.injectMemoryStyles();
        this.loadMemoriesFromDatabase();
      } else {
        console.log('⏳ Waiting for Claude UI to load...');
        setTimeout(checkForUI, 1000);
      }
    };
    
    setTimeout(checkForUI, 2000);
  }

  injectMemoryButton() {
    const projectsLink = document.querySelector('a[aria-label="Projects"]');
    
    if (!projectsLink) {
      console.log('❌ Projects button not found, retrying...');
      setTimeout(() => this.injectMemoryButton(), 2000);
      return;
    }

    const projectsContainer = projectsLink.closest('.relative.group');
    if (!projectsContainer || !projectsContainer.parentElement) {
      console.log('❌ Projects container not found');
      return;
    }

    this.createMemoryButton(projectsContainer.parentElement, projectsContainer);
  }

  createMemoryButton(container, insertAfter) {
    const existing = document.getElementById('claude-memory-container');
    if (existing) existing.remove();

    const memoryContainer = document.createElement('div');
    memoryContainer.className = 'relative group-memory'; 
    memoryContainer.setAttribute('data-state', 'closed');
    memoryContainer.id = 'claude-memory-container';

    const memoryLink = document.createElement('a');
    memoryLink.id = 'claude-memory-button';
    memoryLink.href = '#';
    memoryLink.setAttribute('target', '_self');
    memoryLink.setAttribute('aria-label', 'Memory');
    
    memoryLink.className = `inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-300 border-transparent transition font-styrene duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-bg-400 aria-pressed:bg-bg-400 aria-checked:bg-bg-400 aria-expanded:bg-bg-300 hover:text-text-100 aria-pressed:text-text-100 aria-checked:text-text-100 aria-expanded:text-text-100 h-9 px-4 py-2 rounded-lg min-w-[5rem] active:scale-[0.985] whitespace-nowrap text-sm w-full hover:bg-bg-300 overflow-hidden !min-w-0 group-memory active:bg-bg-400 active:scale-[0.99] px-4`.replace(/\s+/g, ' ').trim();

    memoryLink.innerHTML = `
      <div class="-translate-x-2 w-full flex flex-row items-center justify-start gap-3">
        <div class="size-4 flex items-center justify-center group-memory-hover:!text-text-200 text-text-400">
          <svg width="18" height="18" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="shrink-0 group-memory">
            <path class="group-memory-hover:-translate-y-[0.5px] transition group-memory-active:translate-y-0" d="M184 0c30.9 0 56 25.1 56 56l0 400c0 30.9-25.1 56-56 56c-28.9 0-52.7-21.9-55.7-50.1c-5.2 1.4-10.7 2.1-16.3 2.1c-35.3 0-64-28.7-64-64c0-7.4 1.3-14.6 3.6-21.2C21.4 367.4 0 338.2 0 304c0-31.9 18.7-59.5 45.8-72.3C37.1 220.8 32 207 32 192c0-30.7 21.6-56.3 50.4-62.6C80.8 123.9 80 118 80 112c0-29.9 20.6-55.1 48.3-62.1C131.3 21.9 155.1 0 184 0zM328 0c28.9 0 52.6 21.9 55.7 49.9c27.8 7 48.3 32.1 48.3 62.1c0 6-.8 11.9-2.4 17.4c28.8 6.2 50.4 31.9 50.4 62.6c0 15-5.1 28.8-13.8 39.7C493.3 244.5 512 272.1 512 304c0 34.2-21.4 63.4-51.6 74.8c2.3 6.6 3.6 13.8 3.6 21.2c0 35.3-28.7 64-64 64c-5.6 0-11.1-.7-16.3-2.1c-3 28.2-26.8 50.1-55.7 50.1c-30.9 0-56-25.1-56-56l0-400c0-30.9 25.1-56 56-56z"/>
          </svg>
        </div>
        <span class="truncate group-memory-hover:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_78%,transparent_95%)] group-memory-focus-within:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_78%,transparent_95%)] text-sm whitespace-nowrap w-full [mask-size:100%_100%]">
          <div class="transition-all duration-200">Memory</div>
        </span>
      </div>
    `;

    memoryLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🧠 Memory button clicked!');
      this.toggleMemoryPanel();
    });

    memoryContainer.appendChild(memoryLink);
    container.insertBefore(memoryContainer, insertAfter.nextSibling);
    
    console.log('🎉 Memory button successfully created!');
  }

  injectMemoryStyles() {
    if (document.getElementById('claude-memory-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'claude-memory-styles';
    styles.textContent = `
      .group-memory:hover .group-memory-hover\\:!text-text-200 {
        color: rgb(var(--text-200)) !important;
      }
      
      .group-memory:hover .group-memory-hover\\:-translate-y-\\[0\\.5px\\] {
        transform: translateY(-0.5px);
      }
      
      .group-memory:active .group-memory-active\\:translate-y-0 {
        transform: translateY(0px);
      }
      
      .group-memory:hover .group-memory-hover\\:\\[mask-image\\:linear-gradient\\(to_right\\,hsl\\(var\\(--always-black\\)\\)_78\\%\\,transparent_95\\%\\)\\] {
        mask-image: linear-gradient(to_right, hsl(var(--always-black)) 78%, transparent 95%);
      }
      
      .group-memory:focus-within .group-memory-focus-within\\:\\[mask-image\\:linear-gradient\\(to_right\\,hsl\\(var(--always-black\\)\\)_78\\%\\,transparent_95\\%\\)\\] {
        mask-image: linear-gradient(to_right, hsl(var(--always-black)) 78%, transparent 95%);
      }
      
      #memory-extraction-status {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }
      
      /* Memory item hover effects */
      .memory-item {
        transition: background-color 0.2s ease !important;
      }
      
      .memory-item:hover {
        background-color: #f0f0f0 !important;
      }
      
      .delete-memory-btn {
        transition: background-color 0.2s ease !important;
      }
      
      .delete-memory-btn:hover {
        background-color: #dc2626 !important;
      }
    `;

    document.head.appendChild(styles);
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
    
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      top: 80px;
      width: 450px;
      max-height: 700px;
      background: white;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: inherit;
      overflow: hidden;
      color: #333;
    `;
    
    const memoriesArray = this.memories ? Array.from(this.memories.values())
      .sort((a, b) => b.timestamp - a.timestamp) : [];
    
    const sessionStatus = this.organizationId && this.sessionCookies && this.sessionCookies.length > 0 
      ? '✅ Claude session active' 
      : '❌ Claude session not found';
    
    panel.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #e5e5e5; background: #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px;">
          <span>🧠</span>
          <span>Memory Manager</span>
        </h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button 
            id="extract-memories-btn"
            style="background: ${this.organizationId ? '#3b82f6' : '#9ca3af'}; color: white; border: none; font-size: 12px; cursor: ${this.organizationId ? 'pointer' : 'not-allowed'}; padding: 6px 12px; border-radius: 6px; font-weight: 500; transition: background 0.2s ease;"
            ${this.isExtracting || !this.organizationId ? 'disabled' : ''}
            title="${!this.organizationId ? 'Claude session not available' : ''}"
          >
            ${this.isExtracting ? 'Extracting...' : 'Extract from Conversations'}
          </button>
          <button 
            id="close-memory-panel"
            style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 4px 8px; border-radius: 6px; transition: background 0.2s ease;"
          >×</button>
        </div>
      </div>
      
      <div style="padding: 16px; max-height: 600px; overflow-y: auto;">
        <div style="margin-bottom: 16px; padding: 12px; background: ${this.organizationId ? '#e8f5e8' : '#fff3cd'}; border: 1px solid ${this.organizationId ? '#c3e6c3' : '#ffeaa7'}; border-radius: 8px;">
          <div style="font-weight: 600; color: ${this.organizationId ? '#2d5a2d' : '#856404'}; margin-bottom: 4px;">
            ${memoriesArray.length} memories found
          </div>
          <div style="font-size: 14px; color: ${this.organizationId ? '#4a7c59' : '#856404'};">
            ${sessionStatus} | ${memoriesArray.filter(m => m && m.source !== 'test').length} extracted, ${memoriesArray.filter(m => m && m.source === 'test').length} test
          </div>
        </div>
        
        ${memoriesArray.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">🤔</div>
            <div style="font-size: 16px; margin-bottom: 8px;">No memories found</div>
            <div style="font-size: 14px;">${this.organizationId ? 'Click "Extract from Conversations" to analyze your chats' : 'Visit claude.ai first to enable extraction'}</div>
          </div>
        ` : `
          <div id="memories-container" style="display: flex; flex-direction: column; gap: 12px;">
            ${memoriesArray.map((memory, index) => `
              <div class="memory-item" data-memory-id="${memory.id}" data-index="${index}" style="padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; background: #f8f9fa; transition: background 0.2s ease;">
                <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 8px;">
                  <div style="display: flex; gap: 8px; align-items: center; flex: 1;">
                    <span style="font-size: 11px; font-weight: 500; color: #666; text-transform: uppercase; letter-spacing: 0.5px; background: #e5e5e5; padding: 2px 6px; border-radius: 4px;">
                      ${memory.category}
                    </span>
                    ${memory.confidence ? `
                      <span style="font-size: 10px; color: #888; background: #f0f0f0; padding: 2px 4px; border-radius: 3px;">
                        ${Math.round(memory.confidence * 100)}% confidence
                      </span>
                    ` : ''}
                    ${memory.source !== 'test' ? `
                      <span style="font-size: 10px; color: #22c55e; background: #dcfce7; padding: 2px 4px; border-radius: 3px;">
                        extracted
                      </span>
                    ` : ''}
                  </div>
                  <button 
                    class="delete-memory-btn"
                    data-memory-id="${memory.id}"
                    style="font-size: 12px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; transition: background 0.2s ease;"
                  >Delete</button>
                </div>
                <div style="font-size: 14px; color: #333; margin-bottom: 8px; line-height: 1.4;">
                  ${memory.content}
                </div>
                ${memory.sourceTitle ? `
                  <div style="font-size: 11px; color: #888;">
                    From: ${memory.sourceTitle}
                  </div>
                ` : ''}
                <div style="font-size: 10px; color: #aaa; margin-top: 4px;">
                  ${new Date(memory.timestamp).toLocaleDateString()} ${new Date(memory.timestamp).toLocaleTimeString()}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;11px; color: #888;">
                    From: ${memory.sourceTitle}
                  </div>
                ` : ''}
                <div style="font-size: 10px; color: #aaa; margin-top: 4px;">
                  ${new Date(memory.timestamp).toLocaleDateString()} ${new Date(memory.timestamp).toLocaleTimeString()}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    document.body.appendChild(panel);

    // Event listeners for panel controls
    const closeButton = document.getElementById('close-memory-panel');
    if (closeButton) {
      closeButton.addEventListener('click', () => panel.remove());
    }
    
    const extractButton = document.getElementById('extract-memories-btn');
    if (extractButton && !this.isExtracting && this.organizationId) {
      extractButton.addEventListener('click', () => this.extractMemoriesFromConversations());
    }
    
    // Event listeners for memory items (CSP-compliant)
    this.setupMemoryItemListeners(panel);
    
    // Close on outside click
    setTimeout(() => {
      const closeOnOutsideClick = (e) => {
        const memoryButton = document.getElementById('claude-memory-button');
        if (!panel.contains(e.target) && !memoryButton?.contains(e.target)) {
          panel.remove();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
  }
  }

  refreshMemoryPanel() {
    const panel = document.getElementById('claude-memory-panel');
    if (panel) {
      panel.remove();
      this.createMemoryPanel();
    }
  }

  updateExtractionStatus(message) {
    const existingStatus = document.getElementById('memory-extraction-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    if (!message) return;
    
    const status = document.createElement('div');
    status.id = 'memory-extraction-status';
    status.textContent = message;
    document.body.appendChild(status);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  cleanText(text) {
    return text
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/>\s+(.*?)(?=\n|$)/g, '$1')
      .replace(/^\s*(#{1,6})\s+(.*?)(?=\n|$)/gm, '$2')
      .replace(/(!?)\[.*?\]\(.*?\)/g, '')
      .replace(/^\s*([-*]|\d\.)\s+/gm, '')
      .replace(/^\|.*?\|/gm, '');
  }

  generateMemoryId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Legacy support
  deleteTestMemory(memoryId) {
    this.deleteMemory(memoryId);
  }
}

// Initialize the memory system
const memoryButtonTest = new MemoryButtonTest();
window.memoryButtonTest = memoryButtonTest;

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => memoryButtonTest.init());
} else {
  memoryButtonTest.init();
}

setTimeout(() => memoryButtonTest.init(), 3000);

console.log('🧠 Memory System with Claude Web App Integration: Script loaded');