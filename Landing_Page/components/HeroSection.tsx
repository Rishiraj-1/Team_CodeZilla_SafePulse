import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import ParticleField from "./ParticleField";
import CityGridSVG from "./CityGridSVG";

const HeroSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* Ambient violet orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none animate-ambient"
        style={{
          background: "radial-gradient(circle, rgba(183,135,245,0.10) 0%, rgba(183,135,245,0.03) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Particles */}
      <ParticleField />

      {/* City grid SVG background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <CityGridSVG />
      </div>

      {/* Glass overlay blur at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #050505)" }}
      />

      {/* Content */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <span
            className="glass-violet inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
            style={{ color: "#b787f5", letterSpacing: "0.15em" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#b787f5", boxShadow: "0 0 8px #b787f5" }}
            />
            Predictive Safety Intelligence
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-glow-violet font-black tracking-tight leading-none mb-8"
          style={{
            fontSize: "clamp(3rem, 8vw, 7rem)",
            color: "#f5f5f5",
            letterSpacing: "-0.03em",
          }}
        >
          Safety, Before Danger
          <br />
          <span style={{ color: "#b787f5" }}>Finds You.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-xl font-light max-w-2xl leading-relaxed mb-14"
          style={{ color: "rgba(245,245,245,0.45)", letterSpacing: "0.01em" }}
        >
          SafePulse is a predictive safety intelligence system that helps you avoid risk before it happens.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="relative px-8 py-3.5 rounded-full font-medium text-sm tracking-wide overflow-hidden group"
            style={{
              background: "#b787f5",
              color: "#080808",
              boxShadow: "0 0 30px rgba(183,135,245,0.4), 0 0 60px rgba(183,135,245,0.15)",
            }}
          >
            <span className="relative z-10">See It In Action</span>
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg, #c9a0f7, #b787f5)" }}
            />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="glass px-8 py-3.5 rounded-full font-medium text-sm tracking-wide transition-all"
            style={{
              color: "rgba(245,245,245,0.7)",
              borderColor: "rgba(183,135,245,0.2)",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(183,135,245,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(183,135,245,0.2)")}
          >
            Explore The System
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "rgba(245,245,245,0.2)" }}
      >
        <span className="text-xs tracking-widest uppercase" style={{ letterSpacing: "0.2em" }}>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8"
          style={{ background: "linear-gradient(to bottom, rgba(183,135,245,0.5), transparent)" }}
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
