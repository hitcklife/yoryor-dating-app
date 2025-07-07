import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/context/auth-context';
import sqliteService from '@/services/sqlite-service';

export default function DebugNotificationCounts() {
  const { user, getLocalNotificationCounts, forceRecreateNotificationTable } = useAuth();
  const [counts, setCounts] = useState({ unread_messages_count: 0, new_likes_count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const result = await getLocalNotificationCounts();
      setCounts(result);
      console.log('Current notification counts:', result);
    } catch (error) {
      console.error('Error fetching counts:', error);
      Alert.alert('Error', 'Failed to fetch notification counts');
    } finally {
      setLoading(false);
    }
  };

  const recreateTable = async () => {
    setLoading(true);
    try {
      await forceRecreateNotificationTable();
      Alert.alert('Success', 'Notification table recreated');
      await fetchCounts();
    } catch (error) {
      console.error('Error recreating table:', error);
      Alert.alert('Error', 'Failed to recreate table');
    } finally {
      setLoading(false);
    }
  };

  const addTestData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await sqliteService.updateUnreadMessagesCount(user.id, 5);
      await sqliteService.updateNewLikesCount(user.id, 8);
      await fetchCounts();
      Alert.alert('Success', 'Test data added');
    } catch (error) {
      console.error('Error adding test data:', error);
      Alert.alert('Error', 'Failed to add test data');
    } finally {
      setLoading(false);
    }
  };

  const resetCounts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await sqliteService.resetNotificationCounts(user.id);
      await fetchCounts();
      Alert.alert('Success', 'Counts reset to zero');
    } catch (error) {
      console.error('Error resetting counts:', error);
      Alert.alert('Error', 'Failed to reset counts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Debug Notification Counts
      </Text>
      
      <Text style={{ marginBottom: 10 }}>
        User ID: {user?.id || 'Not logged in'}
      </Text>
      
      <Text style={{ marginBottom: 10 }}>
        Unread Messages: {counts.unread_messages_count}
      </Text>
      
      <Text style={{ marginBottom: 20 }}>
        New Likes: {counts.new_likes_count}
      </Text>
      
      <TouchableOpacity 
        onPress={fetchCounts}
        disabled={loading}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 10,
          opacity: loading ? 0.5 : 1
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {loading ? 'Loading...' : 'Fetch Counts'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={recreateTable}
        disabled={loading}
        style={{ 
          backgroundColor: '#FF9500', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 10,
          opacity: loading ? 0.5 : 1
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Recreate Table
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={addTestData}
        disabled={loading}
        style={{ 
          backgroundColor: '#34C759', 
          padding: 10, 
          borderRadius: 5, 
          marginBottom: 10,
          opacity: loading ? 0.5 : 1
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Add Test Data
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={resetCounts}
        disabled={loading}
        style={{ 
          backgroundColor: '#FF3B30', 
          padding: 10, 
          borderRadius: 5,
          opacity: loading ? 0.5 : 1
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Reset Counts
        </Text>
      </TouchableOpacity>
    </View>
  );
} 