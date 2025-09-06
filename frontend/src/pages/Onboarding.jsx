import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import UserOnboarding from '../components/onboarding/UserOnboarding';
import onboardingService from '../services/onboardingService';
import useAuthStore from '../store/authStore';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleOnboardingComplete = async (answers) => {
    setIsCompleting(true);
    
    try {
      console.log('Frontend: Completing onboarding with answers:', answers);
      console.log('Frontend: User ID:', user.id);
      
      const result = await onboardingService.saveOnboardingData(user.id, answers);
      console.log('Frontend: Onboarding save result:', result);
      
      if (result.success) {
        // Show success animation then redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        console.error('Failed to save onboarding data:', result.error);
        // Still redirect but show error toast
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      navigate('/dashboard');
    }
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Setting up your workspace...</h2>
          <p className="text-gray-400">We're personalizing UIFlow just for you</p>
        </motion.div>
      </div>
    );
  }

  return <UserOnboarding onComplete={handleOnboardingComplete} />;
};

export default OnboardingPage;
