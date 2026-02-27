import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const FailsafeSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section
      id="failsafe"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-32"
      style={{ background: "#050505" }}
    >
      {/* Pulsing violet glow center */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(183,135,245,0.1) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </motion.div>

      <motion.div
        style={{ opacity }}
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
          Emergency Response
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-none mb-16"
          style={{
            fontSize: "clamp(3rem, 10vw, 8rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.04em",
          }}
        >
          When Seconds<br />
          <span style={{ color: "#b787f5" }}>Matter.</span>
        </motion.h2>

        {/* SOS ripple */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative flex justify-center items-center mb-16"
          style={{ height: 200 }}
        >
          <SOSRipple />
        </motion.div>

        {/* Notification cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {/* Telegram notification */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="glass px-5 py-3.5 rounded-2xl flex items-center gap-3"
            style={{ minWidth: 240 }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(39,159,218,0.15)", border: "1px solid rgba(39,159,218,0.2)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.7 8c-.12.54-.46.67-.93.42l-2.57-1.89-1.24 1.19c-.14.14-.25.25-.51.25l.18-2.6 4.72-4.26c.2-.18-.04-.28-.32-.1L8.22 14.4 5.7 13.6c-.55-.17-.56-.55.12-.82l9-3.47c.46-.17.87.11.72.82z" fill="rgba(39,159,218,0.8)" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(245,245,245,0.8)" }}>Immediate Escalation</p>
              <p className="text-xs" style={{ color: "rgba(245,245,245,0.38)" }}>Live location tracking shared instantly</p>
            </div>
            <motion.div
              className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: "#b787f5" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Admin dashboard alert */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="glass-violet px-5 py-3.5 rounded-2xl flex items-center gap-3"
            style={{ minWidth: 240 }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(183,135,245,0.15)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#b787f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(245,245,245,0.8)" }}>Authority Override</p>
              <p className="text-xs" style={{ color: "rgba(183,135,245,0.7)" }}>⬤ Guardian & Authority alerted</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

const SOSRipple = () => (
  <div className="relative w-24 h-24 flex items-center justify-center">
    {/* Ripple rings */}
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 96, height: 96,
          border: "1px solid rgba(183,135,245,0.5)",
        }}
        animate={{
          scale: [1, 3 + i * 0.5],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          delay: i * 0.8,
          ease: "easeOut",
        }}
      />
    ))}
    {/* SOS core */}
    <motion.div
      className="w-16 h-16 rounded-full flex items-center justify-center glass-violet"
      style={{ boxShadow: "0 0 30px rgba(183,135,245,0.3)" }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="text-sm font-black" style={{ color: "#b787f5", letterSpacing: "0.05em" }}>SOS</span>
    </motion.div>
  </div>
);

export default FailsafeSection;
