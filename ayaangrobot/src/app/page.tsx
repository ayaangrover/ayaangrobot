"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";
import { FiLoader } from "react-icons/fi";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loginWithGoogle = () => {
    setLoading(true);
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white hidden-until-animate animate-fade-slide-down">
      <h1 className="text-6xl font-bold mb-8 hidden-until-animate animate-fade-slide-down">Ayaan Grobot</h1>
      <p className="text-lg mb-6 hidden-until-animate animate-fade-slide-down-delay-02">A fast personal AI bot</p>
      <button
        onClick={loginWithGoogle}
        className={`bg-white text-black px-6 py-3 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105 hidden-until-animate animate-fade-slide-down-delay-06 ${loading ? 'loading' : ''}`}
        disabled={loading}
      >
        {loading ? (
          <FiLoader className="animate-spin mr-2" />
        ) : (
          <FaGoogle className="mr-2" />
        )}
        {loading ? "Signing in..." : "Sign in with Google"}
      </button>
    </div>
  );
}