# 🖥️ Internet Café Monitoring System

A **full-stack, real-time computer monitoring and remote control system** designed for internet café environments. Monitor all PCs on your LAN from a beautiful web dashboard — view live screenshots, CPU/RAM usage, and remotely control each machine.

![Dashboard Preview](https://img.shields.io/badge/Status-Production_Ready-green?style=for-the-badge)
![Laravel](https://img.shields.io/badge/Backend-Laravel_11-FF2D20?style=for-the-badge&logo=laravel)
![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Client-Node.js-339933?style=for-the-badge&logo=node.js)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Setup Guide](#-setup-guide)
  - [Auto Startup](#-auto-startup)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup (Laravel 11)](#2-backend-setup-laravel-11)
  - [3. Frontend Setup (React)](#3-frontend-setup-react)
  - [4. Client Agent Setup (Node.js)](#4-client-agent-setup-nodejs)

## 🚀 Auto Startup

To quickly run the Client Agent and React Frontend environments, just double-click:
`start_system.bat`

This batch script will automatically install missing `node_modules` and launch both the dashboard and background client locally!

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    LAN Network (192.168.1.x)                 │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                │
│  │  PC-01   │    │  PC-02   │    │  PC-03   │   ... more     │
│  │  Agent   │    │  Agent   │    │  Agent   │                │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                │
│       │               │               │                      │
│       │    HTTP POST /api/heartbeat   │                      │
│       │    HTTP GET /api/get-command  │                      │
│       └───────────┬───┴───────────────┘                      │
│                   │                                          │
│           ┌───────▼───────┐                                  │
│           │  Server       │                                  │
│           │  192.168.1.2  │                                  │
│           │               │                                  │
│           │  ┌─────────┐  │     ┌──────────────┐             │
│           │  │ Laravel │◄├─────┤  React        │             │
│           │  │  API    │  │     │  Dashboard   │             │
│           │  │  :8000  │  │     │  :5173       │             │
│           │  └────┬─────┘  │     └──────────────┘             │
│           │       │        │                                  │
│           │  ┌────▼─────┐  │                                  │
│           │  │  MySQL   │  │                                  │
│           │  │  :3306   │  │                                  │
│           │  └──────────┘  │                                  │
│           └────────────────┘                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Setup Guide

### 1. Database Setup

1. Open MySQL/MariaDB command line or phpMyAdmin
2. Run the schema file:
```sql
source database/schema.sql;
```

### 2. Backend Setup (Laravel 11)

The new `start_system.bat` file fully handles the manual steps for you.
It will automatically run `composer create-project`, configure the `.env` API keys, update your middleware in `bootstrap/app.php`, and move our core application controllers/routers from `laravel-backend/` directly inside the new `backend/`!

If executing it manually, the batch file runs this internally:
1. `composer create-project laravel/laravel:^11.0 backend`
2. `xcopy /S /Y "laravel-backend\*" "backend\"`
3. Sets up `.env` mapping.
4. Starts servers.

> **Important**: Ensure your MySQL is running and you import `database/schema.sql` to setup tables, then configure credentials in `backend/.env`.

---

### 3. Frontend Setup (React)

You can launch this using `start_system.bat` (which runs `npm run dev`), letting you immediately view the beautiful design.
Or execute manually:
```bash
cd frontend
npm install
npm run dev
```

### 4. Client Agent Software (Node.js)

To prevent customers from deleting or closing the agent gracefully, you can package the Node.js script into an invisible, native `.exe` software, or install it as a hidden Windows Service that restarts seamlessly.

**Method A: Native Invisible `.exe` Software**
Double-click `client-agent/build-agent.bat` to instantly compile your JS agent using `pkg` into `ICafeAgent.exe`. Send this lightweight file to your client PCs!

**Method B: Hidden Windows Service Install**
Since Windows Services run invisibly and require admin passwords to stop, they are safe from customers. Open a terminal in the agent folder:
```bash
cd client-agent
npm install
npm run install-service
```
This registers "ICafe Monitoring Agent" on the system, which starts automatically on boot in the background!

*To uninstall later:* `npm run uninstall-service`

---

## 🧩 Git Remote + Commit + Push Flow

### Step 1: Create repository on GitHub
- Open: https://github.com/new
- Name: `InternetCafeSystem`
- Set Public/Private and create repository.

### Step 2: Set remote in local project
```bash
cd "C:\Users\johnx\OneDrive\Documents\PROJECTS\InternetCafeSystem"
# if not already configured
git remote add origin https://github.com/Buttermuffles/InternetCafeSystem.git
```

### Step 3: Commit existing local files
```bash
git add .
git commit -m "Initial commit - full project"
```

### Step 4: Push to GitHub
```bash
git push -u origin master
# or if default branch is main:
# git push -u origin main
```

### Step 5: Verify remote state
```bash
git remote -v
git log --oneline -n 5
```

---

## 🚀 Optional: create GitHub repo + push with GitHub CLI
```bash
gh repo create Buttermuffles/InternetCafeSystem --public --source . --remote origin --push
```

If you get `repository not found`, confirm the remote exists at https://github.com/Buttermuffles/InternetCafeSystem and repeat push commands.

---

## 🔁 Realtime online/offline status via server-side Pusher

- Heartbeat endpoint `/api/heartbeat` now broadcasts `PcUpdated` with `status` set to `online`.
- `Pc::getWithStatus()` marks stale PCs offline after 15s of no heartbeat and broadcasts `PcUpdated` for offline transitions.
- Dashboard consuming Pusher event `PcUpdated` will reflect status changes immediately.

Ensure env contains correct Pusher keys:
```
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=...
```


