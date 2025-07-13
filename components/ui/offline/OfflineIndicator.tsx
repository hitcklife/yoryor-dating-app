import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { offlineDetectionService, OfflineState, ConnectionQuality, ConnectionType } from '../../../services/offline/offline-detection';
import { smartSyncManager } from '../../../services/offline/smart-sync-manager';
import { offlineActionQueue } from '../../../services/offline/action-queue';

// === OFFLINE INDICATOR PROPS ===
interface OfflineIndicatorProps {
  type?: 'banner' | 'badge' | 'header' | 'toast';
  position?: 'top' | 'bottom' | 'left' | 'right';
  showDetails?: boolean;
  onPress?: () => void;
  style?: any;
}

// === OFFLINE INDICATOR COMPONENT ===
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  type = 'banner',
  position = 'top',
  showDetails = false,
  onPress,
  style
}) => {
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to offline state changes
    const listener = {
      onStateChange: (state: OfflineState) => {
        setOfflineState(state);
        
        // Animate in/out based on connection status
        if (!state.isOnline) {
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }).start();
        } else {
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }).start();
        }
      },
      onConnectionLost: () => {
        console.log('Connection lost');
      },
      onConnectionRestored: () => {
        console.log('Connection restored');
      },
      onQualityChanged: (quality: ConnectionQuality) => {
        console.log('Quality changed:', quality);
      }
    };

    offlineDetectionService.addListener(listener);

    // Get initial state
    const initialState = offlineDetectionService.getState();
    setOfflineState(initialState);

    // Update sync status periodically
    const updateSyncStatus = () => {
      const syncQueueStatus = smartSyncManager.getSyncQueueStatus();
      const syncStats = smartSyncManager.getSyncStats();
      const actionQueueStats = offlineActionQueue.getQueueStats();

      setSyncStatus(syncStats);
      setQueueStats({
        sync: syncQueueStatus,
        actions: actionQueueStats
      });
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000); // Update every 5 seconds

    return () => {
      offlineDetectionService.removeListener(listener);
      clearInterval(interval);
    };
  }, []);

  if (!offlineState) {
    return null;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const getConnectionIcon = (type: ConnectionType, quality: ConnectionQuality) => {
    if (quality === ConnectionQuality.OFFLINE) {
      return '📡';
    }
    
    switch (type) {
      case ConnectionType.WIFI:
        return quality === ConnectionQuality.EXCELLENT ? '📶' : quality === ConnectionQuality.GOOD ? '📶' : '📶';
      case ConnectionType.CELLULAR:
        return quality === ConnectionQuality.EXCELLENT ? '📱' : quality === ConnectionQuality.GOOD ? '📱' : '📱';
      default:
        return '🌐';
    }
  };

  const getQualityColor = (quality: ConnectionQuality) => {
    switch (quality) {
      case ConnectionQuality.EXCELLENT:
        return '#4CAF50';
      case ConnectionQuality.GOOD:
        return '#FF9800';
      case ConnectionQuality.POOR:
        return '#F44336';
      case ConnectionQuality.OFFLINE:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const renderBanner = () => {
    if (offlineState.isOnline) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.banner,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0]
                })
              }
            ]
          },
          style
        ]}
      >
        <TouchableOpacity
          style={styles.bannerContent}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.bannerIcon}>📡</Text>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>You're offline</Text>
            {showDetails && (
              <Text style={styles.bannerSubtitle}>
                {queueStats?.actions?.pending || 0} actions queued
              </Text>
            )}
          </View>
          {queueStats?.actions?.pending > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>
                {queueStats.actions.pending}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderBadge = () => {
    if (offlineState.isOnline) {
      return null;
    }

    return (
      <View style={[styles.badge, style]}>
        <Text style={styles.badgeText}>📡</Text>
      </View>
    );
  };

  const renderHeader = () => {
    const icon = getConnectionIcon(offlineState.connectionType, offlineState.connectionQuality);
    const color = getQualityColor(offlineState.connectionQuality);

    return (
      <TouchableOpacity
        style={[styles.header, { backgroundColor: color }, style]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.headerIcon}>{icon}</Text>
        {showDetails && (
          <View style={styles.headerDetails}>
            <Text style={styles.headerText}>
              {offlineState.isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.headerSubtext}>
              {offlineState.connectionType} · {offlineState.connectionQuality}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderToast = () => {
    if (offlineState.isOnline) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }
            ]
          },
          style
        ]}
      >
        <View style={styles.toastContent}>
          <Text style={styles.toastIcon}>📡</Text>
          <Text style={styles.toastText}>You're offline</Text>
        </View>
      </Animated.View>
    );
  };

  switch (type) {
    case 'banner':
      return renderBanner();
    case 'badge':
      return renderBadge();
    case 'header':
      return renderHeader();
    case 'toast':
      return renderToast();
    default:
      return renderBanner();
  }
};

