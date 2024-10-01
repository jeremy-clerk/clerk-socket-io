import { useEffect, useState } from "react";
import { socket as socketio } from "../lib/socket.ts";
import { useAuth } from "@clerk/clerk-react";
import { Socket } from "socket.io-client";

type messageHandlerFn = (event: string, fn: () => void) => void;

export const useSocket = (messageHandler: messageHandlerFn) => {
  const { getToken, isLoaded } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketState, setSocketState] = useState({
    connected: false,
    authenticated: false,
  });

  useEffect(() => {
    //if Clerk isn't loaded or the socket is authenticated, return;
    if (socket || !isLoaded || socketState.authenticated) return;
    //Reauthenticate the socket with a new JWT
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        setSocket(socketio(token));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isLoaded, socketState]);

  useEffect(() => {
    if (!socket) return;
    function onConnect() {
      console.log("connected");
      setSocketState({
        ...socketState,
        connected: true,
        authenticated: true,
      });
    }

    function onDisconnect() {
      console.log("disconnected");
      setSocketState({
        ...socketState,
        connected: false,
        authenticated: false,
      });
    }

    function onAuth() {
      setSocketState({
        ...socketState,
        authenticated: false,
      });
      setSocket(null);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("auth_error", onAuth);
    socket.onAny(messageHandler);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("auth_error", onAuth);
      socket.offAny(messageHandler);
    };
  }, [socket]);

  return socket;
};
