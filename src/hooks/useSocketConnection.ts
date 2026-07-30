import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMessagesStore } from '../store/userStore';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { Message } from '../types/social';

export function useSocketConnection() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const receiveMessage = useMessagesStore((s) => s.receiveMessage);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    const handleNewMessage = (payload: { message: Message; conversationId: string }) => {
      receiveMessage(payload.message, payload.conversationId);
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [isAuthenticated, token, receiveMessage]);
}