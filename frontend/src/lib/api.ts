import axios from 'axios';

// Use environment variable for production, fallback to relative path for local development proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Static URL for files (e.g., uploads)
// If API_URL is relative (/api/v1), STATIC_URL is also relative (/static)
// If API_URL is absolute (https://api.com/api/v1), STATIC_URL is https://api.com/static
export const STATIC_URL = API_URL.includes('://')
    ? API_URL.replace('/api/v1', '/static')
    : '/static';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Request interceptor to add Auth Token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 (Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
