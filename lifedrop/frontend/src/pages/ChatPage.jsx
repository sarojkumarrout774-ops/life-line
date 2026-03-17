import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { chatAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import { getSocket } from '../hooks/useSocket';

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const { data: conversations } = useQuery('conversations', chatAPI.conversations, {
    enabled: !userId,
    select: r => r.data,
  });

  const { data: thread, refetch } = useQuery(
    ['thread', userId],
    () => chatAPI.thread(userId),
    { enabled: !!userId, select: r => r.data, refetchInterval: 5000 }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('new_message', () => { if (userId) refetch(); });
    return () => socket.off('new_message');
  }, [userId]);

  const sendMutation = useMutation(
    (content) => chatAPI.send(userId, { content }),
    {
      onSuccess: () => { setText(''); refetch(); qc.invalidateQueries('conversations'); },
    }
  );

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  // Conversation list
  if (!userId) {
    return (
      <div>
        <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20, marginBottom: 16 }}>Messages</h2>
        {conversations?.conversations?.length ? conversations.conversations.map(c => (
          <div key={c.other_user_id} onClick={() => navigate(`/chat/${c.other_user_id}`)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFF0F1', color: '#C0152A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {c.other_name?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{c.other_name}</div>
              <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.content}</div>
            </div>
            <div style={{ fontSize: 11, color: '#AEACAA', flexShrink: 0 }}>{format(new Date(c.sent_at), 'HH:mm')}</div>
            {!c.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C0152A', flexShrink: 0 }} />}
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#AEACAA' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <p>No conversations yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Contact a donor from the Donors page to start chatting.</p>
          </div>
        )}
      </div>
    );
  }

  // Thread view
  const otherName = thread?.messages?.[0]
    ? (thread.messages.find(m => m.sender_id !== user.id)?.sender_name || 'Donor')
    : 'Chat';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF0F1', color: '#C0152A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
          {otherName.slice(0, 2).toUpperCase()}
        </div>
        <span style={{ fontWeight: 500 }}>{otherName}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
        {thread?.messages?.map(msg => {
          const mine = msg.sender_id === user.id;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '9px 13px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: mine ? '#C0152A' : '#fff', color: mine ? '#fff' : '#1A1A18',
                border: mine ? 'none' : '1px solid #E8E4DF', fontSize: 13,
              }}>
                <div>{msg.content}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
                  {format(new Date(msg.sent_at), 'HH:mm')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #E8E4DF', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
        <button type="submit" disabled={!text.trim() || sendMutation.isLoading} style={{ width: 44, height: 44, borderRadius: '50%', background: '#C0152A', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ➤
        </button>
      </form>
    </div>
  );
}
