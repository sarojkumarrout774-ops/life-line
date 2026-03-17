// ProfilePage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { userAPI, donorAPI } from '../services/api';
import { useAuthStore } from '../context/store';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: badges } = useQuery(['badges', user?.id], () => userAPI.getBadges(user?.id), { select: r => r.data });

  const availMutation = useMutation(
    (avail) => donorAPI.setAvailability(user.id, { available: avail }),
    {
      onSuccess: (_, avail) => { updateUser({ is_available: avail }); toast.success(avail ? 'You are now available' : 'Set as unavailable'); },
    }
  );

  const handleLogout = () => { logout(); navigate('/login'); };

  const donationCount = user?.total_donations || 0;

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#FFF0F1', color:'#C0152A', fontFamily:'Georgia,serif', fontSize:26, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', border:'3px solid #F7C1C1' }}>
          {user?.name?.slice(0,2).toUpperCase()}
        </div>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:20 }}>{user?.name}</h2>
        <p style={{ fontSize:13, color:'#6B6860', marginTop:4 }}>{user?.blood_group} · {user?.city || 'Location not set'}</p>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:8 }}>
          <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:'#E1F5EE', color:'#085041' }}>
            {user?.is_available ? '● Available' : '○ Unavailable'}
          </span>
          <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:'#FAEEDA', color:'#633806' }}>
            {user?.points || 0} pts
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[{ val: donationCount, label:'Donations' }, { val: donationCount*3, label:'Lives helped' }].map(({val,label}) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #E8E4DF', borderRadius:12, padding:14, textAlign:'center' }}>
            <div style={{ fontFamily:'Georgia,serif', fontSize:26, color:'#C0152A', fontWeight:700 }}>{val}</div>
            <div style={{ fontSize:11, color:'#6B6860', marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <h3 style={{ fontFamily:'Georgia,serif', fontSize:17, marginBottom:10 }}>Achievements</h3>
      <div style={{ background:'#fff', border:'1px solid #E8E4DF', borderRadius:12, padding:'4px 16px', marginBottom:16 }}>
        {badges?.badges?.map(badge => (
          <div key={badge.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F1EFE8', opacity: badge.earned_at ? 1 : 0.4 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#FAEEDA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{badge.icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>{badge.name} {badge.earned_at ? '✓' : ''}</div>
              <div style={{ fontSize:11, color:'#6B6860', marginTop:2 }}>{badge.description}</div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:11, color:'#BA7517', fontWeight:500 }}>+{badge.points}pts</div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <h3 style={{ fontFamily:'Georgia,serif', fontSize:17, marginBottom:10 }}>Settings</h3>
      <div style={{ background:'#fff', border:'1px solid #E8E4DF', borderRadius:12, padding:'4px 16px', marginBottom:16 }}>
        {[
          { label:'Available to donate', val: user?.is_available, onChange: (v) => availMutation.mutate(v) },
        ].map(({ label, val, onChange }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #F1EFE8' }}>
            <span style={{ fontSize:14 }}>{label}</span>
            <div onClick={() => onChange(!val)} style={{ width:40, height:22, borderRadius:11, background: val ? '#1D9E75' : '#E8E4DF', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
              <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, left: val ? 21 : 3, transition:'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleLogout} style={{ width:'100%', padding:12, background:'#fff', color:'#C0152A', border:'1px solid #F7C1C1', borderRadius:12, fontSize:14, fontWeight:500, cursor:'pointer' }}>
        Sign out
      </button>
    </div>
  );
}
