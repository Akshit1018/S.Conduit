# Conduit — Open Source MCP Control Plane

**Conduit** is an open-source **MCP control plane** demo. One desk to watch tool calls across GitHub, Linear, Notion, HubSpot, and a security source — with human-in-the-loop writes.

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)

## Features

- Live-style tool-call log (`tools/call` → cited content)
- Source cards for GitHub, Linear, Notion, HubSpot, Aegis
- HITL (human-in-the-loop) write path
- Landing + authenticated app shell
- Useful as a **Model Context Protocol** teaching app

## Who it is for

- Teams wiring **MCP servers** into one cockpit
- Platform engineers building an **agent control plane**
- Security / RevOps demos

## Quick start

```bash
git clone https://github.com/Akshit1018/S.Conduit.git
cd S.Conduit
npm install
VITE_AUTH_ENABLED=false npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

Integrations in this repo are a **sandbox**. Point them at real credentials only in your own fork.

## Tech stack

React 19 · TanStack Start · Vite · Tailwind · MCP

## License

[MIT](LICENSE)

## Keywords

MCP control plane, Model Context Protocol dashboard, agent tool router, HITL agent writes, open source MCP demo
