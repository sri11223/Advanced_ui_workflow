const express = require('express');
const { db } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * Save user onboarding data
 * POST /api/onboarding
 */
router.post('/', auth, async (req, res) => {
  try {
    console.log('Onboarding POST request received:', req.body);
    const { user_id, role, responses, complexity_level, ai_preferences } = req.body;
    
    const onboardingData = {
      role,
      responses,
      complexity_level,
      ai_preferences,
      completed_at: new Date().toISOString()
    };

    // Update user with onboarding data
    await db.updateUser(user_id, { onboarding_data: onboardingData });

    res.json({ 
      success: true, 
      message: 'Onboarding data saved successfully'
    });

  } catch (error) {
    console.error('Onboarding save error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to save onboarding data' 
    });
  }
});

/**
 * Get user onboarding data
 * GET /api/onboarding/:userId
 */
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.getUserById(userId);

    res.json({ 
      success: true, 
      data: user?.onboarding_data || null 
    });

  } catch (error) {
    console.error('Onboarding fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch onboarding data' 
    });
  }
});

/**
 * Check onboarding completion status
 * GET /api/onboarding/:userId/status
 */
router.get('/:userId/status', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.getUserById(userId);
    const completed = user?.onboarding_data && Object.keys(user.onboarding_data).length > 0;

    res.json({ 
      success: true, 
      completed: completed || false 
    });

  } catch (error) {
    console.error('Onboarding status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to check onboarding status',
      completed: false 
    });
  }
});

module.exports = router;
