import * as Location from 'expo-location';

export const getCurrentPosition = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission refusée');
  }
  const location = await Location.getCurrentPositionAsync({});
  return location;
};

export const getCityFromCoords = async (lat, lng) => {
  // Utilisation de l'API Nominatim (OpenStreetMap) ou une autre
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
    const data = await response.json();
    if (data.address) {
      return data.address.city || data.address.town || data.address.village || data.address.county || 'Inconnu';
    }
    return 'Inconnu';
  } catch (err) {
    console.error(err);
    return 'Inconnu';
  }
};

export const getCurrentCity = async () => {
  try {
    const position = await getCurrentPosition();
    const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
    return city;
  } catch (err) {
    return 'Inconnu';
  }
};