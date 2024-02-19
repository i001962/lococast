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
let authenticatedBefore: string;

interface UserLocation {
  fid: string;
  lat: number;
  lng: number;
  name: string;
  iconUrl?: string; // iconUrl is optional
}

function AuthenticationComponent() {
  const { isAuthenticated, profile } = useProfile();
  const queryParams = new URLSearchParams(window.location.search);
  const userFidFromQuery = queryParams.get('userFid');
  const userIconUrlFromQuery = queryParams.get('userIconUrl');
  const userNameFromQuery = queryParams.get('userName');
  // Check for a previously authenticated flag in localStorage
  useEffect(() => {
    authenticatedBefore = localStorage.getItem('FCprofile1') as string;
    if (authenticatedBefore) {
      console.log("User was authenticated before.");
    }
  }, []); // Run once

  // Save user's profile to localStorage upon authentication
  useEffect(() => {
    if (isAuthenticated && profile) {
      localStorage.setItem('FCprofile1', JSON.stringify(profile));
    }
  }, [isAuthenticated, profile]);

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>
        <SignInButton />
        <div>
              {userFidFromQuery ? 
               <>
               <img src={userIconUrlFromQuery || 'images/degen.png'} alt={`User ${userFidFromQuery}`} style={{ width: '100px', height: '100px' }} />
               {/* <img src={userIconUrlFromQuery} alt={`User ${userFidFromQuery}`} style={{ width: '100px', height: '100px' }} /> */}
               <div>Welcome, {userNameFromQuery}. This device has not yet been authenticated.</div>
               <div>Location services must be shared in order to participate.</div>
             </>
              :
                "You haven't authenticated from this device yet."
              }
            </div>
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
    const theProfile = JSON.parse(authenticatedBefore);
    const userFid = (authenticatedBefore && theProfile?.fid?.toString()) ?? 'anon';
    const userName = (authenticatedBefore && theProfile?.username) ?? 'channel/degen';
    const userIconUrl = (authenticatedBefore && theProfile?.pfpUrl) ?? 'images/degen.png';
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
          const theProfile = JSON.parse(authenticatedBefore);
          const userFid = (authenticatedBefore && theProfile?.fid?.toString()) ?? 'anon';
          const userName = (authenticatedBefore && theProfile?.username) ?? 'channel/degen';
          const userIconUrl = (authenticatedBefore && theProfile?.pfpUrl) ?? 'images/degen.png';
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
      {(!isAuthenticated && !authenticatedBefore) ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <AuthKitProvider config={config}>
            <AuthenticationComponent />
          </AuthKitProvider>
        </div>
      ) : (
          <MapContainer center={userLocation||[50.00, -100.00]} zoom={3} style={{ height: '100vh', width: '100%' }}>
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

                <a href={`https://warpcast.com/~/compose?text=🚀+Find+your+Farcaster+friends+on+an+interactive+map.+Connect+with+FC%0A%0Ahttps%3A%2F%2Flococast.vercel.app+and+explore+like+its+2010+and+facebook+just+launched+check-ins!📍✨`} target="_blank" rel="noopener noreferrer">
                  Share location on Warpcast
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
