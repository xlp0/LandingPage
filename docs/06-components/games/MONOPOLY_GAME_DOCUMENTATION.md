# Monopoly PKC Edition

Game Documentation

---

## Overview

Monopoly PKC Edition is a web-based version of the classic Monopoly board game. It's integrated with ZITADEL authentication, which means players need to log in before they can play. The game is part of the Personal Knowledge Container ecosystem and runs entirely in your web browser.

Platform: Web Browser using HTML5 Canvas
Authentication: ZITADEL with OAuth 2.0 and PKCE
Players: 2 to 4 players in local multiplayer mode
Technology: JavaScript and HTML5 Canvas
Deployment: https://pkc.pub

---

## Features

What the Game Includes

Classic Monopoly gameplay with a 40-tile board featuring colored property groups. Players can roll dice with animations, buy and sell properties, collect rent from other players, and interact with Chance and Community Chest cards. The game includes jail mechanics, bankruptcy detection, and proper win conditions.

The interface is modern and responsive with smooth animations. There's a real-time game log showing all actions, a player status panel, property ownership tracking, and balance management for each player.

Local multiplayer supports 2 to 4 players. Each player can have a custom name, and the game follows traditional turn-based gameplay where players take turns on the same device.

Authentication and Security

The game uses secure login through ZITADEL with OAuth 2.0 and PKCE for protection. Your login session persists across page reloads, and tokens refresh automatically when needed.

User profiles are integrated from ZITADEL. The game displays your name, email, and avatar if you have one set up. There's also a logout button when you want to sign out.

You can log in using your ZITADEL account directly, or if configured, you can use Google Sign-In or other identity providers that ZITADEL supports.

---

## How to Play

Accessing the Game

There are two ways to access the game. The first is through the PKC landing page at https://pkc.pub/app.html. Click on Apps in the sidebar, select Monopoly (Auth), then click the button to open the authenticated game. A new window will open with the game.

The second way is to go directly to https://pkc.pub/public/examples/games/monopoly-auth.html. You'll see the login screen right away.

Logging In

Click the Login with ZITADEL button. You'll be redirected to the ZITADEL login page where you can choose your login method. Either enter your ZITADEL username and password, or click Sign in with Google if that option is available. After logging in successfully, you'll be redirected back to the game and your profile information will appear in the header showing your name, email, and avatar.

Starting a Game

Once you're logged in, you'll see the setup screen. Enter the number of players, which can be anywhere from 2 to 4. Then enter each player's name. Click Start Game and the board will appear with all players positioned at GO.

Playing the Game

On your turn, click the Roll Dice button. Your token will move automatically based on the dice roll. If you land on an unowned property, a modal will pop up asking if you want to buy it. Click Buy to purchase it or Decline to skip. If you land on a property owned by another player, rent is automatically deducted from your balance. After you complete your actions, the turn passes to the next player. The last player who hasn't gone bankrupt wins the game.

---

## Game Rules

The Board

The board has 40 tiles in total. This includes 22 properties grouped by color, 4 railroads, and 2 utilities. There are 3 Chance spaces and 3 Community Chest spaces. The four corners are GO, Jail, Free Parking, and Go to Jail. Finally, there are 2 tax spaces.

Starting the Game

Each player begins with $1500. Everyone starts at the GO space. Players take turns in sequential order.

Taking Your Turn

Roll two dice, each showing values from 1 to 6. Move your token clockwise around the board based on the total. When you land on a space, different things happen depending on what it is.

If it's an unowned property, you get the option to buy it. If someone else owns it, you pay them rent. Landing on Chance or Community Chest will let you draw a card in future versions. Passing or landing on GO gives you $200. Tax spaces require you to pay the amount shown. If you land on Jail, you're just visiting and there's no penalty.

Owning Properties

To purchase a property, pay the listed price and it becomes yours. When other players land on your properties, they pay you rent. If you own all properties of the same color, you have a monopoly. Houses can be built on monopolies in future versions of the game.

Going Bankrupt

A player goes bankrupt when their balance reaches zero or goes negative. Bankrupt players are eliminated from the game. Any properties they owned return to the bank and become available for purchase again.

Winning the Game

The last player who hasn't gone bankrupt wins. When the game ends, a screen appears showing the winner and their final balance.

---

## Current Status and Future Plans

What's Working Now

The current version includes authentication with ZITADEL, user profile integration, local multiplayer for 2 to 4 players, basic Monopoly mechanics, property ownership, rent collection, bankruptcy detection, and win conditions.

Planned Features

Future versions will add real-time multiplayer using WebSockets, a game lobby system where you can invite friends, functional Chance and Community Chest cards, the ability to build houses and hotels, property trading between players, a mortgage system, player statistics and leaderboards, game history with replays, and tournament mode.

---

## Quick Start

To get started, access the game at https://pkc.pub/app.html. Click on Apps in the sidebar, then select Monopoly (Auth). Click the button to open the authenticated game. Log in with ZITADEL or Google. Enter the number of players, between 2 and 4. Enter each player's name. Click Start Game. Then roll the dice and start playing.