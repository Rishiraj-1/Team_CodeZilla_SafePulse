import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const PathFinderSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [60, 0]);

  return (
    <section
      id="pathfinder"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-32"
      style={{ background: "linear-gradient(180deg, #050505 0%, #070709 50%, #050505 100%)" }}
    >
      {/* Ambient orb right */}
      <div
        className="absolute right-0 top-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(183,135,245,0.07) 0%, transparent 70%)",
          filter: "blur(50px)",
          transform: "translate(30%, -50%)",
        }}
      />

      <motion.div
        style={{ opacity, y }}
        className="relative z-10 max-w-6xl mx-auto w-full"
      >
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs font-medium tracking-widest uppercase mb-6 text-center"
          style={{ color: "#b787f5", letterSpacing: "0.2em" }}
        >
          Safe Navigation
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="font-black leading-none mb-16 text-center"
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.03em",
          }}
        >
          Not the shortest route.
          <br />
          <span style={{ color: "#b787f5" }}>The safest one.</span>
        </motion.h2>

        {/* Map SVG + Route cards */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex-1 flex justify-center"
          >
            <RouteMapSVG />
          </motion.div>

          {/* Route cards */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-col gap-4 w-full max-w-sm"
          >
            {/* High risk card */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
              className="glass p-6 rounded-2xl cursor-pointer group"
              style={{ borderColor: "rgba(255,80,80,0.15)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(255,120,120,0.7)", letterSpacing: "0.15em" }}>
                  Route A
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(255,80,80,0.1)", color: "rgba(255,120,120,0.8)", border: "1px solid rgba(255,80,80,0.2)" }}
                >
                  High Risk
                </span>
              </div>
              <div className="text-4xl font-black mb-1" style={{ color: "#f5f5f5", letterSpacing: "-0.03em" }}>
                10 <span className="text-xl font-light" style={{ color: "rgba(245,245,245,0.4)" }}>mins</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(245,245,245,0.3)" }}>Passes through 2 flagged zones</p>
            </motion.div>

            {/* Safe route card */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.2 }}
              className="glass-violet p-6 rounded-2xl cursor-pointer relative overflow-hidden"
              style={{ boxShadow: "0 0 30px rgba(183,135,245,0.1)" }}
            >
              <motion.div
                className="absolute inset-0 opacity-0 hover:opacity-100"
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(183,135,245,0.05), transparent)" }}
              />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "#b787f5", letterSpacing: "0.15em" }}>
                  Route B
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(183,135,245,0.12)", color: "#b787f5", border: "1px solid rgba(183,135,245,0.3)" }}
                >
                  ✓ Safer Route
                </span>
              </div>
              <div className="text-4xl font-black mb-1" style={{ color: "#f5f5f5", letterSpacing: "-0.03em" }}>
                12 <span className="text-xl font-light" style={{ color: "rgba(245,245,245,0.4)" }}>mins</span>
              </div>
              <p className="text-xs leading-relaxed mt-2" style={{ color: "rgba(245,245,245,0.4)" }}>Safety-weighted routing treats risk zones as high-resistance. Suggests slightly longer but significantly safer alternates.</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

const RouteMapSVG = () => (
  <svg width="400" height="320" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grid */}
    {[0, 1, 2, 3, 4].map(i => (
      <line key={`h${i}`} x1="20" y1={40 + i * 60} x2="380" y2={40 + i * 60}
        stroke="rgba(183,135,245,0.07)" strokeWidth="0.5" />
    ))}
    {[0, 1, 2, 3, 4, 5].map(i => (
      <line key={`v${i}`} x1={20 + i * 72} y1="20" x2={20 + i * 72} y2="300"
        stroke="rgba(183,135,245,0.07)" strokeWidth="0.5" />
    ))}

    {/* Danger zone */}
    <motion.ellipse
      cx="200" cy="155" rx="55" ry="45"
      fill="rgba(255,80,80,0.07)" stroke="rgba(255,80,80,0.25)" strokeWidth="1"
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.5 }}
    />
    <motion.text
      x="200" y="158" textAnchor="middle"
      fill="rgba(255,120,120,0.6)" fontSize="7" fontFamily="Inter" letterSpacing="1"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 1, duration: 0.4 }}
    >
      RISK ZONE
    </motion.text>

    {/* Route A — goes through danger (dashed red) */}
    <motion.path
      d="M 50 280 L 50 155 L 200 155 L 350 155 L 350 40"
      stroke="rgba(255,100,100,0.4)" strokeWidth="2" fill="none"
      strokeDasharray="6 4"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
    />

    {/* Route B — curves around (violet) */}
    <motion.path
      d="M 50 280 L 50 220 Q 50 60 130 60 L 350 60 L 350 40"
      stroke="#b787f5" strokeWidth="2.5" fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
    />
    <motion.circle
      cx="50" cy="280" r="5"
      fill="#b787f5"
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.8, duration: 0.4 }}
    />
    <motion.circle
      cx="350" cy="40" r="5"
      fill="#b787f5"
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 2.5, duration: 0.4 }}
    />

    {/* Animated pulse on violet route */}
    <motion.circle
      cx="0" cy="0" r="5"
      fill="#b787f5"
    >
      <animateMotion
        dur="3s"
        repeatCount="indefinite"
        path="M 50 280 L 50 220 Q 50 60 130 60 L 350 60 L 350 40"
        begin="2.8s"
      />
    </motion.circle>
  </svg>
);

export default PathFinderSection;
