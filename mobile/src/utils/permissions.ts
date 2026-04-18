import { Platform, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'L\'accès à la caméra est nécessaire pour cette fonctionnalité.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  return true;
}

export async function requestGalleryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'L\'accès à la galerie est nécessaire pour cette fonctionnalité.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  return true;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'L\'accès à la localisation est nécessaire pour géolocaliser les signalements.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  return true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'Les notifications vous permettent de rester informé des mises à jour.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
    });
  }
  
  return true;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Permission refusée',
      'L\'accès au microphone est nécessaire pour les streams en direct.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les paramètres', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  
  return true;
}