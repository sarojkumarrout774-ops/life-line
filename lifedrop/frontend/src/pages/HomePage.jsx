import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../context/store';
import { requestAPI, donationAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const urgencyColor = { critical: '#C0152A', moderate: '#BA7517', planned: '#185FA5' };
const urgencyBg    = { critical: '#FFF0F1', moderate: '#FAEEDA', planned: '#E6F1FB' };

export default function HomePage() {
  const { user } = useAuthStore();
  const { location } = useGeolocation(true);
  const navigate = useNavigate();

  const { data: eligibility } = useQuery('eligibility', donationAPI.eligibility, {
    select: (r) => r.data,
  });

  const { data: requestsData } = useQuery(
    ['requests-nearby', location],
    () => requestAPI.list({ lat: location?.lat, lng: location?.lng, radius_km: 15, limit: 3 }),
    { enabled: !!location, select: (r) => r.data }
  );

  const donationsLeft = eligibility?.eligible === false
    ? Math.max(0, 90 - (eligibility?.days_since || 0))
    : 0;
  const progressPct = eligibility?.eligible === false
    ? Math.round(((eligibility?.days_since || 0) / 90) * 100) : 100;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#6B6860' }}>{greeting},</p>
        <h2 style={{ fontSize: 20, fontFamily: 'Georgia,serif', marginTop: 2 }}>{user?.name?.split(' ')[0]} 👋</h2>
      </div>

      {/* Blood type card */}
      <div style={{ background: '#C0152A', borderRadius: 16, padding: 16, marginBottom: 14, color: '#fff' }}>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 2 }}>Your blood type</p>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: 32, fontWeight: 700 }}>{user?.blood_group}</div>
        <p style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
          {eligibility?.eligible ? 'Eligible to donate now 🟢' : `${donationsLeft} days until eligible`}
        </p>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 3, width: `${progressPct}%`, transition: 'width 0.5s' }} />
        </div>
        <p style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
          {eligibility?.last_donation
            ? `Last donated ${formatDistanceToNow(new Date(eligibility.last_donation))} ago`
            : 'No donations yet — be a hero!'}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { val: user?.total_donations || 0, label: 'Donations' },
          { val: (user?.total_donations || 0) * 3, label: 'Lives impacted' },
          { val: requestsData?.requests?.length || 0, label: 'Requests nearby' },
          { val: user?.points || 0, label: 'Points earned' },
        ].map(({ val, label }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: '#C0152A', fontWeight: 700 }}>{val}</div>
            <div style={{ fontSize: 11, color: '#6B6860', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Active requests */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 17 }}>Active requests nearby</h3>
        <Link to="/requests" style={{ fontSize: 12, color: '#C0152A', textDecoration: 'none' }}>See all →</Link>
      </div>

      {requestsData?.requests?.length ? requestsData.requests.map(req => (
        <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)} style={{
          borderLeft: `3px solid ${urgencyColor[req.urgency]}`,
          paddingLeft: 12, marginBottom: 14, cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{req.hospital}</span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: urgencyBg[req.urgency], color: urgencyColor[req.urgency] }}>
              {req.urgency}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#6B6860', marginTop: 3 }}>
            {req.blood_group} · {req.units_needed} unit(s) · {req.distance_km ? `${req.distance_km} km` : ''}
          </p>
          {req.notes && <p style={{ fontSize: 12, color: '#1A1A18', marginTop: 3, fontWeight: 500 }}>{req.notes}</p>}
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#AEACAA', fontSize: 13 }}>No active requests nearby</div>
      )}

      {/* Quick actions */}
      <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 17, marginBottom: 10, marginTop: 4 }}>Quick actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '🆘', label: 'Emergency SOS', to: '/sos' },
          { icon: '🗺️', label: 'Find donors',   to: '/donors' },
          { icon: '🩸', label: 'Request blood', to: '/requests' },
          { icon: '🏥', label: 'Blood banks',   to: '/blood-banks' },
          { icon: '💬', label: 'Messages',       to: '/chat' },
          { icon: '🏅', label: 'My donations',  to: '/donations' },
        ].map(({ icon, label, to }) => (
          <Link key={to} to={to} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: 14, background: '#fff', border: '1px solid #E8E4DF',
            borderRadius: 12, textDecoration: 'none', color: '#1A1A18',
          }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 12 }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
