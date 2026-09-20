const express = require('express');
const router = express.Router();
const {
  getNetworks,
  getNetworkById,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  simulate,
  ping,
  traceroute,
  packetReplay,
  debugTopology,
  netAssist,
  netAssistDiagnostics,
  getSnapshots,
  createSnapshotHandler,
  compareSnapshotsHandler,
  restoreSnapshotHandler,
  getLabReportHandler,
  getInstructorAssignmentsHandler,
  getInstructorSubmissionsHandler,
  gradeSubmissionHandler
} = require('../controllers/networkController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Static / Meta routes (registered BEFORE /:id to prevent Express treating literal as id)
router.get('/instructor/assignments', getInstructorAssignmentsHandler);
router.get('/instructor/submissions', getInstructorSubmissionsHandler);
router.put('/instructor/submissions/:submissionId', gradeSubmissionHandler);

router.route('/')
  .get(getNetworks)
  .post(createNetwork);

router.route('/:id')
  .get(getNetworkById)
  .put(updateNetwork)
  .delete(deleteNetwork);

router.post('/:id/simulate', simulate);
router.post('/:id/ping', ping);
router.post('/:id/traceroute', traceroute);
router.post('/:id/replay', packetReplay);
router.post('/:id/debug', debugTopology);
router.post('/:id/assist', netAssist);
router.post('/:id/assist/diagnostics', netAssistDiagnostics);

// Version Control Snapshots
router.get('/:id/snapshots', getSnapshots);
router.post('/:id/snapshots', createSnapshotHandler);
router.post('/:id/snapshots/compare', compareSnapshotsHandler);
router.post('/:id/snapshots/:snapshotId/restore', restoreSnapshotHandler);

// Automatic Lab Report
router.post('/:id/report', getLabReportHandler);
router.get('/:id/report', getLabReportHandler);

module.exports = router;