// === SYNC STATUS COMPONENT ===
export const SyncStatusIndicator: React.FC<{
  style?: any;
  showDetails?: boolean;
}> = ({ style, showDetails = false }) => {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const syncQueueStatus = smartSyncManager.getSyncQueueStatus();
      const syncStats = smartSyncManager.getSyncStats();
      const actionQueueStats = offlineActionQueue.getQueueStats();
      const offlineState = offlineDetectionService.getState();

      setSyncStatus(syncStats);
      setQueueStats({
        sync: syncQueueStatus,
        actions: actionQueueStats
      });
      setIsOnline(offlineState.isOnline);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (!queueStats) {
    return null;
  }

  const hasPendingActions = queueStats.actions.pending > 0;
  const hasPendingSync = queueStats.sync.totalItems > 0;

  if (!hasPendingActions && !hasPendingSync) {
    return null;
  }

  return (
    <View style={[styles.syncStatus, style]}>
      <View style={styles.syncStatusHeader}>
        <Text style={styles.syncStatusIcon}>
          {isOnline ? '🔄' : '⏳'}
        </Text>
        <Text style={styles.syncStatusTitle}>
          {isOnline ? 'Syncing...' : 'Pending sync'}
        </Text>
      </View>
      
      {showDetails && (
        <View style={styles.syncStatusDetails}>
          {hasPendingActions && (
            <Text style={styles.syncStatusText}>
              {queueStats.actions.pending} actions queued
            </Text>
          )}
          {hasPendingSync && (
            <Text style={styles.syncStatusText}>
              {queueStats.sync.totalItems} items to sync
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// === MESSAGE OFFLINE INDICATOR ===
export const MessageOfflineIndicator: React.FC<{
  isOffline: boolean;
  isPending: boolean;
  hasFailed: boolean;
  style?: any;
}> = ({ isOffline, isPending, hasFailed, style }) => {
  if (!isOffline && !isPending && !hasFailed) {
    return null;
  }

  const getIcon = () => {
    if (hasFailed) return '❌';
    if (isPending) return '⏳';
    if (isOffline) return '📡';
    return '✓';
  };

  const getColor = () => {
    if (hasFailed) return '#F44336';
    if (isPending) return '#FF9800';
    if (isOffline) return '#9E9E9E';
    return '#4CAF50';
  };

  return (
    <View style={[styles.messageIndicator, { backgroundColor: getColor() }, style]}>
      <Text style={styles.messageIndicatorIcon}>{getIcon()}</Text>
    </View>
  );
};

// === QUEUE STATS COMPONENT ===
export const QueueStatsIndicator: React.FC<{
  style?: any;
  onPress?: () => void;
}> = ({ style, onPress }) => {
  const [queueStats, setQueueStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = () => {
      const actionQueueStats = offlineActionQueue.getQueueStats();
      setQueueStats(actionQueueStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (!queueStats || queueStats.pending === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.queueStats, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.queueStatsIcon}>📋</Text>
      <View style={styles.queueStatsContent}>
        <Text style={styles.queueStatsTitle}>
          {queueStats.pending} pending actions
        </Text>
        <Text style={styles.queueStatsSubtitle}>
          {queueStats.processing} processing • {queueStats.failed} failed
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// === STYLES ===
const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#323232',
    borderRadius: 8,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerSubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 2,
  },
  queueBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  queueBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  headerDetails: {
    flex: 1,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#323232',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  toastIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  syncStatus: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    margin: 8,
  },
  syncStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  syncStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  syncStatusDetails: {
    marginTop: 4,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#666666',
  },
  messageIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  messageIndicatorIcon: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  queueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    margin: 8,
  },
  queueStatsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  queueStatsContent: {
    flex: 1,
  },
  queueStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  queueStatsSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
});

export default OfflineIndicator; 