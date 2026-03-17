import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { donorAPI, requestAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['All','O+','O-','A+','A-','B+','B-','AB+','AB-'];

const donorIcon = L.divIcon({
  html: '<div style="background:#C0152A;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [28, 28], iconAnchor: [14, 28],
});
const meIcon = L.divIcon({
  html: '<div style="background:#185FA5;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [22, 22], iconAnchor: [11, 11],
});

export default function DonorsPage() {
  const [selectedBG, setSelectedBG] = useState('All');
  const [radius, setRadius]         = useState(10);
  const [view, setView]             = useState('list'); // 'list' | 'map'
  const { location } = useGeolocation(true);

  const { data, isLoading } = useQuery(
    ['donors', selectedBG, radius, location],
    () => donorAPI.getNearby({
      blood_group: selectedBG !== 'All' ? selectedBG : undefined,
      lat: location?.lat, lng: location?.lng, radius_km: radius,
    }),
    { enabled: !!location, select: r => r.data }
  );

  const handleRespond = async (donorId) => {
    toast.success('Request sent to donor!');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20 }}>Nearby donors</h2>
        <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#E1F5EE', color: '#085041' }}>
          {data?.count || 0} online
        </span>
      </div>

      {/* Blood group filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {BLOOD_GROUPS.map(bg => (
          <button key={bg} onClick={() => setSelectedBG(bg)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid',
            borderColor: selectedBG === bg ? '#C0152A' : '#E8E4DF',
            background: selectedBG === bg ? '#C0152A' : '#fff',
            color: selectedBG === bg ? '#fff' : '#1A1A18',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{bg}</button>
        ))}
      </div>

      {/* View toggle + radius */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button onClick={() => setView('list')} style={{ ...toggleBtn, background: view==='list' ? '#1A1A18' : '#fff', color: view==='list' ? '#fff' : '#1A1A18' }}>List</button>
        <button onClick={() => setView('map')}  style={{ ...toggleBtn, background: view==='map'  ? '#1A1A18' : '#fff', color: view==='map'  ? '#fff' : '#1A1A18' }}>Map</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6B6860' }}>Radius:</span>
          <input type="range" min="2" max="30" value={radius} onChange={e => setRadius(+e.target.value)} style={{ width: 80 }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>{radius} km</span>
        </div>
      </div>

      {/* Map view */}
      {view === 'map' && location && (
        <div style={{ height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '1px solid #E8E4DF' }}>
          <MapContainer center={[location.lat, location.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[location.lat, location.lng]} icon={meIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle center={[location.lat, location.lng]} radius={radius * 1000} pathOptions={{ color: '#C0152A', fillOpacity: 0.05 }} />
            {data?.donors?.map(d => d.location && (
              <Marker key={d.id} position={[d.location.lat, d.location.lng]} icon={donorIcon}>
                <Popup><b>{d.name}</b><br />{d.blood_group} · {d.distance_km} km</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* List view */}
      {isLoading && <div style={{ textAlign: 'center', padding: 30, color: '#AEACAA' }}>Finding donors nearby...</div>}

      {!isLoading && data?.donors?.map(donor => (
        <div key={donor.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12,
          marginBottom: 8,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: '#FFF0F1', color: '#C0152A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{donor.blood_group}</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>
              {donor.is_available && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', marginRight: 5 }} />}
              {donor.name}
            </div>
            <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>
              {donor.is_available ? 'Available' : 'Busy'}
              {donor.last_donation && ` · Last donated ${new Date(donor.last_donation).toLocaleDateString()}`}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#6B6860' }}>{donor.distance_km} km</div>
            <button onClick={() => handleRespond(donor.id)} style={{
              marginTop: 4, fontSize: 11, padding: '4px 10px', background: '#C0152A',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}>Contact</button>
          </div>
        </div>
      ))}

      {!isLoading && !data?.donors?.length && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#AEACAA' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
          <p>No donors found nearby. Try increasing the radius.</p>
        </div>
      )}
    </div>
  );
}

const toggleBtn = { padding: '6px 14px', borderRadius: 8, border: '1px solid #E8E4DF', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
