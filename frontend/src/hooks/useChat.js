/**
 * useChat
 * Gère la connexion Socket.io et l'état du chat pour une salle donnée.
 *
 * Usage :
 *   const { messages, typingUsers, roomUsers, connected, sendMessage, handleTyping } = useChat(roomId);
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL  = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
const STORAGE_KEY = 'fliplearn_user';

function getToken() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')?.token ?? null;
  } catch {
    return null;
  }
}

export function useChat(roomId) {
  const [messages,    setMessages]    = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);  // [{ userId, nom, prenom }]
  const [roomUsers,   setRoomUsers]   = useState([]);  // participants en ligne
  const [connected,   setConnected]   = useState(false);
  const [botThinking, setBotThinking] = useState(false);

  const socketRef      = useRef(null);
  const typingTimers   = useRef({});   // userId → timerId
  const typingDebounce = useRef(null);
  const isTypingRef    = useRef(false);

  /* ── Connexion / déconnexion ─────────────────────────────────────────── */
  useEffect(() => {
    if (!roomId) return;

    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth:       { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', roomId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('[Chat] Connexion impossible :', err.message);
    });

    /* Historique initial */
    socket.on('message_history', (msgs) => {
      setMessages(msgs ?? []);
    });

    /* Nouveau message */
    socket.on('receive_message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    /* Typing */
    socket.on('typing', ({ userId, nom, prenom }) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === userId)) return prev;
        return [...prev, { userId, nom, prenom }];
      });
      // Auto-suppression après 3 s si stop_typing n'arrive pas
      clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
      }, 3000);
    });

    socket.on('stop_typing', ({ userId }) => {
      clearTimeout(typingTimers.current[userId]);
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    /* Participants */
    socket.on('room_users', (users) => setRoomUsers(users ?? []));

    /* Bot thinking */
    socket.on('bot_thinking', (val) => setBotThinking(!!val));

    return () => {
      clearTimeout(typingDebounce.current);
      Object.values(typingTimers.current).forEach(clearTimeout);
      socket.disconnect();
      socketRef.current = null;
      setMessages([]);
      setTypingUsers([]);
      setRoomUsers([]);
      setConnected(false);
      setBotThinking(false);
    };
  }, [roomId]);

  /* ── Envoyer un message ──────────────────────────────────────────────── */
  const sendMessage = useCallback((content, receiverId = null) => {
    const s = socketRef.current;
    if (!s?.connected || !content?.trim()) return;

    s.emit('send_message', {
      roomId,
      content:    content.trim(),
      receiverId: receiverId || undefined,
      type:       'text',
    });

    // Annuler le typing
    clearTimeout(typingDebounce.current);
    if (isTypingRef.current) {
      s.emit('stop_typing', { roomId });
      isTypingRef.current = false;
    }
  }, [roomId]);

  /* ── Indicateur "en train d'écrire" (debounced 2 s) ─────────────────── */
  const handleTyping = useCallback(() => {
    const s = socketRef.current;
    if (!s?.connected) return;

    if (!isTypingRef.current) {
      s.emit('typing', { roomId });
      isTypingRef.current = true;
    }

    clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(() => {
      s.emit('stop_typing', { roomId });
      isTypingRef.current = false;
    }, 2000);
  }, [roomId]);

  return { messages, typingUsers, roomUsers, connected, botThinking, sendMessage, handleTyping };
}
