import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

class OnboardingService {
  /**
   * Save user onboarding data to database via backend API
   */
  async saveOnboardingData(userId, onboardingData) {
    try {
      // Determine complexity level based on role and responses
      const complexityLevel = this.determineComplexityLevel(
        onboardingData.role, 
        onboardingData
      );

      // Prepare onboarding payload
      const payload = {
        user_id: userId,
        role: onboardingData.role,
        responses: { ...onboardingData },
        complexity_level: complexityLevel,
        ai_preferences: {
          complexity_level: complexityLevel,
          suggested_templates: this.getSuggestedTemplates(onboardingData.role, complexityLevel),
          preferred_components: this.getPreferredComponents(onboardingData.role),
          design_patterns: this.getDesignPatterns(complexityLevel)
        }
      };

      // Send to backend API
      const response = await axios.post(`${API_BASE_URL}/onboarding`, payload);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  /**
   * Get user onboarding data via backend API
   */
  async getUserOnboardingData(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/onboarding/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  /**
   * Check if user has completed onboarding via backend API
   */
  async hasCompletedOnboarding(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/onboarding/${userId}/status`);
      return response.data.completed || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Determine complexity level based on role and experience
   */
  determineComplexityLevel(role, responses) {
    switch (role) {
      case 'student':
        if (responses.experience_level === 'beginner') return 'beginner';
        if (responses.study_field === 'computer_science' && responses.experience_level === 'intermediate') return 'intermediate';
        return 'beginner';

      case 'developer':
        if (responses.experience_level === 'junior') return 'beginner';
        if (responses.experience_level === 'mid_level') return 'intermediate';
        if (responses.experience_level === 'senior' || responses.experience_level === 'lead') return 'advanced';
        return 'intermediate';

      case 'designer':
        if (responses.experience_level === 'beginner' || responses.experience_level === '1_3_years') return 'beginner';
        if (responses.experience_level === '3_7_years') return 'intermediate';
        if (responses.experience_level === '7_plus_years') return 'advanced';
        return 'intermediate';

      case 'entrepreneur':
        if (responses.business_stage === 'idea_stage') return 'beginner';
        if (responses.business_stage === 'mvp' || responses.business_stage === 'early_startup') return 'intermediate';
        if (responses.business_stage === 'established') return 'advanced';
        return 'intermediate';

      case 'other':
        if (responses.design_experience === 'none' || responses.design_experience === 'basic') return 'beginner';
        if (responses.design_experience === 'intermediate') return 'intermediate';
        if (responses.design_experience === 'advanced') return 'advanced';
        return 'beginner';

      default:
        return 'intermediate';
    }
  }

  /**
   * Get suggested templates based on role and complexity
   */
  getSuggestedTemplates(role, complexityLevel) {
    const templates = {
      student: {
        beginner: ['simple-landing', 'portfolio-basic', 'blog-template'],
        intermediate: ['portfolio-advanced', 'project-showcase', 'resume-site'],
        advanced: ['full-portfolio', 'interactive-resume', 'project-dashboard']
      },
      developer: {
        beginner: ['developer-portfolio', 'simple-dashboard', 'landing-page'],
        intermediate: ['saas-dashboard', 'admin-panel', 'api-documentation'],
        advanced: ['enterprise-dashboard', 'complex-admin', 'data-visualization']
      },
      designer: {
        beginner: ['design-portfolio', 'showcase-gallery', 'creative-landing'],
        intermediate: ['agency-website', 'design-system', 'case-study-template'],
        advanced: ['interactive-portfolio', 'design-studio', 'creative-platform']
      },
      entrepreneur: {
        beginner: ['startup-landing', 'mvp-showcase', 'simple-saas'],
        intermediate: ['business-dashboard', 'saas-platform', 'marketing-site'],
        advanced: ['enterprise-saas', 'complex-platform', 'multi-tenant-app']
      },
      other: {
        beginner: ['basic-website', 'simple-landing', 'contact-page'],
        intermediate: ['business-site', 'service-platform', 'content-management'],
        advanced: ['custom-platform', 'enterprise-solution', 'complex-workflow']
      }
    };

    return templates[role]?.[complexityLevel] || templates.other.beginner;
  }

  /**
   * Get preferred components based on role
   */
  getPreferredComponents(role) {
    const components = {
      student: ['Card', 'Button', 'Form', 'Gallery', 'Timeline'],
      developer: ['Table', 'Chart', 'CodeBlock', 'API', 'Dashboard'],
      designer: ['Gallery', 'Showcase', 'Portfolio', 'Creative', 'Interactive'],
      entrepreneur: ['Pricing', 'Features', 'CTA', 'Testimonials', 'Analytics'],
      other: ['Basic', 'Content', 'Navigation', 'Contact', 'About']
    };

    return components[role] || components.other;
  }

  /**
   * Get design patterns based on complexity
   */
  getDesignPatterns(complexityLevel) {
    const patterns = {
      beginner: ['simple-layout', 'basic-navigation', 'clean-design'],
      intermediate: ['responsive-design', 'component-based', 'modern-ui'],
      advanced: ['complex-interactions', 'micro-animations', 'advanced-patterns']
    };

    return patterns[complexityLevel] || patterns.beginner;
  }

  /**
   * Get user onboarding data
   */
  async getUserOnboardingData(userId) {
    try {
      const { data, error } = await supabase
        .from('ai_contexts')
        .select('context_data')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return { success: true, data: data?.context_data };
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return data?.onboarding_completed || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }
}

export default new OnboardingService();
