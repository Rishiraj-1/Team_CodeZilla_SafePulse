const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Warn in development if API URL is not set
if (!API_BASE_URL && import.meta.env.DEV) {
    console.warn('⚠️  VITE_API_URL is not set. Make sure .env.local has VITE_API_URL=http://localhost:8000');
}

export interface RedZone {
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    risk_level: string;
}

export interface BaselineRisk {
    crime_type: string;
    total_cases: number;
    crime_rate_per_lakh: number;
    weighted_score: number;
}

export const fetchBaselineRisk = async (city: string = 'Lonavala'): Promise<BaselineRisk[]> => {
    try {
        const response = await fetch(API_BASE_URL + '/baseline-risk?city=' + encodeURIComponent(city));
        if (!response.ok) {
            console.warn(`Failed to fetch baseline risk: ${response.statusText}`);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('Network error fetching baseline risk:', error);
        return [];
    }
};

export const fetchRedZones = async (): Promise<RedZone[]> => {
    try {
        const response = await fetch(API_BASE_URL + '/red-zones');
        if (!response.ok) {
            console.warn(`Failed to fetch red zones: ${response.statusText}`);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('Network error fetching red zones:', error);
        return [];
    }
};

export const triggerSOS = async (latitude: number, longitude: number): Promise<{ status: string, session_id?: string, whatsapp_url?: string }> => {
    try {
        const token = localStorage.getItem('safepulse_auth_token') || sessionStorage.getItem('safepulse_auth_token');
        const response = await fetch(API_BASE_URL + '/sos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.detail || `Failed to trigger SOS: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error triggering SOS:', error);
        throw error;
    }
};

export const sendDirectRequest = async (targetGuardianId: string, latitude: number, longitude: number, destination?: string, destination_coords?: [number, number]): Promise<{ status: string }> => {
    try {
        const response = await fetch(API_BASE_URL + '/direct-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target_guardian_id: targetGuardianId, latitude, longitude, destination, destination_coords }),
        });

        if (!response.ok) {
            throw new Error(`Failed to send direct request: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error sending direct request:', error);
        throw error;
    }
};

export const acceptRequest = async (
    sosId: string, guardianId: string, guardianName: string,
    guardianPhone: string, guardianImageUrl: string | null,
    latitude: number, longitude: number
): Promise<{ status: string }> => {
    try {
        const response = await fetch(API_BASE_URL + '/accept-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sos_id: sosId,
                guardian_id: guardianId,
                guardian_name: guardianName,
                guardian_phone: guardianPhone,
                guardian_image_url: guardianImageUrl,
                latitude,
                longitude
            }),
        });
        if (!response.ok) throw new Error(`Failed to accept request: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error accepting request:', error);
        throw error;
    }
};

export const updateCitizenLocation = async (sessionId: string, lat: number, lng: number) => {
    try {
        await fetch(API_BASE_URL + '/update-citizen-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, lat, lng }),
        });
    } catch (e) { /* silent */ }
};

export const updateGuardianLocation = async (sessionId: string, lat: number, lng: number) => {
    try {
        await fetch(API_BASE_URL + '/update-guardian-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, lat, lng }),
        });
    } catch (e) { /* silent */ }
};

export const generateVerificationOtp = async (sessionId: string, guardianId: string, guardianName: string) => {
    const response = await fetch(API_BASE_URL + '/generate-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, guardian_id: guardianId, guardian_name: guardianName }),
    });
    return await response.json();
};

export const verifyOtp = async (sessionId: string, otp: string) => {
    const response = await fetch(API_BASE_URL + '/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, otp }),
    });
    return await response.json();
};

// Keeping these stubs to not break other parts of the app if they import them
export const getNearbyGuardians = async (lat: number, lng: number) => {
    return [
        { id: 'alpha-04', lat: lat + 0.001, lng: lng + 0.001, status: 'active' },
        { id: 'beta-02', lat: lat - 0.002, lng: lng - 0.001, status: 'busy' },
    ];
};

export const getRoute = async (origin: [number, number], destination: [number, number]) => {
    return null;
};
