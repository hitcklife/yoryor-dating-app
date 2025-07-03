import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, User, RegistrationData } from "../services/api-client";
import sqliteService from "../services/sqlite-service";

type HomeStats = {
    unread_messages_count: number;
    new_likes_count: number;
    matches_count: number;
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
    refreshUserData: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<HomeStats | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRegistrationCompleted, setIsRegistrationCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setIsLoading(true);
                const token = await AsyncStorage.getItem('auth_token');
                
                if (token) {
                    // Set the token in api client
                    await apiClient.setAuthToken(token);

                    // Try to get fresh user data from API
                    try {
                        const response = await apiClient.get('/api/v1/profile/me');
                        
                        if (response.status === 'success' && response.data) {
                            // Use fresh data from API
                            const freshUserData = response.data;
                            
                            // Update stored user data
                            await AsyncStorage.setItem('user_data', JSON.stringify(freshUserData));
                            
                            setUser(freshUserData);
                            setIsRegistrationCompleted(freshUserData.registration_completed);
                            setIsAuthenticated(true);
                            
                            console.log('✅ Fresh user data loaded from API');
                            return;
                        }
                    } catch (apiError) {
                        console.warn('Failed to fetch fresh user data, using cached data:', apiError);
                    }

                    // Fallback to cached user data
                    const userData = await AsyncStorage.getItem('user_data');
                    if (userData) {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                        setIsRegistrationCompleted(parsedUser.registration_completed);
                        setIsAuthenticated(true);
                        console.log('📱 Using cached user data');
                    } else {
                        // No user data available, clear token and reset state
                        await AsyncStorage.removeItem('auth_token');
                        setIsAuthenticated(false);
                        console.log('⚠️ No user data found, clearing auth token');
                    }
                } else {
                    setIsAuthenticated(false);
                    console.log('ℹ️ No auth token found');
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

    const refreshUserData = async (): Promise<void> => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            if (!token) {
                console.error('No auth token found for refresh');
                return;
            }

            // Ensure api client has the token
            await apiClient.setAuthToken(token);

            const response = await apiClient.get('/api/v1/profile/me');
            
            if (response.status === 'success' && response.data) {
                const freshUserData = response.data;
                
                // Update stored user data
                await AsyncStorage.setItem('user_data', JSON.stringify(freshUserData));
                
                setUser(freshUserData);
                setIsRegistrationCompleted(freshUserData.registration_completed);
                
                console.log('✅ User data refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
            // Don't throw - this is often called in background
        }
    };

    const sendOTP = async (phone: string): Promise<boolean> => {
        try {
            const response = await apiClient.auth.sendOTP(phone);
            return response.status === 'success' && response.data?.otp_sent;
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }
    };

    const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean, userData?: User }> => {
        try {
            const response = await apiClient.auth.verifyOTP(phone, otp);

            if (response.status === 'success' && response.data?.authenticated) {
                let { token, user } = response.data;

                // Handle nested user object if present
                if (user && typeof user === 'object' && user.status === 'success') {
                    if (user.data && user.data.user) {
                        user = user.data.user;
                    }
                }

                // Store token and user data
                await login(token, user);

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
            const response = await apiClient.auth.completeRegistration(data);

            if (response.status === 'success') {
                const userData = response.data?.user;
                const updatedUser = {
                    ...userData,
                    registration_completed: true
                };

                // Update user data with registration completion
                await login(response.data?.token || '', updatedUser);
                
                // Force a refresh of user data to get the latest profile info
                setTimeout(async () => {
                    await refreshUserData();
                }, 1000);

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

            // Ensure api client has the token
            await apiClient.setAuthToken(token);

            const response = await apiClient.auth.getHomeStats();

            if (response.status === 'success' && response.data?.stats) {
                const newStats = response.data.stats;
                setStats(newStats);
                return newStats;
            }

            return null;
        } catch (error) {
            console.error('Error fetching home stats:', error);
            // Check if it's an authentication error
            if (error instanceof Error && error.message.includes('Session expired')) {
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

            // Set token in api client
            await apiClient.setAuthToken(token);

            setUser(userData);
            setIsRegistrationCompleted(userData.registration_completed);
            setIsAuthenticated(true);
            
            console.log('✅ User logged in successfully');
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Use api client logout which handles both API call and token clearing
            await apiClient.auth.logout();

            await AsyncStorage.removeItem('user_data');

            // Clear and delete the local SQLite database
            try {
                await sqliteService.clearDatabaseOnLogout();
                console.log('SQLite database cleared successfully on logout');
            } catch (sqliteError) {
                console.error('Error clearing SQLite database on logout:', sqliteError);
                // Continue with logout even if database clearing fails
            }

            setUser(null);
            setStats(null);
            setIsRegistrationCompleted(false);
            setIsAuthenticated(false);
            
            console.log('✅ User logged out successfully');
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
            fetchHomeStats,
            refreshUserData
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
