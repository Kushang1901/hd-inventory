"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically direct users entering the inventory portal to the secure dashboard layout
    router.push("/dashboard");
  }, [router]);

  return (
    <div 
      className="flex min-h-screen items-center justify-center text-white"
      style={{ backgroundColor: "#070000" }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-xs uppercase tracking-widest text-amber-500/80">Entering Hotel Devang Portal...</p>
      </div>
    </div>
  );
}
