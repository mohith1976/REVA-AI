import axios from 'axios';

const api = axios.create({
    baseURL: '',
    withCredentials: true,
    timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // If a header is already manually set, don't overwrite it
        if (config.headers.Authorization) {
            return config;
        }

        // Determine which token to use based on target URL
        const isPoliceRoute = config.url.startsWith('/api/police');
        const isSharedRoute =
            config.url.startsWith('/api/evidence') ||
            config.url.startsWith('/api/stations');

        let token = null;

        if (isPoliceRoute) {
            token = localStorage.getItem('reva_police_token');
        } else if (isSharedRoute) {
            token =
                localStorage.getItem('reva_police_token') ||
                localStorage.getItem('reva_token');
        } else {
            token = localStorage.getItem('reva_token');
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
            originalRequest._retry = true;
            const isPoliceRoute = originalRequest.url.startsWith('/api/police');
            const refreshUrl = isPoliceRoute ? '/api/police/auth/refresh' : '/api/auth/refresh';
            const tokenKey = isPoliceRoute ? 'reva_police_token' : 'reva_token';
            const userKey = isPoliceRoute ? 'reva_police_user' : 'reva_user';
            const loginPath = isPoliceRoute ? '/police/login' : '/login';

            try {
                const res = await axios.post(refreshUrl, {}, { withCredentials: true });
                const { accessToken } = res.data;
                localStorage.setItem(tokenKey, accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem(tokenKey);
                localStorage.removeItem(userKey);
                window.location.href = loginPath;
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
