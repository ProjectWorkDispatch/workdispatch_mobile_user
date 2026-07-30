import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({ android: 'http://10.0.2.2:3002/workDispatch/v1', default: undefined })!;

const SOCKET_URL = DEFAULT_API_URL.replace(/\/workDispatch\/v1\/?$/, '');

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};