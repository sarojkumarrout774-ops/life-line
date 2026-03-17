import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const urgencyColor = { critical: '#C0152A', moderate: '#BA7517', planned: '#185FA5' };
const urgencyBg    = { critical: '#FFF0F1', moderate: '#FAEEDA', planned: '#E6F1FB' };
const urgencyBorder = { critical: '#C0152A', moderate: '#BA7517', planned: '#185FA5' };

export default function RequestsPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState('all');
  const { location }            = useGeolocation(true);
  const navigate                = useNavigate();
  const qc                      = useQueryClient();

  const { data, isLoading } = useQuery(
    ['requests', filter, location],
    () => requestAPI.list({ lat: location?.lat, lng: location?.lng, urgency: filter !== 'all' ? filter : undefined }),
    { select: r => r.data }
  );

  const createMutation = useMutation(requestAPI.create, {
    onSuccess: () => { toast.success('Request posted!'); setShowForm(false); qc.invalidateQueries('requests'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to post request'),
  });

  const [form, setForm] = useState({ blood_group: 'A+', units_needed: 1, hospital: '', urgency: 'moderate', notes: '', patient_name: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.hospital) return toast.error('Hospital name is required');
    createMutation.mutate({ ...form, lat: location?.lat, lng: location?.lng });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20 }}>Blood requests</h2>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '7px 14px', background: '#C0152A', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>+ New</button>
      </div>

      {/* New request form */}
      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Post blood request</h3>
          <form onSubmit={handleSubmit}>
            <label style={labelSt}>Blood group needed</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {BLOOD_GROUPS.map(bg => (
                <button key={bg} type="button" onClick={() => setForm(f => ({...f, blood_group: bg}))} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid',
                  borderColor: form.blood_group === bg ? '#C0152A' : '#E8E4DF',
                  background: form.blood_group === bg ? '#C0152A' : '#fff',
                  color: form.blood_group === bg ? '#fff' : '#1A1A18',
                  fontSize: 12, cursor: 'pointer',
                }}>{bg}</button>
              ))}
            </div>
            <label style={labelSt}>Hospital / Location</label>
            <input style={inputSt} value={form.hospital} onChange={e => setForm(f=>({...f,hospital:e.target.value}))} placeholder="e.g. AIIMS Hyderabad" required />
            <label style={labelSt}>Patient name (optional)</label>
            <input style={inputSt} value={form.patient_name} onChange={e => setForm(f=>({...f,patient_name:e.target.value}))} placeholder="For reference only" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelSt}>Units needed</label>
                <input style={inputSt} type="number" min={1} max={10} value={form.units_needed} onChange={e => setForm(f=>({...f,units_needed:+e.target.value}))} />
              </div>
              <div>
                <label style={labelSt}>Urgency</label>
                <select style={inputSt} value={form.urgency} onChange={e => setForm(f=>({...f,urgency:e.target.value}))}>
                  <option value="critical">Critical</option>
                  <option value="moderate">Moderate</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
            </div>
            <label style={labelSt}>Additional notes</label>
            <input style={inputSt} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Surgery in 3 hours" />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" disabled={createMutation.isLoading} style={{ flex:1, padding:10, background:'#C0152A', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:500, cursor:'pointer' }}>
                {createMutation.isLoading ? 'Posting...' : 'Post request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:10, background:'#fff', color:'#1A1A18', border:'1px solid #E8E4DF', borderRadius:10, fontSize:14, cursor:'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['all','critical','moderate','planned'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid',
            borderColor: filter === f ? '#1A1A18' : '#E8E4DF',
            background: filter === f ? '#1A1A18' : '#fff',
            color: filter === f ? '#fff' : '#6B6860',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 30, color: '#AEACAA' }}>Loading requests...</div>}

      {data?.requests?.map(req => (
        <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)} style={{
          background: '#fff', border: `1px solid #E8E4DF`,
          borderLeft: `4px solid ${urgencyBorder[req.urgency]}`,
          borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{req.hospital}</div>
              <div style={{ fontSize: 12, color: '#6B6860', marginTop: 3 }}>
                {req.blood_group} · {req.units_needed} unit(s)
                {req.distance_km ? ` · ${req.distance_km} km away` : ''}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: urgencyBg[req.urgency], color: urgencyColor[req.urgency], flexShrink: 0 }}>
              {req.urgency}
            </span>
          </div>
          {req.notes && <p style={{ fontSize: 12, color: '#1A1A18', marginTop: 6, fontWeight: 500 }}>{req.notes}</p>}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B6860', marginBottom: 4 }}>
              <span>Fulfilled: {req.units_fulfilled || 0} / {req.units_needed}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: req.status === 'fulfilled' ? '#E1F5EE' : '#F1EFE8', color: req.status === 'fulfilled' ? '#085041' : '#6B6860' }}>
                {req.status}
              </span>
            </div>
            <div style={{ height: 4, background: '#F1EFE8', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#C0152A', borderRadius: 2, width: `${Math.min(100, ((req.units_fulfilled||0)/req.units_needed)*100)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const labelSt = { display: 'block', fontSize: 12, color: '#6B6860', marginBottom: 4, marginTop: 10 };
const inputSt = { width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
