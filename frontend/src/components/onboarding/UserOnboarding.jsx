import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, User, Code, Palette, Rocket, Settings, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';

const UserOnboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Onboarding questions structure
  const questions = [
    {
      id: 'role',
      title: 'What best describes you?',
      subtitle: 'Help us personalize your UIFlow experience',
      type: 'role-select',
      options: [
        { value: 'student', label: 'Student', icon: '🎓', description: 'Learning design and development' },
        { value: 'developer', label: 'Developer', icon: '👨‍💻', description: 'Building applications and websites' },
        { value: 'designer', label: 'Designer', icon: '🎨', description: 'Creating user interfaces and experiences' },
        { value: 'entrepreneur', label: 'Entrepreneur', icon: '🚀', description: 'Building products and businesses' },
        { value: 'other', label: 'Other', icon: '🔧', description: 'Something else entirely' }
      ]
    }
  ];

  // Dynamic follow-up questions based on role
  const getFollowUpQuestions = (role) => {
    const followUps = {
      student: [
        {
          id: 'study_field',
          title: 'What are you studying?',
          subtitle: 'This helps us suggest relevant templates',
          type: 'select',
          options: [
            { value: 'computer_science', label: 'Computer Science' },
            { value: 'design', label: 'Design & Arts' },
            { value: 'business', label: 'Business & Marketing' },
            { value: 'engineering', label: 'Engineering' },
            { value: 'other', label: 'Other Field' }
          ]
        },
        {
          id: 'experience_level',
          title: 'How would you rate your design experience?',
          subtitle: 'We\'ll adjust our suggestions accordingly',
          type: 'select',
          options: [
            { value: 'beginner', label: 'Complete Beginner', description: 'Just getting started' },
            { value: 'some_experience', label: 'Some Experience', description: 'Basic understanding' },
            { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with basics' }
          ]
        },
        {
          id: 'main_goal',
          title: 'What\'s your main goal with UIFlow?',
          subtitle: 'This helps us recommend the right features',
          type: 'select',
          options: [
            { value: 'learn_design', label: 'Learn UI/UX Design' },
            { value: 'build_portfolio', label: 'Build My Portfolio' },
            { value: 'class_project', label: 'Complete Class Projects' },
            { value: 'personal_interest', label: 'Personal Interest' }
          ]
        }
      ],
      developer: [
        {
          id: 'tech_stack',
          title: 'What\'s your primary tech stack?',
          subtitle: 'We\'ll suggest compatible components',
          type: 'select',
          options: [
            { value: 'react', label: 'React/Next.js' },
            { value: 'vue', label: 'Vue/Nuxt.js' },
            { value: 'angular', label: 'Angular' },
            { value: 'backend', label: 'Backend Focused' },
            { value: 'fullstack', label: 'Full-Stack' },
            { value: 'mobile', label: 'Mobile Development' }
          ]
        },
        {
          id: 'experience_level',
          title: 'What\'s your experience level?',
          subtitle: 'This determines complexity of suggestions',
          type: 'select',
          options: [
            { value: 'junior', label: 'Junior Developer', description: '0-2 years experience' },
            { value: 'mid_level', label: 'Mid-Level Developer', description: '2-5 years experience' },
            { value: 'senior', label: 'Senior Developer', description: '5+ years experience' },
            { value: 'lead', label: 'Tech Lead/Architect', description: 'Leading teams and architecture' }
          ]
        },
        {
          id: 'team_size',
          title: 'What\'s your typical team size?',
          subtitle: 'Helps us suggest collaboration features',
          type: 'select',
          options: [
            { value: 'solo', label: 'Solo Developer' },
            { value: 'small_team', label: 'Small Team (2-5)' },
            { value: 'medium_team', label: 'Medium Team (6-15)' },
            { value: 'large_team', label: 'Large Team (15+)' }
          ]
        }
      ],
      designer: [
        {
          id: 'design_focus',
          title: 'What\'s your design focus?',
          subtitle: 'We\'ll customize templates for your specialty',
          type: 'select',
          options: [
            { value: 'ui_ux', label: 'UI/UX Design' },
            { value: 'product_design', label: 'Product Design' },
            { value: 'web_design', label: 'Web Design' },
            { value: 'graphic_design', label: 'Graphic Design' },
            { value: 'brand_design', label: 'Brand Design' }
          ]
        },
        {
          id: 'experience_level',
          title: 'How many years of design experience?',
          subtitle: 'This affects the complexity of our suggestions',
          type: 'select',
          options: [
            { value: 'beginner', label: 'Beginner', description: 'Less than 1 year' },
            { value: '1_3_years', label: '1-3 Years', description: 'Building foundational skills' },
            { value: '3_7_years', label: '3-7 Years', description: 'Experienced designer' },
            { value: '7_plus_years', label: '7+ Years', description: 'Senior designer' }
          ]
        },
        {
          id: 'work_type',
          title: 'How do you primarily work?',
          subtitle: 'Helps us suggest relevant workflows',
          type: 'select',
          options: [
            { value: 'freelance', label: 'Freelance Designer' },
            { value: 'agency', label: 'Design Agency' },
            { value: 'in_house', label: 'In-House Designer' },
            { value: 'student', label: 'Design Student' }
          ]
        }
      ],
      entrepreneur: [
        {
          id: 'business_stage',
          title: 'What stage is your business?',
          subtitle: 'We\'ll suggest appropriate design complexity',
          type: 'select',
          options: [
            { value: 'idea_stage', label: 'Idea Stage', description: 'Validating concepts' },
            { value: 'mvp', label: 'Building MVP', description: 'Creating first version' },
            { value: 'early_startup', label: 'Early Startup', description: 'Growing user base' },
            { value: 'established', label: 'Established Business', description: 'Scaling operations' }
          ]
        },
        {
          id: 'industry',
          title: 'What industry are you in?',
          subtitle: 'Helps us recommend relevant templates',
          type: 'select',
          options: [
            { value: 'saas', label: 'SaaS/Software' },
            { value: 'ecommerce', label: 'E-commerce' },
            { value: 'mobile_apps', label: 'Mobile Apps' },
            { value: 'consulting', label: 'Consulting/Services' },
            { value: 'fintech', label: 'FinTech' },
            { value: 'other', label: 'Other Industry' }
          ]
        },
        {
          id: 'primary_need',
          title: 'What\'s your primary design need?',
          subtitle: 'This helps us prioritize features for you',
          type: 'select',
          options: [
            { value: 'mvp_design', label: 'MVP Design' },
            { value: 'landing_pages', label: 'Landing Pages' },
            { value: 'product_redesign', label: 'Product Redesign' },
            { value: 'full_platform', label: 'Full Platform Design' }
          ]
        }
      ],
      other: [
        {
          id: 'role_description',
          title: 'What describes you best?',
          subtitle: 'Help us understand your background',
          type: 'select',
          options: [
            { value: 'product_manager', label: 'Product Manager' },
            { value: 'marketing', label: 'Marketing Professional' },
            { value: 'sales', label: 'Sales Professional' },
            { value: 'consultant', label: 'Consultant' },
            { value: 'hobbyist', label: 'Hobbyist/Personal Use' }
          ]
        },
        {
          id: 'design_experience',
          title: 'How familiar are you with design tools?',
          subtitle: 'We\'ll adjust the interface complexity',
          type: 'select',
          options: [
            { value: 'none', label: 'No Experience', description: 'Never used design tools' },
            { value: 'basic', label: 'Basic', description: 'Used simple tools occasionally' },
            { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with design software' },
            { value: 'advanced', label: 'Advanced', description: 'Proficient with multiple tools' }
          ]
        },
        {
          id: 'main_goal',
          title: 'What\'s your main goal?',
          subtitle: 'This helps us customize your experience',
          type: 'select',
          options: [
            { value: 'personal_project', label: 'Personal Project' },
            { value: 'business_need', label: 'Business Requirement' },
            { value: 'learning', label: 'Learning & Exploration' },
            { value: 'team_collaboration', label: 'Team Collaboration' }
          ]
        }
      ]
    };
    return followUps[role] || [];
  };

  // Get all questions including follow-ups
  const getAllQuestions = () => {
    const baseQuestions = [...questions];
    if (answers.role) {
      const followUps = getFollowUpQuestions(answers.role);
      baseQuestions.push(...followUps);
    }
    return baseQuestions;
  };

  const allQuestions = getAllQuestions();
  const currentQuestion = allQuestions[currentStep];
  const isLastStep = currentStep === allQuestions.length - 1;

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentStep < allQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: API call to save onboarding data
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      onComplete(answers);
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.type === 'role-select') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(currentQuestion.id, option.value)}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                answers[currentQuestion.id] === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start space-x-4">
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{option.label}</h3>
                  <p className="text-gray-400 text-sm">{option.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'select') {
      return (
        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleAnswer(currentQuestion.id, option.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                answers[currentQuestion.id] === option.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{option.label}</h4>
                  {option.description && (
                    <p className="text-gray-400 text-sm mt-1">{option.description}</p>
                  )}
                </div>
                {answers[currentQuestion.id] === option.value && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      );
    }
  };

  const progress = ((currentStep + 1) / allQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              Step {currentStep + 1} of {allQuestions.length}
            </span>
            <span className="text-sm text-gray-400">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-800"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">
                {currentQuestion?.title}
              </h2>
              <p className="text-gray-400 text-lg">
                {currentQuestion?.subtitle}
              </p>
            </div>

            {renderQuestion()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion?.id] || isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Saving...
              </div>
            ) : isLastStep ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserOnboarding;
