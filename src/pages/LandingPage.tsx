import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import OracleSection from "@/components/OracleSection";
import PathFinderSection from "@/components/PathFinderSection";
import AnchorSection from "@/components/AnchorSection";
import FailsafeSection from "@/components/FailsafeSection";
import SilentWitnessSection from "@/components/SilentWitnessSection";
import VisionSection from "@/components/VisionSection";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Index = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.gender) {
        navigate("/complete-profile");
      } else {
        if (user.role === "admin") navigate("/app/admin");
        else if (user.role === "authority") navigate("/app/authority");
        else if (user.role === "guardian") navigate("/app/guardian");
        else navigate("/app/citizen");
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  return (
    <main style={{ background: "#050505" }}>
      <Navbar />
      <HeroSection />
      <OracleSection />
      <PathFinderSection />
      <AnchorSection />
      <FailsafeSection />
      <SilentWitnessSection />
      <VisionSection />
    </main>
  );
};

export default Index;
