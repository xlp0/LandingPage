// PKC Module: tic-tac-toe-p2p/game-logic
// Purpose: Tic-Tac-Toe game logic and state management

/**
 * Tic-Tac-Toe Game Logic
 * Manages game state, moves, and win conditions
 */
export class TicTacToeGame {
  constructor() {
    this.reset();
  }
  
  /**
   * Reset game to initial state
   */
  reset() {
    this.board = Array(9).fill(null); // 3x3 grid as flat array
    this.currentPlayer = 'X'; // X always starts
    this.playerRole = null; // 'X' or 'O' - what this player controls
    this.gameState = 'waiting'; // 'waiting', 'playing', 'finished'
    this.winner = null;
    this.winningLine = null;
  }
  
  /**
   * Set this player's role (X or O)
   */
  setPlayerRole(role) {
    if (role !== 'X' && role !== 'O') {
      throw new Error('Invalid player role. Must be X or O');
    }
    this.playerRole = role;
    this.gameState = 'playing';
  }
  
  /**
   * Get current game board
   */
  getBoard() {
    return [...this.board]; // Return copy
  }
  
  /**
   * Get current player (whose turn it is)
   */
  getCurrentPlayer() {
    return this.currentPlayer;
  }
  
  /**
   * Get this player's role
   */
  getPlayerRole() {
    return this.playerRole;
  }
  
  /**
   * Get game state
   */
  getGameState() {
    return this.gameState;
  }
  
  /**
   * Get winner (null if no winner yet)
   */
  getWinner() {
    return this.winner;
  }
  
  /**
   * Get winning line positions (for highlighting)
   */
  getWinningLine() {
    return this.winningLine;
  }
  
  /**
   * Check if current player can make a move
   */
  canMakeMove() {
    return this.gameState === 'playing' && 
           this.currentPlayer === this.playerRole && 
           !this.winner;
  }
  
  /**
   * Make a move at the specified position
   * @param {number} position - Position on board (0-8)
   * @returns {boolean} - True if move was successful
   */
  makeMove(position) {
    // Validate move
    if (!this._isValidMove(position)) {
      return false;
    }
    
    // Make the move
    this.board[position] = this.currentPlayer;
    
    // Check for winner
    this._checkWinner();
    
    // Switch players if game continues
    if (!this.winner && !this.isDraw()) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
    
    // Update game state
    if (this.winner || this.isDraw()) {
      this.gameState = 'finished';
    }
    
    return true;
  }
  
  /**
   * Make opponent's move (received via network)
   * @param {number} position - Position on board (0-8)
   * @param {string} player - Player making the move ('X' or 'O')
   * @returns {boolean} - True if move was successful
   */
  makeOpponentMove(position, player) {
    // Validate that it's the opponent's turn
    if (player === this.playerRole) {
      console.warn('[TicTacToeGame] Received move from self, ignoring');
      return false;
    }
    
    if (player !== this.currentPlayer) {
      console.warn('[TicTacToeGame] Received move from wrong player, ignoring');
      return false;
    }
    
    // Validate move
    if (!this._isValidMove(position)) {
      console.warn('[TicTacToeGame] Received invalid move, ignoring');
      return false;
    }
    
    // Make the move
    this.board[position] = player;
    
    // Check for winner
    this._checkWinner();
    
    // Switch players if game continues
    if (!this.winner && !this.isDraw()) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
    
    // Update game state
    if (this.winner || this.isDraw()) {
      this.gameState = 'finished';
    }
    
    return true;
  }
  
  /**
   * Check if the game is a draw
   */
  isDraw() {
    return !this.winner && this.board.every(cell => cell !== null);
  }
  
  /**
   * Get cell value at position
   */
  getCellValue(position) {
    if (position < 0 || position > 8) {
      return null;
    }
    return this.board[position];
  }
  
  /**
   * Check if a move is valid
   */
  _isValidMove(position) {
    // Check bounds
    if (position < 0 || position > 8) {
      return false;
    }
    
    // Check if cell is empty
    if (this.board[position] !== null) {
      return false;
    }
    
    // Check game state
    if (this.gameState !== 'playing') {
      return false;
    }
    
    // Check if there's already a winner
    if (this.winner) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check for winner and update game state
   */
  _checkWinner() {
    const winningLines = [
      // Rows
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      // Columns
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      // Diagonals
      [0, 4, 8],
      [2, 4, 6]
    ];
    
    for (const line of winningLines) {
      const [a, b, c] = line;
      if (this.board[a] && 
          this.board[a] === this.board[b] && 
          this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winningLine = line;
        return;
      }
    }
  }
  
  /**
   * Get game statistics
   */
  getGameStats() {
    const emptyCells = this.board.filter(cell => cell === null).length;
    const xCells = this.board.filter(cell => cell === 'X').length;
    const oCells = this.board.filter(cell => cell === 'O').length;
    
    return {
      emptyCells,
      xCells,
      oCells,
      totalMoves: xCells + oCells,
      isMyTurn: this.canMakeMove(),
      gameState: this.gameState,
      winner: this.winner,
      isDraw: this.isDraw()
    };
  }
  
  /**
   * Convert position to row/column coordinates
   */
  positionToCoords(position) {
    return {
      row: Math.floor(position / 3),
      col: position % 3
    };
  }
  
  /**
   * Convert row/column coordinates to position
   */
  coordsToPosition(row, col) {
    return row * 3 + col;
  }
}
