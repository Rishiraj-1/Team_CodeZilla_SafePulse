import axios from 'axios';
// import { auth, googleProvider } from '../firebase';
// import { signInWithPopup, signOut, getIdToken } from 'firebase/auth';

export interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
    role?: 'citizen' | 'guardian' | 'admin';
    isNewUser?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'safepulse_auth_token';
const USER_KEY = 'safepulse_mock_user';

// Warn in development if API URL is not set
if (!API_URL && import.meta.env.DEV) {
    console.warn('⚠️  VITE_API_URL is not set. Make sure .env.local has VITE_API_URL=http://localhost:8000');
}

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true // Allow cookies
});

// Add Authorization header to requests if token exists
api.interceptors.request.use(async (config) => {
    // MOCK: Just use local token if available
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) {
        config.headers.Authorization = 'Bearer ' + localToken;
    }
    return config;
});

export const authService = {
    // 1. Mock Login
    loginWithGoogle: async (): Promise<User> => {
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 50));

            const mockUser: User = {
                id: 'mock-user-123',
                email: 'testuser@safepulse.com',
                name: 'Test Citizen',
                picture: 'https://ui-avatars.com/api/?name=Test+Citizen&background=random',
                isNewUser: false, // Bypass signup flow
                role: 'citizen' // Default to citizen role
            };

            const mockToken = 'mock-jwt-token-12345';
            localStorage.setItem(TOKEN_KEY, mockToken);
            localStorage.setItem(USER_KEY, JSON.stringify(mockUser));

            return mockUser;
        } catch (error) {
            console.error('Mock Login failed', error);
            throw error;
        }
    },

    // 2. Select Role (Mock)
    selectRole: async (role: 'citizen' | 'guardian'): Promise<User> => {
        try {
            const storedUser = localStorage.getItem(USER_KEY);
            if (!storedUser) throw new Error("No user session found");

            const user: User = JSON.parse(storedUser);
            const updatedUser: User = {
                ...user,
                role: role,
                isNewUser: false
            };

            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            await new Promise(resolve => setTimeout(resolve, 500));

            return updatedUser;
        } catch (error) {
            console.error('Role selection failed', error);
            throw error;
        }
    },

    // 3. Get Current User / Me (Mock)
    getCurrentUser: async (): Promise<User | null> => {
        try {
            const storedUser = localStorage.getItem(USER_KEY);
            if (storedUser) {
                // Simulate validating session
                return JSON.parse(storedUser);
            }
            return null;
        } catch (error) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return null;
        }
    },

    logout: async () => {
        // await signOut(auth); // Disable Firebase logout
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    getToken: () => localStorage.getItem(TOKEN_KEY),
    isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY)
};
