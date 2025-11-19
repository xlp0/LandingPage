// UI Handler - Manages all UI updates and interactions for Tic-Tac-Toe P2P

class UIHandler {
  constructor() {
    this.elements = {};
  }
  
  /**
   * Initialize UI elements
   */
  init() {
    this.elements = {
      statusElement: document.getElementById('p2p-status'),
      gameStatus: document.getElementById('game-status'),
      peerCount: document.getElementById('peer-count'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      gameBoard: document.querySelector('.game-board'),
      gameCells: document.querySelectorAll('.game-cell')
    };
  }
  
  /**
   * Update connection status
   */
  updateStatus(message) {
    if (this.elements.statusElement) {
      this.elements.statusElement.textContent = message;
    }
  }
  
  /**
   * Update game status
   */
  updateGameStatus(message) {
    if (this.elements.gameStatus) {
      this.elements.gameStatus.textContent = message;
    }
  }
  
  /**
   * Update peer count
   */
  updatePeerCount(count) {
    if (this.elements.peerCount) {
      this.elements.peerCount.textContent = count;
    }
  }
  
  /**
   * Add chat message
   */
  addChatMessage(message, isSelf = false) {
    if (!this.elements.chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.style.background = isSelf ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255, 255, 255, 0.2)';
    messageDiv.textContent = message;
    
    this.elements.chatMessages.appendChild(messageDiv);
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }
  
  /**
   * Update game board display
   */
  updateGameBoard(board) {
    if (!this.elements.gameCells) return;
    
    this.elements.gameCells.forEach((cell, index) => {
      const value = board[index];
      cell.textContent = value || '';
      cell.style.color = value === 'X' ? '#667eea' : '#764ba2';
      cell.style.fontWeight = 'bold';
    });
  }
  
  /**
   * Enable/disable game board
   */
  setGameBoardEnabled(enabled) {
    if (!this.elements.gameCells) return;
    
    this.elements.gameCells.forEach(cell => {
      if (enabled) {
        cell.classList.remove('disabled');
      } else {
        cell.classList.add('disabled');
      }
    });
  }
  
  /**
   * Show game end result
   */
  showGameEnd(winner) {
    let message;
    if (winner === 'draw') {
      message = "It's a draw! 🤝";
    } else {
      message = `${winner} wins! 🎉`;
    }
    
    this.updateGameStatus(message);
    this.setGameBoardEnabled(false);
    
    // Show reset button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.style.display = 'inline-block';
    }
  }
  
  /**
   * Display invitation modal
   */
  displayInvitation(invitation) {
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🎮 Game Created!</h3>
        <p>Share this invitation code with your friend:</p>
        <textarea readonly>${invitation}</textarea>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button onclick="navigator.clipboard.writeText('${invitation}').then(() => alert('Copied!')); this.disabled=true; this.textContent='✓ Copied'">📋 Copy Invitation</button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  /**
   * Display answer modal
   */
  displayAnswer(answerInvitation) {
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>📤 Send This Answer Back</h3>
        <p>Copy this answer and send it to the host:</p>
        <textarea readonly>${answerInvitation}</textarea>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button onclick="navigator.clipboard.writeText('${answerInvitation}').then(() => alert('Copied!')); this.disabled=true; this.textContent='✓ Copied'">📋 Copy Answer</button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  /**
   * Clear chat input
   */
  clearChatInput() {
    if (this.elements.chatInput) {
      this.elements.chatInput.value = '';
    }
  }
  
  /**
   * Get chat input value
   */
  getChatInput() {
    return this.elements.chatInput ? this.elements.chatInput.value : '';
  }
}

export default UIHandler;
