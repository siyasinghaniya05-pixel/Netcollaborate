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
  debugTopology
} = require('../controllers/networkController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getNetworks)
  .post(createNetwork);

router.route('/:id')
  .get(getNetworkById)
  .put(updateNetwork)
  .delete(deleteNetwork);

router.post('/:id/simulate', simulate);
router.post('/:id/ping', ping);
router.post('/:id/debug', debugTopology);

module.exports = router;
