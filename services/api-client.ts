import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CONFIG, getApiEndpoint } from '@/services/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
}

export interface User {
    id: number;
    email: string | null;
    phone: string;
    google_id: string | null;
    facebook_id: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    disabled_at: string | null;
    registration_completed: boolean;
    profile_photo_path: string | null;
    created_at: string;
    updated_at: string;
    two_factor_enabled: boolean;
    profile: any | null;
    preference: any | null;
    photos?: any[];
}

export interface PhotoData {
    id: string;
    uri: string;
    isMain: boolean;
    isPrivate: boolean;
}

export interface RegistrationData {
    gender: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: string;
    email: string;
    status: string;
    occupation: string;
    profession: string;
    bio?: string;
    interests?: string;
    country: string;
    countryCode: string;
    state?: string;
    region?: string;
    city: string;
    lookingFor: string;
    photos: PhotoData[];
}

class ApiClient {
    private client!: AxiosInstance;
    private authToken: string | null = null;
    private requestQueue: Array<() => Promise<any>> = [];
    private isRefreshingToken = false;

    // Singleton pattern
    private static instance: ApiClient;
    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    constructor() {
        if (ApiClient.instance) {
            return ApiClient.instance;
        }

        this.client = axios.create({
            baseURL: CONFIG.API_URL,
            timeout: 15000, // 15 seconds
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Set up request interceptor for auth token
        this.client.interceptors.request.use(
            async (config) => {
                // Check network connection before making request
                const netInfo = await NetInfo.fetch();
                if (!netInfo.isConnected) {
                    throw new Error('No internet connection');
                }

                // Add auth token if available
                if (!this.authToken) {
                    this.authToken = await AsyncStorage.getItem('auth_token');
                }

                if (this.authToken) {
                    config.headers['Authorization'] = `Bearer ${this.authToken}`;
                }

                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Set up response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                // Keep the original response structure for successful requests
                return response;
            },
            async (error) => {
                // Handle network errors
                if (!error.response) {
                    throw new Error('Network error. Please check your connection.');
                }

                // Handle expired token
                if (error.response.status === 401) {
                    // Try to refresh token
                    try {
                        const refreshed = await this.refreshToken();
                        if (refreshed) {
                            // Retry the original request
                            return this.client.request(error.config);
                        }
                    } catch (refreshError) {
                        // If refresh fails, log out user
                        await this.logoutUser();
                        throw new Error('Session expired. Please log in again.');
                    }
                }

                // Re-throw the error to be handled by individual methods
                throw error;
            }
        );

        ApiClient.instance = this;
    }

    /**
     * Transform response to standard format
     */
    private transformResponse<T>(response: AxiosResponse): ApiResponse<T> {
        // If response already has status field, use it
        if (response.data && 'status' in response.data) {
            return response.data;
        }

        // Otherwise, construct standard response format
        return {
            status: 'success',
            data: response.data
        };
    }

    /**
     * Refresh authentication token
     */
    private async refreshToken(): Promise<boolean> {
        // If already refreshing, wait for it to complete
        if (this.isRefreshingToken) {
            return new Promise((resolve) => {
                // Check every 100ms if refreshing has completed
                const checkRefreshingStatus = setInterval(() => {
                    if (!this.isRefreshingToken) {
                        clearInterval(checkRefreshingStatus);
                        resolve(this.authToken !== null);
                    }
                }, 100);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkRefreshingStatus);
                    resolve(this.authToken !== null);
                }, 5000);
            });
        }

        this.isRefreshingToken = true;

        try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');

            if (!refreshToken) {
                this.isRefreshingToken = false;
                return false;
            }

            const response = await axios.post(getApiEndpoint('auth/refresh'), {
                refresh_token: refreshToken
            });

            if (response.data && response.data.token) {
                this.authToken = response.data.token;
                await AsyncStorage.setItem('auth_token', response.data.token);

                if (response.data.refresh_token) {
                    await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
                }

                // Process any queued requests
                this.processRequestQueue();
                this.isRefreshingToken = false;
                return true;
            }

