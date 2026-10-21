# Chess Game PKC Edition

Game Documentation

---

## Overview

Chess Game PKC Edition is a web-based implementation of the classic chess board game. The game is integrated with ZITADEL authentication, requiring players to log in before they can play. It runs entirely in your web browser and is part of the Personal Knowledge Container ecosystem.

Platform: Web Browser using HTML5 Canvas
Authentication: ZITADEL with OAuth 2.0 and PKCE
Players: 2 players in local multiplayer mode
Technology: JavaScript and HTML5 Canvas
Deployment: https://pkc.pub

---

## Features

What the Game Includes

Classic chess gameplay on an 8x8 board with all standard pieces. Players can move pieces by clicking to select and clicking again to place. The game includes proper chess piece movement rules for pawns, rooks, bishops, knights, queens, and kings. Move validation ensures only legal moves are allowed.

The interface features a beautiful gradient background with a wooden-style board. Light and dark squares follow the traditional chess board pattern. Selected pieces are highlighted in green, and valid move destinations are shown in gold. The last move is highlighted to help players track the game flow.

Local multiplayer supports 2 players taking turns on the same device. The game displays whose turn it is and maintains a complete move history log. Each move is recorded with chess notation showing the piece and destination square.

Authentication and Security

The game uses secure login through ZITADEL with OAuth 2.0 and PKCE for protection. Your login session persists across page reloads, and tokens refresh automatically when needed.

User profiles are integrated from ZITADEL. The game displays your name, email, and avatar if you have one set up. There's a logout button when you want to sign out.

You can log in using your ZITADEL account directly, or if configured, you can use Google Sign-In or other identity providers that ZITADEL supports.

---

## How to Play

Accessing the Game

There are two ways to access the game. The first is through the PKC landing page at https://pkc.pub/app.html. Click on Apps in the sidebar, select Chess, then click the button to open the authenticated game. A new window will open with the game.

The second way is to go directly to https://pkc.pub/public/examples/games/chess-auth.html. You'll see the login screen right away.

Logging In

Click the Login with ZITADEL button. You'll be redirected to the ZITADEL login page where you can choose your login method. Either enter your ZITADEL username and password, or click Sign in with Google if that option is available. After logging in successfully, you'll be redirected back to the game and your profile information will appear in the header showing your name, email, and avatar.

Starting a Game

Once you're logged in, the chess board appears immediately with all pieces in their starting positions. White pieces are at the bottom, black pieces at the top. White always moves first.

Playing the Game

On your turn, click on one of your pieces to select it. The piece will be highlighted in green, and all valid moves for that piece will be highlighted in gold. Click on any highlighted square to move your piece there. If you change your mind, click on a different piece of yours to select it instead.

The game automatically switches turns after each move. The current player is shown at the top of the board. All moves are recorded in the move history log at the bottom of the screen.

---

## Game Rules

The Board

The chess board has 64 squares arranged in an 8x8 grid. Squares alternate between light and dark colors. Each player starts with 16 pieces arranged on their side of the board.

Piece Movement

Pawns move forward one square, or two squares on their first move. They capture diagonally forward one square. Pawns cannot move backward.

Rooks move any number of squares horizontally or vertically in straight lines. They cannot jump over other pieces.

Bishops move any number of squares diagonally. Each bishop stays on its starting color throughout the game.

Knights move in an L-shape, two squares in one direction and one square perpendicular. Knights are the only pieces that can jump over other pieces.

Queens combine the movement of rooks and bishops. They can move any number of squares horizontally, vertically, or diagonally.

Kings move one square in any direction. The king is the most important piece and must be protected.

Capturing Pieces

To capture an opponent's piece, move your piece to the square occupied by the opponent's piece. The opponent's piece is removed from the board. You cannot capture your own pieces.

Special Moves

The current version implements basic chess rules. Advanced moves like castling, en passant, and pawn promotion will be added in future versions.

Winning the Game

The game continues until one player achieves checkmate or the players agree to a draw. In the current version, players manage game end conditions themselves. Automatic checkmate detection will be added in future updates.

---

## Current Status and Future Plans

What's Working Now

The current version includes ZITADEL authentication, user profile integration, local 2-player multiplayer, standard piece movement for all chess pieces, move validation, move history tracking, and visual highlighting for selected pieces and valid moves.

Planned Features

Future versions will add automatic check and checkmate detection, castling support, en passant captures, pawn promotion when reaching the opposite end, draw conditions including stalemate and threefold repetition, a chess clock for timed games, move notation in standard algebraic notation, game save and load functionality, and an AI opponent for single-player mode.

---

## Quick Start

To get started, access the game at https://pkc.pub/app.html. Click on Apps in the sidebar, then select Chess. Click the button to open the authenticated game. Log in with ZITADEL or Google. The board will appear with pieces in starting positions. Click a piece to select it, then click a highlighted square to move. Take turns with your opponent until the game ends.

---

Version 1.0.0 - Authenticated Local Multiplayer
Last Updated March 10, 2026
Maintained by PKC Development Team
