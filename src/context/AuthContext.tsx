import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'citizen' | 'guardian' | 'authority' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
    status: string;
    phone?: string;
    phone_verified?: boolean;
    gender?: string;
    profile_image_url?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserProfile = async (token: string) => {
        const API = import.meta.env.VITE_API_URL ?? '';
        try {
            const res = await fetch(`${API}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const backendRole = data.role.toLowerCase();

                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: backendRole as UserRole,
                    status: data.status,
                    phone: data.phone,
                    phone_verified: data.phone_verified || false,
                    gender: data.gender,
                    profile_image_url: data.profile_image_url || null,
                    picture: data.profile_image_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0D8ABC&color=fff`,
                });
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Subscribe FIRST so we don't miss the INITIAL_SESSION event
        // that fires when PKCE exchanges the ?code= param.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            if (session?.access_token) {
                localStorage.setItem('safepulse_auth_token', session.access_token);
                await fetchUserProfile(session.access_token);
            } else {
                localStorage.removeItem('safepulse_auth_token');
                setUser(null);
                setIsLoading(false);
            }
        });

        // Then call getSession() to cover the case where the session
        // is already stored (returning user, no OAuth code in URL).
        // If onAuthStateChange already fired (INITIAL_SESSION), this
        // is a no-op because fetchUserProfile/setIsLoading already ran.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            if (!session) {
                // No session and listener gave us nothing yet → not loading
                setIsLoading(false);
            }
            // If there IS a session, onAuthStateChange will have already
            // called fetchUserProfile, so we do nothing extra here.
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('safepulse_auth_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