            this.isRefreshingToken = false;
            return false;
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.isRefreshingToken = false;
            return false;
        }
    }

    /**
     * Process queued requests after token refresh
     */
    private async processRequestQueue(): Promise<void> {
        const queue = [...this.requestQueue];
        this.requestQueue = [];

        for (const request of queue) {
            await request();
        }
    }

    /**
     * Log out user
     */
    private async logoutUser(): Promise<void> {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('refresh_token');
        this.authToken = null;

        // In a real app, you would also navigate to login screen
        // and clear any user data from the app state
    }

    /**
     * Set auth token manually
     */
    public async setAuthToken(token: string): Promise<void> {
        this.authToken = token;
        await AsyncStorage.setItem('auth_token', token);
    }

    /**
     * Set refresh token manually
     */
    public async setRefreshToken(token: string): Promise<void> {
        await AsyncStorage.setItem('refresh_token', token);
    }

    /**
     * Clear auth token
     */
    public async clearAuthToken(): Promise<void> {
        this.authToken = null;
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('refresh_token');
    }

    /**
     * Make GET request
     */
    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.get(url, config);
            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Make POST request
     */
    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.post(url, data, config);
            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Make PUT request
     */
    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.put(url, data, config);
            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Make PATCH request
     */
    public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.patch(url, data, config);
            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Make DELETE request
     */
    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        try {
            const response = await this.client.delete(url, config);
            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Upload file(s)
     */
    public async upload<T = any>(
        url: string,
        files: Array<{ uri: string; name: string; type: string }>,
        fieldName: string = 'file',
        additionalData?: Record<string, any>,
        onProgress?: (progress: number) => void
    ): Promise<ApiResponse<T>> {
        try {
            const formData = new FormData();

            // Add files to form data
            files.forEach((file, index) => {
                formData.append(`${fieldName}${files.length > 1 ? '[]' : ''}`, {
                    uri: file.uri,
                    name: file.name,
                    type: file.type
                } as any);
            });

            // Add any additional data
            if (additionalData) {
                Object.keys(additionalData).forEach(key => {
                    formData.append(key, additionalData[key]);
                });
            }

            const response = await this.client.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: event => {
                    if (onProgress && event.total) {
                        const progress = Math.round((event.loaded * 100) / event.total);
                        onProgress(progress);
                    }
                }
            });

            return this.transformResponse<T>(response);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    status: 'error',
                    message: error.response?.data?.message || error.message,
                    data: error.response?.data
                };
            }

            return {
                status: 'error',
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Download file
     */
    public async download(
        url: string,
        destinationPath: string,
        onProgress?: (progress: number) => void
    ): Promise<ApiResponse<{ path: string }>> {
        try {
            // Check if the FileSystem is available (should be imported from expo-file-system)
            const FileSystem = require('expo-file-system');

            if (!FileSystem) {
                return {
                    status: 'error',
                    message: 'FileSystem module not available'
                };
            }

            const downloadResumable = FileSystem.createDownloadResumable(
                url.startsWith('http') ? url : `${CONFIG.API_URL}${url}`,
                destinationPath,
                {
                    headers: this.authToken ? {
                        Authorization: `Bearer ${this.authToken}`
                    } : undefined
                },
                (progress: any) => {
                    if (onProgress && progress.totalBytesExpectedToWrite > 0) {
                        const progressPercent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite * 100;
                        onProgress(progressPercent);
                    }
                }
            );

            const { uri } = await downloadResumable.downloadAsync();

            return {
                status: 'success',
                data: { path: uri }
            };
        } catch (error) {
            console.error('Download error:', error);
            return {
                status: 'error',
                message: 'Failed to download file'
            };
        }
    }

    /**
     * Check if the device has internet connection
     */
    public async isConnected(): Promise<boolean> {
        const netInfo = await NetInfo.fetch();
        return !!(netInfo.isConnected && netInfo.isInternetReachable);
    }

    /**
     * Set default request timeout
     */
    public setTimeout(timeout: number): void {
        this.client.defaults.timeout = timeout;
    }

    /**
     * Set default headers
     */
    public setHeaders(headers: Record<string, string>): void {
        Object.keys(headers).forEach(key => {
            this.client.defaults.headers.common[key] = headers[key];
        });
    }

    /**
     * Clear request headers
     */
    public clearHeaders(headerNames: string[]): void {
        headerNames.forEach(header => {
            delete this.client.defaults.headers.common[header];
        });
    }

    /**
     * Create a cancelable request
     */
    public createCancelToken() {
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();
        return source;
    }

    // ===============================
    // SPECIFIC API ENDPOINTS
    // ===============================

    /**
     * Authentication endpoints
     */
    public auth = {
        sendOTP: async (phone: string) => {
            return this.post('/api/v1/auth/authenticate', { phone });
        },

        verifyOTP: async (phone: string, otp: string) => {
            return this.post('/api/v1/auth/authenticate', { phone, otp });
        },

        completeRegistration: async (data: RegistrationData) => {
            const formData = new FormData();

            // Add user data to form data
            formData.append('gender', data.gender);
            formData.append('firstName', data.firstName);
            formData.append('lastName', data.lastName);
            formData.append('dateOfBirth', data.dateOfBirth);
            formData.append('age', data.age);
            formData.append('email', data.email);
            formData.append('status', data.status);
            formData.append('occupation', data.occupation);
            formData.append('lookingFor', data.lookingFor);
            formData.append('profession', data.profession);

            if (data.bio) formData.append('bio', data.bio);

            if (data.interests) {
                const interestsArray = data.interests.split(',');
                interestsArray.forEach((interest, index) => {
                    formData.append(`interests[${index}]`, interest.trim());
                });
            }

            // Add location data
            formData.append('country', data.country);
            formData.append('countryCode', data.countryCode);
            if (data.state) formData.append('state', data.state);
            if (data.region) formData.append('region', data.region);
            formData.append('city', data.city);

            // Find main photo index
            const mainPhotoIndex = data.photos.findIndex(photo => photo.isMain);
            if (mainPhotoIndex !== -1) {
                formData.append('mainPhotoIndex', mainPhotoIndex.toString());
            }

            // Add photos to form data
            data.photos.forEach((photo, index) => {
                if (!photo.uri) {
                    console.error(`Photo ${index} has invalid URI: ${photo.uri}`);
                    return;
                }

                const uriParts = photo.uri.split('/');
                const fileName = uriParts[uriParts.length - 1] || `photo_${index}.jpg`;

                const fileObject = {
                    uri: photo.uri,
                    name: fileName,
                    type: 'image/jpeg',
                } as any;

                formData.append(`photos[${index}]`, fileObject);
                formData.append(`photoMeta[${index}][isMain]`, photo.isMain ? 'true' : 'false');
                formData.append(`photoMeta[${index}][is_private]`, photo.isPrivate ? 'true' : 'false');
            });

            return this.post('/api/v1/auth/complete-registration', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                },
                transformRequest: (data, headers) => data,
            });
        },

        getHomeStats: async () => {
            return this.get('/api/v1/home');
        },

        logout: async () => {
            try {
                await this.post('/api/v1/auth/logout');
            } catch (error) {
                console.error('Error calling logout API:', error);
            } finally {
                await this.clearAuthToken();
            }
        },

        refresh: async () => {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            return this.post('/auth/refresh', { refresh_token: refreshToken });
        },
    };

    /**
     * Chat endpoints
     */
    public chats = {
        getAll: async (page: number = 1, perPage: number = CONFIG.APP.defaultPageSize) => {
            return this.get(`/api/v1/chats?page=${page}&per_page=${perPage}`);
        },

        getById: async (chatId: number, page: number = 1, perPage: number = CONFIG.APP.chatMessagesPageSize) => {
            return this.get(`/api/v1/chats/${chatId}?page=${page}&per_page=${perPage}`);
        },

        sendMessage: async (chatId: number, data: {
            content: string;
            message_type?: string;
            media_url?: string;
            media_data?: any;
            reply_to_message_id?: number;
        }) => {
            return this.post(`/api/v1/chats/${chatId}/messages`, data);
        },

        sendVoiceMessage: async (chatId: number, formData: FormData) => {
            return this.post(`/api/v1/chats/${chatId}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },

        loadMoreMessages: async (chatId: number, page: number, perPage: number = CONFIG.APP.chatMessagesPageSize) => {
            return this.get(`/api/v1/chats/${chatId}?page=${page}&per_page=${perPage}`);
        },
    };

    /**
     * Matches endpoints
     */
    public matches = {
        getPotential: async (page: number = 1) => {
            return this.get(`/api/v1/matches/potential?page=${page}`);
        },

        getMatches: async (page: number = 1) => {
            return this.get(`/api/v1/matches?page=${page}`);
        },
    };

    /**
     * Likes endpoints
     */
    public likes = {
        send: async (userId: number | string) => {
            return this.post('/api/v1/likes', { user_id: userId });
        },

        getReceived: async (page: number = 1) => {
            return this.get(`/api/v1/likes/received?page=${page}`);
        },
    };

    /**
     * Dislikes endpoints
     */
    public dislikes = {
        send: async (userId: number | string) => {
            return this.post('/api/v1/dislikes', { user_id: userId });
        },
    };

    /**
     * Device token endpoints
     */
    public deviceTokens = {
        register: async (tokenData: {
            token: string;
            deviceName?: string;
            brand?: string;
            modelName?: string;
            osName?: string;
            osVersion?: string;
            deviceType?: string;
            isDevice?: boolean;
            manufacturer?: string;
        }) => {
            return this.post('/api/v1/device-tokens', tokenData);
        },
    };

    /**
     * Broadcasting endpoints
     */
    public broadcasting = {
        auth: async (data: { socket_id: string; channel_name: string }) => {
            return this.post('/api/v1/broadcasting/auth', data);
        },
    };

    /**
     * Agora endpoints
     */
    public agora = {
        getToken: async (channelName: string, userId: string) => {
            return this.post('/api/v1/agora/token', {
                channel_name: channelName,
                user_id: userId
            });
        }
    };

    // Profile management
    public profile = {
        getMyProfile: async () => {
            return this.get('/api/v1/profile/me');
        },

        updateProfile: async (profileId: number, data: any) => {
            return this.put(`/api/v1/profile/${profileId}`, data);
        },

        uploadPhoto: async (photoFile: { uri: string; name: string; type: string }, isProfilePhoto: boolean = false, order: number = 0, isPrivate: boolean = false) => {
            return this.upload(
                '/api/v1/photos/upload',
                [photoFile],
                'photo',
                {
                    is_profile_photo: isProfilePhoto,
                    order: order,
                    is_private: isPrivate
                }
            );
        },

        getPhotos: async () => {
            return this.get('/api/v1/photos');
        },

        deletePhoto: async (photoId: number) => {
            return this.delete(`/api/v1/photos/${photoId}`);
        }
    };

    // Video call endpoints
    public videoCall = {
        getToken: async () => {
            return this.post('/api/v1/video-call/token');
        },

        createRoom: async (customRoomId?: string) => {
            return this.post('/api/v1/video-call/room', {
                custom_room_id: customRoomId
            });
        }
    };
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
