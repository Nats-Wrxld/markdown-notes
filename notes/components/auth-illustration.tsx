"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { Enter, ParallaxLayer, ParallaxScene } from "@/components/motion";

const PARTICLES = [
  { left: "12%", top: "62%", size: 5, delay: 0, duration: 9 },
  { left: "22%", top: "78%", size: 3, delay: 2.2, duration: 11 },
  { left: "38%", top: "70%", size: 4, delay: 4.1, duration: 10 },
  { left: "58%", top: "82%", size: 3, delay: 1.4, duration: 12 },
  { left: "72%", top: "66%", size: 5, delay: 3.3, duration: 9.5 },
  { left: "86%", top: "76%", size: 3, delay: 5.2, duration: 11.5 },
  { left: "48%", top: "58%", size: 2, delay: 6.4, duration: 10.5 },
  { left: "80%", top: "48%", size: 2, delay: 7.6, duration: 12.5 },
];

function SheetLines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-1.5">
      {widths.map((w, i) => (
        <div key={i} className="paper-line" style={{ width: w }} />
      ))}
    </div>
  );
}

export function AuthIllustration() {
  const reduce = useReducedMotion();

  return (
    <ParallaxScene className="auth-scene" strength={1}>
      <div className="auth-scene-gradient" aria-hidden="true" />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="auth-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Back layer — drifting loose sheets */}
      <ParallaxLayer depth={-16} className="pointer-events-none absolute inset-0">
        <Enter delay={0.2} className="absolute left-[7%] top-[9%] w-[36%]">
          <div className="float-slower paper-sheet p-3" style={{ "--rot": "-7deg" } as React.CSSProperties}>
            <SheetLines widths={["82%", "64%", "72%"]} />
            <svg viewBox="0 0 120 26" fill="none" className="handwrite mt-2 w-full" aria-hidden="true">
              <path d="M4 18c10-10 16 6 26-4s14 6 24-4 14 6 24-4 14 6 24-4" stroke="#655294" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </Enter>
        <Enter delay={0.32} className="absolute right-[6%] top-[15%] w-[28%]">
          <div className="float-slow paper-sheet p-3" style={{ "--rot": "6deg" } as React.CSSProperties}>
            <SheetLines widths={["70%", "88%", "52%"]} />
          </div>
        </Enter>
      </ParallaxLayer>

      {/* Mid layer — small notebook + stationery */}
      <ParallaxLayer depth={-7} className="pointer-events-none absolute inset-0">
        <Enter delay={0.4} className="absolute bottom-[24%] left-[5%] w-[26%]">
          <div className="float-slow rounded-[12px] bg-[#4b3a78] p-2.5 shadow-[0_16px_34px_rgba(28,18,48,0.4)]" style={{ "--rot": "-5deg" } as React.CSSProperties}>
            <div className="rounded-[8px] bg-[#fbf8f3] p-2">
              <SheetLines widths={["76%", "58%"]} />
            </div>
          </div>
        </Enter>
        {/* pencil */}
        <Enter delay={0.5} className="absolute right-[10%] top-[42%] w-[30%]">
          <div className="float-slower" style={{ "--rot": "-24deg" } as React.CSSProperties}>
            <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-[#e9c46a] to-[#d9a441] shadow-[0_10px_22px_rgba(28,18,48,0.35)]">
              <span className="absolute -right-2 top-1/2 size-0 -translate-y-1/2 border-y-[5px] border-l-[10px] border-y-transparent border-l-[#f4ecdf]" />
            </div>
          </div>
        </Enter>
        {/* paperclip */}
        <Enter delay={0.58} className="absolute left-[16%] top-[38%]">
          <svg viewBox="0 0 24 40" fill="none" className="float-slow w-5" stroke="#f4ecdf" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 10v20a4 4 0 0 0 8 0V8a6 6 0 0 0-12 0v22a8 8 0 0 0 16 0V12" />
          </svg>
        </Enter>
      </ParallaxLayer>

      {/* Anchor — the uploaded book image, gently floating */}
      <ParallaxLayer depth={5} className="absolute inset-0 flex items-center justify-center">
        <Enter delay={0.08} y={34} className="w-[88%]">
          <motion.div
            className="book-anchor relative"
            animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, -1.1, 0, 1.1, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/illustrations/book.png"
              alt="An open book surrounded by floating pages and a purple ribbon"
              width={800}
              height={533}
              priority
              className="h-auto w-full"
              style={{
                maskImage: "radial-gradient(115% 115% at 50% 50%, #000 58%, transparent 94%)",
                WebkitMaskImage: "radial-gradient(115% 115% at 50% 50%, #000 58%, transparent 94%)",
              }}
            />
            {/* A separate translucent leaf that turns — the photograph itself stays still. */}
            <div
              aria-hidden="true"
              className="page-turn absolute right-[16%] top-[34%] h-[30%] w-[26%] rounded-r-[6px] bg-gradient-to-r from-[#fffdf9]/90 to-[#efe6f6]/70 shadow-[0_8px_20px_rgba(28,18,48,0.25)]"
            />
          </motion.div>
        </Enter>
      </ParallaxLayer>

      {/* Front layer — drifting sheet + sparkles */}
      <ParallaxLayer depth={14} className="pointer-events-none absolute inset-0">
        <Enter delay={0.66} className="absolute bottom-[16%] right-[8%] w-[24%]">
          <div className="float-slow paper-sheet p-2.5" style={{ "--rot": "9deg" } as React.CSSProperties}>
            <SheetLines widths={["80%", "60%"]} />
          </div>
        </Enter>
        <svg viewBox="0 0 24 24" className="float-slower absolute left-[10%] top-[26%] w-5 fill-[#fffdf9]/90" aria-hidden="true">
          <path d="M12 2c1.6 6.4 3.6 8.4 10 10-6.4 1.6-8.4 3.6-10 10-1.6-6.4-3.6-8.4-10-10 6.4-1.6 8.4-3.6 10-10Z" />
        </svg>
        <svg viewBox="0 0 24 24" className="float-slow absolute right-[14%] top-[10%] w-3.5 fill-[#fffdf9]/70" aria-hidden="true">
          <path d="M12 2c1.6 6.4 3.6 8.4 10 10-6.4 1.6-8.4 3.6-10 10-1.6-6.4-3.6-8.4-10-10 6.4-1.6 8.4-3.6 10-10Z" />
        </svg>
      </ParallaxLayer>

      <div className="absolute inset-x-0 bottom-[4%] px-8 text-center">
        <Enter delay={0.75}>
          <p className="font-serif text-2xl font-medium leading-snug text-white">
            Your thoughts, beautifully kept.
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Write, organize, and return to your ideas — a calm space that’s always yours.
          </p>
        </Enter>
      </div>
    </ParallaxScene>
  );
}