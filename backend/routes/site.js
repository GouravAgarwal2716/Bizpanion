const express = require('express');
const auth = require('../middlewares/auth');
const { User } = require('../models');
const router = express.Router();

router.post('/deploy', auth, async (req, res) => {
  try {
    const { site } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For the hackathon, we'll just update the user's site configuration
    // In a real application, this would trigger a deployment process
    await user.update({ site });

    res.json({
      success: true,
      message: 'Site deployed successfully!',
      url: `https://${user.businessName.toLowerCase().replace(/\\s+/g, '-')}.bizpanion.ai`,
    });
  } catch (err) {
    console.error('Site deployment failed:', err);
    res.status(500).json({ error: 'Failed to deploy site' });
  }
});

module.exports = router;
