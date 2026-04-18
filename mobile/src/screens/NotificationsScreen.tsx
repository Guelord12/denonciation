import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bell,
  Flag,
  MessageCircle,
  Heart,
  Video,
  CheckCircle,
  Trash2,
} from 'lucide-react-native';

const NotificationIcon = ({ type }: { type: string }) => {
  const icons: Record<string, any> = {
    new_report: Flag,
    new_comment: MessageCircle,
    new_like: Heart,
    new_witness: Flag,
    new_live: Video,
    report_status: CheckCircle,
    system: Bell,
    welcome: Bell,
  };

  const IconComponent = icons[type] || Bell;
  const colors: Record<string, string> = {
    new_report: '#EF4444',
    new_comment: '#3B82F6',
    new_like: '#EC4899',
    new_witness: '#F59E0B',
    new_live: '#10B981',
    report_status: '#8B5CF6',
    system: '#6B7280',
    welcome: '#10B981',
  };

  return (
    <View style={[styles.iconContainer, { backgroundColor: colors[type] + '20' }]}>
      <IconComponent color={colors[type]} size={20} />
    </View>
  );
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery(
    'notifications',
    () => api.get('/notifications', { params: { limit: 50 } })
  );

  const markAsReadMutation = useMutation(
    (id?: number) => api.patch(`/notifications/${id || ''}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
        queryClient.invalidateQueries('unread-notifications');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/notifications/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      },
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: any) => {
    markAsReadMutation.mutate(notification.id);

    switch (notification.type) {
      case 'new_report':
      case 'new_comment':
      case 'new_like':
      case 'new_witness':
      case 'report_status':
        if (notification.related_id) {
          navigation.navigate('ReportDetail' as never, { id: notification.related_id } as never);
        }
        break;
      case 'new_live':
        if (notification.related_id) {
          navigation.navigate('LiveStream' as never, { streamId: notification.related_id } as never);
        }
        break;
    }
  };

  const handleMarkAllRead = () => {
    markAsReadMutation.mutate();
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const notifications = data?.data?.notifications || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllRead}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notificationItem, !item.is_read && styles.unread]}
            onPress={() => handleNotificationPress(item)}
          >
            <NotificationIcon type={item.type} />
            <View style={styles.notificationContent}>
              <Text style={styles.notificationText}>{item.content}</Text>
              <Text style={styles.notificationTime}>
                {formatDistance(new Date(item.created_at), new Date(), {
                  addSuffix: true,
                  locale: fr,
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Trash2 color="#CCC" size={16} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell color="#CCC" size={48} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>
              Vous recevrez des notifications pour les mises à jour importantes
            </Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 && styles.emptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  markAllRead: {
    color: '#EF4444',
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unread: {
    backgroundColor: '#FEF2F2',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});