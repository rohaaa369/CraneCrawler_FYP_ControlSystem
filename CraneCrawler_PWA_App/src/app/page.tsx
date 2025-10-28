// src/app/page.tsx
"use client";
import dynamic from "next/dynamic";

// The ClientOnlyUI component was part of the native shell approach.
// For a pure PWA, we can directly render the main interface.
const ClientOnlyUI = dynamic(
  () => import("@/components/crane/client-only-ui"),
  { 
    ssr: false,
    loading: () => <div className="flex h-svh w-full items-center justify-center bg-background"><p>Loading Interface...</p></div>
  }
);


export default function Home() {
  return <ClientOnlyUI />;
}
