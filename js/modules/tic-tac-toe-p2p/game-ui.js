// PKC Module: tic-tac-toe-p2p/game-ui
// Purpose: User interface management for Tic-Tac-Toe game

/**
 * Game UI Manager
 * Handles all user interface updates and interactions
 */
export class GameUI {
  constructor() {
    this.container = null;
    this.elements = {};
  }
  
  /**
   * Initialize UI in the given container
   */
  initialize(container) {
    this.container = container;
    this._createUI();
    this._bindEvents();
  }
  
  /**
   * Cleanup UI
   */
  cleanup() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.elements = {};
  }
  
  /**
   * Show room created state
   */
  showRoomCreated(room) {
    this._updateStatus('Room created! Share the invitation with your friend.', 'success');
    this._showInvitation(room.invitation);
    this.showHostNeedsAnswer(); // Show input for answer
    this._hideElement('room-setup');
    this._showElement('room-controls');
    this._showElement('game-area');
    this._updateRoomInfo(`Room: ${room.id} (Host)`);
  }
  
  /**
   * Show room joined state
   */
  showRoomJoined(room) {
    this._updateStatus('Joined room! Send this answer back to the host:', 'info');
    this._hideElement('room-setup');
    this._showElement('room-controls');
    this._showElement('game-area');
    this._updateRoomInfo(`Room: ${room.id} (Guest)`);
    
    // Show the answer invitation that needs to be sent back
    if (room.answerInvitation) {
      this._showAnswerInvitation(room.answerInvitation);
    }
  }
  
  /**
   * Show room left state
   */
  showRoomLeft() {
    this._updateStatus('Left room', 'info');
    this._showElement('room-setup');
    this._hideElement('room-controls');
    this._hideElement('game-area');
    this._hideElement('invitation-display');
    this._updateRoomInfo('');
  }
  
  /**
   * Show peer connected
   */
  showPeerConnected() {
    this._updateStatus('Connected! Game ready to start.', 'success');
    this._hideElement('invitation-display');
  }
  
  /**
   * Show peer disconnected
   */
  showPeerDisconnected() {
    this._updateStatus('Peer disconnected', 'warning');
    this._showInvitation(); // Show invitation again for reconnection
  }
  
  /**
   * Show game started
   */
  showGameStarted(isMyTurn) {
    if (isMyTurn) {
      this._updateStatus('Game started! Your turn.', 'success');
    } else {
      this._updateStatus('Game started! Waiting for opponent...', 'info');
    }
    this._enableBoard(isMyTurn);
  }
  
  /**
   * Update game board display
   */
  updateBoard(board) {
    const cells = this.elements.gameBoard?.querySelectorAll('.game-cell');
    if (!cells) return;
    
    cells.forEach((cell, index) => {
      const value = board[index];
      cell.textContent = value || '';
      cell.classList.toggle('occupied', !!value);
      cell.classList.toggle('x-cell', value === 'X');
      cell.classList.toggle('o-cell', value === 'O');
    });
  }
  
  /**
   * Show game end
   */
  showGameEnd(winner) {
    if (winner === 'draw') {
      this._updateStatus('Game ended in a draw!', 'info');
    } else {
      this._updateStatus(`Game ended! Winner: ${winner}`, 'success');
    }
    this._enableBoard(false);
    this._showElement('reset-controls');
  }
  
  /**
   * Show game reset
   */
  showGameReset() {
    this._updateStatus('Game reset', 'info');
    this._hideElement('reset-controls');
    this.updateBoard(Array(9).fill(null));
  }
  
  /**
   * Show connection status updates
   */
  showConnectionStatus(message, type = 'info') {
    this._updateStatus(message, type);
  }
  
  /**
   * Show error message
   */
  showError(message) {
    this._updateStatus(`Error: ${message}`, 'error');
  }
  
  /**
   * Add chat message to the chat area
   */
  addChatMessage(message, isOwn = false) {
    const chatMessages = this.container.querySelector('#chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    senderDiv.textContent = isOwn ? 'You' : 'Opponent';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.textContent = message;
    
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  /**
   * Clear chat messages
   */
  clearChat() {
    const chatMessages = this.container.querySelector('#chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }
  }
  
  /**
   * Create the UI structure
   */
  _createUI() {
    this.container.innerHTML = `
      <div class="tic-tac-toe-game">
        <!-- Header -->
        <div class="game-header">
          <h2>🎮 Tic-Tac-Toe P2P</h2>
          <div id="game-status" class="status-display">Ready to play</div>
          <div id="room-info" class="room-info"></div>
        </div>
        
        <!-- Room Setup -->
        <div id="room-setup" class="room-setup">
          <div class="setup-section">
            <h3>Create Room</h3>
            <button id="create-room-btn" class="btn btn-primary">Create New Game</button>
          </div>
          
          <div class="setup-divider">OR</div>
          
          <div class="setup-section">
            <h3>Join Room</h3>
            <div class="join-controls">
              <input 
                type="text" 
                id="invitation-input" 
                placeholder="Paste invitation code here..."
                class="invitation-input"
              />
              <button id="join-room-btn" class="btn btn-secondary">Join Game</button>
            </div>
          </div>
        </div>
        
        <!-- Room Controls -->
        <div id="room-controls" class="room-controls" style="display: none;">
          <button id="leave-room-btn" class="btn btn-danger">Leave Room</button>
        </div>
        
        <!-- Invitation Display -->
        <div id="invitation-display" class="invitation-display" style="display: none;">
          <h3>Share this invitation:</h3>
          <div class="invitation-container">
            <textarea id="invitation-text" readonly class="invitation-text"></textarea>
            <button id="copy-invitation-btn" class="btn btn-copy">Copy</button>
          </div>
          <div class="qr-container">
            <canvas id="invitation-qr" class="invitation-qr"></canvas>
          </div>
        </div>
        
        <!-- Game Area -->
        <div id="game-area" class="game-area" style="display: none;">
          <div class="game-board-container">
            <div id="game-board" class="game-board">
              ${Array(9).fill(0).map((_, i) => 
                `<div class="game-cell" data-position="${i}"></div>`
              ).join('')}
            </div>
          </div>
          
          <div id="reset-controls" class="reset-controls" style="display: none;">
            <button id="reset-game-btn" class="btn btn-secondary">Play Again</button>
          </div>
          
          <!-- Chat Section -->
          <div class="chat-section">
            <h3>💬 Chat with Your Opponent</h3>
            <div id="chat-messages" class="chat-messages"></div>
            <div class="chat-input-container">
              <input type="text" id="chat-input" placeholder="Type a message..." class="chat-input">
              <button id="send-chat-btn" class="btn btn-primary">Send</button>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .tic-tac-toe-game {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .game-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .game-header h2 {
          margin: 0 0 10px 0;
          color: #333;
        }
        
        .status-display {
          padding: 10px 15px;
          border-radius: 8px;
          margin: 10px 0;
          font-weight: 500;
        }
        
        .status-display.status-info { background: #e3f2fd; color: #1976d2; }
        .status-display.status-success { background: #e8f5e8; color: #2e7d32; }
        .status-display.status-warning { background: #fff3e0; color: #f57c00; }
        .status-display.status-error { background: #ffebee; color: #d32f2f; }
        
        .room-info {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        
        .room-setup {
          display: grid;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .setup-section {
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          text-align: center;
        }
        
        .setup-section h3 {
          margin: 0 0 15px 0;
          color: #333;
        }
        
        .setup-divider {
          text-align: center;
          font-weight: bold;
          color: #666;
          position: relative;
        }
        
        .setup-divider::before,
        .setup-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #e0e0e0;
        }
        
        .setup-divider::before { left: 0; }
        .setup-divider::after { right: 0; }
        
        .join-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .invitation-input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .invitation-input:focus {
          outline: none;
          border-color: #2196f3;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .btn-primary { background: #2196f3; color: white; }
        .btn-secondary { background: #757575; color: white; }
        .btn-danger { background: #f44336; color: white; }
        .btn-copy { background: #4caf50; color: white; }
        
        .room-controls {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .invitation-display {
          margin: 20px 0;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 12px;
        }
        
        .invitation-display h3 {
          margin: 0 0 15px 0;
          color: #333;
        }
        
        .invitation-container {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .invitation-text {
          flex: 1;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          resize: none;
          height: 80px;
        }
        
        .qr-container {
          text-align: center;
        }
        
        .invitation-qr {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
        }
        
        .game-area {
          text-align: center;
        }
        
        .game-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          max-width: 300px;
          margin: 0 auto 20px auto;
          background: #333;
          padding: 4px;
          border-radius: 12px;
        }
        
        .game-cell {
          aspect-ratio: 1;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .game-cell:hover:not(.occupied) {
          background: #f0f0f0;
        }
        
        .game-cell.occupied {
          cursor: not-allowed;
        }
        
        .game-cell.x-cell {
          color: #2196f3;
        }
        
        .game-cell.o-cell {
          color: #f44336;
        }
        
        .game-board.disabled .game-cell {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .reset-controls {
          margin-top: 20px;
        }
        
        .chat-section {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }
        
        .chat-section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
        }
        
        .chat-messages {
          height: 200px;
          overflow-y: auto;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .chat-message {
          margin-bottom: 8px;
          padding: 6px 10px;
          border-radius: 6px;
          max-width: 80%;
        }
        
        .chat-message.own {
          background: #2196f3;
          color: white;
          margin-left: auto;
          text-align: right;
        }
        
        .chat-message.other {
          background: #e0e0e0;
          color: #333;
        }
        
        .chat-message .sender {
          font-size: 11px;
          opacity: 0.7;
          margin-bottom: 2px;
        }
        
        .chat-message .text {
          word-wrap: break-word;
        }
        
        .chat-input-container {
          display: flex;
          gap: 10px;
        }
        
        .chat-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .chat-input:focus {
          outline: none;
          border-color: #2196f3;
        }
        
        @media (max-width: 480px) {
          .tic-tac-toe-game {
            padding: 15px;
          }
          
          .join-controls {
            flex-direction: column;
          }
          
          .invitation-container {
            flex-direction: column;
          }
          
          .game-board {
            max-width: 250px;
          }
          
          .game-cell {
            font-size: 28px;
          }
        }
      </style>
    `;
    
    // Cache element references
    this.elements = {
      gameStatus: this.container.querySelector('#game-status'),
      roomInfo: this.container.querySelector('#room-info'),
      roomSetup: this.container.querySelector('#room-setup'),
      roomControls: this.container.querySelector('#room-controls'),
      invitationDisplay: this.container.querySelector('#invitation-display'),
      invitationText: this.container.querySelector('#invitation-text'),
      gameArea: this.container.querySelector('#game-area'),
      gameBoard: this.container.querySelector('#game-board'),
      resetControls: this.container.querySelector('#reset-controls')
    };
  }
  
  /**
   * Bind UI events
   */
  _bindEvents() {
    // Copy invitation button
    const copyBtn = this.container.querySelector('#copy-invitation-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const invitationText = this.elements.invitationText;
        if (invitationText) {
          invitationText.select();
          document.execCommand('copy');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }
      });
    }
  }
  
  /**
   * Update status display
   */
  _updateStatus(message, type = 'info') {
    if (this.elements.gameStatus) {
      this.elements.gameStatus.textContent = message;
      this.elements.gameStatus.className = `status-display status-${type}`;
    }
  }
  
  /**
   * Update room info
   */
  _updateRoomInfo(info) {
    if (this.elements.roomInfo) {
      this.elements.roomInfo.textContent = info;
    }
  }
  
  /**
   * Show invitation
   */
  _showInvitation(invitation) {
    if (invitation && this.elements.invitationText) {
      this.elements.invitationText.value = invitation;
      this._showElement('invitation-display');
      
      // Generate QR code (simple implementation)
      this._generateQRCode(invitation);
    }
  }
  
  /**
   * Show answer invitation (for guest to send back to host)
   */
  _showAnswerInvitation(answerInvitation) {
    // Create answer invitation display if it doesn't exist
    let answerDisplay = this.container.querySelector('#answer-invitation-display');
    if (!answerDisplay) {
      const gameArea = this.container.querySelector('#game-area');
      answerDisplay = document.createElement('div');
      answerDisplay.id = 'answer-invitation-display';
      answerDisplay.className = 'invitation-display';
      answerDisplay.innerHTML = `
        <h3>📤 Send this answer to the host:</h3>
        <div class="invitation-container">
          <textarea id="answer-invitation-text" readonly class="invitation-text"></textarea>
          <button id="copy-answer-btn" class="btn btn-copy">Copy Answer</button>
        </div>
        <p><small>The host needs to paste this answer to complete the connection.</small></p>
      `;
      gameArea.insertBefore(answerDisplay, gameArea.firstChild);
      
      // Bind copy button
      const copyBtn = answerDisplay.querySelector('#copy-answer-btn');
      copyBtn.addEventListener('click', () => {
        const answerText = answerDisplay.querySelector('#answer-invitation-text');
        answerText.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Answer';
        }, 2000);
      });
    }
    
    const answerText = answerDisplay.querySelector('#answer-invitation-text');
    answerText.value = answerInvitation;
    answerDisplay.style.display = 'block';
  }
  
  /**
   * Show host needs to complete connection
   */
  showHostNeedsAnswer() {
    // Add answer input for host
    let answerInput = this.container.querySelector('#host-answer-input');
    if (!answerInput) {
      const invitationDisplay = this.container.querySelector('#invitation-display');
      answerInput = document.createElement('div');
      answerInput.id = 'host-answer-input';
      answerInput.className = 'invitation-display';
      answerInput.innerHTML = `
        <h3>📥 Paste the answer from your friend:</h3>
        <div class="invitation-container">
          <textarea id="answer-input-text" placeholder="Paste the answer invitation here..." class="invitation-text"></textarea>
          <button id="complete-connection-btn" class="btn btn-primary">Complete Connection</button>
        </div>
      `;
      invitationDisplay.parentNode.insertBefore(answerInput, invitationDisplay.nextSibling);
    }
    
    answerInput.style.display = 'block';
  }
  
  /**
   * Generate QR code for invitation
   */
  _generateQRCode(invitation) {
    const canvas = this.container.querySelector('#invitation-qr');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    
    // Simple placeholder - in a real implementation, use a QR code library
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 90);
    ctx.fillText('(Placeholder)', 100, 110);
  }
  
  /**
   * Enable/disable game board
   */
  _enableBoard(enabled) {
    if (this.elements.gameBoard) {
      this.elements.gameBoard.classList.toggle('disabled', !enabled);
    }
  }
  
  /**
   * Show element
   */
  _showElement(elementId) {
    const element = this.container.querySelector(`#${elementId}`);
    if (element) {
      element.style.display = '';
    }
  }
  
  /**
   * Hide element
   */
  _hideElement(elementId) {
    const element = this.container.querySelector(`#${elementId}`);
    if (element) {
      element.style.display = 'none';
    }
  }
}
