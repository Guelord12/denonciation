import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSocket } from './SocketContext';

const NotificationContext = createContext<null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📱 Notification received:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        console.log('📱 Notification clicked:', data);
        
        if (data?.type && data?.related_id) {
          const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
          await AsyncStorage.setItem('pending_navigation', JSON.stringify({
            type: data.type,
            id: data.related_id,
            timestamp: Date.now(),
          }));
        }
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', async (data) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Dénonciation',
          body: data.content,
          data: data,
        },
        trigger: null,
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  return (
    <NotificationContext.Provider value={null}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });
    }
    
    console.log('✅ Push notifications registered');
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
}

export function useNotifications() {
  return useContext(NotificationContext);
}