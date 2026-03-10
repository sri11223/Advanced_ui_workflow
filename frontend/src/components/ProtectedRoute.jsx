import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, token } = useAuthStore();

  // During rehydration, check if we have a persisted token
  if (!isAuthenticated && token) {
    // Token exists but state not yet initialized - show nothing briefly
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
