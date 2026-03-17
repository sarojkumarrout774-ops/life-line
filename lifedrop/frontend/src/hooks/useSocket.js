import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useAppStore } from '../context/store';
import toast from 'react-hot-toast';

let socketInstance = null;

export function useSocket() {
  const { token, user } = useAuthStore();
  const { addNotification, setActiveSOS } = useAppStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    if (!socketInstance) {
      socketInstance = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketInstance;
    const socket = socketInstance;

    // Join personal blood group room
    socket.emit('join_blood_group', user.blood_group);

    socket.on('connect', () => console.log('Socket connected'));

    socket.on('sos_alert', (data) => {
      if (data.blood_group === user.blood_group || user.blood_group === 'O-') {
        setActiveSOS(data);
        toast.custom(() => (
          <div style={{
            background: '#C0152A', color: '#fff', padding: '12px 16px',
            borderRadius: '12px', fontWeight: 500, maxWidth: 320,
          }}>
            🚨 EMERGENCY: {data.blood_group} needed at {data.hospital}
          </div>
        ), { duration: 10000 });
      }
    });

    socket.on('new_message', (msg) => {
      addNotification({ type: 'chat', title: `Message from ${msg.sender_name}`, body: msg.content });
      toast(`💬 ${msg.sender_name}: ${msg.content.slice(0, 60)}`);
    });

    socket.on('donor_responded', (data) => {
      toast.success(`✅ ${data.donor_name} is responding to your request!`);
    });

    return () => {
      socket.off('sos_alert');
      socket.off('new_message');
      socket.off('donor_responded');
    };
  }, [token, user]);

  return socketRef.current;
}

export function getSocket() { return socketInstance; }
