# Clerk + React + Fastify + Socket.io

Example and Starter

## Using this example

In both the `/apps/server` and `/apps/web` directories, rename the `.env.example` files to `.env` 

Fill in the values for `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` with your keys from the [Clerk Dashboard](https://dashboard.clerk.com)


Run the following command to install the required dependencies:

```sh
pnpm i
```

## What's inside?

An example chat application using [Clerk](https://clerk.com) authentication and user management with Socket.io.

`/apps/server` directory contains a Fastify web server and Socket.io server. 

`/apps/web` directory contains a React app with the Socket.io client. 

### Apps and Packages

- `web`: React App with Clerk
- `server`: Fastify web server with [Socket.io](https://socket.io)


### Develop

After installing all required dependencies, run the following command to start the application.
```sh
pnpm dev
```
The React app will be available in your browser at: `http://localhost:5173`

The Fastify web server listens on `http://localhost:8080`

The Socket.io server listens on `http://localhost:8081`

