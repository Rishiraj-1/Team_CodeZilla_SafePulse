import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const SilentWitnessSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-32"
      style={{ background: "#050505" }}
    >
      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-4xl mx-auto text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium tracking-widest uppercase mb-8"
          style={{ color: "#b787f5", letterSpacing: "0.2em" }}
        >
          Background Protection
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-none mb-8"
          style={{
            fontSize: "clamp(2.5rem, 8vw, 6rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.04em",
          }}
        >
          Protection That
          <br />
          <span style={{ color: "#b787f5" }}>Doesn't Ask.</span>
        </motion.h2>

        {/* Route trace animation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex justify-center my-14"
        >
          <RouteSVG />
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {["Background Monitoring", "Route Check-ins", "Deviation Alerts"].map((item, i) => (
            <motion.span
              key={item}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
              className="glass px-5 py-2 rounded-full text-sm font-medium"
              style={{ color: "rgba(245,245,245,0.5)" }}
            >
              {item}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="text-lg font-light max-w-lg mx-auto leading-relaxed"
          style={{ color: "rgba(245,245,245,0.35)" }}
        >
          Background monitoring. Route check-ins. Intelligent deviation alerts.
        </motion.p>
      </motion.div>
    </section>
  );
};

const RouteSVG = () => (
  <svg width="500" height="80" viewBox="0 0 500 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Static line */}
    <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(183,135,245,0.08)" strokeWidth="1" />

    {/* Animated tracing path */}
    <motion.path
      d="M 0 40 Q 50 20 100 40 Q 150 60 200 40 Q 250 20 300 40 Q 350 60 400 40 Q 450 20 500 40"
      stroke="#b787f5" strokeWidth="1.5" fill="none" strokeOpacity="0.4"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
    />

    {/* Waypoint dots */}
    {[100, 200, 300, 400].map((x, i) => (
      <motion.circle
        key={x} cx={x} cy="40" r="3"
        fill="#b787f5" fillOpacity="0.6"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 + (i + 1) * 0.6, duration: 0.4 }}
      />
    ))}

    {/* Moving dot */}
    <motion.circle r="4" fill="#b787f5" fillOpacity="0.9">
      <animateMotion
        dur="4s"
        repeatCount="indefinite"
        path="M 0 40 Q 50 20 100 40 Q 150 60 200 40 Q 250 20 300 40 Q 350 60 400 40 Q 450 20 500 40"
        begin="3s"
      />
    </motion.circle>
  </svg>
);

export default SilentWitnessSection;
