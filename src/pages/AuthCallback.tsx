import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';

const AuthCallback = () => {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const handled = useRef(false);

    // Always-fresh refs so intervals/timeouts can read latest values
    const userRef = useRef<User | null>(user);
    const isLoadingRef = useRef<boolean>(isLoading);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

    const routeUser = (u: User | null) => {
        if (handled.current) return;
        handled.current = true;

        if (!u) {
            navigate('/login', { replace: true });
            return;
        }
        if (u.status === 'PENDING_VERIFICATION' && u.role !== 'admin') {
            navigate('/pending', { replace: true });
        } else if (u.status === 'REJECTED' && u.role !== 'admin') {
            navigate('/rejected', { replace: true });
        } else if (!u.gender) {
            navigate('/complete-profile', { replace: true });
        } else if (u.role === 'admin') {
            navigate('/app/admin', { replace: true });
        } else if (u.role === 'authority') {
            navigate('/app/authority', { replace: true });
        } else if (u.role === 'guardian') {
            navigate('/app/guardian', { replace: true });
        } else {
            navigate('/app/citizen', { replace: true });
        }
    };

    // Dedicated effect: re-run when AuthContext finishes hydrating
    useEffect(() => {
        if (!isLoading) {
            // Tiny debounce so user ref has synced
            const t = setTimeout(() => routeUser(userRef.current), 50);
            return () => clearTimeout(t);
        }
    }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    // Safety net: subscribe directly to Supabase events in case AuthContext
    // was already loading=false before this page mounted (returning user)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                // Poll until AuthContext has loaded the user profile
                const poll = setInterval(() => {
                    if (!isLoadingRef.current) {
                        clearInterval(poll);
                        routeUser(userRef.current);
                    }
                }, 150);
                setTimeout(() => {
                    clearInterval(poll);
                    if (!handled.current) routeUser(userRef.current);
                }, 10000);
            }
        });

        // Hard timeout fallback — 15s
        const hardTimeout = setTimeout(() => {
            if (!handled.current) routeUser(null);
        }, 15000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(hardTimeout);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050505] gap-4">
            <div className="w-10 h-10 border-2 border-[#b787f5]/30 border-t-[#b787f5] rounded-full animate-spin" />
            <p className="text-white/40 text-sm tracking-[0.15em] uppercase font-medium">
                Signing you in…
            </p>
        </div>
    );
};

export default AuthCallback;
