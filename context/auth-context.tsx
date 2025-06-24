import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

type User = {
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
};

type HomeStats = {
    unread_messages_count: number;
    new_likes_count: number;
    matches_count: number;
};

type PhotoData = {
    id: string;
    uri: string;
    isMain: boolean;
    isPrivate: boolean;
};

type RegistrationData = {
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
};

type AuthContextType = {
    isAuthenticated: boolean;
    isRegistrationCompleted: boolean;
    isLoading: boolean;
    user: User | null;
    stats: HomeStats | null;
    sendOTP: (phone: string) => Promise<boolean>;
    verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean, userData?: User }>;
    completeRegistration: (data: RegistrationData) => Promise<{ success: boolean, userData?: User }>;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    fetchHomeStats: () => Promise<HomeStats | null>;
};

const API_BASE_URL = 'https://incredibly-evident-hornet.ngrok-free.app/';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<HomeStats | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRegistrationCompleted, setIsRegistrationCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.defaults.baseURL = API_BASE_URL;
    }, []);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setIsLoading(true);
                const token = await AsyncStorage.getItem('auth_token');
                if (token) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    const userData = await AsyncStorage.getItem('user_data');
                    if (userData) {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                        setIsRegistrationCompleted(parsedUser.registration_completed);
                        setIsAuthenticated(true);
                    } else {
                        await AsyncStorage.removeItem('auth_token');
                        setIsAuthenticated(false);
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    const sendOTP = async (phone: string): Promise<boolean> => {
        try {
            const response = await axios.post('/api/v1/auth/authenticate', {
                phone
            });

            return response.data.status === 'success' && response.data.data.otp_sent;
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }
    };

    const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean, userData?: User }> => {
        try {
            const response = await axios.post('/api/v1/auth/authenticate', {
                phone,
                otp
            });

            if (response.data.status === 'success' && response.data.data.authenticated) {
                let { token, user } = response.data.data;

                // Handle nested user object if present
                if (user && typeof user === 'object' && user.status === 'success') {
                    if (user.data && user.data.user) {
                        user = user.data.user;
                    }
                }

                // Store token and user data
                await login(token, user);

                // Fetch home stats after successful login

                return { success: true, userData: user };
            }

            return { success: false };
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
        }
    };

    const completeRegistration = async (data: RegistrationData): Promise<{ success: boolean, userData?: User }> => {
        try {
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

            const response = await axios.post(
                '/api/v1/auth/complete-registration',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Accept': 'application/json',
                    },
                    transformRequest: (data, headers) => data,
                }
            );

            if (response.data.status === 'success') {
                const userData = response.data.data.user;
                const updatedUser = {
                    ...userData,
                    registration_completed: true
                };

                await login(response.data.data.token || '', updatedUser);
                return { success: true, userData: updatedUser };
            }

            return { success: false };
        } catch (error) {
            console.error('Error completing registration:', error);
            throw error;
        }
    };

    const fetchHomeStats = async (): Promise<HomeStats | null> => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                console.error('No auth token found');
                return null;
            }

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const response = await axios.get('/api/v1/home');

            if (response.data.status === 'success' && response.data.data.stats) {
                const newStats = response.data.data.stats;
                setStats(newStats);
                return newStats;
            }

            return null;
        } catch (error) {
            console.error('Error fetching home stats:', error);
            // @ts-ignore
            if (error.response?.status === 401) {
                console.log('Authentication failed, logging out...');
                await logout();
            }
            return null;
        }
    };

    const login = async (token: string, userData: User) => {
        try {
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setUser(userData);
            setIsRegistrationCompleted(userData.registration_completed);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            try {
                await axios.post('/api/v1/auth/logout');
            } catch (logoutError) {
                console.error('Error calling logout API:', logoutError);
            }

            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');

            delete axios.defaults.headers.common['Authorization'];

            setUser(null);
            setStats(null);
            setIsRegistrationCompleted(false);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            isRegistrationCompleted,
            isLoading,
            user,
            stats,
            sendOTP,
            verifyOTP,
            completeRegistration,
            login,
            logout,
            fetchHomeStats
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
