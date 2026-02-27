import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const useInView = (threshold = 0.3) => {
  const ref = useRef<HTMLDivElement>(null);
  return { ref };
};

const OracleSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8], [60, 0, -20]);

  return (
    <section
      id="oracle"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6"
      style={{ background: "#050505" }}
    >
      {/* Ambient orb top left */}
      <div
        className="absolute top-0 left-0 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(183,135,245,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <motion.div
        style={{ opacity, y }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium tracking-widest uppercase mb-8"
          style={{ color: "#b787f5", letterSpacing: "0.2em" }}
        >
          Risk Awareness
        </motion.p>

        {/* Main headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-none mb-6"
          style={{
            fontSize: "clamp(4rem, 12vw, 10rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.04em",
          }}
        >
          The Oracle.
        </motion.h2>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-2xl font-light mb-16"
          style={{ color: "rgba(245,245,245,0.4)" }}
        >
          Crowd-powered risk intelligence.
        </motion.p>

        {/* SVG Map clustering animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative mx-auto mb-16"
          style={{ maxWidth: 600, height: 260 }}
        >
          <OracleMapSVG />
        </motion.div>

        {/* Copy */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-lg font-light max-w-2xl mx-auto leading-relaxed"
          style={{ color: "rgba(245,245,245,0.38)" }}
        >
          Collects safety reports from Web, Telegram Bot, and Voice AI using consensus threshold logic. Dynamic risk zones influence intelligent routing and live dashboard alerts.
        </motion.p>
      </motion.div>
    </section>
  );
};

const OracleMapSVG = () => (
  <svg width="100%" height="260" viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base map grid */}
    {[0, 1, 2, 3].map(i => (
      <line key={`gh${i}`} x1="40" y1={50 + i * 55} x2="560" y2={50 + i * 55}
        stroke="rgba(183,135,245,0.1)" strokeWidth="0.5" strokeDasharray="6 10" />
    ))}
    {[0, 1, 2, 3, 4, 5, 6].map(i => (
      <line key={`gv${i}`} x1={40 + i * 87} y1="30" x2={40 + i * 87} y2="230"
        stroke="rgba(183,135,245,0.08)" strokeWidth="0.5" strokeDasharray="6 10" />
    ))}

    {/* Scattered map pins */}
    {[
      { x: 120, y: 80, d: 0 }, { x: 200, y: 110, d: 0.2 }, { x: 150, y: 150, d: 0.4 },
      { x: 170, y: 90, d: 0.1 }, { x: 210, y: 140, d: 0.3 }, { x: 135, y: 120, d: 0.5 },
    ].map((p, i) => (
      <g key={i}>
        <motion.circle
          cx={p.x} cy={p.y} r="5"
          fill="#b787f5" fillOpacity="0"
          stroke="#b787f5" strokeWidth="1.5" strokeOpacity="0.6"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: p.d + 0.5 }}
        />
        <motion.circle
          cx={p.x} cy={p.y} r="5"
          fill="#b787f5"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: [0, 1.5, 1], opacity: [0, 0.8, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: p.d + 0.8 }}
        />
      </g>
    ))}

    {/* Cluster glow zone */}
    <motion.circle
      cx="165" cy="115" r="60"
      fill="rgba(183,135,245,0)"
      stroke="#b787f5" strokeWidth="1"
      initial={{ r: 10, strokeOpacity: 0 }}
      whileInView={{ r: 60, strokeOpacity: 0.25 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
    />
    <motion.circle
      cx="165" cy="115" r="60"
      fill="rgba(183,135,245,0.06)"
      initial={{ r: 10, opacity: 0 }}
      whileInView={{ r: 60, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 1.2 }}
    />

    {/* Zone label */}
    <motion.text
      x="165" y="118" textAnchor="middle"
      fill="#b787f5" fontSize="9" fontFamily="Inter" letterSpacing="2" opacity="0"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 0.8 }}
      viewport={{ once: true }}
      transition={{ delay: 1.8, duration: 0.5 }}
    >
      HIGH RISK ZONE
    </motion.text>

    {/* Safe area pins */}
    {[{ x: 420, y: 80 }, { x: 480, y: 140 }, { x: 380, y: 160 }, { x: 500, y: 90 }].map((p, i) => (
      <g key={`safe-${i}`}>
        <motion.circle
          cx={p.x} cy={p.y} r="4"
          fill="rgba(0,240,118,0)"
          stroke="#00f076" strokeWidth="1.5" strokeOpacity="0.5"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.15 + 0.5 }}
        />
        <motion.circle
          cx={p.x} cy={p.y} r="4"
          fill="#00f076"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: [0, 1.5, 1], opacity: [0, 0.7, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: i * 0.15 + 0.8 }}
        />
      </g>
    ))}

    {/* Safe Zone glow */}
    <motion.circle
      cx="445" cy="115" r="60"
      fill="rgba(0,240,118,0)"
      stroke="#00f076" strokeWidth="1"
      initial={{ r: 10, strokeOpacity: 0 }}
      whileInView={{ r: 60, strokeOpacity: 0.2 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
    />
    <motion.circle
      cx="445" cy="115" r="60"
      fill="rgba(0,240,118,0.05)"
      initial={{ r: 10, opacity: 0 }}
      whileInView={{ r: 60, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 1.2 }}
    />

    {/* Safe Zone label */}
    <motion.text
      x="445" y="118" textAnchor="middle"
      fill="#00f076" fontSize="9" fontFamily="Inter" letterSpacing="2" opacity="0"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 0.7 }}
      viewport={{ once: true }}
      transition={{ delay: 1.8, duration: 0.5 }}
    >
      LOW RISK ZONE
    </motion.text>
  </svg>
);

export default OracleSection;
