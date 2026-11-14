"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";

// One easing curve + duration scale keeps every entrance/exit feeling related.
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const DUR = { fast: 0.25, base: 0.5, slow: 0.8 } as const;

const VIEWPORT = { once: true, margin: "-60px" } as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DUR.base, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

// Transform-only hover elevation; the shadow itself is a cheap CSS transition.
export function HoverLift({
  children,
  className,
  lift = -4,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={`hover-lift ${className ?? ""}`}>{children}</div>;
  return (
    <motion.div
      className={`hover-lift ${className ?? ""}`}
      whileHover={{ y: lift }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

type ParallaxContextValue = { x: MotionValue<number>; y: MotionValue<number> };
const ParallaxContext = createContext<ParallaxContextValue | null>(null);

export function ParallaxScene({
  children,
  className,
  strength = 1,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 60, damping: 18, mass: 0.6 });
  const y = useSpring(my, { stiffness: 60, damping: 18, mass: 0.6 });

  if (reduce) return <div className={className}>{children}</div>;

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    mx.set(((event.clientX - rect.left) / rect.width - 0.5) * 2 * strength);
    my.set(((event.clientY - rect.top) / rect.height - 0.5) * 2 * strength);
  }
  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <ParallaxContext.Provider value={{ x, y }}>
      <div ref={ref} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
        {children}
      </div>
    </ParallaxContext.Provider>
  );
}

export function ParallaxLayer({
  children,
  className,
  depth = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  depth?: number;
  style?: CSSProperties;
}) {
  const ctx = useContext(ParallaxContext);
  const zero = useMotionValue(0);
  const sx = ctx ? ctx.x : zero;
  const sy = ctx ? ctx.y : zero;
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);
  return (
    <motion.div className={className} style={{ x, y, ...style }}>
      {children}
    </motion.div>
  );
}

// Counts up when scrolled into view; writes textContent directly (no re-renders).
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const source = useMotionValue(0);
  const spring = useSpring(source, { stiffness: 70, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    if (inView) source.set(value);
  }, [inView, value, reduce, source]);

  useEffect(() => {
    if (reduce) return;
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
  }, [spring, reduce]);

  if (reduce) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Mount entrance (no scroll trigger) for above-the-fold panels.
export function Enter({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}