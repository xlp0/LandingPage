# Go Game PKC Edition

Game Documentation

---

## Overview

Go Game PKC Edition is a web-based implementation of the ancient board game Go, also known as Baduk in Korean or Weiqi in Chinese. The game is integrated with ZITADEL authentication, requiring players to log in before they can play. It runs entirely in your web browser and is part of the Personal Knowledge Container ecosystem.

Platform: Web Browser using HTML5 Canvas
Authentication: ZITADEL with OAuth 2.0 and PKCE
Players: 2 players in local multiplayer mode
Board Size: 9x9 grid
Technology: JavaScript and HTML5 Canvas
Deployment: https://pkc.pub

---

## Features

What the Game Includes

Classic Go gameplay on a 9x9 board with black and white stones. Players place stones on intersections of the grid lines by clicking. The game includes proper Go rules including liberty counting, stone capture mechanics, and territory scoring.

The interface features a traditional wooden board appearance with a gradient green background. Grid lines are drawn in black with star points marking key intersections. Stones are rendered with realistic gradients showing black and white pieces. The last move is highlighted with a red circle.

Local multiplayer supports 2 players taking turns on the same device. Black always plays first. The game displays whose turn it is and tracks captured stones for each player. A complete move history log shows all moves including passes and captures.

Game mechanics include automatic capture of stones with no liberties, group detection for connected stones, pass functionality when players have no good moves, and game end detection when both players pass consecutively. Territory counting happens automatically at game end with komi compensation for white.

Authentication and Security

The game uses secure login through ZITADEL with OAuth 2.0 and PKCE for protection. Your login session persists across page reloads, and tokens refresh automatically when needed.

User profiles are integrated from ZITADEL. The game displays your name, email, and avatar if you have one set up. There's a logout button when you want to sign out.

You can log in using your ZITADEL account directly, or if configured, you can use Google Sign-In or other identity providers that ZITADEL supports.

---

## How to Play

Accessing the Game

There are two ways to access the game. The first is through the PKC landing page at https://pkc.pub/app.html. Click on Apps in the sidebar, select Go, then click the button to open the authenticated game. A new window will open with the game.

The second way is to go directly to https://pkc.pub/public/examples/games/go-auth.html. You'll see the login screen right away.

Logging In

Click the Login with ZITADEL button. You'll be redirected to the ZITADEL login page where you can choose your login method. Either enter your ZITADEL username and password, or click Sign in with Google if that option is available. After logging in successfully, you'll be redirected back to the game and your profile information will appear in the header showing your name, email, and avatar.

Starting a Game

Once you're logged in, the Go board appears immediately as an empty 9x9 grid. Black plays first. The current player is shown at the top of the board along with the number of stones each player has captured.

Playing the Game

On your turn, click on any empty intersection to place your stone. The stone will appear immediately and the turn will pass to your opponent. You cannot place a stone on an occupied intersection.

If your move surrounds opponent stones and removes all their liberties, those stones are automatically captured and removed from the board. The capture count updates immediately.

If you have no good moves, click the Pass Turn button. If both players pass consecutively, the game ends and territory is counted automatically.

---

## Game Rules

The Board

The Go board is a 9x9 grid of lines creating 81 intersections. Stones are placed on the intersections, not in the squares. The board starts empty. Star points mark strategic positions on the board.

Placing Stones

Players alternate placing one stone per turn. Black plays first. Once placed, stones do not move unless captured. You cannot place a stone on an occupied intersection.

Liberties

A liberty is an empty intersection directly adjacent to a stone or group of stones. Stones need liberties to survive. Adjacent means horizontally or vertically connected, not diagonally.

Connected stones of the same color form a group and share their liberties. A group's liberties are all the empty intersections directly next to any stone in the group.

Capturing Stones

When a stone or group has no liberties remaining, it is captured and removed from the board. Captured stones are counted and displayed for each player.

You can capture opponent stones by surrounding them completely. The captured stones are removed immediately after your move.

Suicide Rule

You cannot place a stone that would have no liberties unless that move captures opponent stones. This is called the suicide rule and prevents invalid moves.

Ko Rule

The game implements a simplified ko rule. You cannot immediately recapture in a way that returns the board to the previous position. This prevents infinite loops.

Passing

If you have no good moves, you can pass your turn. Click the Pass Turn button to pass. Passing does not forfeit the game.

Ending the Game

The game ends when both players pass consecutively. This indicates both players agree there are no more profitable moves to make.

Scoring

When the game ends, territory is counted automatically. Each player scores one point for each intersection they control plus one point for each stone they captured.

White receives 6.5 points of komi as compensation for playing second. This balances the first-move advantage that black has.

The player with the higher total score wins the game.

---

## Current Status and Future Plans

What's Working Now

The current version includes ZITADEL authentication, user profile integration, local 2-player multiplayer on a 9x9 board, stone placement on intersections, liberty counting and group detection, automatic stone capture, suicide rule enforcement, simplified ko rule, pass functionality, automatic game end detection, and territory scoring with komi.

Planned Features

Future versions will add support for larger board sizes including 13x13 and 19x19, full ko rule implementation, dead stone marking at game end, handicap stones for skill balancing, game timer and byoyomi time controls, SGF file export for game records, game review mode to replay moves, AI opponent for single-player practice, and online multiplayer with WebSocket support.

---

## Quick Start

To get started, access the game at https://pkc.pub/app.html. Click on Apps in the sidebar, then select Go. Click the button to open the authenticated game. Log in with ZITADEL or Google. The empty board will appear. Click on any intersection to place a stone. Surround opponent stones to capture them. Click Pass Turn when you have no good moves. The game ends when both players pass. Territory is counted automatically to determine the winner.

---

## Quick Rules Reference

Click intersections to place stones
Surround opponent stones to capture them
Stones with no liberties are captured and removed
Connected stones of the same color form groups
Groups share their liberties
Cannot place stones with no liberties unless capturing
Pass your turn if you have no good moves
Game ends when both players pass consecutively
Score equals territory plus captured stones plus komi for white

---

Version 1.0.0 - Authenticated Local Multiplayer
Last Updated March 10, 2026
Maintained by PKC Development Team
