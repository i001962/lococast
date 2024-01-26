// Not currently used
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { LatLngExpression } from 'leaflet';

interface CenterMapOnLocationProps {
  location: LatLngExpression;
}

const CenterMapOnLocation: React.FC<CenterMapOnLocationProps> = ({ location }) => {
 
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location);
    }
  }, [location, map]);

  return null; // this component does not render anything
}

export default CenterMapOnLocation;