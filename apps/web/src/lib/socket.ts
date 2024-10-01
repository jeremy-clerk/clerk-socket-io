import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export const socket = (token: string) =>
  io(SOCKET_URL, {
    extraHeaders: {
      authorization: `Bearer ${token}`,
    },
    autoConnect: false,
  });
