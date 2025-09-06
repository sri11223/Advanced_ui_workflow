import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Login function
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password,
          });

          const { access_token, user } = response.data;
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          toast.success('Welcome back!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Register function
      register: async (userData) => {
        set({ isLoading: true });
        try {
          console.log('Frontend: Making registration request to:', `${API_BASE_URL}/auth/register`);
          console.log('Frontend: Request data:', userData);
          const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

          const { access_token, user } = response.data;
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          toast.success('Account created successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          console.error('Frontend: Registration error:', error);
          console.error('Frontend: Error response:', error.response?.data);
          console.error('Frontend: Error status:', error.response?.status);
          const message = error.response?.data?.error || 'Registration failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      // Logout function
      logout: async () => {
        try {
          if (get().token) {
            await axios.post(`${API_BASE_URL}/auth/logout`);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          
          // Remove axios default header
          delete axios.defaults.headers.common['Authorization'];
          
          toast.success('Logged out successfully');
        }
      },

      // Initialize auth state
      initialize: () => {
        const { token } = get();
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ isAuthenticated: true });
        }
      },

      // Refresh token
      refreshToken: async () => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`);
          const { access_token } = response.data;
          
          set({ token: access_token });
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          return { success: true };
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          return { success: false };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
