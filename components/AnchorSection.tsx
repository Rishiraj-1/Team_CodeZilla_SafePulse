import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const AnchorSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [60, 0]);

  return (
    <section
      id="anchor"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-32"
      style={{
        background: "linear-gradient(180deg, #050505 0%, #060508 50%, #050505 100%)",
      }}
    >
      {/* Ambient bottom */}
      <div
        className="absolute bottom-0 left-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(183,135,245,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: "translateX(-50%)",
        }}
      />

      <motion.div
        style={{ opacity, y }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium tracking-widest uppercase mb-8"
          style={{ color: "#b787f5", letterSpacing: "0.2em" }}
        >
          Human Support
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-tight mb-16"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.03em",
          }}
        >
          When You Don't Want<br />
          <span style={{ color: "#b787f5" }}>to Walk Alone.</span>
        </motion.h2>

        {/* Guardian animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative flex justify-center mb-16"
        >
          <GuardianSVG />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-lg font-light max-w-xl mx-auto leading-relaxed"
          style={{ color: "rgba(245,245,245,0.38)" }}
        >
          Exclusive network of institutional guardians (NSS, campus security, NGOs). Live session-based assistance fully logged and monitored by the admin dashboard.
        </motion.p>
      </motion.div>
    </section>
  );
};

const GuardianSVG = () => (
  <div className="relative" style={{ width: 280, height: 220 }}>
    <svg width="280" height="220" viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Street light */}
      <line x1="140" y1="40" x2="140" y2="200" stroke="rgba(183,135,245,0.2)" strokeWidth="2" />
      <line x1="140" y1="40" x2="175" y2="40" stroke="rgba(183,135,245,0.2)" strokeWidth="2" />
      <circle cx="175" cy="40" r="4" fill="rgba(183,135,245,0.5)" />

      {/* Lamp glow */}
      <motion.circle
        cx="175" cy="40" r="30"
        fill="rgba(183,135,245,0.06)"
        animate={{ r: [30, 38, 30], opacity: [0.8, 0.5, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ground */}
      <line x1="60" y1="200" x2="220" y2="200" stroke="rgba(183,135,245,0.1)" strokeWidth="1" />

      {/* Silhouette A */}
      <motion.g
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <circle cx="105" cy="145" r="14" fill="rgba(183,135,245,0.15)" stroke="rgba(183,135,245,0.3)" strokeWidth="1" />
        <rect x="97" y="159" width="16" height="35" rx="8" fill="rgba(183,135,245,0.12)" stroke="rgba(183,135,245,0.25)" strokeWidth="1" />
      </motion.g>

      {/* Silhouette B */}
      <motion.g
        initial={{ opacity: 0, x: 10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <circle cx="132" cy="148" r="12" fill="rgba(183,135,245,0.12)" stroke="rgba(183,135,245,0.2)" strokeWidth="1" />
        <rect x="125" y="160" width="14" height="32" rx="7" fill="rgba(183,135,245,0.1)" stroke="rgba(183,135,245,0.2)" strokeWidth="1" />
      </motion.g>

      {/* Guardian verified badge pulse */}
      <motion.circle
        cx="105" cy="145" r="22"
        fill="none" stroke="#b787f5" strokeWidth="1"
        animate={{ r: [22, 32, 22], strokeOpacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.circle
        cx="105" cy="145" r="22"
        fill="none" stroke="#b787f5" strokeWidth="0.5"
        animate={{ r: [22, 40, 22], strokeOpacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
      />
    </svg>

    {/* Verified badge */}
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
      className="absolute glass-violet px-3 py-1.5 rounded-full flex items-center gap-2"
      style={{ top: 10, right: 0 }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#b787f5", boxShadow: "0 0 6px #b787f5" }} />
      <span className="text-xs font-medium" style={{ color: "#b787f5" }}>Guardian Active</span>
    </motion.div>
  </div>
);

export default AnchorSection;
