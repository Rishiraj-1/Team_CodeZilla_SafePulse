import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SectionBase = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    return (
        <section className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden px-6 py-20 ${className}`}>
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
                {children}
            </div>
        </section>
    )
}

const TextContent = ({ headline, text, step }: { headline: string; text: string; step: string }) => (
    <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false, amount: 0.5 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
    >
        <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "#b787f5", letterSpacing: "0.2em" }}>{step}</p>
        <h2 className="font-black leading-tight mb-6" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em" }}>{headline}</h2>
        <p className="text-lg font-light leading-relaxed" style={{ color: "rgba(245,245,245,0.45)" }}>{text}</p>
    </motion.div>
)

const Section1Report = () => (
    <SectionBase>
        <TextContent
            step="01 // Report"
            headline="Every Signal Matters."
            text="SafePulse collects safety signals from citizens via web, Telegram, and AI voice calls."
        />
        <motion.div
            className="relative h-96 flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
        >
            <div className="absolute inset-0 border border-white/5 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02), transparent)" }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>

            <motion.div
                className="absolute top-1/4 left-1/4 glass-violet p-3 rounded-xl flex items-center justify-center border border-[#b787f5]/20 bg-[#b787f5]/10 backdrop-blur-md"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <span className="text-xs text-[#b787f5]">Voice AI</span>
            </motion.div>
            <motion.div
                className="absolute bottom-1/4 right-1/4 glass-violet p-3 rounded-xl flex items-center justify-center border border-[#b787f5]/20 bg-[#b787f5]/10 backdrop-blur-md"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.6, delay: 0.4 }}
            >
                <span className="text-xs text-[#b787f5]">Telegram</span>
            </motion.div>

            <motion.div
                className="absolute"
                initial={{ y: -50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8, delay: 0.6 }}
            >
                <div className="w-4 h-4 rounded-full bg-[#b787f5] shadow-[0_0_20px_#b787f5]" />
                <motion.div
                    className="absolute inset-0 rounded-full border border-[#b787f5]"
                    animate={{ scale: [1, 4], opacity: [1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                />
            </motion.div>
        </motion.div>
    </SectionBase>
)

const Section2Cluster = () => (
    <SectionBase>
        <motion.div
            className="relative h-96 flex items-center justify-center order-2 lg:order-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
        >
            <div className="absolute inset-0 border border-white/5 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02), transparent)" }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>

            {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-[#ff4f4f] shadow-[0_0_15px_#ff4f4f]"
                    initial={{ x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, opacity: 0 }}
                    whileInView={{ x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40, opacity: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 1.2, delay: i * 0.1, type: "spring" }}
                />
            ))}

            <motion.div
                className="absolute w-32 h-32 rounded-full border border-[#ff4f4f]/30 bg-[#ff4f4f]/10"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 1, delay: 1 }}
            />
        </motion.div>
        <div className="order-1 lg:order-2">
            <TextContent
                step="02 // Cluster"
                headline="Patterns Reveal Risk."
                text="When multiple verified reports appear in proximity, SafePulse's Oracle engine detects a cluster."
            />
        </div>
    </SectionBase>
)

const Section3RedZone = () => (
    <SectionBase>
        <TextContent
            step="03 // Red Zone"
            headline="Risk Becomes Visible."
            text="The system dynamically marks high-risk zones only after consensus validation."
        />
        <motion.div
            className="relative h-96 flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
        >
            <div className="absolute inset-0 border border-white/5 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02), transparent)" }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>

            <motion.svg
                viewBox="0 0 200 200"
                className="absolute w-64 h-64"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 1, type: "spring" }}
            >
                <motion.polygon
                    points="100,20 180,70 150,160 50,160 20,70"
                    fill="rgba(255,79,79,0.15)"
                    stroke="#ff4f4f"
                    strokeWidth="2"
                    animate={{ strokeOpacity: [1, 0.4, 1], fillOpacity: [0.15, 0.05, 0.15] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.svg>
        </motion.div>
    </SectionBase>
)

const Section4SafeRoute = () => (
    <SectionBase>
        <motion.div
            className="relative h-96 flex items-center justify-center order-2 lg:order-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
        >
            <div className="absolute inset-0 border border-white/5 rounded-3xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02), transparent)" }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>

            <svg viewBox="0 0 200 200" className="absolute w-48 h-48 opacity-40">
                <polygon points="100,20 180,70 150,160 50,160 20,70" fill="rgba(255,79,79,0.1)" stroke="#ff4f4f" strokeWidth="1" />
            </svg>

            <svg viewBox="0 0 300 300" className="absolute w-full h-full">
                <motion.path
                    d="M 50 250 L 150 150 L 250 50"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.5 }}
                />
                <motion.path
                    d="M 50 250 Q 80 100 150 70 T 250 50"
                    fill="none"
                    stroke="#00f076"
                    strokeWidth="4"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                />

                <circle cx="50" cy="250" r="6" fill="#fff" />
                <circle cx="250" cy="50" r="6" fill="#fff" />

                <motion.circle r="5" fill="#00f076" style={{ filter: "drop-shadow(0 0 8px #00f076)" }}>
                    <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        path="M 50 250 Q 80 100 150 70 T 250 50"
                        begin="2s"
                    />
                </motion.circle>
            </svg>
        </motion.div>
        <div className="order-1 lg:order-2">
            <TextContent
                step="04 // Safe Route"
                headline="Safety Over Speed."
                text="SafePulse does not choose the shortest path. It chooses the safest available path."
            />
        </div>
    </SectionBase>
)

const Section5Guardian = () => (
    <SectionBase>
        <TextContent
            step="05 // Guardian Alert"
            headline="When Intelligence Meets Humanity."
            text="Institutional guardians receive structured alerts when urgency is high."
        />
        <motion.div
            className="relative h-96 flex items-center justify-center flex-col gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
        >
            <motion.div
                className="w-16 h-16 rounded-2xl bg-[#b787f5]/20 border border-[#b787f5]/40 flex items-center justify-center relative"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: false }}
                transition={{ type: "spring", duration: 0.8 }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#b787f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <motion.div
                    className="absolute inset-0 rounded-2xl border border-[#b787f5]"
                    animate={{ scale: [1, 2], opacity: [1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            </motion.div>

            <motion.div
                className="w-64 glass p-4 rounded-xl border border-white/10 backdrop-blur-md bg-white/5"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.8, delay: 0.4 }}
            >
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff4f4f] animate-pulse" />
                    <span className="text-xs font-bold text-white/80 uppercase">High Urgency Alert</span>
                </div>
                <div className="h-2 w-3/4 bg-white/10 rounded-full mb-2" />
                <div className="h-2 w-1/2 bg-white/10 rounded-full mb-4" />

                <motion.div
                    className="flex justify-end"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
                >
                    <div className="bg-[#00f076]/20 px-3 py-1 rounded-full border border-[#00f076]/40 flex items-center gap-1">
                        <span className="text-[#00f076] text-xs font-medium">Alert Active</span>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    </SectionBase>
)

const Section6Closing = ({ navigate }: { navigate: any }) => (
    <section className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-6 pb-20 pt-10">
        <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <div className="w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(183,135,245,0.1) 0%, transparent 60%)", filter: "blur(50px)" }} />
        </motion.div>

        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center text-center max-w-4xl"
        >
            <h2 className="font-black leading-none mb-6" style={{ fontSize: "clamp(3rem, 8vw, 6rem)", color: "#f5f5f5", letterSpacing: "-0.03em" }}>
                Safety, Before Danger<br /><span style={{ color: "#b787f5" }}>Finds You.</span>
            </h2>
            <p className="text-xl font-light mb-12" style={{ color: "rgba(245,245,245,0.5)" }}>
                SafePulse transforms scattered signals into structured protection.
            </p>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase relative overflow-hidden group"
                style={{ background: "#b787f5", color: "#050505", boxShadow: "0 0 30px rgba(183,135,245,0.4)" }}
            >
                <span className="relative z-10">Enter The System</span>
                <motion.div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
        </motion.div>
    </section>
)

const WalkthroughPage = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const navigate = useNavigate();

    return (
        <div ref={containerRef} className="bg-[#050505] text-[#f5f5f5] font-sans antialiased relative w-full overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b787f5]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00f076]/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                className="fixed top-0 left-0 h-1 bg-[#b787f5] z-50"
                style={{ scaleX: scrollYProgress, transformOrigin: "0%", boxShadow: "0 0 15px rgba(183,135,245,0.5)" }}
            />

            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 hidden md:flex">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor: useTransform(scrollYProgress,
                                [Math.max(0, (i - 0.5) / 5), i / 5, Math.min(1, (i + 0.5) / 5)],
                                ["rgba(255,255,255,0.2)", "#b787f5", "rgba(255,255,255,0.2)"]
                            )
                        }}
                    />
                ))}
            </div>

            <Section1Report />
            <Section2Cluster />
            <Section3RedZone />
            <Section4SafeRoute />
            <Section5Guardian />
            <Section6Closing navigate={navigate} />
        </div>
    );
};

export default WalkthroughPage;
