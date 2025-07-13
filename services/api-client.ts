import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import { CONFIG, getApiEndpoint } from '@/services/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// === API CLIENT OPTIMIZATIONS ===

// Request priority levels
export enum RequestPriority {
    HIGH = 'high',      // Auth, messages, calls
    MEDIUM = 'medium',  // Profiles, matches
    LOW = 'low'         // Analytics, settings
}

// Request deduplication cache entry
interface CachedRequest {
    promise: Promise<any>;
    timestamp: number;
    response?: ApiResponse<any>;
}

// Request retry configuration
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    retryableStatusCodes: number[];
    retryableNetworkErrors: string[];
}

// Request priority queue entry
interface PriorityQueueEntry {
    request: () => Promise<any>;
    priority: RequestPriority;
    cancelToken: CancelTokenSource;
    timestamp: number;
}

// Optimized API client configuration
interface OptimizedApiConfig {
    requestDeduplication: boolean;
    responseCompression: boolean;
    smartRetry: boolean;
    requestPrioritization: boolean;
    cacheTimeout: number;
    maxConcurrentRequests: number;
    priorityQueueSize: number;
}

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
    file?: any;          // File object for upload
    type?: string;       // File type
    name?: string;       // File name
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
    interests?: string | string[];
    country: string;
    countryCode: string;
    state?: string;
    region?: string;
    city: string;
    lookingFor: string;
    photos: PhotoData[];
}

export interface ProfileData {
    first_name?: string;
    last_name?: string;
    bio?: string;
    profession?: string;
    occupation?: string;
    city?: string;
    state?: string;
    gender?: string;
    looking_for?: string;
    interests?: string[];
}

// Optimized API client configuration
const OPTIMIZED_CONFIG: OptimizedApiConfig = {
    requestDeduplication: true,
    responseCompression: true,
    smartRetry: true,
    requestPrioritization: true,
    cacheTimeout: 30 * 1000, // 30 seconds
    maxConcurrentRequests: 10,
    priorityQueueSize: 50
};

// Retry configuration
const RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryableStatusCodes: [500, 502, 503, 504, 520, 521, 522, 523, 524],
    retryableNetworkErrors: ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
};

// Priority mappings for different API endpoints
const ENDPOINT_PRIORITIES: Record<string, RequestPriority> = {
    // High priority - Auth, messages, calls
    'auth': RequestPriority.HIGH,
    'chats': RequestPriority.HIGH,
    'messages': RequestPriority.HIGH,
    'broadcasting': RequestPriority.HIGH,
    'device-tokens': RequestPriority.HIGH,
    
    // Medium priority - Profiles, matches, likes
    'profile': RequestPriority.MEDIUM,
    'matches': RequestPriority.MEDIUM,
    'likes': RequestPriority.MEDIUM,
    'dislikes': RequestPriority.MEDIUM,
    'photos': RequestPriority.MEDIUM,
    'preferences': RequestPriority.MEDIUM,
    
    // Low priority - Analytics, settings, support
    'settings': RequestPriority.LOW,
    'account': RequestPriority.LOW,
    'blocked-users': RequestPriority.LOW,
    'support': RequestPriority.LOW,
    'emergency-contacts': RequestPriority.LOW,
    'verification': RequestPriority.LOW,
    'countries': RequestPriority.LOW,
    'location': RequestPriority.LOW
};

class ApiClient {
    private client!: AxiosInstance;
    private authToken: string | null = null;
    private requestQueue: Array<() => Promise<any>> = [];
    private isRefreshingToken = false;
    private baseURL: string = 'https://incredibly-evident-hornet.ngrok-free.app';
    
    // === OPTIMIZATION PROPERTIES ===
    
    // Request deduplication cache
    private requestCache = new Map<string, CachedRequest>();
    
    // Response cache for successful requests
    private responseCache = new Map<string, { data: any; timestamp: number }>();
    
    // Priority queue for request management
    private priorityQueue: PriorityQueueEntry[] = [];
    
