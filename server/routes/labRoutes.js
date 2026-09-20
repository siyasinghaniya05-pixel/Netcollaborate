const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LabSession = require('../models/LabSession');
const { authenticateUser, requireInstructor, requireStudent } = require('../middleware/authMiddleware');

// In-memory fallback repository for lab sessions
const inMemorySessions = new Map();

// Generate unique session code format NC-FSK-XXXX or NC-XXXX
const generateUniqueSessionCode = (experimentType = 'FSK') => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NC-${experimentType.toUpperCase()}-${rand}`;
};

// Generate 43 initial student benches matching the user specification example
const initialStudents = [
  {
    studentId: 'user_student_01',
    name: 'Siya Singhaniya',
    rollNumber: 'CS2026-081',
    status: 'Online',
    currentExperiment: 'FSK',
    progress: 65,
    ber: 2.3,
    score: 88,
    joinedAt: new Date(Date.now() - 25 * 60000),
    lastActive: new Date()
  },
  {
    studentId: 'stu-demo-02',
    name: 'Rohan Verma',
    rollNumber: 'CS2026-042',
    status: 'Online',
    currentExperiment: 'FSK',
    progress: 100,
    ber: 0.0,
    score: 92,
    joinedAt: new Date(Date.now() - 45 * 60000),
    lastActive: new Date(Date.now() - 5 * 60000)
  },
  {
    studentId: 'stu-demo-03',
    name: 'Omkar Joshi',
    rollNumber: 'CS2026-104',
    status: 'Running',
    currentExperiment: 'FSK',
    progress: 40,
    ber: 0.0,
    score: 75,
    joinedAt: new Date(Date.now() - 30 * 60000),
    lastActive: new Date()
  },
  {
    studentId: 'stu-demo-04',
    name: 'Shivani Patel',
    rollNumber: 'CS2026-019',
    status: 'Submitted',
    currentExperiment: 'FSK',
    progress: 95,
    ber: 1.2,
    score: 88,
    joinedAt: new Date(Date.now() - 35 * 60000),
    lastActive: new Date()
  }
];

// Add 39 more students to reach 43 total students (39 Online, matching spec)
const studentNames = [
  'Aarav Sharma', 'Aditi Rao', 'Ananya Gupta', 'Aryan Deshmukh', 'Bhavya Nair',
  'Chetan Kulkarni', 'Devendra Patil', 'Diya Mehta', 'Gaurav Shinde', 'Isha Sen',
  'Kabir Sengupta', 'Kavya Iyer', 'Manish Reddy', 'Meera Pillai', 'Nikhil Bhat',
  'Neha Chawla', 'Pooja Hegde', 'Pranav Roy', 'Priya Dixit', 'Rahul Joshi',
  'Rhea Banerjee', 'Rishi Menon', 'Saanvi Trivedi', 'Sahil Kapoor', 'Samarth Jain',
  'Sanya Malhotra', 'Siddharth Bose', 'Sneha Agarwal', 'Tanvi Saxena', 'Utkarsh Dubey',
  'Varun Chopra', 'Vidya Balan', 'Yash Gaikwad', 'Zoya Khan', 'Amitabh Paul',
  'Bipasha Roy', 'Chirag Sethi', 'Deepak More', 'Esha Pandey'
];

studentNames.forEach((name, idx) => {
  const roll = `CS2026-${String(idx + 5).padStart(3, '0')}`;
  initialStudents.push({
    studentId: `stu-seat-${idx + 5}`,
    name,
    rollNumber: roll,
    status: idx < 35 ? 'Online' : 'Running',
    currentExperiment: 'FSK',
    progress: 30 + (idx % 60),
    ber: parseFloat((0.5 + (idx % 4) * 0.7).toFixed(1)),
    score: 75 + (idx % 20),
    joinedAt: new Date(Date.now() - (idx + 10) * 60000),
    lastActive: new Date()
  });
});

// Initialize ready-made demo active session matching user's exact specification
const demoSession = {
  _id: 'session-demo-01',
  id: 'session-demo-01',
  sessionCode: 'NC-FSK-7A42',
  joinCode: 'NET-4821',
  title: 'Digital Communication Lab',
  subject: 'Computer Networks',
  room: 'Networking Lab 2',
  instructorId: 'user_instructor_01',
  instructorName: 'Dr. Santosh Patil',
  date: '20 September 2026',
  startTime: '10:00 AM',
  endTime: '12:00 PM',
  experimentId: 'EXP-05-BFSK',
  experimentName: 'FSK Modulation and Demodulation',
  experimentType: 'FSK',
  selectedExperiments: ['FSK'],
  durationMinutes: 120,
  maxStudents: 50,
  description: 'Perform FSK modulation, transmission, demodulation and BER analysis.',
  instructions: '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.',
  status: 'active',
  createdAt: new Date(),
  students: initialStudents
};

inMemorySessions.set('NC-FSK-7A42', demoSession);
inMemorySessions.set('NC-7F42K', demoSession);
inMemorySessions.set('DC-LAB-204', demoSession);
inMemorySessions.set('session-demo-01', demoSession);

// GET /api/labs/my-active - Get active lab for student
router.get('/my-active', authenticateUser, async (req, res) => {
  try {
    const studentId = req.user.id || req.user.userId;
    let active = null;

    // Search for a session containing this student
    for (const s of inMemorySessions.values()) {
      if (s.status === 'active' && s.students?.some(stu => stu.studentId === studentId || stu.rollNumber === req.user.rollNumber)) {
        active = s;
        break;
      }
    }

    if (!active) {
      active = inMemorySessions.get('NC-FSK-7A42') || demoSession;
    }

    res.json({ success: true, data: active });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/instructor/labs or /api/labs/instructor/labs - Get labs created by instructor
router.get(['/instructor/labs', '/labs'], authenticateUser, requireInstructor, async (req, res) => {
  try {
    const instructorId = req.user.id || req.user.userId;
    let sessions = [];

    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await LabSession.find({ instructorId }).sort({ createdAt: -1 });
      } catch (dbErr) {}
    }

    if (sessions.length === 0) {
      sessions = Array.from(inMemorySessions.values()).filter(
        (s, idx, self) => self.findIndex(t => t.sessionCode === s.sessionCode) === idx
      );
    }

    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/labs - List all lab sessions
router.get('/', async (req, res) => {
  try {
    let sessions = [];
    if (mongoose.connection.readyState === 1) {
      try {
        sessions = await LabSession.find().sort({ createdAt: -1 });
      } catch (dbErr) {}
    }
    if (sessions.length === 0) {
      sessions = Array.from(inMemorySessions.values()).filter(
        (s, idx, self) => self.findIndex(t => t.sessionCode === s.sessionCode) === idx
      );
    }
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/labs/active - Get currently active session
router.get('/active', async (req, res) => {
  try {
    let active = null;
    if (mongoose.connection.readyState === 1) {
      try {
        active = await LabSession.findOne({ status: 'active' }).sort({ createdAt: -1 });
      } catch (dbErr) {}
    }
    if (!active) {
      for (const s of inMemorySessions.values()) {
        if (s.status === 'active') {
          active = s;
          break;
        }
      }
    }
    if (!active) {
      active = demoSession;
    }
    res.json({ success: true, data: active });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/labs - Create a new lab session (Instructor only)
router.post('/', authenticateUser, requireInstructor, async (req, res) => {
  try {
    const {
      title,
      subject,
      room,
      instructorName,
      date,
      startTime,
      endTime,
      sessionCode,
      selectedExperiments,
      maxStudents = 50,
      instructions,
      description,
      status = 'active'
    } = req.body;

    const chosenExperiments = Array.isArray(selectedExperiments) && selectedExperiments.length > 0
      ? selectedExperiments
      : ['FSK'];

    const primaryType = chosenExperiments[0] || 'FSK';
    const code = (sessionCode || generateUniqueSessionCode(primaryType)).toUpperCase();
    const join = `NET-${Math.floor(1000 + Math.random() * 9000)}`;
    const capacity = Math.min(100, Math.max(1, parseInt(maxStudents) || 50));

    const newSession = {
      id: 'session-' + Date.now(),
      _id: 'session-' + Date.now(),
      title: title || 'Digital Communication Lab',
      subject: subject || 'Computer Networks',
      room: room || 'Networking Lab 2',
      sessionCode: code,
      joinCode: join,
      instructorId: req.user.id || req.user.userId || 'instructor-root',
      instructorName: instructorName || req.user.name || 'Dr. Santosh Patil',
      date: date || '20 September 2026',
      startTime: startTime || '10:00 AM',
      endTime: endTime || '12:00 PM',
      experimentId: 'EXP-05-BFSK',
      experimentName: chosenExperiments.includes('FSK') ? 'FSK Modulation and Demodulation' : `${chosenExperiments[0]} Experiment`,
      experimentType: primaryType,
      selectedExperiments: chosenExperiments,
      durationMinutes: 120,
      maxStudents: capacity,
      description: description || 'Perform FSK modulation, transmission, demodulation and BER analysis.',
      instructions: instructions || '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.',
      status: status,
      students: [],
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await LabSession.create(newSession);
        inMemorySessions.set(code, saved);
        inMemorySessions.set(saved._id.toString(), saved);
        return res.status(201).json({ success: true, data: saved });
      } catch (dbErr) {}
    }

    inMemorySessions.set(code, newSession);
    inMemorySessions.set(newSession.id, newSession);
    return res.status(201).json({ success: true, data: newSession });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper join logic for both POST /api/labs/join and POST /api/labs/:sessionCode/join
const handleJoinSession = async (req, res, targetCode) => {
  try {
    const { studentName, rollNumber } = req.body;
    const studentId = req.user.id || req.user.userId;
    const displayName = studentName || req.user.name || 'Student Engineer';
    const displayRoll = rollNumber || req.user.rollNumber || 'CS2026-UNASSIGNED';

    if (!targetCode) {
      return res.status(400).json({
        success: false,
        message: 'Session code is required'
      });
    }

    const cleanCode = targetCode.trim().toUpperCase();

    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await LabSession.findOne({
          $or: [{ sessionCode: cleanCode }, { joinCode: cleanCode }]
        });
      } catch (dbErr) {}
    }

    if (!session) {
      session = inMemorySessions.get(cleanCode);
    }

    if (!session) {
      for (const s of inMemorySessions.values()) {
        if (s.sessionCode === cleanCode || s.joinCode === cleanCode) {
          session = s;
          break;
        }
      }
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Lab Session with code "${cleanCode}" not found. Please verify the code with your instructor.`
      });
    }

    if (session.status === 'closed' || session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This lab session has been closed by the instructor.'
      });
    }

    const maxAllowed = session.maxStudents || 50;
    const targetStudentId = req.body.studentId || studentId;

    // Check if this student is already in this session
    const existingIndex = session.students.findIndex(
      (s) => (s.studentId && s.studentId === targetStudentId && (!rollNumber || s.rollNumber === displayRoll)) ||
             (rollNumber && s.rollNumber === displayRoll)
    );

    if (existingIndex >= 0) {
      // Student is reconnecting - update status to Online
      session.students[existingIndex].status = 'Online';
      session.students[existingIndex].lastActive = new Date();
      if (mongoose.connection.readyState === 1 && session.save) {
        try { await session.save(); } catch (e) {}
      }

      return res.json({
        success: true,
        message: 'Welcome back to the lab session!',
        data: {
          session,
          student: session.students[existingIndex]
        }
      });
    }

    // STRICT 50-STUDENT CAPACITY ENFORCEMENT
    if (session.students.length >= maxAllowed) {
      return res.status(403).json({
        success: false,
        message: `❌ Lab Session Full. Maximum capacity of ${maxAllowed} students has been reached. Maximum ${maxAllowed} students are allowed.`
      });
    }

    // Add new student record
    const studentRecord = {
      studentId: targetStudentId || 'stu-' + Date.now(),
      name: displayName,
      rollNumber: displayRoll,
      status: 'Online',
      currentExperiment: session.selectedExperiments?.[0] || 'FSK',
      progress: 10,
      ber: 0,
      score: 0,
      joinedAt: new Date(),
      lastActive: new Date()
    };

    session.students.push(studentRecord);

    if (mongoose.connection.readyState === 1 && session.save) {
      try { await session.save(); } catch (e) {}
    }

    res.json({
      success: true,
      message: `Successfully joined lab session (${session.students.length}/${maxAllowed} students)`,
      data: {
        session,
        student: studentRecord
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/labs/join - Student joins lab session
router.post('/join', authenticateUser, async (req, res) => {
  const code = req.body.code || req.body.sessionCode;
  return handleJoinSession(req, res, code);
});

// POST /api/labs/:sessionCode/join - Alternative RESTful join endpoint
router.post('/:sessionCode/join', authenticateUser, async (req, res) => {
  const code = req.params.sessionCode;
  return handleJoinSession(req, res, code);
});

// POST & PUT /api/labs/:id/close - Close lab session (Instructor only)
const handleCloseLab = async (req, res) => {
  try {
    const { id } = req.params;
    let session = null;

    if (mongoose.connection.readyState === 1) {
      try {
        session = await LabSession.findById(id);
        if (session) {
          session.status = 'closed';
          await session.save();
        }
      } catch (dbErr) {}
    }

    if (!session) {
      session = inMemorySessions.get(id) || Array.from(inMemorySessions.values()).find(s => s.sessionCode === id);
      if (session) {
        session.status = 'closed';
      }
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Lab session not found' });
    }

    res.json({
      success: true,
      message: 'Lab session has been closed.',
      data: session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.put('/:id/close', authenticateUser, requireInstructor, handleCloseLab);
router.post('/:id/close', authenticateUser, requireInstructor, handleCloseLab);

// PUT /api/labs/:id - Update lab session (Instructor only)
router.put('/:id', authenticateUser, requireInstructor, async (req, res) => {
  try {
    const { id } = req.params;
    let session = inMemorySessions.get(id) || Array.from(inMemorySessions.values()).find(s => s.sessionCode === id || s.id === id);

    if (session) {
      const allowedFields = ['title', 'subject', 'room', 'instructorName', 'date', 'startTime', 'endTime', 'description', 'instructions', 'maxStudents', 'selectedExperiments', 'status'];
      allowedFields.forEach(f => {
        if (req.body[f] !== undefined) session[f] = req.body[f];
      });

      if (mongoose.connection.readyState === 1) {
        try {
          await LabSession.findByIdAndUpdate(session._id || id, session);
        } catch (e) {}
      }
      return res.json({ success: true, data: session });
    }

    return res.status(404).json({ success: false, message: 'Lab session not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/labs/:id - Get session details by ID or sessionCode
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clean = id.toUpperCase();
    let session = null;

    if (mongoose.connection.readyState === 1) {
      try {
        session = await LabSession.findOne({
          $or: [{ sessionCode: clean }, { _id: mongoose.isValidObjectId(id) ? id : null }]
        });
      } catch (dbErr) {}
    }

    if (!session) {
      session = inMemorySessions.get(clean) || inMemorySessions.get(id) || Array.from(inMemorySessions.values()).find(s => s.sessionCode === clean || s.id === id);
    }

    if (!session) {
      return res.status(404).json({ success: false, message: 'Lab session not found' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/labs/:id/progress - Update student progress and live metrics
router.post('/:id/progress', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { rollNumber, studentName, status, progress, ber, score, currentExperiment } = req.body;
    const studentId = req.user.id || req.user.userId;

    let session = inMemorySessions.get(id) || Array.from(inMemorySessions.values()).find(s => s.sessionCode === id || s.id === id);

    if (session) {
      let stu = session.students.find(
        (s) => s.studentId === studentId || s.rollNumber === rollNumber || s.name === studentName
      );

      if (stu) {
        if (status) stu.status = status;
        if (currentExperiment) stu.currentExperiment = currentExperiment;
        if (typeof progress === 'number') stu.progress = progress;
        if (typeof ber === 'number') stu.ber = ber;
        if (typeof score === 'number') stu.score = score;
        stu.lastActive = new Date();
      } else {
        session.students.push({
          studentId: studentId || 'stu-' + Date.now(),
          name: studentName || req.user.name || 'Student',
          rollNumber: rollNumber || req.user.rollNumber || 'N/A',
          status: status || 'Running',
          currentExperiment: currentExperiment || 'FSK',
          progress: progress || 25,
          ber: ber || 0,
          score: score || 0,
          joinedAt: new Date(),
          lastActive: new Date()
        });
      }

      if (mongoose.connection.readyState === 1 && session.save) {
        try { await session.save(); } catch (e) {}
      }
    }

    res.json({ success: true, message: 'Student progress updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
