# NetCollaborate
## Real-World Multi-User Networking, Communication & FSK Simulation Laboratory

> **Tagline**: *Connect. Collaborate. Communicate. Simulate. Learn.*

NetCollaborate is a full-stack, production-grade educational SaaS and local college computer laboratory platform. It bridges the gap between Layer 2/3 computer networking and Layer 1 physical digital communications by embedding a mathematically rigorous Digital Signal Processing (DSP) engine directly into a multiplayer, real-time collaborative workspace.

---

## 1. Project Vision & Real-World Use Case

In a typical college networking or digital communications laboratory, students individually perform experiments on isolated desktop workstations using disconnected software tools. This leads to fragmented understanding where students never see how high-level IP routing and packet forwarding physically translate into modulated electromagnetic waveforms across physical transmission channels.

**NetCollaborate** provides a centralized, browser-accessible laboratory where:
- Faculty create centralized laboratory sessions (with custom session codes, QR codes, and duration limits).
- Students join instantly using session codes or QR scans without complex IP client configurations.
- An entire laboratory section works concurrently on live network topologies and digital communication links.
- When students send digital data between devices across routers and communication channels, NetCollaborate renders **two synchronized levels simultaneously**:
  1. **Network Level (Layer 2/3)**: Hop-by-hop packet traversal, ARP resolution, TTL decrements, and routing table evaluation.
  2. **Signal Level (Layer 1 Physical)**: Continuous-phase BFSK carrier signal generation, physical channel attenuation and Gaussian noise, matched-filter correlation detection, and exact Bit Error Rate (BER) calculation.

---

## 2. Core Architecture & Workflow

```text
              NETCOLLABORATE WORKFLOW
                         |
           Faculty Creates Lab Session (Code / QR)
                         ↓
               Students Join via Code
                         ↓
           Design Topology & Communication Link
                         ↓
             Enter Digital Bitstream / Text
                         ↓
              Select Modulation: [BFSK]
                         ↓
          FSK Modulator generates s(t) = A cos(2πfi t)
                         ↓
      Physical Channel (Noise %, Attenuation, Delay)
                         ↓
          Received Signal r(t) = s(t) + n(t)
                         ↓
      Matched-Filter Correlators: I_k, Q_k & Energy E_k
                         ↓
        Decision Threshold: argmax(E_k) -> Rx Bits
                         ↓
           Compare Tx vs Rx Bits -> Calculate BER
                         ↓
           Simultaneous Dual-Level Visualization
                         ↓
         Automatic Academic Evaluation & Lab Report
```

---

## 3. Mathematical DSP & FSK Modulation Engine

The platform incorporates a genuine digital signal processing implementation with no hardcoded or fake simulation values.

### A. BFSK Continuous-Phase Signal Generation
For a binary symbol sequence $b_k \in \{0, 1\}$ with bit duration $T_b$:
- **Bit 0 (Space)**: Modulates with carrier frequency $f_0$ (e.g. $1000\text{ Hz}$)
- **Bit 1 (Mark)**: Modulates with carrier frequency $f_1$ (e.g. $2000\text{ Hz}$)

Continuous Phase Frequency Shift Keying (CPFSK) ensures phase continuity across symbol transitions to minimize sideband spectral leakage:
$$\phi(t) = \phi(t - \Delta t) + 2\pi f_i \Delta t, \quad s(t) = A \cos(\phi(t))$$

### B. Physical Channel Model
The channel introduces Gaussian thermal noise via Box-Muller transformation and amplitude attenuation:
$$r(t) = \alpha \cdot s(t) + n(t), \quad n(t) \sim \mathcal{N}(0, \sigma^2)$$
$$\text{SNR}_{\text{dB}} = 10 \log_{10}\left(\frac{P_{\text{signal}}}{P_{\text{noise}}}\right)$$