    // Active requests counter
    private activeRequests = 0;
    
    // Request processing timer
    private processQueueTimer: any = null;

    // Singleton pattern
    private static instance: ApiClient;
    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    constructor(baseURL: string = 'https://incredibly-evident-hornet.ngrok-free.app') {
        if (ApiClient.instance) {
            return ApiClient.instance;
        }

        this.baseURL = baseURL;

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 15000, // 15 seconds
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // Enable response compression
                ...(OPTIMIZED_CONFIG.responseCompression && {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9'
                })
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
                    console.log(`Request to ${config.url} with Bearer token: ${this.authToken.substring(0, 20)}...`);
                } else {
                    console.log(`Request to ${config.url} without auth token`);
                }

                return config;
            },
            (error) => {
                console.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Set up response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                console.log(`API Response ${response.status} for ${response.config.url}:`, response.data);
                // Keep the original response structure for successful requests
                return response;
            },
            async (error) => {
                console.error(`API Error ${error.response?.status} for ${error.config?.url}:`, error.response?.data || error.message);
                
                // Handle network errors
                if (!error.response) {
                    throw new Error('Network error. Please check your connection.');
                }

                // Handle expired token
                if (error.response.status === 401) {
                    console.log('Received 401, attempting token refresh...');
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
        
        // Start the priority queue processor
        if (OPTIMIZED_CONFIG.requestPrioritization) {
            this.startQueueProcessor();
        }
        
        // Start cache cleanup timer
        this.startCacheCleanup();
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

    // === OPTIMIZATION METHODS ===

    /**
     * Generate request signature for deduplication
     */
    private generateRequestSignature(method: string, url: string, data?: any, params?: any): string {
        const normalizedUrl = url.replace(/\/+/g, '/');
        const dataStr = data ? JSON.stringify(data) : '';
        const paramsStr = params ? JSON.stringify(params) : '';
        const signature = `${method.toUpperCase()}:${normalizedUrl}:${dataStr}:${paramsStr}`;
        
        // Simple hash function (not cryptographically secure but sufficient for cache keys)
        let hash = 0;
        for (let i = 0; i < signature.length; i++) {
            const char = signature.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(16);
    }

    /**
     * Get request priority based on URL
     */
    private getRequestPriority(url: string): RequestPriority {
        // Extract the first segment after /api/v1/
        const match = url.match(/\/api\/v\d+\/([^\/]+)/);
        if (!match) return RequestPriority.LOW;
        
        const endpoint = match[1];
        return ENDPOINT_PRIORITIES[endpoint] || RequestPriority.LOW;
    }

    /**
     * Start priority queue processor
     */
    private startQueueProcessor(): void {
        if (this.processQueueTimer) {
            clearInterval(this.processQueueTimer);
        }
        
        this.processQueueTimer = setInterval(() => {
            this.processQueue();
        }, 100); // Process every 100ms
    }

    /**
     * Process priority queue
     */
    private async processQueue(): Promise<void> {
        if (this.activeRequests >= OPTIMIZED_CONFIG.maxConcurrentRequests) {
            return;
        }
        
        if (this.priorityQueue.length === 0) {
            return;
        }
        
        // Sort by priority (HIGH first) and timestamp (older first)
        this.priorityQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                const priorityOrder = { [RequestPriority.HIGH]: 3, [RequestPriority.MEDIUM]: 2, [RequestPriority.LOW]: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return a.timestamp - b.timestamp;
        });
        
        // Cancel low priority requests if high priority requests are waiting
        const highPriorityCount = this.priorityQueue.filter(item => item.priority === RequestPriority.HIGH).length;
        if (highPriorityCount > 0) {
            this.cancelLowPriorityRequests();
        }
        
        // Process requests up to the limit
        while (this.activeRequests < OPTIMIZED_CONFIG.maxConcurrentRequests && this.priorityQueue.length > 0) {
            const queueEntry = this.priorityQueue.shift()!;
            
            if (queueEntry.cancelToken.token.reason) {
                continue; // Skip cancelled requests
            }
            
            this.activeRequests++;
            
            // Execute request
            queueEntry.request()
                .finally(() => {
                    this.activeRequests--;
                });
        }
    }

    /**
     * Cancel low priority requests
     */
    private cancelLowPriorityRequests(): void {
        this.priorityQueue.forEach(entry => {
            if (entry.priority === RequestPriority.LOW) {
                entry.cancelToken.cancel('Cancelled due to high priority request');
            }
        });
        
        // Remove cancelled requests from queue
        this.priorityQueue = this.priorityQueue.filter(entry => !entry.cancelToken.token.reason);
    }

    /**
     * Start cache cleanup timer
     */
    private startCacheCleanup(): void {
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Cleanup every minute
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupCache(): void {
        const now = Date.now();
        
        // Clean request cache
        for (const [key, cached] of this.requestCache.entries()) {
            if (now - cached.timestamp > OPTIMIZED_CONFIG.cacheTimeout) {
                this.requestCache.delete(key);
            }
        }
        
        // Clean response cache
        for (const [key, cached] of this.responseCache.entries()) {
            if (now - cached.timestamp > OPTIMIZED_CONFIG.cacheTimeout) {
                this.responseCache.delete(key);
            }
        }
    }

    /**
     * Execute request with retry logic
     */
    private async executeWithRetry<T>(
        requestFn: () => Promise<AxiosResponse>,
        retryCount: number = 0
    ): Promise<AxiosResponse> {
        try {
            return await requestFn();
        } catch (error: any) {
            if (!OPTIMIZED_CONFIG.smartRetry || retryCount >= RETRY_CONFIG.maxRetries) {
                throw error;
            }
            
            // Check if error is retryable
            const shouldRetry = this.shouldRetryRequest(error);
            if (!shouldRetry) {
                throw error;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
                RETRY_CONFIG.maxDelay
            );
            
            console.log(`Retrying request after ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return this.executeWithRetry(requestFn, retryCount + 1);
        }
    }

    /**
     * Check if request should be retried
     */
    private shouldRetryRequest(error: any): boolean {
        // Network errors
        if (!error.response) {
            const errorCode = error.code || '';
            return RETRY_CONFIG.retryableNetworkErrors.includes(errorCode);
        }
        
        // HTTP status codes
        const statusCode = error.response.status;
        return RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
    }

    /**
     * Add request to priority queue
     */
    private addToQueue(
        request: () => Promise<any>,
        priority: RequestPriority,
        cancelToken: CancelTokenSource
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const queueEntry: PriorityQueueEntry = {
                request: async () => {
                    try {
                        const result = await request();
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                },
                priority,
                cancelToken,
                timestamp: Date.now()
            };
            
            this.priorityQueue.push(queueEntry);
            
            // Trim queue if it gets too large
            if (this.priorityQueue.length > OPTIMIZED_CONFIG.priorityQueueSize) {
                // Remove oldest low priority requests
                const lowPriorityIndex = this.priorityQueue.findIndex(entry => entry.priority === RequestPriority.LOW);
                if (lowPriorityIndex !== -1) {
                    const removed = this.priorityQueue.splice(lowPriorityIndex, 1)[0];
                    removed.cancelToken.cancel('Queue capacity exceeded');
                }
            }
        });
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
     * Make GET request with optimizations
     */
    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeOptimizedRequest<T>('GET', url, undefined, config);
    }

    /**
     * Make optimized request with all optimizations
     */
    private async makeOptimizedRequest<T = any>(
        method: string,
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        const requestSignature = this.generateRequestSignature(method, url, data, config?.params);
        const priority = this.getRequestPriority(url);
        const cancelToken = axios.CancelToken.source();

        try {
            // 1. CHECK REQUEST DEDUPLICATION
            if (OPTIMIZED_CONFIG.requestDeduplication) {
                const cachedRequest = this.requestCache.get(requestSignature);
                if (cachedRequest) {
                    console.log(`🔄 Deduplicating request: ${method} ${url}`);
                    return await cachedRequest.promise;
                }
            }

            // 2. CHECK RESPONSE CACHE (for GET requests)
            if (method === 'GET' && OPTIMIZED_CONFIG.requestDeduplication) {
                const cachedResponse = this.responseCache.get(requestSignature);
                if (cachedResponse && Date.now() - cachedResponse.timestamp < OPTIMIZED_CONFIG.cacheTimeout) {
                    console.log(`💾 Using cached response: ${method} ${url}`);
                    return {
                        status: 'success',
                        data: cachedResponse.data
                    };
                }
            }

            // 3. CREATE REQUEST PROMISE
            const requestPromise = this.executeOptimizedRequest<T>(method, url, data, config, cancelToken);

            // 4. CACHE REQUEST (for deduplication)
            if (OPTIMIZED_CONFIG.requestDeduplication) {
                this.requestCache.set(requestSignature, {
                    promise: requestPromise,
                    timestamp: Date.now()
                });
            }

            // 5. EXECUTE WITH PRIORITY QUEUE OR DIRECTLY
            let result: ApiResponse<T>;
            
            if (OPTIMIZED_CONFIG.requestPrioritization) {
                result = await this.addToQueue(
                    () => requestPromise,
                    priority,
                    cancelToken
                );
            } else {
                result = await requestPromise;
            }

            // 6. CACHE SUCCESSFUL RESPONSE (for GET requests)
            if (method === 'GET' && result.status === 'success' && OPTIMIZED_CONFIG.requestDeduplication) {
                this.responseCache.set(requestSignature, {
                    data: result.data,
                    timestamp: Date.now()
                });
            }

            return result;

        } catch (error) {
            // Remove from cache on error
            if (OPTIMIZED_CONFIG.requestDeduplication) {
                this.requestCache.delete(requestSignature);
            }

            if (axios.isCancel(error)) {
                return {
                    status: 'error',
                    message: 'Request was cancelled due to priority management'
                };
            }

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
     * Execute optimized request with retry logic
     */
    private async executeOptimizedRequest<T>(
        method: string,
        url: string,
        data?: any,
        config?: AxiosRequestConfig,
        cancelToken?: CancelTokenSource
    ): Promise<ApiResponse<T>> {
        const requestConfig = {
            ...config,
            cancelToken: cancelToken?.token
        };

        const requestFn = () => {
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.client.get(url, requestConfig);
                case 'POST':
                    return this.client.post(url, data, requestConfig);
                case 'PUT':
                    return this.client.put(url, data, requestConfig);
                case 'PATCH':
                    return this.client.patch(url, data, requestConfig);
                case 'DELETE':
                    return this.client.delete(url, requestConfig);
                default:
                    throw new Error(`Unsupported HTTP method: ${method}`);
            }
        };

        try {
            const response = await this.executeWithRetry(requestFn);
            return this.transformResponse<T>(response);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Make POST request with optimizations
     */
    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeOptimizedRequest<T>('POST', url, data, config);
    }

    /**
     * Make PUT request with optimizations
     */
    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeOptimizedRequest<T>('PUT', url, data, config);
    }

    /**
     * Make PATCH request with optimizations
     */
    public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeOptimizedRequest<T>('PATCH', url, data, config);
    }

    /**
     * Make DELETE request with optimizations
     */
    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeOptimizedRequest<T>('DELETE', url, undefined, config);
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
     * Get optimization statistics
     */
    public getOptimizationStats(): any {
        return {
            cacheHits: this.responseCache.size,
            activeRequests: this.activeRequests,
            queuedRequests: this.priorityQueue.length,
            deduplicationCacheSize: this.requestCache.size,
            responseCacheSize: this.responseCache.size,
            config: OPTIMIZED_CONFIG
        };
    }

    /**
     * Clear all caches
     */
    public clearCaches(): void {
        this.requestCache.clear();
        this.responseCache.clear();
        this.priorityQueue.forEach(entry => {
            entry.cancelToken.cancel('Cache cleared');
        });
        this.priorityQueue = [];
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        if (this.processQueueTimer) {
            clearInterval(this.processQueueTimer);
            this.processQueueTimer = null;
        }
        this.clearCaches();
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

        checkEmailAvailability: async (email: string) => {
            return this.post('/api/v1/auth/check-email', { email });
        },

        completeRegistration: async (data: RegistrationData) => {
            // If there are photos, use multipart/form-data
            if (data.photos && data.photos.length > 0) {
                try {
                    const formData = new FormData();
                    
                    // Add all non-photo fields
                    Object.keys(data).forEach(key => {
                        if (key !== 'photos' && key !== 'isPrivateProfile') {
                            const value = (data as any)[key];
                            
                            // Send interests as actual array for Laravel validation
                            if (key === 'interests') {
                                if (typeof value === 'string') {
                                    // If it's a JSON string, parse it to array
                                    try {
                                        const parsed = JSON.parse(value);
                                        const interestsArray = Array.isArray(parsed) ? parsed : [];
                                        interestsArray.forEach((interest, index) => {
                                            formData.append(`interests[${index}]`, interest);
                                        });
                                    } catch {
                                        // If parsing fails, skip interests
                                    }
                                } else if (Array.isArray(value)) {
                                    value.forEach((interest, index) => {
                                        formData.append(`interests[${index}]`, interest);
                                    });
                                } else {
                                    // Skip if not array or string
                                }
                            } else {
                                formData.append(key, value);
                            }
                        }
                    });
                    
                    // Add profile-level privacy setting
                    if ((data as any).isPrivateProfile !== undefined) {
                        formData.append('profile_private', (data as any).isPrivateProfile ? '1' : '0');
                    }
                    
                    // Find main photo and get its index for main_photo_id
                    let mainPhotoIndex = -1;
                    data.photos.forEach((photo, index) => {
                        if (photo.isMain) {
                            mainPhotoIndex = index;
                        }
                    });
                    
                    // Add main_photo_id (using index since we don't have persistent IDs yet)
                    if (mainPhotoIndex >= 0) {
                        formData.append('main_photo_id', mainPhotoIndex.toString());
                    }
                    
                    // Add photos as files (simple structure)
                    data.photos.forEach((photo, index) => {
                        if (photo.file) {
                            formData.append(`photos[${index}]`, {
                                uri: photo.file.uri,
                                name: photo.file.name || `photo_${index + 1}.jpg`,
                                type: photo.file.type || 'image/jpeg'
                            } as any);
                        }
                    });

                    const response = await this.client.post('/api/v1/auth/complete-registration', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        },
                        timeout: 60000 // 60 seconds for photo uploads
                    });

                    console.log('🔍 Response:', response);

                    return this.transformResponse(response);
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
            } else {
                // No photos, use regular JSON request
                // Prepare data for JSON request
                const jsonData = { ...data };
                
                // Handle interests for JSON request - send as actual array
                if (jsonData.interests) {
                    if (typeof jsonData.interests === 'string') {
                        try {
                            const parsed = JSON.parse(jsonData.interests);
                            (jsonData as any).interests = Array.isArray(parsed) ? parsed : [];
                        } catch {
                            (jsonData as any).interests = [];
                        }
                    } else if (Array.isArray(jsonData.interests)) {
                        // Already an array, keep as is
                        (jsonData as any).interests = jsonData.interests;
                    } else {
                        (jsonData as any).interests = [];
                    }
                }
                
                // Add profile privacy for JSON request
                if ((jsonData as any).isPrivateProfile !== undefined) {
                    (jsonData as any).profile_private = (jsonData as any).isPrivateProfile;
                    delete (jsonData as any).isPrivateProfile;
                }
                
                return this.post('/api/v1/auth/complete-registration', jsonData, {
                    timeout: 30000 // 30 seconds for JSON requests
                });
            }
        },

        logout: async () => {
            try {
                await this.post('/api/v1/auth/logout');
            } catch (error) {
                console.warn('Logout API call failed, but continuing with local logout');
            } finally {
                await this.clearAuthToken();
            }
        },

        getHomeStats: async () => {
            return this.get('/api/v1/auth/home-stats');
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
        getAll: (page: number = 1, perPage: number = 10) =>
            this.get(`/api/v1/chats?page=${page}&per_page=${perPage}`),
        getById: (id: number, page: number = 1, perPage: number = 20) =>
            this.get(`/api/v1/chats/${id}?page=${page}&per_page=${perPage}`),
        create: (otherUserId: number) =>
            this.post('/api/v1/chats/create', { other_user_id: otherUserId }),
        sendMessage: (chatId: number, data: any) =>
            this.post(`/api/v1/chats/${chatId}/messages`, data),
        sendVoiceMessage: (chatId: number, formData: FormData) =>
            this.post(`/api/v1/chats/${chatId}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }),
        editMessage: (chatId: number, messageId: number, content: string) =>
            this.put(`/api/v1/chats/${chatId}/messages/${messageId}`, { content }),
        deleteMessage: (chatId: number, messageId: number) =>
            this.delete(`/api/v1/chats/${chatId}/messages/${messageId}`),
        markMessagesAsRead: (chatId: number, messageIds?: number[]) => {
            // If specific message IDs are provided, mark them individually
            if (messageIds && messageIds.length > 0) {
                // Mark multiple messages as read
                return Promise.all(
                    messageIds.map(messageId => 
                        this.post(`/api/v1/chats/${chatId}/messages/${messageId}/read`)
                    )
                );
            }
            // Otherwise mark all messages in chat as read
            return this.post(`/api/v1/chats/${chatId}/read`);
        },
        getUnreadCount: () =>
            this.get('/api/v1/chats/unread-count'),
        deleteChat: (chatId: number) =>
            this.delete(`/api/v1/chats/${chatId}`),
        getCallMessages: (chatId: number) =>
            this.get(`/api/v1/chats/${chatId}/call-messages`),
        getCallStatistics: (chatId: number) =>
            this.get(`/api/v1/chats/${chatId}/call-statistics`),
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
     * Location endpoints
     */
    public location = {
        updateLocation: async (locationData: {
            latitude: number;
            longitude: number;
            accuracy?: number;
            altitude?: number;
            heading?: number;
            speed?: number;
        }) => {
            return this.post('/api/v1/location/update', locationData);
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
     * Profile endpoints
     */
    public profile = {
        getMyProfile: async () => {
            return this.get('/api/v1/profile/me');
        },

        updateProfile: async (profileId: number, data: ProfileData) => {
            return this.put(`/api/v1/profile/${profileId}`, data);
        },

        getCompletionStatus: async () => {
            return this.get('/api/v1/profile/completion-status');
        },
    };

    /**
     * Photos endpoints
     */
    public photos = {
        getPhotos: async () => {
            return this.get('/api/v1/photos');
        },

        uploadPhoto: async (photoData: FormData) => {
            const url = `${this.baseURL}/api/v1/photos/upload`;
            const headers: HeadersInit = {};
            
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: photoData,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                return response.json();
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Upload timeout. Please try again.');
                }
                throw error;
            }
        },

        updatePhoto: async (photoId: number, data: {
            is_profile_photo?: boolean;
            order?: number;
            is_private?: boolean;
        }) => {
            return this.put(`/api/v1/photos/${photoId}`, data);
        },

        deletePhoto: async (photoId: number) => {
            return this.delete(`/api/v1/photos/${photoId}`);
        },

        reorderPhotos: async (photoOrders: Array<{ id: number; order: number }>) => {
            return this.put('/api/v1/photos/reorder', { photo_orders: photoOrders });
        },
    };

    /**
     * Preferences endpoints
     */
    public preferences = {
        get: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/preferences');
        },

        update: async (preferences: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/preferences', preferences);
        }
    };

    /**
     * Countries endpoints
     */
    public countries = {
        getAll: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/countries');
        }
    };

    /**
     * Settings endpoints
     */
    public settings = {
        get: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/settings');
        },

        update: async (settings: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/settings', settings);
        },

        getNotifications: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/settings/notifications');
        },

        updateNotifications: async (notifications: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/settings/notifications', notifications);
        },

        getPrivacy: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/settings/privacy');
        },

        updatePrivacy: async (privacy: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/settings/privacy', privacy);
        },

        getDiscovery: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/settings/discovery');
        },

        updateDiscovery: async (discovery: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/settings/discovery', discovery);
        },

        getSecurity: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/settings/security');
        },

        updateSecurity: async (security: any): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/settings/security', security);
        }
    };

    /**
     * Account management endpoints
     */
    public account = {
        changePassword: async (passwordData: {
            current_password: string;
            new_password: string;
            new_password_confirmation: string;
        }): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/account/password', passwordData);
        },

        changeEmail: async (emailData: {
            new_email: string;
            password?: string;
        }): Promise<ApiResponse<any>> => {
            return this.put('/api/v1/account/email', emailData);
        },

        deleteAccount: async (reason?: string): Promise<ApiResponse<any>> => {
            return this.delete('/api/v1/account', { data: { reason } });
        },

        exportData: async (): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/account/export-data');
        }
    };

    /**
     * Blocked users endpoints
     */
    public blockedUsers = {
        getAll: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/blocked-users');
        },

        block: async (data: {
            blocked_user_id: number;
            reason?: string;
        }): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/blocked-users', data);
        },

        unblock: async (blockedUserId: number): Promise<ApiResponse<any>> => {
            return this.delete(`/api/v1/blocked-users/${blockedUserId}`);
        }
    };

    /**
     * Support endpoints
     */
    public support = {
        submitFeedback: async (feedbackData: {
            feedback_text: string;
            category?: string;
            email?: string;
        }): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/support/feedback', feedbackData);
        },

        reportUser: async (reportData: {
            reported_user_id: number;
            reason: string;
            description?: string;
            evidence_urls?: string[];
        }): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/support/report', reportData);
        },

        createTicket: async (ticketData: {
            subject: string;
            description: string;
            category?: string;
            priority?: string;
        }): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/support/tickets', ticketData);
        },

        getTickets: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/support/tickets');
        }
    };

    /**
     * Emergency contacts endpoints
     */
    public emergencyContacts = {
        getAll: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/emergency-contacts');
        },

        create: async (contactData: {
            name: string;
            phone: string;
            relationship?: string;
            is_primary?: boolean;
        }): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/emergency-contacts', contactData);
        },

        update: async (contactId: number, contactData: {
            name?: string;
            phone?: string;
            relationship?: string;
            is_primary?: boolean;
        }): Promise<ApiResponse<any>> => {
            return this.put(`/api/v1/emergency-contacts/${contactId}`, contactData);
        },

        delete: async (contactId: number): Promise<ApiResponse<any>> => {
            return this.delete(`/api/v1/emergency-contacts/${contactId}`);
        }
    };

    /**
     * Verification endpoints
     */
    public verification = {
        getStatus: async (): Promise<ApiResponse<any>> => {
            return this.get('/api/v1/verification/status');
        },

        startPhotoVerification: async (): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/verification/photo/start');
        },

        submitPhotoVerification: async (photos: FormData): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/verification/photo/submit', photos, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },

        startIdVerification: async (): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/verification/id/start');
        },

        submitIdVerification: async (idData: FormData): Promise<ApiResponse<any>> => {
            return this.post('/api/v1/verification/id/submit', idData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        }
    };
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
