# NetCollaborate – Real-Time Collaborative Virtual Network Simulator

A modern, browser-based, educational SaaS platform where students, network engineers, and educators can simultaneously design, configure, test, and troubleshoot virtual computer networks in real time.

---

## 1. Problem Statement

Students typically learn computer networking concepts individually through static diagrams or single-user desktop simulation tools. These tools fail to provide a collaborative multiplayer environment where multiple peers can simultaneously design topologies, allocate IP subnets, diagnose misconfigurations, and observe how packets navigate network interfaces.

Furthermore, abstract concepts like packet routing, default gateways, ARP resolution, TTL expiration, and subnet masks are difficult to grasp without dynamic, visual packet feedback and automated diagnostic troubleshooting.

---

## 2. Proposed Solution

**NetCollaborate** transforms computer networking education into a collaborative experience:
- **Interactive Multi-Device Canvas**: Drag and drop Routers, Switches, PCs, Servers, Firewalls, Hubs, and Access Points onto a shared canvas.
- **Dynamic Topology Connections**: Connect devices with Ethernet, Fiber, and Wireless links with live link status.
- **Complete Device Configuration**: Configure IP addresses, Subnet masks, Default Gateways, DNS, MAC addresses, router multi-interfaces (G0/0, G0/1), static routing tables, and switch VLANs.
- **Custom Network Simulation Engine**: Simulates realistic hop-by-hop packet transmission with animated packet movement across canvas edges.
- **Integrated ICMP Ping Terminal**: Realistic streaming terminal output measuring Round-Trip Time (RTT) and packet loss.
- **Intelligent Troubleshooting Debugger**: Automatically identifies IP conflicts, missing routes, invalid subnet masks, and network loops with **1-click Quick Fixes**.
- **Real-Time Multiplayer Collaboration**: Powered by Socket.IO with live collaborator cursors, synchronized canvas operations, active room users, and in-room team chat.
- **Educational Guide & Quiz Mode**: Interactive networking glossary and challenges with automated scoring.

---

## 3. Technology Stack

### Frontend
- **Framework**: React.js (Vite)
- **Canvas / Topology Engine**: React Flow (`reactflow`)
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT Interceptors
- **Real-Time WebSockets**: Socket.IO Client
- **Interactive Confetti**: Canvas Confetti
- **Styling**: Modern CSS Design System (Dark & Light Theme variables, Glassmorphism, Glowing Badges)

### Backend
- **Runtime**: Node.js & Express.js
- **Real-Time Server**: Socket.IO
- **Database**: MongoDB with Mongoose (with automated In-Memory Resilience Fallback)
- **Security & Auth**: JSON Web Tokens (JWT) & bcryptjs
- **Simulation Algorithms**: Graph traversal (BFS/DFS), Longest Prefix Match (LPM), cycle detection, IP/CIDR math

---

## 4. Application Architecture

```text
Netcollaborate/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NetworkCanvas.jsx          # Interactive React Flow canvas with live cursors
│   │   │   ├── DeviceNode.jsx             # Custom node displaying device icon, IP, and status
│   │   │   ├── NetworkEdge.jsx            # Custom animated link (Ethernet, Fiber, Wireless)
│   │   │   ├── Sidebar.jsx                # Draggable device catalog with OSI layer tooltips
│   │   │   ├── Toolbar.jsx                # Device search, undo/redo, save, fit view, quick triggers
│   │   │   ├── ConfigurationPanel.jsx     # Dynamic device settings (PC, Router, Switch, Firewall)
│   │   │   ├── SimulationPanel.jsx        # Send Packet & Ping tools with terminal output
│   │   │   ├── DebugPanel.jsx             # Topology analyzer with 1-click Quick Fixes
│   │   │   ├── CollaborationPanel.jsx     # Active users, live cursor broadcast, activity log & chat
│   │   │   ├── NetworkStats.jsx           # Health score gauge & device statistics
│   │   │   ├── Navbar.jsx                 # Top navigation, room code copy, theme switch
│   │   │   ├── EducationalPanel.jsx       # Interactive networking guide (OSI, Subnets, Routing)
│   │   │   ├── QuizModal.jsx              # Interactive networking quiz challenge with scoring
│   │   │   └── CreateNetworkModal.jsx     # Create project modal
│   │   ├── pages/
│   │   │   ├── Landing.jsx                # Modern SaaS hero page with "Try Demo"
│   │   │   ├── Login.jsx                  # User login & "Continue as Guest"
│   │   │   ├── Register.jsx               # Registration with full validation
│   │   │   ├── Dashboard.jsx              # Project list, network cards with health %, join room
│   │   │   ├── Workspace.jsx              # Main workspace orchestrating canvas & panels
│   │   │   └── Profile.jsx                # User stats, saved networks, activity
│   │   ├── services/
│   │   │   ├── api.js                     # Axios client with JWT interceptor & demo fallbacks
│   │   │   └── socket.js                  # Socket.IO connection client and event handlers
│   │   ├── context/
│   │   │   ├── AuthContext.jsx            # Auth state (user, token, login, logout, guest mode)
│   │   │   └── NetworkContext.jsx         # Network topology, undo/redo history, active selection
│   │   ├── utils/
│   │   │   ├── demoNetwork.js             # Preconfigured multi-subnet enterprise demo network
│   │   │   └── networkMath.js             # IP/CIDR calculations, subnet mask utilities
│   │   ├── App.jsx                        # Route configuration & protected route guard
│   │   ├── main.jsx                       # React entry point
│   │   └── App.css                        # Modern CSS design system (Dark & Light themes)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/
│   ├── models/
│   │   ├── User.js                        # Mongoose user model with bcrypt hashing
│   │   ├── Network.js                     # Network project schema (nodes, edges, history, health)
│   │   └── CollaborationRoom.js           # Live room state and active users
│   ├── routes/
│   │   ├── authRoutes.js                  # POST /register, POST /login, GET /me, POST /guest
│   │   ├── networkRoutes.js               # CRUD networks, /simulate, /ping, /debug
│   │   └── userRoutes.js                  # User profile and stats
│   ├── controllers/
│   │   ├── authController.js              # Auth business logic & JWT generation
│   │   ├── networkController.js           # Network CRUD and simulation coordination
│   │   └── userController.js              # Profile data management
│   ├── middleware/
│   │   └── authMiddleware.js              # JWT verification & guest token support
│   ├── simulation/
│   │   ├── graph.js                       # Graph builder, topology representation, cycle detection
│   │   ├── validator.js                   # IPv4 validation, subnet analysis, duplicate IP, gateway checks
│   │   ├── routing.js                     # Longest Prefix Match routing lookup, ARP tables
│   │   └── packetSimulator.js             # Hop-by-hop packet journey simulation & ICMP Ping engine
│   ├── server.js                          # Express app, Socket.IO server & DB initialization
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## 5. Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)
- Optional: MongoDB running locally or MongoDB Atlas URI (if unavailable, the server automatically runs in zero-config In-Memory Resilience Mode)

### Quick Start

#### 1. Start the Backend Server
```bash
cd server
npm install
node server.js
```
The server will start on `http://localhost:5000`.

