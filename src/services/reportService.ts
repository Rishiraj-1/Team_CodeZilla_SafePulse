// SafetyZoneData type (used as adapter for heatmap layer in mapService)
export interface SafetyZoneData {
    id: string;
    coordinates: [number, number];
    type: 'risk' | 'safe';
    intensity: number;
}

// --- Types ---
export type ReportCategory =
    | 'Poor Lighting'
    | 'Suspicious Loitering'
    | 'Verbal Harassment'
    | 'Physical Threat'
    | 'Abandoned/Dark Area'
    | 'Unsafe Crowd Behavior';

export interface ReportData {
    id: string;
    category: ReportCategory;
    timestamp: number;
    coordinates: [number, number];
    deviceId: string;
    hasImage: boolean;
    description?: string;
}

export interface RiskCluster {
    id: string;
    coordinates: [number, number];
    reports: ReportData[];
    weight: number;
    intensity: number; // 0.1 to 1.0 mapped for heatmap
}

// --- Configuration ---
const CONFIG = {
    CLUSTER_RADIUS_KM: 0.05, // 50 meters
    DECAY_HOURS: 4,          // Reports older than this are ignored completely
    THRESHOLD_COUNT: 3,      // Need 3 unique devices to confirm a red zone
};

// --- In-Memory Store (Hackathon Demo) ---
let reports: ReportData[] = [];

// Helper: Haversine distance in km
const getDistance = (coord1: [number, number], coord2: [number, number]) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// --- Service Methods ---

export const getReports = () => [...reports];

export const addReport = (report: Omit<ReportData, 'id' | 'timestamp'>) => {
    const newReport: ReportData = {
        ...report,
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now()
    };

    // False Reporting Protection: Throttle per device ID in this small area within 10 mins
    const recentFromDevice = reports.find(r =>
        r.deviceId === newReport.deviceId &&
        getDistance(r.coordinates, newReport.coordinates) < CONFIG.CLUSTER_RADIUS_KM &&
        (Date.now() - r.timestamp) < 10 * 60 * 1000 // 10 mins
    );

    if (recentFromDevice) {
        throw new Error('You have already submitted a report in this exact area recently.');
    }

    reports.push(newReport);
    return newReport;
};

export const clearReports = () => {
    reports = [];
};

/**
 * Clustering & Consensus Engine
 * 1. Filter out old reports (Data Freshness / Decay)
 * 2. Group reports geographically (DBSCAN simulation)
 * 3. Calculate weight per cluster
 * 4. Yield only clusters that pass threshold
 */
export const getActiveClusters = (): RiskCluster[] => {
    const now = Date.now();
    const maxAgeMs = CONFIG.DECAY_HOURS * 60 * 60 * 1000;

    // 1. Decay Engine (Filter old)
    const activeReports = reports.filter(r => (now - r.timestamp) <= maxAgeMs);

    // 2. Clustering Layer (Radius grouping)
    const clusters: RiskCluster[] = [];

    activeReports.forEach(report => {
        // Find existing cluster within radius
        const cluster = clusters.find(c => getDistance(c.coordinates, report.coordinates) <= CONFIG.CLUSTER_RADIUS_KM);

        if (cluster) {
            cluster.reports.push(report);
            // Re-center cluster slightly (average)
            cluster.coordinates[0] = (cluster.coordinates[0] * (cluster.reports.length - 1) + report.coordinates[0]) / cluster.reports.length;
            cluster.coordinates[1] = (cluster.coordinates[1] * (cluster.reports.length - 1) + report.coordinates[1]) / cluster.reports.length;
        } else {
            clusters.push({
                id: `cluster_${report.id}`,
                coordinates: [...report.coordinates],
                reports: [report],
                weight: 0,
                intensity: 0
            });
        }
    });

    // 3. Validation & Weighting Layer
    const validClusters = clusters.filter(cluster => {
        const uniqueDevices = new Set(cluster.reports.map(r => r.deviceId)).size;

        // Threshold check
        if (uniqueDevices < CONFIG.THRESHOLD_COUNT) return false;

        // Weight calculation
        let totalWeight = 0;
        cluster.reports.forEach(r => {
            let w = 1.0;
            // Time decay (newer = higher weight, older = approaches 0.2)
            const ageHours = (now - r.timestamp) / (1000 * 60 * 60);
            const timeMult = Math.max(0.2, 1 - (ageHours / CONFIG.DECAY_HOURS));
            w *= timeMult;

            // Media attachment slight boost
            if (r.hasImage) w *= 1.2;

            totalWeight += w;
        });

        cluster.weight = totalWeight;

        // Cap max intensity at 1.0, base intensity is 0.6 if threshold is met
        cluster.intensity = Math.min(1.0, 0.6 + (totalWeight * 0.05));

        return true;
    });

    return validClusters;
};

// Adapter for the Heatmap logic in mapService
export const getCrowdSafetyZones = (): SafetyZoneData[] => {
    const clusters = getActiveClusters();
    return clusters.map(c => ({
        id: c.id,
        coordinates: c.coordinates,
        type: 'risk',
        intensity: c.intensity
    }));
};
