/**
 * Server CLM Runner
 * Executes CLM logic via WebSocket connection to the backend server on port 5321.
 * Used when Execution Mode is set to 'server' or 'auto' (fallback).
 */
export class ServerCLMRunner {
  constructor(wsUrl = null) {
    this.wsUrl = wsUrl || this.detectWebSocketUrl();
    this.ws = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.messageId = 0;
  }

  /**
   * Detect WebSocket URL based on current location
   */
  detectWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 5321; // WebSocket server port
    return `${protocol}//${host}:${port}`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[ServerRunner] Connecting to WebSocket:', this.wsUrl);
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('[ServerRunner] WebSocket connected');
          this.connected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[ServerRunner] Received message:', data);
            
            if (data.messageId && this.messageHandlers.has(data.messageId)) {
              const handler = this.messageHandlers.get(data.messageId);
              handler(data);
              this.messageHandlers.delete(data.messageId);
            }
          } catch (error) {
            console.error('[ServerRunner] Message parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[ServerRunner] WebSocket error:', error);
          this.connected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[ServerRunner] WebSocket disconnected');
          this.connected = false;
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message and wait for response
   */
  async sendMessage(type, payload) {
    await this.connect();

    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const message = {
        type,
        messageId,
        timestamp: new Date().toISOString(),
        ...payload
      };

      // Set up response handler with timeout
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error('Message response timeout'));
      }, 30000); // 30 second timeout

      this.messageHandlers.set(messageId, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      // Send message
      console.log('[ServerRunner] Sending message:', message);
      this.ws.send(JSON.stringify(message));
    });
  }

  /**
   * Execute CLM on the server via WebSocket
   * @param {string} code - The CLM code (YAML/JSON)
   * @param {object} input - Input data for execution
   * @returns {Promise<object>} Execution result
   */
  async execute(code, input) {
    try {
      console.log('[ServerRunner] === Starting CLM Execution ===');
      console.log('[ServerRunner] Input data:', input);
      console.log('[ServerRunner] Code length:', code.length);
      
      // Parse the CLM YAML to check if we need to load code_file
      let clmData;
      try {
        clmData = jsyaml.load(code);
        console.log('[ServerRunner] Parsed CLM data:', clmData);
      } catch (e) {
        console.error('[ServerRunner] Failed to parse CLM YAML:', e);
        throw new Error('Invalid CLM YAML format');
      }
      
      // Check if concrete has code_file instead of code
      const concrete = clmData?.clm?.concrete;
      console.log('[ServerRunner] Concrete section:', concrete);
      console.log('[ServerRunner] Has code_file?', !!concrete?.code_file);
      console.log('[ServerRunner] Has code?', !!concrete?.code);
      
      if (concrete && concrete.code_file && !concrete.code) {
        console.log('[ServerRunner] *** LOADING CODE FROM FILE ***');
        console.log('[ServerRunner] code_file:', concrete.code_file);
        
        // Extract chapter directory from the current URL or CLM structure
        const chapterId = clmData?.chapter?.id;
        if (chapterId) {
          // Construct path to code file
          const chapterNum = String(chapterId).padStart(3, '0').substring(0, 2);
          const codePath = `/chapters/chapter_${chapterNum}_arithmetic/${concrete.code_file}`;
          
          try {
            const codeResponse = await fetch(codePath);
            if (codeResponse.ok) {
              const codeContent = await codeResponse.text();
              console.log('[ServerRunner] Loaded code content, length:', codeContent.length);
              
              // Replace code_file with actual code content
              concrete.code = codeContent;
              delete concrete.code_file;
              delete concrete.entry_point;
              
              // Convert back to YAML
              code = jsyaml.dump(clmData);
            } else {
              console.warn('[ServerRunner] Could not load code file:', codePath);
            }
          } catch (fetchError) {
            console.error('[ServerRunner] Error loading code file:', fetchError);
          }
        }
      }
      
      const response = await this.sendMessage('clm_execute', {
        clm: code,
        input: input
      });

      console.log('[ServerRunner] Result:', response);
      
      // Normalize result format to match BrowserCLMRunner
      return {
        success: true,
        result: response.result || response.output,
        executionTime: response.executionTime || response.duration || 0,
        clm: {
          chapter: response.chapter || 'Server-Executed',
          concept: response.concept || 'Remote'
        }
      };

    } catch (error) {
      console.error('[ServerRunner] Execution error:', error);
      return {
        success: false,
        error: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Run tests on the server (Not yet implemented on backend)
   */
  async runTests(code) {
    console.warn('[ServerRunner] Server-side testing not yet implemented');
    return {
      success: false,
      error: 'Server-side testing not supported yet.',
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }
}