### C. Matched-Filter Quadrature Demodulation
The demodulator evaluates in-phase ($I$) and quadrature ($Q$) correlations for both candidate frequencies over each bit period $T_b$:
$$I_i = \int_{(k-1)T_b}^{k T_b} r(t) \cos(2\pi f_i t)\, dt, \quad Q_i = \int_{(k-1)T_b}^{k T_b} r(t) \sin(2\pi f_i t)\, dt$$
$$\text{Energy: } E_i = I_i^2 + Q_i^2$$
$$\text{Decision Rule: } \hat{b}_k = \begin{cases} 1, & \text{if } E_1 \ge E_0 \\ 0, & \text{if } E_1 < E_0 \end{cases}$$

### D. Carson's Bandwidth Rule & BER
- **Transmission Bandwidth**:
  $$B_{\text{FSK}} = |f_1 - f_0| + 2 R_b = |f_1 - f_0| + \frac{2}{T_b}$$
- **Bit Error Rate (BER)**:
  $$\text{BER} = \frac{\text{Number of Incorrect Bits}}{\text{Total Transmitted Bits}}$$
- **Theoretical Error Probability**:
  $$P_b = Q\left(\sqrt{\frac{E_b}{N_0}}\right) \quad \text{(Coherent BFSK)}$$

---

## 4. Key Platform Features

### 1. Dedicated FSK Laboratory (`/fsk-lab`)
- **4-Channel Interactive Oscilloscope**: High-resolution HTML5 Canvas oscilloscope rendering:
  - Trace 1: Clean Digital Input Sequence with bit labels
  - Trace 2: Carrier Frequency Symbol Mapping timeline ($f_1, f_0...$)
  - Trace 3: Modulated Sinusoidal FSK Waveform ($s(t)$ with frequency transitions)
  - Trace 4: Noisy Received Signal ($r(t)$ under Gaussian noise)
  - Trace 5: Demodulated Recovered Bits (matches in green, bit errors highlighted in red)
- **Oscilloscope Controls**: Play, Pause, Restart, Single-Step Bit Advance, Zoom In/Out (75% to 250%), and Playback Speed (0.5x, 1.0x, 2.0x).
- **Experiment: Effect of Noise on FSK**: Sweeps channel noise from 0% to 50% and draws an empirical BER curve vs the theoretical waterfall curve.
- **FSK vs ASK vs PSK Comparison**: Synchronized multi-trace comparison of Amplitude Shift Keying, Frequency Shift Keying, and Phase Shift Keying.
- **6-Step Educational Mode**: Step-by-step interactive walkthrough:
  1. Binary Bits $\to$ 2. Frequency Mapping $\to$ 3. Carrier Signal $\to$ 4. Channel Noise $\to$ 5. Correlator Demod $\to$ 6. Recovered Data.

### 2. Dual-Level Network + Physical Simulation
In the Network Simulator (`/workspace`):
- Select **Communication Method: FSK Digital Communication**.
- Enter binary bitstream or ASCII text.
- Hit **TRANSMIT FSK SIGNAL**:
  - **Level 1 (Layer 2/3)**: Packet hops across routers and switches with animated edges.
  - **Level 2 (Layer 1 Physical)**: Live FSK carrier waveform is generated, corrupted by channel noise, correlator-demodulated at the destination, and verified bit-by-bit.

### 3. Standardized Experiment Curriculum (9 Experiments)
1. **EXP-01**: Pulse Amplitude Modulation (PAM)
2. **EXP-02**: Amplitude Modulation (AM / DSB-FC)
3. **EXP-03**: Frequency Modulation (FM)
4. **EXP-04**: Amplitude Shift Keying (ASK / OOK)
5. **EXP-05**: Binary Frequency Shift Keying (BFSK)
6. **EXP-06**: Phase Shift Keying (BPSK)
7. **EXP-07**: Effect of Channel Noise on Digital Modulation
8. **EXP-08**: Bit Error Rate (BER) Analysis & Waterfall Curve
9. **EXP-09**: End-to-End Digital Data Transmission over Virtual Network

