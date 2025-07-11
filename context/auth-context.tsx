import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, User, RegistrationData } from "../services/api-client";
import sqliteService from "../services/sqlite-service";
import { webSocketService } from "../services/websocket-service";

type HomeStats = {
    unread_messages_count: number;
    new_likes_count: number;
    matches_count: number;
};

type AuthContextType = {
    isAuthenticated: boolean;
    isRegistrationCompleted: boolean;
    isProfileSetupCompleted: boolean;
    isLoading: boolean;
    user: User | null;
    stats: HomeStats | null;
    sendOTP: (phone: string) => Promise<boolean>;
    verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean, userData?: User }>;
    completeRegistration: (data: RegistrationData) => Promise<{ success: boolean, userData?: User }>;
    completeProfileSetup: (data: any) => Promise<{ success: boolean }>;
    login: (token: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updatedUser: User) => Promise<void>;
    refreshProfile: () => Promise<void>;
    fetchHomeStats: () => Promise<HomeStats | null>;
    getLocalNotificationCounts: () => Promise<{ unread_messages_count: number; new_likes_count: number }>;
    forceRecreateNotificationTable: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<HomeStats | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isRegistrationCompleted, setIsRegistrationCompleted] = useState(false);
    const [isProfileSetupCompleted, setIsProfileSetupCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize WebSocket service when user is authenticated, registration is completed, and profile setup is completed
    useEffect(() => {
        const initializeWebSocket = async () => {
            if (isAuthenticated && isRegistrationCompleted && isProfileSetupCompleted && user?.id) {
                try {
                    console.log('Initializing WebSocket service for user:', user.id);
                    
                    // Set the current user ID which will auto-initialize the service
                    webSocketService.setCurrentUserId(user.id);
                    
                    // Set up global callbacks for app-wide events
                    webSocketService.setGlobalCallbacks({
                        onNewMatch: (match: any) => {
                            console.log('New match received in app:', match);
                            // You can update app state here if needed
                        },
                        onNewLike: (like: any) => {
                            console.log('New like received in app:', like);
                            // You can update app state here if needed
                        },
                        onIncomingCall: (call: any) => {
                            console.log('Incoming call received in app:', call);
                            // Handle incoming call UI/logic here
                        },
                        onGeneralNotification: (notification: any) => {
                            console.log('General notification received in app:', notification);
                            // Handle general notifications here
                        },
                        onGlobalUnreadCountUpdate: (count: number) => {
                            console.log('Global unread count updated:', count);
                            // Update stats or badge count
                            setStats(prevStats => prevStats ? { ...prevStats, unread_messages_count: count } : null);
                        }
                    });
                    
                    console.log('WebSocket service initialized successfully');
                } catch (error) {
                    console.error('Error initializing WebSocket service:', error);
                }
            } else {
                // Disconnect WebSocket if user is not authenticated, registration not completed, or profile setup not completed
                try {
                    webSocketService.disconnect();
                    console.log('WebSocket service disconnected - user not authenticated, registration not completed, or profile setup not completed');
                } catch (error) {
                    console.error('Error disconnecting WebSocket service:', error);
                }
            }
        };

        initializeWebSocket();
    }, [isAuthenticated, isRegistrationCompleted, isProfileSetupCompleted, user?.id]);

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                console.log('Checking auth status on app start...');
                setIsLoading(true);
                const token = await AsyncStorage.getItem('auth_token');
                console.log('Token found in storage:', !!token);
                
                if (token) {
                    // Set the token in api client
                    await apiClient.setAuthToken(token);

                    const userData = await AsyncStorage.getItem('user_data');
                    console.log('User data found in storage:', !!userData);
                    
                    if (userData) {
                        const parsedUser = JSON.parse(userData);
                        console.log('Parsed user data:', parsedUser);
                        console.log('User registration_completed:', parsedUser.registration_completed);
                        
                        // Check profile setup completion status
                        const profileSetupCompleted = await AsyncStorage.getItem('profile_setup_completed');
                        const isProfileSetupCompleted = profileSetupCompleted === 'true' || parsedUser.profile_setup_completed === true;
                        
                        setUser(parsedUser);
                        setIsRegistrationCompleted(parsedUser.registration_completed);
                        setIsProfileSetupCompleted(isProfileSetupCompleted);
                        setIsAuthenticated(true);
                        
                        console.log('Auth status set - isAuthenticated: true, isRegistrationCompleted:', parsedUser.registration_completed, 'isProfileSetupCompleted:', isProfileSetupCompleted);
                    } else {
                        console.log('No user data found, removing token and setting auth to false');
                        await AsyncStorage.removeItem('auth_token');
                        setIsAuthenticated(false);
                    }
                } else {
                    console.log('No token found, setting auth to false');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
                console.log('Auth status check completed');
            }
        };

        checkAuthStatus();
    }, []);

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
            console.log('Starting registration completion...');
            const response = await apiClient.auth.completeRegistration(data);
            console.log('Registration completion response:', response);

            if (response.status === 'success') {
                const userData = response.data?.user;
                console.log('User data from response:', userData);
                
                const updatedUser = {
                    ...userData,
                    registration_completed: true
                };
                console.log('Updated user data:', updatedUser);

                // Check if we have an existing auth token from the previous login
                const existingToken = await AsyncStorage.getItem('auth_token');
                console.log('Existing token found:', !!existingToken);
                
                if (existingToken) {
                    // Use the existing token since registration completion doesn't return a new one
                    await login(existingToken, updatedUser);
                    console.log('Registration completed successfully with existing token');
                } else {
                    // If no existing token, we need to handle this case
                    console.warn('No existing auth token found after registration completion');
                    // Store user data but don't set as authenticated
                    await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                    setIsRegistrationCompleted(true);
                    // Don't set isAuthenticated to true since we don't have a valid token
                }
                
                return { success: true, userData: updatedUser };
            }

            console.log('Registration completion failed - response status not success');
            return { success: false };
        } catch (error) {
            console.error('Error completing registration:', error);
            throw error;
        }
    };

    const fetchHomeStats = useCallback(async (): Promise<HomeStats | null> => {
        try {
            console.log('fetchHomeStats called');
            const response = await apiClient.auth.getHomeStats();
            console.log('fetchHomeStats response:', response);

            if (response.status === 'success' && response.data?.stats) {
                const newStats = response.data.stats;
                console.log('Setting new stats:', newStats);
                setStats(newStats);
                
                // Also update the local SQLite database with these stats
                if (user?.id) {
                    try {
                        console.log('Updating SQLite with stats:', newStats);
                        await sqliteService.updateUnreadMessagesCount(user.id, newStats.unread_messages_count);
                        await sqliteService.updateNewLikesCount(user.id, newStats.new_likes_count);
                        console.log('SQLite updated successfully');
                    } catch (error) {
                        console.error('Error updating local notification counts:', error);
                    }
                }
                
                return newStats;
            }

            console.log('No stats found in response');
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
    }, [user?.id]);

    const login = async (token: string, userData: User) => {
        try {
            console.log('Login function called with token length:', token.length);
            console.log('User data for login:', userData);
            
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user_data', JSON.stringify(userData));

            // Set token in api client
            await apiClient.setAuthToken(token);

            setUser(userData);
            setIsRegistrationCompleted(userData.registration_completed);
            setIsAuthenticated(true);
            
            console.log('Login completed successfully');
            console.log('isAuthenticated set to:', true);
            console.log('isRegistrationCompleted set to:', userData.registration_completed);
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Disconnect WebSocket service first
            try {
                webSocketService.disconnect();
                console.log('WebSocket service disconnected on logout');
            } catch (wsError) {
                console.error('Error disconnecting WebSocket service on logout:', wsError);
            }

            // Use api client logout which handles both API call and token clearing
            await apiClient.auth.logout();

            await AsyncStorage.removeItem('user_data');
            await AsyncStorage.removeItem('profile_setup_completed');

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
            setIsProfileSetupCompleted(false);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    };

    const updateUser = async (updatedUser: User) => {
        try {
            await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setIsRegistrationCompleted(updatedUser.registration_completed);
        } catch (error) {
            console.error('Error updating user data:', error);
            throw error;
        }
    };

    const refreshProfile = useCallback(async () => {
        try {
            console.log('refreshProfile called');
            const response = await apiClient.profile.getMyProfile();

            if (response.status === 'success' && response.data) {
                // Transform the profile response to match User interface
                const profileData = response.data;
                const updatedUser: User = {
                    id: profileData.user?.id || user?.id || 0,
                    email: profileData.user?.email || user?.email || null,
                    phone: profileData.user?.phone || user?.phone || '',
                    google_id: profileData.user?.google_id || user?.google_id || null,
                    facebook_id: profileData.user?.facebook_id || user?.facebook_id || null,
                    email_verified_at: profileData.user?.email_verified_at || user?.email_verified_at || null,
                    phone_verified_at: profileData.user?.phone_verified_at || user?.phone_verified_at || null,
                    disabled_at: profileData.user?.disabled_at || user?.disabled_at || null,
                    registration_completed: profileData.user?.registration_completed ?? user?.registration_completed ?? true,
                    profile_photo_path: profileData.profile_photo?.image_url || user?.profile_photo_path || null,
                    created_at: profileData.created_at || user?.created_at || '',
                    updated_at: profileData.updated_at || user?.updated_at || '',
                    two_factor_enabled: profileData.user?.two_factor_enabled ?? user?.two_factor_enabled ?? false,
                    profile: profileData,
                    preference: user?.preference || null,
                    photos: profileData.photos || []
                };

                await updateUser(updatedUser);
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
            // Check if it's an authentication error
            if (error instanceof Error && error.message.includes('Session expired')) {
                console.log('Authentication failed, logging out...');
                await logout();
            }
        }
    }, [user?.id]);

    const getLocalNotificationCounts = useCallback(async (): Promise<{ unread_messages_count: number; new_likes_count: number }> => {
        try {
            if (!user?.id) {
                return { unread_messages_count: 0, new_likes_count: 0 };
            }
            
            return await sqliteService.getNotificationCounts(user.id);
        } catch (error) {
            console.error('Error getting local notification counts:', error);
            return { unread_messages_count: 0, new_likes_count: 0 };
        }
    }, [user?.id]);

    const forceRecreateNotificationTable = async (): Promise<void> => {
        try {
            await sqliteService.forceRecreateNotificationTable();
            console.log('Notification table recreated successfully');
        } catch (error) {
            console.error('Error recreating notification table:', error);
            throw error;
        }
    };

    const completeProfileSetup = async (data: any): Promise<{ success: boolean }> => {
        try {
            console.log('Completing profile setup with data:', data);
            
            // TODO: Send profile setup data to backend API
            // const response = await apiClient.profile.completeProfileSetup(data);
            
            // For now, just mark as completed locally
            setIsProfileSetupCompleted(true);
            
            // Update user data to include profile setup completion
            if (user) {
                const updatedUser = {
                    ...user,
                    profile_setup_completed: true
                };
                await updateUser(updatedUser);
            }
            
            // Store profile setup completion in local storage
            await AsyncStorage.setItem('profile_setup_completed', 'true');
            
            console.log('Profile setup completed successfully');
            return { success: true };
        } catch (error) {
            console.error('Error completing profile setup:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            isRegistrationCompleted,
            isProfileSetupCompleted,
            isLoading,
            user,
            stats,
            sendOTP,
            verifyOTP,
            completeRegistration,
            completeProfileSetup,
            login,
            logout,
            updateUser,
            refreshProfile,
            fetchHomeStats,
            getLocalNotificationCounts,
            forceRecreateNotificationTable
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
