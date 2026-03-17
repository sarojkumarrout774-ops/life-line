import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { requestAPI } from '../services/api';
import { useAuthStore } from '../context/store';

const urgencyColor  = { critical: '#C0152A', moderate: '#BA7517', planned: '#185FA5' };
const urgencyBg     = { critical: '#FFF0F1', moderate: '#FAEEDA', planned: '#E6F1FB' };

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [eta, setEta]     = useState(30);
  const [msg, setMsg]     = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: req, isLoading } = useQuery(
    ['request', id],
    () => requestAPI.get(id),
    { select: r => r.data }
  );

  const respondMutation = useMutation(
    () => requestAPI.respond(id, { eta_minutes: eta, message: msg }),
    {
      onSuccess: () => {
        toast.success('Response sent! The requester will be notified.');
        setShowForm(false);
        qc.invalidateQueries(['request', id]);
      },
      onError: (e) => toast.error(e.response?.data?.error || 'Failed to respond'),
    }
  );

  const fulfillMutation = useMutation(
    () => requestAPI.update(id, { status: 'fulfilled' }),
    {
      onSuccess: () => { toast.success('Request marked as fulfilled'); qc.invalidateQueries(['request', id]); },
    }
  );

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#AEACAA' }}>Loading...</div>;
  if (!req) return <div style={{ textAlign: 'center', padding: 40 }}>Request not found.</div>;

  const isMine = req.requester_id === user?.id;
  const pct = Math.min(100, Math.round(((req.units_fulfilled || 0) / req.units_needed) * 100));

  return (
    <div>
      <button onClick={() => navigate('/requests')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginBottom: 12 }}>← Back</button>

      {/* Status banner */}
      <div style={{ background: urgencyBg[req.urgency], borderRadius: 12, padding: 14, marginBottom: 14, borderLeft: `4px solid ${urgencyColor[req.urgency]}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{req.hospital}</div>
            <div style={{ fontSize: 13, color: '#6B6860', marginTop: 3 }}>
              {req.blood_group} · {req.units_needed} unit(s) needed
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: urgencyColor[req.urgency], color: '#fff' }}>
            {req.urgency}
          </span>
        </div>
        {req.notes && <div style={{ fontSize: 13, marginTop: 8, fontWeight: 500 }}>{req.notes}</div>}
      </div>

      {/* Details */}
      <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Request details</h3>
        {[
          { label: 'Patient', value: req.patient_name || 'Anonymous' },
          { label: 'Contact', value: req.contact_phone || req.requester_phone },
          { label: 'Posted',  value: formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) },
          { label: 'Status',  value: req.status },
          { label: 'Address', value: req.address },
        ].filter(d => d.value).map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFE8', fontSize: 13 }}>
            <span style={{ color: '#6B6860' }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#6B6860' }}>Fulfillment</span>
          <span style={{ fontWeight: 500 }}>{req.units_fulfilled || 0} / {req.units_needed} units</span>
        </div>
        <div style={{ height: 8, background: '#F1EFE8', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#C0152A', borderRadius: 4, width: `${pct}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6B6860', marginTop: 4 }}>{pct}% fulfilled</div>
      </div>

      {/* Responses */}
      {req.responses?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Responding donors ({req.responses.length})</h3>
          {req.responses.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F1EFE8' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF0F1', color: '#C0152A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {r.donor_name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.donor_name}</div>
                {r.eta && <div style={{ fontSize: 12, color: '#6B6860' }}>ETA: ~{r.eta} min</div>}
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: r.status === 'donated' ? '#E1F5EE' : '#FAEEDA', color: r.status === 'donated' ? '#085041' : '#633806' }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isMine && req.status === 'active' && user?.role !== 'receiver' && (
        <>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: 13, background: '#C0152A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              🩸 I can donate
            </button>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Confirm your response</h3>
              <label style={{ display: 'block', fontSize: 12, color: '#6B6860', marginBottom: 4 }}>Estimated arrival (minutes)</label>
              <input type="range" min={10} max={120} step={5} value={eta} onChange={e => setEta(+e.target.value)} style={{ width: '100%', marginBottom: 4 }} />
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>~{eta} minutes</div>
              <label style={{ display: 'block', fontSize: 12, color: '#6B6860', marginBottom: 4 }}>Message (optional)</label>
              <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="I'm on my way..." style={{ width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => respondMutation.mutate()} disabled={respondMutation.isLoading} style={{ flex: 1, padding: 10, background: '#C0152A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                  {respondMutation.isLoading ? 'Sending...' : 'Confirm response'}
                </button>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 10, background: '#fff', border: '1px solid #E8E4DF', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isMine && req.status === 'active' && (
        <button onClick={() => fulfillMutation.mutate()} disabled={fulfillMutation.isLoading} style={{ width: '100%', padding: 12, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          ✓ Mark as fulfilled
        </button>
      )}
    </div>
  );
}
