// PKC Module: tic-tac-toe-p2p
// Purpose: Multiplayer Tic-Tac-Toe game using WebRTC P2P connections
// Architecture: Room-based game sessions with invitation system

import { ConnectionManager } from '../p2p-serverless/connection.js';
import { DiscoveryManager } from '../p2p-serverless/discovery.js';
import { TicTacToeGame } from './game-logic.js';
// import { GameUI } from './game-ui.js'; // Not needed - using direct DOM manipulation

let connectionManager = null;
let discoveryManager = null;
let gameLogic = null;
let gameUI = null;
let currentRoom = null;

/**
 * PKC Module: Tic-Tac-Toe P2P Game
 */
export default {
  id: 'tic-tac-toe-p2p',
  
  async init({ pkc, config, capabilities }) {
    console.log('[TicTacToe P2P] Initializing module', { capabilities });
    
    // Check WebRTC capability
    if (!capabilities.webrtc) {
      console.warn('[TicTacToe P2P] WebRTC not supported, module disabled');
      return;
    }
    
    // Initialize components using working P2P modules
    console.log('[TicTacToe P2P] Creating ConnectionManager...');
    connectionManager = new ConnectionManager({
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    console.log('[TicTacToe P2P] ConnectionManager created:', !!connectionManager);
    
    console.log('[TicTacToe P2P] Creating DiscoveryManager...');
    discoveryManager = new DiscoveryManager({
      channelName: config.channelName || 'tic-tac-toe-p2p-discovery'
    });
    console.log('[TicTacToe P2P] DiscoveryManager created:', !!discoveryManager);
    
    // Initialize discovery manager
    console.log('[TicTacToe P2P] Initializing DiscoveryManager...');
    await discoveryManager.init();
    console.log('[TicTacToe P2P] DiscoveryManager initialized');
    
    console.log('[TicTacToe P2P] Creating game components...');
    gameLogic = new TicTacToeGame();
    // gameUI = new GameUI(); // Not needed - using direct DOM manipulation
    console.log('[TicTacToe P2P] Game components created');
    
    // Setup event handlers
    this._setupEventHandlers();
    
    console.log('[TicTacToe P2P] Module initialized successfully');
  },
  
  async start() {
    console.log('[TicTacToe P2P] Starting module');
    
    if (!connectionManager) {
      console.error('[TicTacToe P2P] Module not properly initialized');
      return;
    }
    
    // Bind buttons directly (like P2P serverless example)
    this._bindButtons();
    
    // Initialize UI if on game page
    const gameContainer = document.getElementById('tic-tac-toe-container');
    if (gameContainer) {
      gameUI.initialize(gameContainer);
    }
    
    console.log('[TicTacToe P2P] Module started successfully');
  },
  
  async stop() {
    console.log('[TicTacToe P2P] Stopping module');
    
    // Disconnect from current game
    if (currentRoom) {
      await this.leaveRoom();
    }
    
    // Cleanup UI
    if (gameUI) {
      gameUI.cleanup();
    }
  },
  
  /**
   * Create a new game room (using working P2P modules)
   */
  async createRoom() {
    try {
      console.log('[TicTacToe P2P] Creating room using P2P modules...');
      
      // Check if modules are initialized
      if (!connectionManager) {
        throw new Error('ConnectionManager not initialized');
      }
      if (!discoveryManager) {
        throw new Error('DiscoveryManager not initialized');
      }
      
      console.log('[TicTacToe P2P] Creating WebRTC offer...');
      // Create WebRTC offer using working P2P module
      const offerData = await connectionManager.createOffer();
      console.log('[TicTacToe P2P] Offer created:', offerData);
      
      console.log('[TicTacToe P2P] Creating invitation...');
      // Create invitation with QR code using working P2P module
      const invitation = discoveryManager.createInvitation(offerData);
      console.log('[TicTacToe P2P] Invitation created:', invitation);
      
      currentRoom = {
        id: offerData.peerId,
        isHost: true,
        invitation: invitation.encoded,
        peerId: offerData.peerId
      };
      
      // Update status display
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Game room created! Waiting for player...';
      }
      
      if (gameLogic) {
        gameLogic.reset();
        gameLogic.setPlayerRole('X'); // Host is always X
      }
      
      console.log('[TicTacToe P2P] Room created with P2P modules:', currentRoom.id);
      return currentRoom;
    } catch (error) {
      console.error('[TicTacToe P2P] Failed to create room:', error);
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Failed to create room: ' + error.message;
      }
      throw error;
    }
  },
  
  /**
   * Join an existing game room using invitation (using working P2P modules)
   */
  async joinRoom(invitation) {
    try {
      console.log('[TicTacToe P2P] Joining room using P2P modules...');
      
      // Parse invitation using working P2P module
      const invitationData = discoveryManager.parseInvitation(invitation);
      if (!invitationData) {
        throw new Error('Invalid invitation');
      }
      
      // Accept offer and generate answer using working P2P module
      const answerData = await connectionManager.acceptOffer(
        invitationData.peerId,
        invitationData.offer,
        invitationData.ice
      );
      
      // Create answer invitation using working P2P module
      const answerInvitation = discoveryManager.createAnswerInvitation(answerData);
      
      currentRoom = {
        id: invitationData.peerId,
        isHost: false,
        invitation: invitation,
        answerInvitation: answerInvitation.encoded,
        peerId: invitationData.peerId
      };
      
      // Update status display
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Joined game! Answer generated.';
      }
      
      if (gameLogic) {
        gameLogic.reset();
        gameLogic.setPlayerRole('O'); // Guest is always O
      }
      
      console.log('[TicTacToe P2P] Joined room with P2P modules:', currentRoom.id);
      return currentRoom;
    } catch (error) {
      console.error('[TicTacToe P2P] Failed to join room:', error);
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Failed to join room: ' + error.message;
      }
      throw error;
    }
  },
  
  /**
   * Complete connection (host receives answer from guest) - using working P2P modules
   */
  async completeConnection(answerInvitation) {
    if (!currentRoom || !currentRoom.isHost) {
      throw new Error('Only host can complete connection');
    }
    
    try {
      console.log('[TicTacToe P2P] Completing connection using P2P modules...');
      
      // Parse answer invitation using working P2P module
      const answerData = discoveryManager.parseInvitation(answerInvitation);
      if (!answerData || answerData.type !== 'answer') {
        throw new Error('Invalid answer data');
      }
      
      // Apply answer using working P2P module
      await connectionManager.applyAnswer(
        answerData.peerId,
        answerData.answer,
        answerData.ice
      );
      
      console.log('[TicTacToe P2P] Connection completed with P2P modules');
    } catch (error) {
      console.error('[TicTacToe P2P] Failed to complete connection:', error);
      gameUI.showError('Failed to complete connection: ' + error.message);
      throw error;
    }
  },
  
  /**
   * Leave current room
   */
  async leaveRoom() {
    if (!currentRoom) return;
    
    try {
      // Disconnect from all peers using P2P module
      if (currentRoom.peerId) {
        connectionManager.disconnect(currentRoom.peerId);
      }
      
      gameUI.showRoomLeft();
      gameUI.clearChat(); // Clear chat messages
      gameLogic.reset();
      currentRoom = null;
      
      console.log('[TicTacToe P2P] Left room');
    } catch (error) {
      console.error('[TicTacToe P2P] Error leaving room:', error);
    }
  },
  
  /**
   * Make a move in the game
   */
  makeMove(position) {
    console.log('[TicTacToe P2P] makeMove called with position:', position);
    console.log('[TicTacToe P2P] currentRoom:', !!currentRoom);
    console.log('[TicTacToe P2P] gameLogic:', !!gameLogic);
    
    if (!currentRoom) {
      console.log('[TicTacToe P2P] No current room');
      return false;
    }
    
    if (!gameLogic) {
      console.log('[TicTacToe P2P] No game logic');
      return false;
    }
    
    if (!gameLogic.canMakeMove()) {
      console.log('[TicTacToe P2P] Cannot make move - not your turn or game over');
      return false;
    }
    
    console.log('[TicTacToe P2P] Attempting to make move...');
    const success = gameLogic.makeMove(position);
    console.log('[TicTacToe P2P] Move result:', success);
    if (success) {
      // Update board display
      this._updateGameBoard();
      
      // Send move to opponent
      try {
        // The player who just moved is MY role, not the current player (which switches after move)
        const myRole = gameLogic.getPlayerRole();
        const moveMessage = {
          type: 'move',
          position: position,
          player: myRole  // Send MY role, not current player
        };
        console.log('[TicTacToe P2P] I just moved as player:', myRole);
        console.log('[TicTacToe P2P] My role:', gameLogic.getPlayerRole());
        console.log('[TicTacToe P2P] Current player (after move):', gameLogic.getCurrentPlayer());
        console.log('[TicTacToe P2P] Sending move message:', moveMessage);
        connectionManager.broadcast(moveMessage);
        console.log('[TicTacToe P2P] Move message sent successfully');
      } catch (error) {
        console.error('[TicTacToe P2P] Failed to send move:', error);
      }
      
      // Check for game end
      const winner = gameLogic.getWinner();
      if (winner) {
        this._showGameEnd(winner);
        connectionManager.broadcast({
          type: 'game-end',
          winner: winner
        });
      } else if (gameLogic.isDraw()) {
        this._showGameEnd('draw');
        connectionManager.broadcast({
          type: 'game-end',
          winner: 'draw'
        });
      } else {
        // Update status - waiting for opponent
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
          gameStatus.textContent = 'Waiting for opponent...';
        }
      }
    }
    
    return success;
  },
  
  /**
   * Reset the game
   */
  resetGame() {
    if (!currentRoom || !gameLogic) {
      return;
    }
    
    console.log('[TicTacToe P2P] Resetting game...');
    
    // Reset game logic
    gameLogic.reset();
    
    // Update board display
    this._updateGameBoard();
    
    // Send reset message to opponent
    try {
      connectionManager.broadcast({
        type: 'game-reset'
      });
      console.log('[TicTacToe P2P] Reset message sent to opponent');
    } catch (error) {
      console.error('[TicTacToe P2P] Failed to send reset message:', error);
    }
    
    // Update UI
    const gameStatus = document.getElementById('game-status');
    if (gameStatus) {
      if (currentRoom.isHost) {
        gameStatus.textContent = 'Game reset! Your turn (X).';
      } else {
        gameStatus.textContent = 'Game reset! Wait for host to start.';
      }
    }
    
    // Hide reset button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.style.display = 'none';
    }
    
    // Enable game board
    const gameCells = document.querySelectorAll('.game-cell');
    gameCells.forEach(cell => cell.classList.remove('disabled'));
    
    console.log('[TicTacToe P2P] Game reset complete');
  },
  
  /**
   * Send chat message to opponent (using working P2P modules)
   */
  sendChatMessage(message) {
    if (!currentRoom || !message.trim()) {
      return false;
    }
    
    try {
      // Use working P2P module to broadcast message
      const chatMessage = {
        type: 'chat',
        message: message.trim(),
        sender: currentRoom.isHost ? 'host' : 'guest'
      };
      console.log('[TicTacToe P2P] Sending chat message:', chatMessage);
      connectionManager.broadcast(chatMessage);
      console.log('[TicTacToe P2P] Chat message sent successfully');
      
      // Add to own chat display
      this._addChatMessage(message.trim(), true);
      return true;
    } catch (error) {
      console.error('[TicTacToe P2P] Failed to send chat message:', error);
      return false;
    }
  },
  
  /**
   * Add chat message to display
   */
  _addChatMessage(message, isOwn = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    messageDiv.textContent = `${isOwn ? 'You' : 'Opponent'}: ${message}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },
  
  /**
   * Setup event handlers for P2P connection
   */
  _setupEventHandlers() {
    // Use working P2P module events
    connectionManager.on('peer:connect', (data) => {
      console.log('[TicTacToe P2P] Peer connected:', data.peerId);
      
      // Update status display
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = '✅ Connected! Peer joined the room.';
      }
      
      // Update peer count
      const peerCount = document.getElementById('peer-count');
      if (peerCount) {
        peerCount.textContent = '1';
      }
      
      // Enable game board
      const gameCells = document.querySelectorAll('.game-cell');
      gameCells.forEach(cell => cell.classList.remove('disabled'));
      
      // Update game status
      const gameStatus = document.getElementById('game-status');
      if (gameStatus) {
        gameStatus.textContent = currentRoom?.isHost ? 'Your turn (X)' : 'Waiting for opponent (O)';
      }
      
      this._startGame();
    });
    
    connectionManager.on('peer:disconnect', (data) => {
      console.log('[TicTacToe P2P] Peer disconnected:', data.peerId);
      
      // Update status display
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Peer disconnected';
      }
      
      // Update peer count
      const peerCount = document.getElementById('peer-count');
      if (peerCount) {
        peerCount.textContent = '0';
      }
      
      // Disable game board
      const gameCells = document.querySelectorAll('.game-cell');
      gameCells.forEach(cell => cell.classList.add('disabled'));
    });
    
    connectionManager.on('message', (data) => {
      console.log('[TicTacToe P2P] *** MESSAGE RECEIVED ***');
      console.log('[TicTacToe P2P] Raw message received:', data);
      console.log('[TicTacToe P2P] Message data:', data.data);
      console.log('[TicTacToe P2P] Message type:', typeof data.data);
      
      // The P2P module sends data in data.data, but it might be a string that needs parsing
      let messageData = data.data;
      if (typeof messageData === 'string') {
        try {
          messageData = JSON.parse(messageData);
          console.log('[TicTacToe P2P] Parsed message:', messageData);
        } catch (e) {
          console.error('[TicTacToe P2P] Failed to parse message:', e);
          return;
        }
      }
      
      console.log('[TicTacToe P2P] About to handle message:', messageData);
      this._handleGameMessage(messageData);
    });
    
    connectionManager.on('error', (error) => {
      console.error('[TicTacToe P2P] Connection error:', error);
      
      // Update status display
      const statusText = document.getElementById('p2p-status');
      if (statusText) {
        statusText.textContent = 'Connection error: ' + error.message;
      }
    });
  },
  
  /**
   * Start the actual game once connection is ready
   */
  _startGame() {
    console.log('[TicTacToe P2P] _startGame called');
    console.log('[TicTacToe P2P] currentRoom:', !!currentRoom);
    console.log('[TicTacToe P2P] gameLogic:', !!gameLogic);
    
    if (!currentRoom) {
      console.log('[TicTacToe P2P] No current room, cannot start game');
      return;
    }
    
    if (!gameLogic) {
      console.log('[TicTacToe P2P] No game logic, cannot start game');
      return;
    }
    
    console.log('[TicTacToe P2P] Game state before reset:', gameLogic.getGameState());
    
    // Always reset and initialize game logic when connection is established
    if (gameLogic) {
      gameLogic.reset();
      const myRole = currentRoom.isHost ? 'X' : 'O';
      gameLogic.setPlayerRole(myRole);
      console.log('[TicTacToe P2P] I am:', currentRoom.isHost ? 'HOST' : 'GUEST');
      console.log('[TicTacToe P2P] My role set to:', myRole);
      console.log('[TicTacToe P2P] Game logic role:', gameLogic.getPlayerRole());
      console.log('[TicTacToe P2P] Game state after reset:', gameLogic.getGameState());
    }
    
    console.log('[TicTacToe P2P] Starting game, isHost:', currentRoom.isHost);
    
    // Send game start message to opponent
    if (currentRoom.isHost) {
      const startMessage = {
        type: 'game-start',
        hostPlayer: 'X',
        guestPlayer: 'O'
      };
      console.log('[TicTacToe P2P] Sending game start message:', startMessage);
      connectionManager.broadcast(startMessage);
      
      // Update game status for host
      const gameStatus = document.getElementById('game-status');
      if (gameStatus) {
        gameStatus.textContent = 'Your turn! Click a square to play.';
      }
    }
  },
  
  /**
   * Handle incoming game messages
   */
  _handleGameMessage(message) {
    console.log('[TicTacToe P2P] Handling message:', message);
    
    switch (message.type) {
      case 'chat':
        // Handle chat message
        this._addChatMessage(message.message, false);
        break;
        
      case 'game-start':
        if (gameLogic) {
          // Guest receives game-start message from host
          const myRole = currentRoom.isHost ? 'X' : 'O';
          gameLogic.setPlayerRole(myRole);
          console.log('[TicTacToe P2P] Game start received - I am:', currentRoom.isHost ? 'HOST' : 'GUEST');
          console.log('[TicTacToe P2P] Game start - setting my role to:', myRole);
          console.log('[TicTacToe P2P] My role after game start:', gameLogic.getPlayerRole());
        }
        
        // Update game status for guest
        if (!currentRoom.isHost) {
          const gameStatus = document.getElementById('game-status');
          if (gameStatus) {
            gameStatus.textContent = 'Host goes first (X). Wait for your turn.';
          }
        }
        break;
        
      case 'move':
        console.log('[TicTacToe P2P] Received move:', message.position, message.player);
        console.log('[TicTacToe P2P] My role:', gameLogic?.getPlayerRole());
        console.log('[TicTacToe P2P] Current player turn:', gameLogic?.getCurrentPlayer());
        
        if (gameLogic) {
          const moveAccepted = gameLogic.makeOpponentMove(message.position, message.player);
          console.log('[TicTacToe P2P] Move accepted:', moveAccepted);
          
          if (moveAccepted) {
            this._updateGameBoard();
            
            // Check for game end
            const winner = gameLogic.getWinner();
            if (winner) {
              this._showGameEnd(winner);
            } else if (gameLogic.isDraw()) {
              this._showGameEnd('draw');
            } else {
              // Update status - now it's your turn
              const gameStatus = document.getElementById('game-status');
              if (gameStatus) {
                gameStatus.textContent = 'Your turn! Click a square to play.';
              }
            }
          } else {
            console.log('[TicTacToe P2P] Move was rejected by game logic');
          }
        }
        break;
        
      case 'game-end':
        this._showGameEnd(message.winner);
        break;
        
      case 'game-reset':
        if (gameLogic) {
          gameLogic.reset();
        }
        this._updateGameBoard();
        
        // Update UI
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
          if (currentRoom.isHost) {
            gameStatus.textContent = 'Game reset! Your turn (X).';
          } else {
            gameStatus.textContent = 'Game reset! Wait for host to start.';
          }
        }
        
        // Hide reset button
        const resetBtn = document.getElementById('reset-game-btn');
        if (resetBtn) {
          resetBtn.style.display = 'none';
        }
        
        // Enable game board
        const gameCells = document.querySelectorAll('.game-cell');
        gameCells.forEach(cell => cell.classList.remove('disabled'));
        break;
        
      default:
        console.warn('[TicTacToe P2P] Unknown game message type:', message.type);
    }
  },
  
  /**
   * Update game board display
   */
  _updateGameBoard() {
    if (!gameLogic) return;
    
    const board = gameLogic.getBoard();
    const gameCells = document.querySelectorAll('.game-cell');
    
    gameCells.forEach((cell, index) => {
      cell.textContent = board[index] || '';
    });
  },
  
  /**
   * Show game end result
   */
  _showGameEnd(winner) {
    const gameStatus = document.getElementById('game-status');
    if (gameStatus) {
      if (winner === 'draw') {
        gameStatus.textContent = "It's a draw! 🤝";
      } else {
        const isWinner = (currentRoom?.isHost && winner === 'X') || (!currentRoom?.isHost && winner === 'O');
        gameStatus.textContent = isWinner ? `You win! 🎉 (${winner})` : `You lose! 😔 (${winner})`;
      }
    }
    
    // Show reset button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.style.display = 'block';
    }
    
    // Disable game board
    const gameCells = document.querySelectorAll('.game-cell');
    gameCells.forEach(cell => cell.classList.add('disabled'));
  },
  
  /**
   * Bind UI event handlers
   */
  _bindUIEvents() {
    // Create room button
    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', () => this.createRoom());
    }
    
    // Join room button
    const joinRoomBtn = document.getElementById('join-room-btn');
    const invitationInput = document.getElementById('invitation-input');
    if (joinRoomBtn && invitationInput) {
      joinRoomBtn.addEventListener('click', () => {
        const invitation = invitationInput.value.trim();
        if (invitation) {
          this.joinRoom(invitation);
        }
      });
    }
    
    // Leave room button
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    if (leaveRoomBtn) {
      leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
    }
    
    // Game board clicks
    const gameBoard = document.getElementById('game-board');
    if (gameBoard) {
      gameBoard.addEventListener('click', (event) => {
        const cell = event.target.closest('.game-cell');
        if (cell) {
          const position = parseInt(cell.dataset.position);
          this.makeMove(position);
        }
      });
    }
    
    // Reset game button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        gameLogic.reset();
        gameUI.updateBoard(gameLogic.getBoard());
        gameUI.showGameReset();
        
        if (currentRoom) {
          gameConnection.sendGameMessage({ type: 'game-reset' });
        }
      });
    }
    
    // Complete connection button (for host)
    const completeBtn = document.getElementById('complete-connection-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        const answerInput = document.getElementById('answer-input-text');
        if (answerInput && answerInput.value.trim()) {
          this.completeConnection(answerInput.value.trim());
        }
      });
    }
    
    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    if (chatInput && sendChatBtn) {
      const sendChat = () => {
        const message = chatInput.value.trim();
        if (message) {
          this.sendChatMessage(message);
          chatInput.value = '';
        }
      };
      
      sendChatBtn.addEventListener('click', sendChat);
      
      chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          sendChat();
        }
      });
    }
  },
  
  /**
   * Bind buttons directly (like P2P serverless example)
   */
  _bindButtons() {
    console.log('[TicTacToe P2P] Binding buttons...');
    
    // Create Game button
    const createBtn = document.getElementById('create-invitation-btn');
    if (createBtn) {
      createBtn.onclick = async () => {
        try {
          console.log('[TicTacToe P2P] Create button clicked');
          const room = await this.createRoom();
          this._displayInvitation(room);
        } catch (e) {
          console.error('[TicTacToe P2P] Failed to create game:', e);
          alert('Failed to create game: ' + e.message);
        }
      };
      console.log('[TicTacToe P2P] Create button bound');
    } else {
      console.warn('[TicTacToe P2P] Create button not found');
    }
    
    // Join Game button
    const acceptBtn = document.getElementById('accept-invitation-btn');
    if (acceptBtn) {
      acceptBtn.onclick = async () => {
        try {
          console.log('[TicTacToe P2P] Join button clicked');
          const input = prompt('Enter invitation code:');
          if (input) {
            const room = await this.joinRoom(input);
            this._displayAnswer(room);
          }
        } catch (e) {
          console.error('[TicTacToe P2P] Failed to join game:', e);
          alert('Failed to join game: ' + e.message);
        }
      };
      console.log('[TicTacToe P2P] Join button bound');
    } else {
      console.warn('[TicTacToe P2P] Join button not found');
    }
    
    // Complete Connection button
    const completeBtn = document.getElementById('complete-connection-btn');
    if (completeBtn) {
      completeBtn.onclick = async () => {
        try {
          console.log('[TicTacToe P2P] Complete button clicked');
          const input = prompt('Enter answer code:');
          if (input) {
            await this.completeConnection(input);
            alert('Connection completed! You can now play and chat.');
          }
        } catch (e) {
          console.error('[TicTacToe P2P] Failed to complete connection:', e);
          alert('Failed to complete connection: ' + e.message);
        }
      };
      console.log('[TicTacToe P2P] Complete button bound');
    } else {
      console.warn('[TicTacToe P2P] Complete button not found');
    }
    
    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    if (chatInput && sendChatBtn) {
      const sendChat = () => {
        const message = chatInput.value.trim();
        if (message) {
          this.sendChatMessage(message);
          chatInput.value = '';
        }
      };
      
      sendChatBtn.onclick = sendChat;
      chatInput.onkeypress = (event) => {
        if (event.key === 'Enter') {
          sendChat();
        }
      };
      console.log('[TicTacToe P2P] Chat functionality bound');
    }
    
    // Game board clicks
    const gameCells = document.querySelectorAll('.game-cell');
    gameCells.forEach((cell, index) => {
      cell.onclick = () => {
        console.log('[TicTacToe P2P] Cell clicked:', index, 'disabled:', cell.classList.contains('disabled'), 'content:', cell.textContent);
        if (!cell.classList.contains('disabled') && !cell.textContent.trim()) {
          console.log('[TicTacToe P2P] Making move at position:', index);
          this.makeMove(index);
        } else {
          console.log('[TicTacToe P2P] Move blocked - disabled or occupied');
        }
      };
    });
    console.log('[TicTacToe P2P] Game board bound to', gameCells.length, 'cells');
    
    // Reset game button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        console.log('[TicTacToe P2P] Reset button clicked');
        this.resetGame();
      };
      console.log('[TicTacToe P2P] Reset button bound');
    } else {
      console.warn('[TicTacToe P2P] Reset button not found');
    }
  },
  
  /**
   * Display invitation modal (like P2P serverless example)
   */
  _displayInvitation(room) {
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🎮 Game Created!</h3>
        <p>Share this invitation with your friend:</p>
        <textarea readonly>${room.invitation}</textarea>
        <button onclick="navigator.clipboard.writeText('${room.invitation}').then(() => alert('Copied!'))">Copy Invitation</button>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  },
  
  /**
   * Display answer modal (like P2P serverless example)
   */
  _displayAnswer(room) {
    const modal = document.createElement('div');
    modal.className = 'p2p-invitation-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>📤 Send This Answer Back</h3>
        <p>Copy this answer and send it to the host:</p>
        <textarea readonly>${room.answerInvitation}</textarea>
        <button onclick="navigator.clipboard.writeText('${room.answerInvitation}').then(() => alert('Copied!'))">Copy Answer</button>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
};
