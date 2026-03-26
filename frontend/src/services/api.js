/**
 * ============================================================
 * API Service
 * ============================================================
 * Centralized API client for communicating with the Laravel backend.
 */

import axios from 'axios';

// ULTIMATE IP DETECTION:
// If the user accessed the dashboard via an IP (like 192.168.1.200),
// we should talk to the backend on that SAME IP.
const getBackendURL = () => {
    // 1. Check if an explicit override exists in .env
    if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Automagically detect the current server IP from the address bar
    const currentHost = window.location.hostname; // e.g., "192.168.1.200" or "localhost"
    return `http://${currentHost}:8000`;
};

const API_CONFIG = {
    baseURL: getBackendURL(),
    apiKey: import.meta.env.VITE_API_KEY || 'icafe-monitor-api-key-2024-secure-token-abc123xyz',
    timeout: 30000,
};

console.log(`[API] Connecting to backend at: ${API_CONFIG.baseURL}`);

// Create axios instance
const api = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_CONFIG.apiKey,
    },
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error(`API Error [${error.response.status}]:`, error.response.data);
        } else if (error.request) {
            console.error('API Error: No response received from ' + API_CONFIG.baseURL, error.message);
        } else {
            console.error('API Error:', error.message);
        }
        return Promise.reject(error);
    }
);

/**
 * Internal helper to do path fallback between API prefix and no prefix.
 */
async function apiGetWithFallback(path, params = {}) {
    try {
        const response = await api.get(path, { params });
        return response.data;
    } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
            const fallbackPath = path.replace(/^\/api/, '');
            if (fallbackPath !== path) {
                const fallbackResponse = await api.get(fallbackPath, { params });
                return fallbackResponse.data;
            }
        }
        throw error;
    }
}

/**
 * Fetch all PCs with their current status.
 */
export async function fetchPcs(includeScreenshot = true) {
    const params = includeScreenshot ? {} : { include_screenshot: '0' };
    return apiGetWithFallback('/api/pcs', params);
}

/**
 * Fetch a single PC (optionally with screenshot).
 */
export async function fetchPc(pcName, includeScreenshot = true) {
    const params = includeScreenshot ? {} : { include_screenshot: '0' };
    return apiGetWithFallback(`/api/pcs/${encodeURIComponent(pcName)}`, params);
}

/**
 * Fetch the latest recorded video clip for a specific PC.
 */
export async function fetchLatestVideo(pcName) {
    return apiGetWithFallback(`/api/videos/latest/${encodeURIComponent(pcName)}`);
}

export async function fetchStreamFrame(pcName) {
    return apiGetWithFallback(`/api/streams/frame/${encodeURIComponent(pcName)}`);
}

export async function fetchStreamFrames(pcNames = []) {
    const normalized = Array.isArray(pcNames) ? pcNames.filter(Boolean) : [];
    if (normalized.length === 0) {
        return { status: 'success', data: {} };
    }

    return apiGetWithFallback('/api/streams/frames', {
        pc_names: normalized.join(',')
    });
}

async function apiPostWithFallback(path, data = {}, config = {}) {
    try {
        const response = await api.post(path, data, config);
        return response.data;
    } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
            const fallbackPath = path.replace(/^\/api/, '');
            if (fallbackPath !== path) {
                const responseFallback = await api.post(fallbackPath, data, config);
                return responseFallback.data;
            }
        }
        throw error;
    }
}

export async function postWebRTCOffer(pcName, sdp) {
    return apiPostWithFallback('/api/streams/webrtc/offer-session', { pc_name: pcName, sdp });
}

export async function getWebRTCAnswer(pcName) {
    return apiGetWithFallback(`/api/streams/webrtc/answer-agent/${encodeURIComponent(pcName)}`);
}

/**
 * Send a command to a specific PC.
 */
export async function sendCommand(pcName, commandType, commandData = null) {
    const response = await api.post('/api/send-command', {
        pc_name: pcName,
        command_type: commandType,
        command_data: commandData,
    });
    return response.data;
}

export async function fetchCommandResult(id) {
    return apiGetWithFallback(`/api/command-result/${id}`);
}

export default api;
