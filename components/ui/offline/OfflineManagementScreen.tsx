import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  FlatList,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { offlineDetectionService, OfflineState, ConnectionEvent } from '../../../services/offline/offline-detection';
import { smartSyncManager, SyncType, SyncPriority } from '../../../services/offline/smart-sync-manager';
import { offlineActionQueue, OfflineActionType } from '../../../services/offline/action-queue';
import { conflictResolutionService, ConflictData, ConflictResolutionStrategy } from '../../../services/offline/conflict-resolution';

// === OFFLINE MANAGEMENT SCREEN ===
export const OfflineManagementScreen: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'actions' | 'conflicts' | 'settings'>('status');
  const [refreshing, setRefreshing] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [actionQueue, setActionQueue] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [conflictResolutionModal, setConflictResolutionModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const state = offlineDetectionService.getState();
      const queueStats = await offlineActionQueue.getQueueStats();
      const syncStats = smartSyncManager.getSyncStats();
      const pendingConflicts = conflictResolutionService.getPendingConflicts();

      setOfflineState(state);
      setActionQueue(queueStats);
      setSyncStatus(syncStats);
      setConflicts(pendingConflicts);
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleForceSync = async () => {
    try {
      await smartSyncManager.forceSyncType(SyncType.MESSAGES);
      await smartSyncManager.forceSyncType(SyncType.CHATS);
      Alert.alert('Success', 'Force sync initiated');
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate force sync');
    }
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear all pending actions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineActionQueue.clearAllActions();
              await smartSyncManager.clearSyncQueue();
              Alert.alert('Success', 'Queue cleared');
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear queue');
            }
          }
        }
      ]
    );
  };

  const handleResolveConflict = async (conflictId: string, strategy: ConflictResolutionStrategy, userInput?: any) => {
    try {
      const result = await conflictResolutionService.resolveConflict(conflictId, strategy, userInput);
      
      if (result.success) {
        Alert.alert('Success', 'Conflict resolved successfully');
        setConflictResolutionModal(false);
        setSelectedConflict(null);
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to resolve conflict');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve conflict');
    }
  };

  const renderStatusTab = () => {
    if (!offlineState) return null;

    const connectionHistory = offlineState.connectionHistory.slice(0, 5);
    const stats = offlineDetectionService.getConnectionStats();

    return (
      <ScrollView style={styles.tabContent}>
        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusIcon}>
                {offlineState.isOnline ? '🟢' : '🔴'}
              </Text>
              <Text style={styles.statusTitle}>
                {offlineState.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text style={styles.statusText}>
              Type: {offlineState.connectionType}
            </Text>
            <Text style={styles.statusText}>
              Quality: {offlineState.connectionQuality}
            </Text>
            {!offlineState.isOnline && (
              <Text style={styles.statusText}>
                Offline for: {Math.round(offlineState.offlineDuration / 1000)}s
              </Text>
            )}
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Total syncs: {syncStatus?.totalSyncs || 0}
            </Text>
            <Text style={styles.statusText}>
              Successful: {syncStatus?.successfulSyncs || 0}
            </Text>
            <Text style={styles.statusText}>
              Failed: {syncStatus?.failedSyncs || 0}
            </Text>
            <Text style={styles.statusText}>
              Last sync: {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never'}
            </Text>
          </View>
        </View>

        {/* Connection History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Connection Events</Text>
          {connectionHistory.map((event: ConnectionEvent, index: number) => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventType}>
                {event.type === 'connected' ? '🟢' : event.type === 'disconnected' ? '🔴' : '🔄'} {event.type}
              </Text>
              <Text style={styles.eventTime}>
                {new Date(event.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.eventDetails}>
                {event.connectionType} • {event.connectionQuality}
              </Text>
            </View>
          ))}
        </View>

        {/* Connection Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEvents}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.disconnections}</Text>
              <Text style={styles.statLabel}>Disconnections</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.qualityChanges}</Text>
              <Text style={styles.statLabel}>Quality Changes</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderActionsTab = () => {
    if (!actionQueue) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Queue</Text>
          <View style={styles.queueStats}>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatValue}>{actionQueue.pending}</Text>
              <Text style={styles.queueStatLabel}>Pending</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatValue}>{actionQueue.processing}</Text>
              <Text style={styles.queueStatLabel}>Processing</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatValue}>{actionQueue.completed}</Text>
              <Text style={styles.queueStatLabel}>Completed</Text>
            </View>
            <View style={styles.queueStat}>
              <Text style={styles.queueStatValue}>{actionQueue.failed}</Text>
              <Text style={styles.queueStatLabel}>Failed</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleForceSync}>
            <Text style={styles.actionButtonText}>Force Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearQueue}>
            <Text style={styles.actionButtonText}>Clear Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => offlineActionQueue.forceProcessQueue()}
          >
            <Text style={styles.actionButtonText}>Process Queue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderConflictsTab = () => {
    if (conflicts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No conflicts to resolve</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Conflicts ({conflicts.length})</Text>
          {conflicts.map((conflict, index) => (
            <TouchableOpacity
              key={conflict.id}
              style={styles.conflictCard}
              onPress={() => {
                setSelectedConflict(conflict);
                setConflictResolutionModal(true);
              }}
            >
              <Text style={styles.conflictTitle}>
                {conflict.type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.conflictDescription}>
                {conflict.conflictDetails.description}
              </Text>
              <Text style={styles.conflictTime}>
                {new Date(conflict.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.conflictFields}>
                Fields: {conflict.conflictDetails.conflictedFields.join(', ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderSettingsTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto-sync when online</Text>
            <Switch value={true} onValueChange={() => {}} />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Background sync</Text>
            <Switch value={true} onValueChange={() => {}} />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Media download on WiFi only</Text>
            <Switch value={false} onValueChange={() => {}} />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderConflictResolutionModal = () => {
    if (!selectedConflict) return null;

    return (
      <Modal
        visible={conflictResolutionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resolve Conflict</Text>
            <TouchableOpacity onPress={() => setConflictResolutionModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.conflictType}>
              {selectedConflict.type.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.conflictDescription}>
              {selectedConflict.conflictDetails.description}
            </Text>

            <View style={styles.conflictVersions}>
              <View style={styles.conflictVersion}>
                <Text style={styles.versionTitle}>Your Version</Text>
                <Text style={styles.versionContent}>
                  {JSON.stringify(selectedConflict.localVersion, null, 2)}
                </Text>
              </View>
              <View style={styles.conflictVersion}>
                <Text style={styles.versionTitle}>Server Version</Text>
                <Text style={styles.versionContent}>
                  {JSON.stringify(selectedConflict.serverVersion, null, 2)}
                </Text>
              </View>
            </View>

            <View style={styles.resolutionOptions}>
              <Text style={styles.optionsTitle}>Resolution Options</Text>
              
              <TouchableOpacity
                style={styles.resolutionButton}
                onPress={() => handleResolveConflict(selectedConflict.id, ConflictResolutionStrategy.CLIENT_WINS)}
              >
                <Text style={styles.resolutionButtonText}>Keep Your Version</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.resolutionButton}
                onPress={() => handleResolveConflict(selectedConflict.id, ConflictResolutionStrategy.SERVER_WINS)}
              >
                <Text style={styles.resolutionButtonText}>Keep Server Version</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.resolutionButton}
                onPress={() => handleResolveConflict(selectedConflict.id, ConflictResolutionStrategy.MERGE)}
              >
                <Text style={styles.resolutionButtonText}>Merge Versions</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.resolutionButton}
                onPress={() => handleResolveConflict(selectedConflict.id, ConflictResolutionStrategy.LAST_WRITER_WINS)}
              >
                <Text style={styles.resolutionButtonText}>Last Writer Wins</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Offline Management</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'status' && styles.activeTab]}
            onPress={() => setActiveTab('status')}
          >
            <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>
              Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'actions' && styles.activeTab]}
            onPress={() => setActiveTab('actions')}
          >
            <Text style={[styles.tabText, activeTab === 'actions' && styles.activeTabText]}>
              Actions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'conflicts' && styles.activeTab]}
            onPress={() => setActiveTab('conflicts')}
          >
            <Text style={[styles.tabText, activeTab === 'conflicts' && styles.activeTabText]}>
              Conflicts {conflicts.length > 0 && `(${conflicts.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'status' && renderStatusTab()}
          {activeTab === 'actions' && renderActionsTab()}
          {activeTab === 'conflicts' && renderConflictsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </View>

        {renderConflictResolutionModal()}
      </View>
    </Modal>
  );
};

// === STYLES ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    fontSize: 18,
    color: '#666666',
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  eventTime: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  eventDetails: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  queueStat: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  queueStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  queueStatLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  conflictCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 4,
  },
  conflictDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  conflictTime: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  conflictFields: {
    fontSize: 12,
    color: '#666666',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  modalClose: {
    fontSize: 18,
    color: '#666666',
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  conflictType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
    marginBottom: 8,
  },
  conflictVersions: {
    marginTop: 16,
  },
  conflictVersion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  versionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  versionContent: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
  },
  resolutionOptions: {
    marginTop: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  resolutionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  resolutionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OfflineManagementScreen; 