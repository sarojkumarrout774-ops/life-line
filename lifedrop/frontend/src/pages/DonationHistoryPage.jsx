import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { donationAPI } from '../services/api';

export default function DonationHistoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hospital: '', units: 1, donated_at: new Date().toISOString().slice(0,10), notes: '' });
  const qc = useQueryClient();

  const { data: history }     = useQuery('my-donations',  donationAPI.myHistory,   { select: r => r.data });
  const { data: eligibility } = useQuery('eligibility',   donationAPI.eligibility, { select: r => r.data });

  const confirmMutation = useMutation(donationAPI.confirm, {
    onSuccess: (res) => {
      toast.success(`Donation confirmed! +${res.data.points_earned} points`);
      setShowForm(false);
      qc.invalidateQueries('my-donations');
      qc.invalidateQueries('eligibility');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to confirm'),
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:20 }}>Donation history</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding:'7px 14px', background:'#C0152A', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Confirm</button>
      </div>

      {/* Eligibility card */}
      <div style={{ background: eligibility?.eligible ? '#E1F5EE' : '#FFF0F1', border:'1px solid', borderColor: eligibility?.eligible ? '#9FE1CB' : '#F7C1C1', borderRadius:12, padding:14, marginBottom:16 }}>
        <div style={{ fontWeight:500, fontSize:14, color: eligibility?.eligible ? '#085041' : '#A32D2D' }}>
          {eligibility?.eligible ? '🟢 You can donate now!' : `⏳ ${90 - (eligibility?.days_since||0)} days until eligible`}
        </div>
        {eligibility?.last_donation && (
          <div style={{ fontSize:12, color:'#6B6860', marginTop:4 }}>
            Last donation: {format(new Date(eligibility.last_donation), 'MMM d, yyyy')}
          </div>
        )}
        {!eligibility?.eligible && eligibility?.next_eligible && (
          <div style={{ fontSize:12, color:'#6B6860', marginTop:2 }}>
            Eligible again: {format(new Date(eligibility.next_eligible), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      {/* Confirm form */}
      {showForm && (
        <div style={{ background:'#fff', border:'1px solid #E8E4DF', borderRadius:12, padding:16, marginBottom:16 }}>
          <h3 style={{ fontSize:15, marginBottom:12 }}>Confirm a donation</h3>
          <label style={lbl}>Hospital name</label>
          <input style={inp} value={form.hospital} onChange={e=>setForm(f=>({...f,hospital:e.target.value}))} placeholder="e.g. AIIMS Hyderabad" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={lbl}>Units donated</label><input style={inp} type="number" min={1} max={4} value={form.units} onChange={e=>setForm(f=>({...f,units:+e.target.value}))} /></div>
            <div><label style={lbl}>Date</label><input style={inp} type="date" value={form.donated_at} onChange={e=>setForm(f=>({...f,donated_at:e.target.value}))} /></div>
          </div>
          <label style={lbl}>Notes (optional)</label>
          <input style={inp} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes" />
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={() => confirmMutation.mutate({ ...form, donated_at: new Date(form.donated_at) })} disabled={confirmMutation.isLoading} style={{ flex:1, padding:10, background:'#C0152A', color:'#fff', border:'none', borderRadius:10, fontSize:14, cursor:'pointer' }}>
              {confirmMutation.isLoading ? 'Saving...' : 'Confirm donation'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex:1, padding:10, background:'#fff', border:'1px solid #E8E4DF', borderRadius:10, fontSize:14, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {history?.donations?.length ? (
        <div style={{ paddingLeft:16, borderLeft:'2px solid #E8E4DF' }}>
          {history.donations.map((d, i) => (
            <div key={d.id} style={{ position:'relative', paddingBottom:16, paddingLeft:16 }}>
              <div style={{ position:'absolute', left:-21, top:4, width:10, height:10, borderRadius:'50%', background:'#C0152A', border:'2px solid #fff', boxShadow:'0 0 0 2px #C0152A' }} />
              <div style={{ fontSize:13, fontWeight:500 }}>{d.hospital}</div>
              <div style={{ fontSize:12, color:'#6B6860', marginTop:2 }}>
                {d.units} unit(s) · {format(new Date(d.donated_at), 'MMM d, yyyy')}
                {d.verified && <span style={{ marginLeft:6, color:'#1D9E75', fontWeight:500 }}>✓ Verified</span>}
              </div>
              {d.notes && <div style={{ fontSize:11, color:'#AEACAA', marginTop:2 }}>{d.notes}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#AEACAA' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🩸</div>
          <p>No donations yet. Be a hero!</p>
        </div>
      )}
    </div>
  );
}

const lbl = { display:'block', fontSize:12, color:'#6B6860', marginBottom:4, marginTop:10 };
const inp = { width:'100%', padding:'9px 12px', border:'1px solid #E8E4DF', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
