import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

const VisionSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.9, 1], [0, 1, 1, 0]);

  return (
    <section
      id="vision"
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-32"
      style={{ background: "#050505" }}
    >
      {/* City grid background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
        <VisionGridSVG />
      </div>

      {/* Large ambient glow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-[800px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(183,135,245,0.08) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
      </motion.div>

      {/* Divider line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, rgba(183,135,245,0.2) 30%, rgba(183,135,245,0.2) 70%, transparent)",
        }}
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium tracking-widest uppercase mb-12"
          style={{ color: "#b787f5", letterSpacing: "0.2em" }}
        >
          The Vision
        </motion.p>

        {/* Massive statement */}
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-tight mb-20"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 6rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.03em",
          }}
        >
          We Don't Ask Women<br />
          To Be Brave.
          <br />
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.8 }}
            style={{ color: "#b787f5" }}
          >
            We Redesign Cities<br />
            To Be Safer.
          </motion.span>
        </motion.h2>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/login")}
            className="relative px-10 py-4 rounded-full font-semibold text-base tracking-wide overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #b787f5, #9b6de0)",
              color: "#080808",
              boxShadow: "0 0 40px rgba(183,135,245,0.35), 0 0 80px rgba(183,135,245,0.15)",
              letterSpacing: "0.01em",
            }}
          >
            Build The Future of Safety
          </motion.button>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.6 }}
            className="text-xs"
            style={{ color: "rgba(245,245,245,0.2)", letterSpacing: "0.1em" }}
          >
            SafePulse — Predictive Safety Intelligence · 2026
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
};

const VisionGridSVG = () => (
  <svg width="1200" height="700" viewBox="0 0 1200 700" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Perspective grid - horizontal */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
      const y = 100 + i * 70;
      const x1 = 600 - (600 * (1 - i / 8));
      const x2 = 600 + (600 * (1 - i / 8));
      return (
        <motion.line
          key={`h${i}`}
          x1={x1} y1={y} x2={x2} y2={y}
          stroke="#b787f5" strokeWidth="0.5" strokeOpacity={0.08 + i * 0.025}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
        />
      );
    })}
    {/* Vertical lines (perspective) */}
    {[-6, -4, -2, 0, 2, 4, 6].map((offset, i) => (
      <motion.line
        key={`v${i}`}
        x1={600 + offset * 90} y1="690" x2={600 + offset * 15} y2="100"
        stroke="#b787f5" strokeWidth="0.5" strokeOpacity="0.06"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
      />
    ))}
    {/* Scattered light nodes */}
    {[
      { x: 200, y: 300 }, { x: 400, y: 200 }, { x: 600, y: 400 }, { x: 800, y: 250 }, { x: 1000, y: 350 },
      { x: 300, y: 500 }, { x: 700, y: 150 }, { x: 900, y: 450 },
    ].map((p, i) => (
      <motion.circle
        key={i} cx={p.x} cy={p.y} r="2"
        fill="#b787f5" fillOpacity="0.4"
        animate={{ fillOpacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
      />
    ))}
  </svg>
);

export default VisionSection;
