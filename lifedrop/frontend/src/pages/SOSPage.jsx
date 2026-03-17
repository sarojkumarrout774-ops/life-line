// SOSPage.jsx
import React, { useState } from 'react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { sosAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export function SOSPage() {
  const [selectedBG, setSelectedBG] = useState('O+');
  const [hospital, setHospital]     = useState('');
  const [message, setMessage]       = useState('');
  const [radius, setRadius]         = useState(15);
  const [result, setResult]         = useState(null);
  const { location, getLocation }   = useGeolocation();

  const sosMutation = useMutation(sosAPI.broadcast, {
    onSuccess: (res) => {
      setResult(res.data);
      toast.custom(() => (
        <div style={{ background:'#C0152A',color:'#fff',padding:'12px 18px',borderRadius:12,fontWeight:500 }}>
          🚨 SOS sent! {res.data.donors_alerted} donors alerted
        </div>
      ), { duration: 8000 });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'SOS failed'),
  });

  const handleSOS = () => {
    if (!location) { getLocation(); toast('Getting your location...'); return; }
    sosMutation.mutate({ blood_group: selectedBG, lat: location.lat, lng: location.lng, hospital, message, radius_km: radius });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ paddingTop: 10, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 22 }}>Emergency SOS</h2>
        <p style={{ fontSize: 13, color: '#6B6860', marginTop: 6, lineHeight: 1.6 }}>Broadcasts an alert to all available<br/>donors within your radius instantly</p>
      </div>

      {/* SOS Button */}
      <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'rgba(192,21,42,0.12)', animation:'pulse 1.8s ease-out infinite' }} />
        <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'rgba(192,21,42,0.08)', animation:'pulse 1.8s ease-out 0.6s infinite' }} />
        <button onClick={handleSOS} disabled={sosMutation.isLoading} style={{
          position:'relative', zIndex:2, width:110, height:110, borderRadius:'50%',
          background:'#C0152A', color:'#fff', fontFamily:'Georgia,serif',
          fontSize:22, fontWeight:700, border:'none', cursor:'pointer',
          boxShadow:'0 4px 20px rgba(192,21,42,0.4)',
        }}>SOS</button>
      </div>

      {result && (
        <div style={{ background:'#FFF0F1', border:'1px solid #F7C1C1', borderRadius:12, padding:14, marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:22, marginBottom:4 }}>🚨</div>
          <div style={{ fontWeight:500 }}>{result.donors_alerted} donors alerted</div>
          <div style={{ fontSize:12, color:'#6B6860', marginTop:4 }}>Expected response in ~5 minutes</div>
        </div>
      )}

      <div style={{ textAlign:'left', marginBottom:16 }}>
        <label style={lbl}>Blood group needed</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
          {BLOOD_GROUPS.map(bg => (
            <button key={bg} type="button" onClick={() => setSelectedBG(bg)} style={{
              padding:'6px 12px', borderRadius:20, border:'1px solid',
              borderColor: selectedBG===bg ? '#C0152A' : '#E8E4DF',
              background: selectedBG===bg ? '#C0152A' : '#fff',
              color: selectedBG===bg ? '#fff' : '#1A1A18',
              fontSize:13, cursor:'pointer',
            }}>{bg}</button>
          ))}
        </div>
        <label style={lbl}>Hospital / Location</label>
        <input style={inp} value={hospital} onChange={e=>setHospital(e.target.value)} placeholder="e.g. AIIMS Hyderabad, Ward 4" />
        <label style={lbl}>Message (optional)</label>
        <input style={inp} value={message} onChange={e=>setMessage(e.target.value)} placeholder="e.g. Patient in ICU, critical condition" />
        <label style={lbl}>Broadcast radius: <b>{radius} km</b></label>
        <input type="range" min={5} max={50} value={radius} onChange={e=>setRadius(+e.target.value)} style={{ width:'100%', marginBottom:16 }} />
      </div>

      <button onClick={handleSOS} disabled={sosMutation.isLoading} style={{ width:'100%', padding:14, background:'#C0152A', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', marginBottom:8 }}>
        {sosMutation.isLoading ? 'Broadcasting...' : '🚨 Broadcast Emergency SOS'}
      </button>
      <style>{`@keyframes pulse{0%{transform:scale(.9);opacity:.8}100%{transform:scale(1.6);opacity:0}}`}</style>
    </div>
  );
}

const lbl = { display:'block', fontSize:12, color:'#6B6860', marginBottom:4, marginTop:10 };
const inp = { width:'100%', padding:'10px 12px', border:'1px solid #E8E4DF', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

export default SOSPage;
