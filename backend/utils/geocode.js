const axios = require('axios');

async function getCityFromCoordinates(lat, lng) {
    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
        );
        if (response.data && response.data.address) {
            const addr = response.data.address;
            return addr.city || addr.town || addr.village || addr.county || 'Inconnu';
        }
        return 'Inconnu';
    } catch (err) {
        console.error('Erreur géocodage:', err.message);
        return 'Inconnu';
    }
}

async function getCurrentCity() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve('Inconnu');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const city = await getCityFromCoordinates(position.coords.latitude, position.coords.longitude);
                resolve(city);
            },
            () => resolve('Inconnu')
        );
    });
}

module.exports = { getCityFromCoordinates, getCurrentCity };