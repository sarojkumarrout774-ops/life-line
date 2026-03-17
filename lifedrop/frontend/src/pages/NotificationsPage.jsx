import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { formatDistanceToNow } from 'date-fns';
import { notificationAPI } from '../services/api';
import { useAppStore } from '../context/store';

const typeIcon = {
  sos_alert: '🚨', request_match: '🩸', donation_confirmed: '✅',
  eligibility_reminder: '📅', badge_earned: '🏅', donor_responded: '👤',
  chat: '💬',
};
const typeBg = {
  sos_alert: '#FFF0F1', request_match: '#FFF0F1', donation_confirmed: '#E1F5EE',
  eligibility_reminder: '#FAEEDA', badge_earned: '#E6F1FB', donor_responded: '#E1F5EE',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { clearUnread } = useAppStore();

  const { data, isLoading } = useQuery('notifications', notificationAPI.list, {
    select: r => r.data,
    onSuccess: () => clearUnread(),
  });

  const readAllMutation = useMutation(notificationAPI.readAll, {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:20 }}>Notifications</h2>
        {data?.unread > 0 && (
          <button onClick={() => readAllMutation.mutate()} style={{ fontSize:12, color:'#C0152A', background:'none', border:'none', cursor:'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      {isLoading && <div style={{ textAlign:'center', padding:30, color:'#AEACAA' }}>Loading...</div>}

      {data?.notifications?.map(n => (
        <div key={n.id} style={{
          display:'flex', gap:12, padding:14,
          background: n.is_read ? '#fff' : '#FFF8F8',
          border:'1px solid #E8E4DF', borderRadius:12, marginBottom:8,
        }}>
          <div style={{ width:38, height:38, borderRadius:10, background: typeBg[n.type] || '#F1EFE8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
            {typeIcon[n.type] || '🔔'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight: n.is_read ? 400 : 500, lineHeight:1.5 }}>{n.title}</div>
            {n.body && <div style={{ fontSize:12, color:'#6B6860', marginTop:2 }}>{n.body}</div>}
            <div style={{ fontSize:11, color:'#AEACAA', marginTop:4 }}>
              {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
            </div>
          </div>
          {!n.is_read && <div style={{ width:8, height:8, borderRadius:'50%', background:'#C0152A', flexShrink:0, marginTop:4 }} />}
        </div>
      ))}

      {!isLoading && !data?.notifications?.length && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#AEACAA' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔔</div>
          <p>No notifications yet</p>
        </div>
      )}
    </div>
  );
}
