import { motion } from "framer-motion";

const CityGridSVG = () => (
  <motion.svg
    width="900"
    height="600"
    viewBox="0 0 900 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, delay: 0.5 }}
  >
    {/* Grid lines - horizontal */}
    {[0, 1, 2, 3, 4, 5].map(i => (
      <motion.line
        key={`h${i}`}
        x1="50" y1={100 + i * 80} x2="850" y2={100 + i * 80}
        stroke="#b787f5" strokeWidth="0.4" strokeOpacity="0.3"
        strokeDasharray="4 8"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 2, delay: i * 0.15 + 0.5 }}
      />
    ))}
    {/* Grid lines - vertical */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
      <motion.line
        key={`v${i}`}
        x1={50 + i * 115} y1="80" x2={50 + i * 115} y2="520"
        stroke="#b787f5" strokeWidth="0.4" strokeOpacity="0.25"
        strokeDasharray="4 8"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.25 }}
        transition={{ duration: 2, delay: i * 0.1 + 0.8 }}
      />
    ))}
    {/* Building silhouettes */}
    {[
      { x: 80, y: 200, w: 60, h: 300 },
      { x: 160, y: 260, w: 40, h: 240 },
      { x: 220, y: 180, w: 70, h: 320 },
      { x: 310, y: 300, w: 50, h: 200 },
      { x: 380, y: 140, w: 80, h: 360 },
      { x: 480, y: 220, w: 60, h: 280 },
      { x: 560, y: 280, w: 45, h: 220 },
      { x: 625, y: 160, w: 75, h: 340 },
      { x: 720, y: 240, w: 55, h: 260 },
      { x: 790, y: 300, w: 60, h: 200 },
    ].map((b, i) => (
      <motion.rect
        key={i}
        x={b.x} y={b.y} width={b.w} height={b.h}
        fill="none" stroke="#b787f5" strokeWidth="0.5" strokeOpacity="0.2"
        initial={{ scaleY: 0, originY: 1, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 0.2 }}
        style={{ transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h}px` }}
        transition={{ duration: 1.5, delay: i * 0.1 + 1 }}
      />
    ))}
    {/* Pulse dot */}
    <motion.circle
      cx="450" cy="300" r="4"
      fill="#b787f5" fillOpacity="0.9"
      animate={{ r: [4, 12, 4], fillOpacity: [0.9, 0, 0.9] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
    />
    <motion.circle
      cx="450" cy="300" r="4"
      fill="#b787f5" fillOpacity="0.5"
      animate={{ r: [4, 20, 4], fillOpacity: [0.5, 0, 0.5] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
    />
  </motion.svg>
);

export default CityGridSVG;