### 4. Faculty Dashboard & Live Lab Monitoring (`/instructor`)
- **Lab Session Controls**: Create sessions, configure experiment assignments, duration timers, generate Session Codes (e.g. `DC-LAB-204`), Join Codes (e.g. `NET-4821`), and printable QR codes.
- **Real-Time Student Roster**: Live tracking of connected students, status (`Running`, `Completed`, `Error`), live BER %, progress %, and scores.
- **Inspect Workspace**: View-only mode allowing instructors to open and inspect any student's live signal waveform and topology.
- **Automatic Academic Grading**: 100-mark evaluation assessing network topology, frequency parameter orthogonality, matched-filter demodulation fidelity, and BER calculation.

### 5. Official Lab Report Generator
- Produces a standardized academic report: **"NETWORK & DIGITAL COMMUNICATION LAB REPORT"**.
- Contains: Student Name, Roll Number, Session Code, Date, Objectives, Theoretical Formulas, Network Inventory, FSK Parameters, Rendered Waveforms, Transmitted vs Recovered Bits, Errors, Measured BER %, Dynamic Observations, and Conclusions.
- Includes **Print / Save as PDF** formatting.

### 6. "What-If" Scenario Simulator
- Allows students to compare hypotheses side-by-side:
  - *What if noise increases from 10% to 35%?*
  - *What if frequency separation narrows ($f_0 = 1000\text{ Hz}, f_1 = 1200\text{ Hz}$)?*
- Displays real-time delta $\Delta\text{BER}$ and $\Delta\text{SNR}$.

### 7. Network Detective Mode
- Gamified troubleshooting challenge where networks and FSK links are intentionally broken (demodulator frequency mismatch, bad gateway IP, missing route).
- Features timer countdown, hints counter, attempts tracking, and diagnostic explanations.

### 8. NetAssist AI Assistant
- Embedded networking and digital communication reasoning engine explaining why packet loss occurred, why BER increased, how channel noise degrades SNR, and how Carson's bandwidth applies.

---

## 5. Technology Stack

- **Frontend**:
  - Framework: React 18 with Vite
  - Topology Canvas: React Flow (`reactflow`)
  - Icons: Lucide React
  - Real-Time Sockets: Socket.IO Client
  - Styling: Modern CSS Design System (Dark & Light Theme variables, Glassmorphism, Responsive Grid)
- **Backend**:
  - Runtime: Node.js & Express.js
  - WebSockets: Socket.IO Server
  - Database: MongoDB with Mongoose (with automated In-Memory Resilience Fallback when MongoDB is offline)
  - Auth & Security: JSON Web Tokens (JWT) & bcryptjs
  - DSP Algorithms: Continuous-phase modulation, Box-Muller AWGN, quadrature correlator matched filter, Longest Prefix Match (LPM) IP routing.

---

## 6. REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new student or instructor account |
| `POST` | `/api/auth/login` | Authenticate user with JWT |
| `POST` | `/api/auth/guest` | Instant guest access |
| `GET` | `/api/auth/me` | Fetch authenticated profile |

### Modulation & DSP Engine (`/api/modulation`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/modulation/fsk/modulate` | Generate continuous-phase BFSK waveform |
| `POST` | `/api/modulation/fsk/demodulate` | Matched-filter correlator demodulation |
| `POST` | `/api/modulation/fsk/analyze` | End-to-end modulation, channel noise & BER |
| `POST` | `/api/modulation/fsk/sweep-noise` | 0% to 50% noise sweep vs BER curve |
| `POST` | `/api/modulation/compare` | Multi-modulation comparison (ASK, FSK, PSK) |

### Lab Sessions (`/api/labs`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/labs` | List active laboratory sessions |
| `POST` | `/api/labs` | Create new lab session with session code |
| `POST` | `/api/labs/join` | Join session using code + student roll number |
| `GET` | `/api/labs/:id` | Fetch lab session telemetry |
| `POST` | `/api/labs/:id/progress` | Update student progress and live BER |

### Experiments & Evaluations (`/api/experiments`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/experiments` | List standardized 9-experiment curriculum |
| `GET` | `/api/experiments/:id` | Fetch experiment details and instructions |
| `POST` | `/api/experiments/:id/submit` | Auto-evaluate submission & generate grade /100 |
| `GET` | `/api/experiments/results/all` | Fetch class results for faculty dashboard |

