import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(5,5,5,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(183,135,245,0.08)" : "1px solid transparent",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(183,135,245,0.15)", border: "1px solid rgba(183,135,245,0.3)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#b787f5", boxShadow: "0 0 8px #b787f5" }} />
        </div>
        <span className="font-bold text-sm tracking-wide" style={{ color: "#f5f5f5", letterSpacing: "0.05em" }}>
          SafePulse
        </span>
      </div>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        {["The Oracle", "PathFinder", "Failsafe", "Vision"].map((item) => (
          <button
            key={item}
            className="text-xs font-medium transition-colors duration-200"
            style={{ color: "rgba(245,245,245,0.4)", letterSpacing: "0.05em" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#b787f5")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(245,245,245,0.4)")}
          >
            {item}
          </button>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/login")}
        className="glass-violet px-5 py-2 rounded-full text-xs font-medium"
        style={{ color: "#b787f5", letterSpacing: "0.05em" }}
      >
        Get Access
      </motion.button>
    </motion.nav>
  );
};

export default Navbar;
