/**
 * Automated Verification Test Suite for NetCollaborate:
 * - Role-Based Authentication (Student vs Instructor)
 * - Instructor Invitation Code Enforcement (FACULTY-2026)
 * - Role Mismatch Prevention on Login
 * - API Role Authorization Guards (403 on unauthorized actions)
 * - Strict 50-Student Lab Session Capacity Enforcement (51st rejected)
 * - Objective 100-Mark Automatic Preliminary Evaluation
 * - Instructor Evaluation & Score Modification
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('================================================================');
  console.log(' NetCollaborate Role-Based Authentication & Capacity Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Default Seeded Accounts
    // ------------------------------------------------------------------------
    console.log('[1] Testing Default Seeded Accounts...');
    const instLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'instructor@college.edu',
        password: 'faculty123',
        role: 'instructor'
      })
    });
    const instLoginData = await instLoginRes.json();
    assert(instLoginRes.status === 200 && instLoginData.success, 'Instructor seeded login succeeds');
    assert(instLoginData.user?.role === 'instructor', 'Instructor user object has role=instructor');
    const instructorToken = instLoginData.token;

    const stuLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@college.edu',
        password: 'student123',
        role: 'student'
      })
    });
    const stuLoginData = await stuLoginRes.json();
    assert(stuLoginRes.status === 200 && stuLoginData.success, 'Student seeded login succeeds');
    assert(stuLoginData.user?.role === 'student', 'Student user object has role=student');
    const studentToken = stuLoginData.token;

    // ------------------------------------------------------------------------
    // TEST 2: Instructor Registration Security (Invite Code Validation)
    // ------------------------------------------------------------------------
    console.log('\n[2] Testing Instructor Registration Security...');
    const rogueInstructorRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rogue Faculty',
        email: `fake_instructor_${Date.now()}@college.edu`,
        password: 'password123',
        role: 'instructor',
        inviteCode: 'WRONG_CODE_XYZ'
      })
    });
    assert(rogueInstructorRes.status === 403, 'Instructor registration with wrong invite code rejected (403)');

    const validInstructorRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Vikram Rao',
        email: `dr_rao_${Date.now()}@college.edu`,
        password: 'facultyPassword123',
        role: 'instructor',
        inviteCode: 'FACULTY-2026'
      })
    });
    const validInstData = await validInstructorRes.json();
    assert(validInstructorRes.status === 201 && validInstData.user?.role === 'instructor', 'Instructor registration with FACULTY-2026 succeeds (201)');

    // ------------------------------------------------------------------------
    // TEST 3: Role Mismatch Prevention on Login
    // ------------------------------------------------------------------------
    console.log('\n[3] Testing Role Mismatch Prevention on Login...');
    const mismatchRes1 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@college.edu',
        password: 'student123',
        role: 'instructor' // Student tries to log in under instructor tab
      })
    });
    assert(mismatchRes1.status === 403, 'Student credentials rejected when selecting Instructor role (403)');

    const mismatchRes2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'instructor@college.edu',
        password: 'faculty123',
        role: 'student' // Instructor tries to log in under student tab
      })
    });
    assert(mismatchRes2.status === 403, 'Instructor credentials rejected when selecting Student role (403)');

    // ------------------------------------------------------------------------
    // TEST 4: Role-Based API Authorization Guards
    // ------------------------------------------------------------------------
    console.log('\n[4] Testing Role-Based API Authorization Guards...');
    // Student tries to create a lab session (requireInstructor)
    const studentCreateLabRes = await fetch(`${BASE_URL}/labs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Unauthorized Student Lab Session',
        experimentName: 'BFSK'
      })
    });
    assert(studentCreateLabRes.status === 403, 'Student blocked from creating lab session (403 Forbidden)');

    // Instructor creates a lab session
    const testSessionCode = `NC-CAP${Math.floor(100 + Math.random() * 900)}`;
    const instructorCreateLabRes = await fetch(`${BASE_URL}/labs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        title: 'BFSK Capacity Test Lab',
        sessionCode: testSessionCode,
        maxStudents: 50,
        experimentName: 'Binary Frequency Shift Keying (BFSK) Capacity Trial'
      })
    });
    const labData = await instructorCreateLabRes.json();
    assert(instructorCreateLabRes.status === 201 && labData.success, `Instructor successfully created lab session: ${testSessionCode} with maxStudents=50`);

    // ------------------------------------------------------------------------
    // TEST 5: Strict 50-Student Lab Capacity Enforcement
    // ------------------------------------------------------------------------
    console.log('\n[5] Testing 50-Student Capacity Enforcement...');
    console.log('    Joining 50 distinct students into the lab session...');

    let joinSuccessCount = 0;
    // Create tokens and join 50 students
    for (let i = 1; i <= 50; i++) {
      const studentRoll = `CS2026-${String(i).padStart(3, '0')}`;
      const joinRes = await fetch(`${BASE_URL}/labs/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          code: testSessionCode,
          studentId: `stu-bench-${i}`,
          studentName: `Student ${i}`,
          rollNumber: studentRoll
        })
      });
      if (joinRes.status === 200) {
        joinSuccessCount++;
      }
    }
    assert(joinSuccessCount === 50, `Exactly 50 students successfully joined the lab session (${joinSuccessCount}/50)`);

    // Attempt 51st student join
    console.log('    Attempting to join 51st student (capacity should reject)...');
    const student51Res = await fetch(`${BASE_URL}/labs/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        code: testSessionCode,
        studentName: 'Student Fifty-One',
        rollNumber: 'CS2026-051'
      })
    });
    const student51Data = await student51Res.json();
    assert(student51Res.status === 403, `51st student join rejected with HTTP 403 Forbidden`);
    assert(student51Data.message?.includes('full') || student51Data.message?.includes('capacity'), `Rejection message indicates lab session capacity reached: "${student51Data.message}"`);

    // Reconnecting an existing student should succeed and not overflow
    const reconnectRes = await fetch(`${BASE_URL}/labs/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        code: testSessionCode,
        studentName: 'Student 1',
        rollNumber: 'CS2026-001'
      })
    });
    assert(reconnectRes.status === 200, 'Reconnecting existing student succeeds without capacity breach');

    // ------------------------------------------------------------------------
    // TEST 6: Automatic 100-Mark Preliminary Evaluation
    // ------------------------------------------------------------------------
    console.log('\n[6] Testing Automatic 100-Mark Preliminary Evaluation...');
    const submitExpRes = await fetch(`${BASE_URL}/experiments/EXP-05-BFSK/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        studentName: 'Siya Singhaniya',
        rollNumber: 'CS2026-081',
        sessionCode: testSessionCode,
        parameters: { f0: 1000, f1: 2000, noisePercent: 10, bits: '10110010' },
        results: { berPercent: 0.0, demodulatedBits: '10110010' },
        networkConfigured: true,
        reportText: 'The BFSK transmitter successfully encoded digital bits and correlators recovered the stream.'
      })
    });

    const submitExpData = await submitExpRes.json();
    assert(submitExpRes.status === 201 && submitExpData.success, 'Student experiment submitted successfully (201)');
    const score = submitExpData.data?.score;
    assert(score >= 80 && score <= 100, `Preliminary score calculated accurately: ${score} / 100`);

    const criteria = submitExpData.data?.evaluationBreakdown || [];
    const critNames = criteria.map(c => c.criterion);
    assert(critNames.includes('Network Configuration'), 'Evaluation includes Network Configuration (20 marks)');
    assert(critNames.includes('FSK Implementation'), 'Evaluation includes FSK Implementation (25 marks)');
    assert(critNames.includes('Demodulation'), 'Evaluation includes Demodulation (15 marks)');
    assert(critNames.includes('BER Analysis'), 'Evaluation includes BER Analysis (15 marks)');
    assert(critNames.includes('Experiment Completion'), 'Evaluation includes Experiment Completion (15 marks)');
    assert(critNames.includes('Report'), 'Evaluation includes Report (10 marks)');

    const submissionId = submitExpData.data?.id;

    // ------------------------------------------------------------------------
    // TEST 7: Instructor Marks Modification & Feedback
    // ------------------------------------------------------------------------
    console.log('\n[7] Testing Instructor Evaluation & Feedback Review...');
    // Student tries to evaluate -> 403
    const stuEvalRes = await fetch(`${BASE_URL}/experiments/submissions/${submissionId}/evaluate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ score: 99, status: 'Completed' })
    });
    assert(stuEvalRes.status === 403, 'Student blocked from grading/evaluating submissions (403)');

    // Instructor evaluates
    const instEvalRes = await fetch(`${BASE_URL}/experiments/submissions/${submissionId}/evaluate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        score: 95,
        status: 'Completed',
        feedback: 'Excellent work on BFSK matched-filter correlation and zero-error detection.'
      })
    });
    const instEvalData = await instEvalRes.json();
    assert(instEvalRes.status === 200 && instEvalData.data?.score === 95, 'Instructor successfully evaluated and updated score to 95/100');
    assert(instEvalData.data?.feedback?.includes('Excellent work'), 'Instructor feedback successfully recorded');

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(` Test Suite Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during test suite execution:', error);
    process.exit(1);
  }
}

runTests();
