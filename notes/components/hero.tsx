"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { Enter } from "@/components/motion";

const VIDEO_SRC = "/hero/woman-writing.mp4";
const POSTER_SRC = "/hero/poster.jpg";

export default function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  // Attach the video source only once the hero is near the viewport and the
  // first paint has settled, so the 1080p asset never blocks rendering.
  useEffect(() => {
    if (reduce) return;
    const node = sectionRef.current;
    if (!node) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          timer = window.setTimeout(() => setActive(true), 200);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [reduce]);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    video.src = VIDEO_SRC;
    const play = () => {
      video.play().catch(() => {});
    };
    if (video.readyState >= 2) play();
    else video.addEventListener("loadeddata", play, { once: true });
    return () => video.removeEventListener("loadeddata", play);
  }, [active]);

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden">
      <div className="hero-media" aria-hidden="true">
        <Image src={POSTER_SRC} alt="" fill sizes="100vw" priority className="object-cover" />
        {!reduce && (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            autoPlay
            preload="none"
            poster={POSTER_SRC}
            tabIndex={-1}
            disableRemotePlayback
          />
        )}
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-content mx-auto flex min-h-[72vh] w-full max-w-6xl flex-col justify-center px-5 py-24 sm:min-h-[82vh] sm:px-8 sm:py-28">
        <Enter delay={0.05}>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d9cdee]">
            A private home for your thinking
          </p>
        </Enter>
        <Enter delay={0.16}>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(2.6rem,6vw,4.4rem)] font-medium leading-[1.05] tracking-[-0.03em] text-[#fdf9f3]">
            Your thoughts deserve a space of their own.
          </h1>
        </Enter>
        <Enter delay={0.3}>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#e9e1f3]">
            UrSpace is a calm, personal notebook for tutors — rich-text notes, tags, and
            search, wrapped in warm paper tones. Write freely; we keep it safe and
            organized.
          </p>
        </Enter>
        <Enter delay={0.44}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="ui-button ui-button-primary px-6 py-3 text-sm">
              Create your space — free
            </Link>
            <Link
              href="/login"
              className="ui-button border-white/40 bg-white/10 px-6 py-3 text-sm text-white backdrop-blur-sm hover:bg-white/20"
            >
              Log in
            </Link>
          </div>
        </Enter>
        <Enter delay={0.56}>
          <p className="mt-5 text-xs text-[#cfc3e4]">
            Email, Google &amp; GitHub sign-in · Honest privacy, explained below
          </p>
        </Enter>
        <div className="hero-scroll-cue mt-14 flex items-center gap-2 text-[#cfc3e4]" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 4v14m0 0 5-5m-5 5-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Scroll</span>
        </div>
      </div>
    </section>
  );
}