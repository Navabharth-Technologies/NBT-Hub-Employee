import { useState, useEffect } from 'react';

/**
 * useGeolocation Hook
 * Returns the current coordinates and an approximate address using reverse geocoding.
 */
const useGeolocation = () => {
  const [state, setState] = useState({
    coords: { lat: null, lon: null },
    address: 'Fetching location...',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    const onSuccess = async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        // Use Nominatim (OpenStreetMap) for free reverse geocoding
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
        const data = await res.json();
        
        setState({
          coords: { lat, lon },
          address: data.display_name || 'Address found',
          loading: false,
          error: null
        });
      } catch (err) {
        setState({
          coords: { lat, lon },
          address: 'Location found (Address lookup failed)',
          loading: false,
          error: null
        });
      }
    };

    const onError = (error) => {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Location access denied' 
      }));
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  }, []);

  return state;
};

export default useGeolocation;
