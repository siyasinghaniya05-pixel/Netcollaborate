/**
 * Automated Verification Script for Dynamic Lab Sessions & FSK Experiment Flow
 * Tests:
 * 1. Pre-seeded demo session NC-FSK-7A42 (Dr. Santosh Patil, 43 students, Computer Networks)
 * 2. Strict 50-student capacity limit enforcement (rejection of 51st student)
 * 3. Instructor lab creation with experiment multi-select
 * 4. Fetch lab details by session code
 * 5. Student my-active lab retrieval
 * 6. Instructor my-labs retrieval
 */

const http = require('http');

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      ...(data ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      } : {})
    };

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

async function runTests() {
  console.log('===========================================================');
  console.log('  NetCollaborate Lab Session & FSK Flow Verification  ');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  };

  try {
    // 1. Log in as student and instructor
    console.log('\n--- 1. Authentication ---');
    const stuLogin = await request('POST', '/api/auth/login', {
      email: 'student@college.edu',
      password: 'student123',
      selectedRole: 'student'
    });
    assert(stuLogin.status === 200 && stuLogin.data?.token, 'Student login successful');
    const stuToken = stuLogin.data?.token;

    const instLogin = await request('POST', '/api/auth/login', {
      email: 'instructor@college.edu',
      password: 'faculty123',
      selectedRole: 'instructor'
    });
    assert(instLogin.status === 200 && instLogin.data?.token, 'Instructor login successful');
    const instToken = instLogin.data?.token;

    // 2. Fetch pre-seeded demo lab session NC-FSK-7A42
    console.log('\n--- 2. Pre-seeded Lab Session NC-FSK-7A42 ---');
    const demoLab = await request('GET', '/api/labs/NC-FSK-7A42');
    assert(demoLab.status === 200, 'GET /api/labs/NC-FSK-7A42 returns 200 OK');
    assert(demoLab.data?.data?.title === 'Digital Communication Lab', 'Title is "Digital Communication Lab"');
    assert(demoLab.data?.data?.instructorName === 'Dr. Santosh Patil', 'Instructor is "Dr. Santosh Patil"');
    assert(demoLab.data?.data?.room === 'Networking Lab 2', 'Room is "Networking Lab 2"');
    assert(demoLab.data?.data?.subject === 'Computer Networks', 'Subject is "Computer Networks"');
    assert(demoLab.data?.data?.selectedExperiments?.includes('FSK'), 'Selected experiments includes FSK');
    assert(demoLab.data?.data?.students?.length >= 43, `Session has ${demoLab.data?.data?.students?.length} pre-seeded students (spec asks for 43/50)`);

    // 3. Student fetches my-active lab
    console.log('\n--- 3. Student Active Lab Session ---');
    const myActive = await request('GET', '/api/labs/my-active', null, {
      Authorization: `Bearer ${stuToken}`
    });
    assert(myActive.status === 200 && myActive.data?.data?.sessionCode, 'GET /api/labs/my-active returns active lab');

    // 4. Instructor creates a new customized lab session
    console.log('\n--- 4. Instructor Creates Lab Session ---');
    const createRes = await request('POST', '/api/labs', {
      title: 'Advanced Digital Signal Processing Lab',
      subject: 'Digital Communications',
      room: 'DSP Lab 3',
      instructorName: 'Dr. Santosh Patil',
      date: '21 September 2026',
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      selectedExperiments: ['FSK', 'ASK', 'PSK'],
      maxStudents: 50,
      description: 'Test BFSK, ASK, and BPSK modulation performance under AWGN noise.',
      instructions: '1. Build network.\n2. Configure modulation.\n3. Analyze BER waterfall curve.'
    }, {
      Authorization: `Bearer ${instToken}`
    });
    assert(createRes.status === 201, 'Instructor successfully created new lab session (201 Created)');
    const createdSession = createRes.data?.data;
    assert(createdSession?.sessionCode?.startsWith('NC-'), `Generated unique session code: ${createdSession?.sessionCode}`);
    assert(createdSession?.selectedExperiments?.length === 3, 'Created session has 3 selected experiments (FSK, ASK, PSK)');

    // 5. Test Strict 50-Student Capacity Enforcement
    console.log('\n--- 5. Strict 50-Student Capacity Enforcement ---');
    // Create a special test session with maxStudents: 50
    const capTestRes = await request('POST', '/api/labs', {
      title: 'Capacity Stress Test Session',
      subject: 'Lab Systems',
      sessionCode: 'NC-CAP-50',
      maxStudents: 50,
      selectedExperiments: ['FSK']
    }, {
      Authorization: `Bearer ${instToken}`
    });
    assert(capTestRes.status === 201, 'Created test session NC-CAP-50');

    // Join 50 distinct students
    console.log('Joining 50 students into NC-CAP-50...');
    let joinOkCount = 0;
    for (let i = 1; i <= 50; i++) {
      const jRes = await request('POST', '/api/labs/NC-CAP-50/join', {
        studentId: `stu-bench-id-${i}`,
        studentName: `Student Seat ${i}`,
        rollNumber: `CS2026-${String(i).padStart(3, '0')}`
      }, {
        Authorization: `Bearer ${stuToken}`
      });
      if (jRes.status === 200 && jRes.data?.success) {
        joinOkCount++;
      }
    }
    assert(joinOkCount === 50, `Successfully filled lab to exact capacity: 50/50 students joined`);

    // Attempt 51st student join
    const overCapRes = await request('POST', '/api/labs/NC-CAP-50/join', {
      studentId: 'stu-bench-id-51',
      studentName: 'Student 51',
      rollNumber: 'CS2026-051'
    }, {
      Authorization: `Bearer ${stuToken}`
    });
    assert(overCapRes.status === 403, `51st student strictly rejected with 403 Forbidden: "${overCapRes.data?.message}"`);

    // 6. Instructor retrieves their created labs
    console.log('\n--- 6. Instructor Labs Retrieval ---');
    const instLabs = await request('GET', '/api/instructor/labs', null, {
      Authorization: `Bearer ${instToken}`
    });
    assert(instLabs.status === 200 && Array.isArray(instLabs.data?.data), 'GET /api/instructor/labs returns array of labs');

    console.log('\n===========================================================');
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

runTests();