### Network Topology & Simulation (`/api/networks`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/networks` | List user networks |
| `POST` | `/api/networks/:id/simulate` | Run packet forwarding simulation |
| `POST` | `/api/networks/:id/ping` | Execute ICMP Ping simulation |
| `POST` | `/api/networks/:id/debug` | Run automated topology diagnostic analyzer |
| `POST` | `/api/networks/:id/report` | Compile official lab report |

---

## 7. Socket.IO Real-Time Collaboration Events

| Event Name | Direction | Description |
|---|---|---|
| `join-lab` | Client $\to$ Server | Student enters lab room with session code |
| `student-joined` | Server $\to$ Room | Broadcasts new student arrival to instructor |
| `student-progress-update` | Client $\to$ Server | Broadcasts student progress & live BER |
| `fsk-simulation-started` | Client $\to$ Server | Initiates synchronized FSK transmission |
| `fsk-simulation-completed` | Client $\to$ Server | Syncs demodulation results with collaborators |
| `cursor-move` | Client $\to$ Server | Real-time collaborator cursor position |
| `node-change` | Client $\leftrightarrow$ Server | Shared topology node drag/drop sync |
| `edge-change` | Client $\leftrightarrow$ Server | Dynamic connection link creation/deletion |
| `simulate-broadcast` | Client $\to$ Server | Triggers synchronized packet animation |

---

## 8. Installation & Local College LAN Deployment

### Quick Start (Local Machine)

#### 1. Start Backend Server
```bash
cd server
npm install
node server.js
```
The server will start on `http://localhost:5000` (runs in high-resilience in-memory mode if MongoDB is not running locally).

#### 2. Start Frontend Client
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### College Laboratory LAN Deployment Guide

To deploy NetCollaborate in an actual college computer lab across all student workstations:

```text
    College Lab Workstations (PC-01, PC-02, ..., PC-50)
                           ↓
             College Wi-Fi / Ethernet Switch
                           ↓
              Lab Server (192.168.1.100)
              ├── Port 5000: NetCollaborate API & Socket.IO
              └── Port 5173: Frontend Web Server
```

1. **Find Server IP**:
   On the instructor/server host machine, run `ipconfig` (Windows) or `ifconfig` (Linux) to find the LAN IP (e.g. `192.168.1.100`).

2. **Launch Server on all network interfaces**:
   ```bash
   cd server
   node server.js
   ```
   The backend server automatically binds to `0.0.0.0:5000`.

3. **Launch Client with Host Flag**:
   ```bash
   cd client
   npm run dev -- --host 0.0.0.0
   ```

4. **Student Access**:
   Students open their web browser from any computer in the lab and navigate to:
   ```text
   http://192.168.1.100:5173
   ```
   Students click **"Join Lab"**, enter session code `DC-LAB-204` or scan the projected QR code, enter their student name and roll number, and immediately start collaborating!

---

## 9. Verification & Unit Testing

Run the automated simulation and modulation test suites:
```bash
cd server
node simulation/testSimulation.js
node simulation/testModulation.js
```
All unit tests verify:
- ASCII $\leftrightarrow$ binary conversions
- BFSK carrier generation ($f_0 = 1000\text{ Hz}, f_1 = 2000\text{ Hz}$)
- Zero-noise error-free matched-filter demodulation (0% BER)
- Noise channel degradation and theoretical Q-function curve
- Multi-modulation comparison (ASK, FSK, PSK)
- Longest Prefix Match (LPM) packet routing and ICMP Ping calculations.

---

## 10. Summary

**NetCollaborate** delivers a complete, genuine educational laboratory experience connecting **Network Simulation** with **Digital Communication**:
$$\text{Topology Routing} \longrightarrow \text{Binary Data} \longrightarrow \text{BFSK Modulation} \longrightarrow \text{AWGN Channel} \longrightarrow \text{Correlator Demodulation} \longrightarrow \text{BER Analysis} \longrightarrow \text{Official Lab Report}$$
