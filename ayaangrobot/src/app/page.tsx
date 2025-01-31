"use client";

import { useEffect, useRef, useState, ReactElement } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaBolt, FaLock, FaDatabase } from "react-icons/fa";
import { FiLoader } from "react-icons/fi";
import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/src/locomotive-scroll.scss"; // Import Locomotive Scroll styles
import CustomCursor from "../../components/CustomCursor";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const scrollRef = useRef(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const cursorPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const scroll = new LocomotiveScroll({
      el: scrollRef.current || undefined,
      smooth: true,
      multiplier: 1.5,
    });

    return () => {
      if (scroll) scroll.destroy();
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current!;
    const handleMouseMove = (e: MouseEvent) => {
      cursorPos.current = { x: e.clientX, y: e.clientY };
    };

    const updateCursor = () => {
      cursor!.style.transform = `translate3d(${cursorPos.current.x}px, ${cursorPos.current.y}px, 0)`;
      requestAnimationFrame(updateCursor);
    };

    document.addEventListener("mousemove", handleMouseMove);
    updateCursor();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const loginWithGoogle = () => {
    setLoading(true);
    router.push("/app");
  };

  const splitText = (text: string) => {
    return text.split("").map((char, index) => (
      <span key={index} data-scroll data-scroll-speed={Math.random() * 2}>
        {char}
      </span>
    ));
  };

  return (
    <div ref={scrollRef} data-scroll-container className="min-h-screen bg-white text-black relative">
      <div ref={cursorRef} className="custom-cursor"></div>
      <div className="flex flex-col items-center justify-center min-h-screen" data-scroll-section>
        <h1 className="text-9xl font-bold mb-8">
          {splitText("Ayaan Grobot")}
        </h1>
        <p className="text-2xl mb-6">
          {splitText("A fast personal AI bot")}
        </p>
        <button
          onClick={loginWithGoogle}
          className={`bg-black text-white px-6 py-3 rounded-lg flex items-center justify-center transition-transform transform hover:scale-105 ${loading ? 'loading' : ''}`}
          disabled={loading}
          data-scroll
          data-scroll-speed="2"
        >
          {loading ? "Redirecting..." : "Try Now"}
        </button>
      </div>
      <div className="lerp-elements" data-scroll-section>
        <h2 className="huge-text" data-scroll data-scroll-speed="1">{splitText("Fast Responses")}</h2>
        <h4 className="medium-text" data-scroll data-scroll-speed="2">with <a href="https://groq.com/">Groq</a></h4>
        <div className="small-text" data-scroll data-scroll-speed="2">
          <p>Experience the unparalleled speed of Groq AI, delivering lightning-fast responses to your queries.</p>
        </div>
        <h2 className="huge-text" data-scroll data-scroll-speed="1">{splitText("Secure Authentication")}</h2>
        <h4 className="medium-text" data-scroll data-scroll-speed="2">with <a href="https://firebase.google.com/">Firebase</a></h4>
        <div className="small-text" data-scroll data-scroll-speed="2.5">
          <p>Your security is our top priority. With Firebase authentication, you can log in securely using your Google account.</p>
        </div>
        <h2 className="huge-text" data-scroll data-scroll-speed="1">{splitText("Message Storage")}</h2>
        <h4 className="medium-text" data-scroll data-scroll-speed="2">with <a href="https://firebase.google.com/docs/firestore/">Firestore</a></h4>
        <div id="lastInfo" className="small-text" data-scroll data-scroll-speed="2">
          <p>Never lose track of your conversations again. Our reliable chat storage solution, powered by Firestore, keeps all your messages safe and easily accessible.</p>
        </div>
        <h1 className="tiny-text" data-scroll data-scroll-speed="1">hello there</h1>
      </div>
    </div>
  );
}