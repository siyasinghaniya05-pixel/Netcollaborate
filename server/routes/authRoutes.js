const express = require('express');
const router = express.Router();
const { register, login, verifyInstructorCode, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-instructor-code', verifyInstructorCode);
router.get('/me', protect, getMe);

module.exports = router;
