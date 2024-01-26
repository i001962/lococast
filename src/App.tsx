import {useEffect, useState} from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import "@farcaster/auth-kit/styles.css";

/* GUNDB */
import Gun from 'gun';
// import sea from 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit';

const config = {
  relay: "https://relay.farcaster.xyz",
  rpcUrl: "https://mainnet.optimism.io",
  domain: "d33m.com",
  siweUri: "https://example.com/login",
};
const GunPeers = ['https://gun-manhattan.herokuapp.com/gun']; // TODO: add more peers in const.ts
const peers = GunPeers; 
const gun = Gun({
  peers: peers,
  localStorage: true, 
  radisk: false, // Use Radisk to persist data
}); 
const locations = gun.get('d33m-locations-1').get("user");

interface UserLocation {
  fid: string;
  lat: number;
  lng: number;
  name: string;
  iconUrl?: string; // iconUrl is optional
}

function AuthenticationComponent() {
  const { isAuthenticated } = useProfile();

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '24px', fontWeight: '700', color: 'purple', marginBottom: '20px' }}>
          &#9888; Your current location is about to be as public as a blockchain transaction.
        </p>
        <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Using this app might just turn your location into the next trending topic on Supercast.
        </p>
        <p style={{ fontSize: '24px', fontWeight: '700', color: 'purple', marginBottom: '20px' }}>
          Last person in gets the $DEGEN avatar.
        </p>
        <p style={{ fontSize: '18px', fontWeight: '600', color: 'darkblue', marginBottom: '30px' }}>
          What's this really all about? Experimenting with storing FC account attributes, eg current location, use P2P tech.
          Thinking about a reward points system for watching the beautiful game live. PPOIDH 'Pics & Pins or it didn't happen'&#8253;
        </p>
        <SignInButton />
      </div>
    );
  }

  return <MyMap />;
}

function MyMap() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [users, setUsers] = useState(new Map());
  const { isAuthenticated, profile } = useProfile();
  // Function to update location in Gun DB
  const updateUserLocationInGun = (latitude: number, longitude:number) => {
    const userFid = (isAuthenticated && profile?.fid?.toString()) ?? 'anon';
    const userName = (isAuthenticated && profile?.displayName) ?? 'channel/degen';
    const userIconUrl = (isAuthenticated && profile?.pfpUrl) ?? 'images/degen.png';

    const newUserLocation = {
      fid: userFid,
      lat: latitude,
      lng: longitude,
      name: userName,
      iconUrl: userIconUrl,
    };
    if (typeof newUserLocation.fid === 'string') {
      locations.get(newUserLocation.fid).put(newUserLocation);
    } else {console.log("fid is not a string")}
  };

    // Fetch user location
    useEffect(() => {
      if (!navigator.geolocation) {
        console.log("Geolocation is not supported by this browser.");
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateUserLocationInGun(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }, []);
  
  /* Get user's current location and pin it*/
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser.");
      return;
    }
  
    const fetchLocationAndSet = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
        
          // Define user attributes based on authentication status
          const userFid = (isAuthenticated && profile?.fid?.toString()) ?? 'anon';
          const userName = (isAuthenticated && profile?.displayName) ?? 'channel/degen';
          const userIconUrl = (isAuthenticated && profile?.pfpUrl) ?? 'images/degen.png';
  
          const newUserLocation = {
            fid: userFid || 'anon',
            lat: latitude,
            lng: longitude,
            name: userName || 'channel/degen',
            iconUrl: userIconUrl || 'images/degen.png',
          };
  
          // Update location in Gun DB and state
          locations.get(newUserLocation.fid).put(newUserLocation);
          setUserLocation(newUserLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    };
  
    fetchLocationAndSet();
  }, [isAuthenticated, userLocation, profile]); // Re-run when isAuthenticated or profile changes
  
  /* Get all pinned locations from GUNDB */
  useEffect(() => {
    locations.map().on((user) => {
      if (user && user.fid) { 
        setUsers(prevUsers => {
          const newUsers = new Map(prevUsers);
          newUsers.set(user.fid, user);
          return newUsers;
        });
      }
    });
  }, []);
  
  const usersArray = Array.from(users.values());
  
  return (
    <>
      {!isAuthenticated ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <AuthKitProvider config={config}>
            <AuthenticationComponent />
          </AuthKitProvider>
        </div>
      ) : (
        <MapContainer center={[37.4603776, -122.273792]} zoom={13} style={{ height: '100vh', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {usersArray.map(loc => {
            const customIcon = new L.Icon({
              iconUrl: loc.iconUrl,
              iconSize: [50, 50],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34]
            });
            const popupContent = (
              <div>
                {loc.name}
                <br />
                <a href={`https://www.supercast.xyz/${loc.name}`} target="_blank" rel="noopener noreferrer">
                  Visit {loc.name} on Supercast
                </a>
              </div>
            );
            return (
              <Marker key={loc.fid} position={[loc.lat, loc.lng]} icon={customIcon}>
                <Popup>{popupContent}</Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </>
  );
}  

export default MyMap;
