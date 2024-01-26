import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

function CenterMapOnLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location);
    }
  }, [location, map]);

  return null; // this component does not render anything
}

export default CenterMapOnLocation;