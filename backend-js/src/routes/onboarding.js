const express = require('express');
const { supabase } = require('../config/database');
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
    
    // Prepare AI context data
    const aiContextData = {
      onboarding: {
        role,
        responses,
        completed_at: new Date().toISOString(),
        complexity_level
      },
      ai_preferences
    };

    // Save to ai_contexts table
    const { data: contextData, error: contextError } = await supabase
      .from('ai_contexts')
      .upsert({
        user_id,
        context_data: aiContextData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (contextError) throw contextError;

    // Update users table with onboarding data
    console.log('Updating users table for user_id:', user_id);
    const onboardingData = {
      role,
      responses,
      complexity_level,
      completed_at: new Date().toISOString()
    };
    console.log('Onboarding data to save:', onboardingData);

    const { data: userUpdateData, error: userError } = await supabase
      .from('users')
      .update({
        onboarding_data: onboardingData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    console.log('Users table update result:', { userUpdateData, userError });
    if (userError) throw userError;

    // Also update user_profiles table if it exists
    const profileData = {
      role,
      experience_level: responses.experience_level,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    };

    const { data: profileUpdateData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id,
        ...profileData
      }, {
        onConflict: 'user_id'
      });

    if (profileError) throw profileError;

    res.json({ 
      success: true, 
      message: 'Onboarding data saved successfully',
      data: { contextData, userUpdateData, profileUpdateData }
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

    // Get onboarding data from users table
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_data')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ 
      success: true, 
      data: data?.onboarding_data || null 
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

    // Check onboarding data in users table
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_data')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const completed = data?.onboarding_data && Object.keys(data.onboarding_data).length > 0;

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