#### 2. Start the Frontend Client
In a new terminal:
```bash
cd client
npm install
npm run dev
```
The client application will start on `http://localhost:5173`. Open this URL in your browser.

---

## 6. Environment Variables

### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/netcollaborate
JWT_SECRET=netcollaborate_super_secret_jwt_key_2026
CLIENT_URL=http://localhost:5173
```

---

## 7. REST API Documentation

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Log in existing user | No |
| `POST` | `/api/auth/guest` | Instant guest login | No |
| `GET` | `/api/auth/me` | Fetch authenticated user | Yes |
| `GET` | `/api/networks` | List user & shared networks | Yes |
| `POST` | `/api/networks` | Create a new network project | Yes |
| `GET` | `/api/networks/:id` | Get network project by ID / Room ID | Yes |
| `PUT` | `/api/networks/:id` | Update nodes, edges, configs & stats | Yes |
| `DELETE` | `/api/networks/:id` | Delete network project | Yes |
| `POST` | `/api/networks/:id/simulate`| Run packet transmission simulation | Yes |
| `POST` | `/api/networks/:id/ping` | Run ICMP Ping simulation | Yes |
| `POST` | `/api/networks/:id/debug` | Run automated topology analyzer | Yes |
| `GET` | `/api/users/profile` | Get user statistics & summary | Yes |
| `PUT` | `/api/users/profile` | Update display name & avatar color | Yes |

---

## 8. Socket.IO Real-Time Collaboration Events

| Event Name | Direction | Payload Description |
|---|---|---|
| `join-room` | Client → Server | `{ roomId, user: { id, name, username, avatarColor } }` |
| `room-users` | Server → Room | Array of currently active users in the workspace |
| `cursor-move` | Client → Server | `{ roomId, cursor: { x, y } }` |
| `cursor-update` | Server → Room (others) | Collaborator cursor position with name and color tag |
| `node-change` | Client ↔ Server | Broadcasts node additions, deletions, and moves in real time |
| `edge-change` | Client ↔ Server | Broadcasts link creation and disconnection |
| `config-change`| Client ↔ Server | Synchronizes device IP, interface, or routing changes |
| `simulate-broadcast` | Client → Server | Triggers synchronized packet animation for all viewers |
| `send-message` | Client → Server | Sends collaborative team chat message |
| `activity-updated` | Server → Room | Live chronological activity log feed |

---

## 9. Simulation Engine & Packet Forwarding Logic

1. **Host Verification**: Confirms Source and Destination device statuses are operational (not administratively down).
2. **Subnet Evaluation**:
   - Compares Source IP and Destination IP using the Source Subnet Mask.
   - If in the same subnet: Dispatches directly via Layer 2 BFS path (host → switches → destination).
   - If in different subnets: Evaluates Source Default Gateway.
3. **Gateway Verification**: Locates the active router interface hosting the gateway IP and routes through local switches.
4. **Router Forwarding**:
   - Decrements TTL by 1 (drops packet if TTL reaches 0: ICMP Time Exceeded).
   - Checks firewall security policies (blocks packet if rule matches).
   - Searches the router static routing table using **Longest Prefix Match (LPM)**.
   - If directly connected: forwards out interface to destination subnet.
   - If next hop: resolves adjacent router IP and repeats.
5. **Animation & Tracing**:
   - Generates animation sequence with active node and edge markers.
   - Produces diagnostic hop table with timestamps and detailed protocol actions.

---

## 10. Educational Features & Quiz Mode

- **Concepts Covered**: Routers, Switches, Hubs, Firewalls, IPv4, Subnetting, OSI Model Layers 1–7, Default Gateways, DNS, ARP, and TTL.
- **Interactive Quiz**: Includes multiple-choice networking challenges, real-time score tracking, explanations for answers, and celebratory confetti upon completion.

---

## 11. Testing & Verification

Run the built-in simulation unit tests:
```bash
cd server
node simulation/testSimulation.js
```
All unit tests verify IP validation, subnet mask compliance, Longest Prefix Match routing, multi-router packet delivery, and Ping calculations.
