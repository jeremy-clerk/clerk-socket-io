// dotenv must be imported before @clerk/fastify
import "dotenv/config";
import Fastify from "fastify";
import {
  clerkClient,
  clerkPlugin,
  getAuth,
  User,
  verifyToken,
} from "@clerk/fastify";
import cors from "@fastify/cors";
import { Server, Socket } from "socket.io";
import { IncomingMessage } from "node:http";

type Message = {
  id: string;
  from: string;
  body: string;
  time: Date | string;
  recipient: string;
};

interface ServerToClientEvents {
  auth: (authenticated: boolean) => void;
  send: (channel: string, message: string) => void;
  inc: (val: number) => void;
  pong: (payload: any) => void;
  auth_error: () => void;
  message: (content: Message) => Promise<void>;
  usersChanged: (userId: string, state: "join" | "leave") => void;
}

interface ClientToServerEvents {
  auth: () => void;
  refresh: () => void;
  ping: () => void;
  message: ({
    user,
    content,
  }: {
    user: string;
    content: Message;
  }) => Promise<void>;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  user: User;
  orgId: string;
}

type SocketWithAuth = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> & {
  request: IncomingMessage & {
    signedIn: boolean;
    userId: string;
    orgId: string;
    authExpiration?: number;
  };
};

//if you want to check every message from the socket for Auth state,
const checkSocketAuth = (clientSocket: SocketWithAuth) => {
  const signedIn = clientSocket.request.signedIn;
  const expiryTime = new Date(
    (clientSocket.request.authExpiration || 0) * 1000,
  );
  const now = new Date();
  const expired = expiryTime < now;
  if (!signedIn || expired) {
    clientSocket.emit("auth_error");
    return false;
  } else {
    return true;
  }
};

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(8081, {
  cors: {
    origin: "*",
    allowedHeaders: ["authorization"],
    credentials: true,
  },
});

fastify.register(clerkPlugin);

io.engine.use(async (req, res, next) => {
  const isHandshake = req._query.sid === undefined;
  if (!isHandshake) {
    return next();
  }
  const header = req.headers["authorization"];
  const token = header.split(" ")[1];
  const auth = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: ["http://localhost:5173"],
  })
    .catch((e) => {
      console.log(e);
      if (e) return false;
    })
    .then((auth) => auth);
  if (auth && typeof auth !== "boolean") {
    req.signedIn = true;
    req.userId = auth.sub;
    req.orgId = auth.org_id;
    // req.authExpiration = auth.exp -- if you want to authenticate every request.
  }
  return next();
});

fastify.get("/api/users", async (request, reply) => {
  try {
    const { userId, orgId } = getAuth(request);

    if (!userId) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    if (!orgId) {
      //no active org or is a personal account
      reply.code(200).send([]);
      return;
    }

    const membershipList =
      await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

    const sockets = await io.sockets.fetchSockets();

    return membershipList.data.map((user) => {
      return {
        firstName: user.publicUserData.firstName,
        lastName: user.publicUserData.lastName,
        email: user.publicUserData.identifier,
        userId: user.publicUserData.userId,
        status: sockets.some(
          (sock) => sock.data?.user?.id === user.publicUserData?.userId,
        )
          ? "online"
          : "offline",
      };
    });
  } catch (e) {
    console.log(e);
    return reply.code(500).send({ message: "Server error." });
  }
});

io.on("connection", async (socket: SocketWithAuth) => {
  if (!socket.request?.signedIn || !socket.request?.userId) {
    //disconnect the socket and force it to reconnect.
    socket.emit("auth_error");
    socket.disconnect();
    return;
  }

  console.log("connection established.");

  const userId = socket.request.userId;
  const orgId = socket.request.orgId;

  socket.data.user = await clerkClient.users.getUser(userId);

  socket.data.orgId = orgId;
  socket.join(`org:${orgId}`);

  io.in(`org:${orgId}`).emit("usersChanged", userId, "join");

  socket.on("disconnect", (socket) => {
    io.in(`org:${orgId}`).emit("usersChanged", userId, "leave");
  });

  socket.on("message", async ({ user, content }) => {
    const userSockets = await io.sockets.fetchSockets();
    const recipient = userSockets.find((sock) => sock.data.user.id === user);
    //Check to make sure that the recipient and sender are in the same org and that the 'from' user is the same as the 'socket' user.
    if (
      recipient &&
      recipient.data.orgId === socket.data.orgId &&
      content.from === socket.data.user.id
    ) {
      recipient.emit("message", {
        id: content.id,
        from: content.from,
        body: content.body,
        time: content.time,
        recipient: user,
      });
    }
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 8080 });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
