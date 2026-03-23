export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('Géolocalisation non supportée'));
    else navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
};

export const getCityFromCoords = async (lat, lng) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`);
    const data = await response.json();
    if (data.address) return data.address.city || data.address.town || data.address.village || data.address.county || 'Inconnu';
    return 'Inconnu';
  } catch (err) {
    console.error('Erreur géocodage:', err);
    return 'Inconnu';
  }
};

export const getCurrentCity = async () => {
  try {
    const position = await getCurrentPosition();
    return await getCityFromCoords(position.coords.latitude, position.coords.longitude);
  } catch (err) {
    console.error('Erreur récupération ville:', err);
    return 'Inconnu';
  }
};