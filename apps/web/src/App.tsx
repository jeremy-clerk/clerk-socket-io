import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import Dashboard from "./pages/dashboard.tsx";

export default function App() {
  return (
    <div
      className={
        "w-full h-full bg-black/95 flex flex-col items-center justify-center"
      }
    >
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <SignIn path={"/"} />
      </SignedOut>
    </div>
  );
}
