import { io, Socket } from 'socket.io-client';

// Adjust the URL to match your backend server
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

// Create a socket instance. AutoConnect is false; components will connect when needed.
const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});

export default socket;
