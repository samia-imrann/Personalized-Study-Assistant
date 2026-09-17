import { useEffect, useRef, useState } from 'react';

export const useCollab = (docId, token) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  useEffect(() => {
    if (!docId || !token) return;

    const connect = () => {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      const wsUrl = apiUrl.replace(/^http/, 'ws');
      const url = `${wsUrl}/documents/ws/${docId}?token=${token}`;
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('Connected to collab WS');
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setContent(data.payload.content);
          setTitle(data.payload.title);
          setActiveUsers(data.payload.activeUsers);
        } else if (data.type === 'edit') {
          setContent(data.payload.delta.content);
          setActiveUsers(data.payload.activeUsers);
        } else if (data.type === 'user_joined' || data.type === 'user_left') {
          setActiveUsers(data.payload.activeUsers);
        }
      };

      ws.current.onclose = () => {
        console.log('Collab WS disconnected. Reconnecting...');
        reconnectTimeout.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [docId, token]);

  const sendEdit = (newContent) => {
    setContent(newContent);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'edit',
        payload: { content: newContent }
      }));
    }
  };

  return { content, title, activeUsers, sendEdit };
};
