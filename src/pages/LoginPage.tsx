import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import ParticleField from "@/components/ParticleField";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("NSS_VOLUNTEER");
  const [document, setDocument] = useState<File | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"citizen" | "guardian" | "authority">("citizen");
  const [authorityId, setAuthorityId] = useState("");
  const [authorities, setAuthorities] = useState<{ id: string, name: string, institution: string }[]>([]);

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? '';
    fetch(`${API}/users/authorities`)
      .then(res => res.json())
      .then(data => setAuthorities(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role !== "admin" && user.status === "PENDING_VERIFICATION") {
        navigate("/pending");
      } else if (user.role !== "admin" && user.status === "REJECTED") {
        navigate("/rejected");
      } else if (!user.gender) {
        navigate("/complete-profile");
      } else {
        if (user.role === "admin") navigate("/app/admin");
        else if (user.role === "authority") navigate("/app/authority");
        else if (user.role === "guardian") navigate("/app/guardian");
        else navigate("/app/citizen");
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const API = import.meta.env.VITE_API_URL ?? '';
      if (mode === "signup") {
        if (role !== "citizen" && !phone) {
          throw new Error("Mobile number is required for Guardian/Authority roles.");
        }
        if (role === "guardian" && !document) {
          throw new Error("ID Proof document is required for Guardian role.");
        }
        if (role === "guardian" && !authorityId) {
          throw new Error("Please select your local authority.");
        }

        if (role !== "citizen") {
          if (!showOtp) {
            // Trigger Twilio OTP BEFORE SUPABASE
            const res = await fetch(`${API}/api/otp/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone })
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.detail || "Failed to trigger OTP.");
            }

            setShowOtp(true);
            setSuccessMessage(`OTP sent via SMS. Please check your phone.`);
            return;
          } else {
            // Verify Twilio OTP BEFORE SUPABASE
            if (!otp) throw new Error("Please enter the OTP.");

            const verifyRes = await fetch(`${API}/api/otp/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone, otp })
            });

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json();
              throw new Error(errorData.detail || "Invalid OTP.");
            }

            // OTP Verified! Now create user in Supabase
            const { data: authData, error: signupError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: name, role: role }
              }
            });
            if (signupError) throw signupError;

            // Immediately sync to public.users before asking for email verification
            if (authData.user) {
              await fetch(`${API}/auth/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: authData.user.id,
                  email: authData.user.email || email,
                  name: name || "User",
                  role: role
                })
              }).catch(err => console.error("Sync error:", err));
            }

            if (!authData.session) {
              // Sometime supabase needs email verification first.
              setSuccessMessage("Account created successfully. Please check your email for verification.");

              // Reset form
              setEmail(""); setPassword(""); setName(""); setPhone(""); setOtp(""); setShowOtp(false);

              // Reload page after a short delay so the user can read the success message
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              return;
            }

            // Create profile
            const roleRes = await fetch(`${API}/users/request-role-upgrade`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.session.access_token}`
              },
              body: JSON.stringify({
                role,
                mobile: phone || "",
                category: role === "guardian" ? category : undefined,
                document_url: role === "guardian" ? document?.name : undefined,
                authority_id: role === "guardian" ? authorityId : undefined,
              })
            });

            if (!roleRes.ok) {
              throw new Error("Failed to submit role upgrade request. Admin review pending.");
            }

            setSuccessMessage(`Application sent successfully. System admin will review your request for the ${role} role.`);

            // Reset form
            setEmail(""); setPassword(""); setName(""); setPhone(""); setOtp(""); setShowOtp(false);

            // Reload page after a short delay so the user can read the success message
            setTimeout(() => {
              window.location.reload();
            }, 2000);

            return;
          }
        }
        if (role === "citizen") {
          const { data: authData, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                role: role
              }
            }
          });
          if (signupError) throw signupError;

          if (authData.user) {
            await fetch(`${API}/auth/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: authData.user.id,
                email: authData.user.email || email,
                name: name || "User",
                role: "citizen"
              })
            }).catch(err => console.error("Sync error:", err));
          }

          if (!authData.session) {
            setSuccessMessage("Account created. Please check your email for verification.");

            // Reset form
            setEmail(""); setPassword(""); setName(""); setPhone(""); setOtp(""); setShowOtp(false);

            // Reload page after a short delay so the user can read the success message
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
        if (signinError) throw signinError;
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none animate-ambient"
        style={{
          background:
            "radial-gradient(circle, rgba(183,135,245,0.12) 0%, rgba(183,135,245,0.04) 40%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      <ParticleField />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-20"
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all group-hover:scale-105"
            style={{
              background: "rgba(183,135,245,0.15)",
              border: "1px solid rgba(183,135,245,0.3)",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "#b787f5", boxShadow: "0 0 8px #b787f5" }}
            />
          </div>
          <span
            className="font-bold text-sm tracking-wide"
            style={{ color: "#f5f5f5", letterSpacing: "0.05em" }}
          >
            SafePulse
          </span>
        </Link>
        <Link
          to="/"
          className="text-xs font-medium transition-colors duration-200"
          style={{ color: "rgba(245,245,245,0.35)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#b787f5")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(245,245,245,0.35)")}
        >
          ← Back to home
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[520px] mx-4"
      >
        <div
          className="rounded-2xl p-8 md:p-10"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(183,135,245,0.12)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            boxShadow:
              "0 0 60px rgba(183,135,245,0.06), 0 40px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full"
              style={{
                background: "rgba(183,135,245,0.08)",
                border: "1px solid rgba(183,135,245,0.2)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#b787f5", boxShadow: "0 0 6px #b787f5" }}
              />
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "#b787f5", letterSpacing: "0.15em" }}
              >
                Secure Access
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-black tracking-tight mb-2"
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                color: "#f5f5f5",
                letterSpacing: "-0.03em",
              }}
            >
              {mode === "signin" ? "Welcome back." : "Join SafePulse."}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              {mode === "signin"
                ? "Sign in to your safety intelligence dashboard."
                : "Create your account and stay ahead of risk."}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex rounded-xl mb-8 p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-300"
                style={{
                  background:
                    mode === m
                      ? "rgba(183,135,245,0.15)"
                      : "transparent",
                  color:
                    mode === m ? "#b787f5" : "rgba(245,245,245,0.35)",
                  border:
                    mode === m
                      ? "1px solid rgba(183,135,245,0.25)"
                      : "1px solid transparent",
                  letterSpacing: "0.05em",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </motion.div>

          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg text-xs text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 px-4 py-2 rounded-lg text-xs text-green-400" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showOtp ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <InputField
                  label="Enter 6-Digit SMS OTP"
                  type="text"
                  value={otp}
                  onChange={setOtp}
                  placeholder="123456"
                  focused={focused}
                  onFocus={() => setFocused("otp")}
                  onBlur={() => setFocused(null)}
                  id="otp"
                />
              </motion.div>
            ) : (
              <>
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(245,245,245,0.4)", letterSpacing: "0.05em" }}>
                        I am signing up as a
                      </label>
                      <div className="flex gap-2">
                        {(["citizen", "guardian", "authority"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className="flex-1 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 capitalize"
                            style={{
                              background: role === r ? "rgba(183,135,245,0.15)" : "rgba(255,255,255,0.04)",
                              color: role === r ? "#b787f5" : "rgba(245,245,245,0.4)",
                              border: role === r ? "1px solid rgba(183,135,245,0.3)" : "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    {role !== "citizen" && (
                      <InputField
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={setName}
                        placeholder="Your name"
                        focused={focused}
                        onFocus={() => setFocused("name")}
                        onBlur={() => setFocused(null)}
                        id="name"
                      />
                    )}

                    {role !== "citizen" && (
                      <InputField
                        label="Mobile Number"
                        type="tel"
                        value={phone}
                        onChange={setPhone}
                        placeholder="+91..."
                        focused={focused}
                        onFocus={() => setFocused("phone")}
                        onBlur={() => setFocused(null)}
                        id="phone"
                      />
                    )}

                    {role === "guardian" && (
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="category"
                            className="block text-xs font-medium mb-1.5"
                            style={{
                              color: focused === "category" ? "#b787f5" : "rgba(245,245,245,0.4)",
                              transition: "color 0.2s",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Category
                          </label>
                          <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            onFocus={() => setFocused("category")}
                            onBlur={() => setFocused(null)}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 appearance-none"
                            style={{
                              background: focused === "category"
                                ? "rgba(183,135,245,0.06)"
                                : "rgba(255,255,255,0.04)",
                              border: focused === "category"
                                ? "1px solid rgba(183,135,245,0.4)"
                                : "1px solid rgba(255,255,255,0.07)",
                              color: "#f5f5f5",
                              boxShadow: focused === "category"
                                ? "0 0 20px rgba(183,135,245,0.08)"
                                : "none",
                            }}
                          >
                            <option value="NSS_VOLUNTEER" style={{ color: "black" }}>NSS Volunteer</option>
                            <option value="COLLEGE_SECURITY" style={{ color: "black" }}>College Security</option>
                            <option value="CAMPUS_WARDEN" style={{ color: "black" }}>Campus Warden</option>
                            <option value="NGO" style={{ color: "black" }}>NGO</option>
                            <option value="POLICE_COMMUNITY_OFFICER" style={{ color: "black" }}>Police Community Officer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: focused === "authorityId" ? "#b787f5" : "rgba(245,245,245,0.4)", letterSpacing: "0.05em", transition: "color 0.2s" }}>Local Authority *</label>
                          <select
                            value={authorityId}
                            onChange={e => setAuthorityId(e.target.value)}
                            onFocus={() => setFocused("authorityId")}
                            onBlur={() => setFocused(null)}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 appearance-none bg-white/5 border border-white/10 text-[#f5f5f5]"
                            style={{
                              background: focused === "authorityId" ? "rgba(183,135,245,0.06)" : "rgba(255,255,255,0.04)",
                              border: focused === "authorityId" ? "1px solid rgba(183,135,245,0.4)" : "1px solid rgba(255,255,255,0.07)"
                            }}
                          >
                            <option value="" disabled style={{ color: "black" }}>Select your region's authority</option>
                            {authorities.map(auth => (
                              <option key={auth.id} value={auth.id} style={{ color: "black" }}>
                                {auth.name} {auth.institution ? `(${auth.institution})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="document"
                            className="block text-xs font-medium mb-1.5"
                            style={{
                              color: focused === "document" ? "#b787f5" : "rgba(245,245,245,0.4)",
                              transition: "color 0.2s",
                              letterSpacing: "0.05em",
                            }}
                          >
                            ID Proof Document (Required)
                          </label>
                          <input
                            id="document"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setDocument(e.target.files[0]);
                              }
                            }}
                            onFocus={() => setFocused("document")}
                            onBlur={() => setFocused(null)}
                            className="w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[rgba(183,135,245,0.15)] file:text-[#b787f5] hover:file:bg-[rgba(183,135,245,0.25)]"
                            style={{
                              background: focused === "document" ? "rgba(183,135,245,0.06)" : "rgba(255,255,255,0.04)",
                              border: focused === "document" ? "1px solid rgba(183,135,245,0.4)" : "1px solid rgba(255,255,255,0.07)",
                              color: "rgba(245,245,245,0.7)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {!(mode === "signup" && role === "citizen") && !(mode === "signup" && role !== "citizen" && showOtp) && (
                  <>
                    <InputField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@example.com"
                      focused={focused}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      id="email"
                    />

                    <InputField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      focused={focused}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      id="password"
                    />
                  </>
                )}
              </>
            )}

            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs transition-colors duration-200"
                  style={{ color: "rgba(183,135,245,0.6)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#b787f5")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(183,135,245,0.6)")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {!(mode === "signup" && role === "citizen") && (
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide mt-2 overflow-hidden group disabled:opacity-60"
                style={{
                  background: "#b787f5",
                  color: "#080808",
                  boxShadow:
                    "0 0 30px rgba(183,135,245,0.35), 0 0 60px rgba(183,135,245,0.1)",
                  letterSpacing: "0.03em",
                }}
              >
                <span className="relative z-10">
                  {loading ? "Please wait..." : mode === "signin" ? "Sign In" : showOtp ? "Verify OTP" : "Receive OTP & Submit"}
                </span>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(135deg, #c9a0f7 0%, #b787f5 100%)",
                  }}
                />
              </motion.button>
            )}

          </form>

          {!(mode === "signup" && role !== "citizen") && (
            <>
              {mode !== "signin" && (
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-xs" style={{ color: "rgba(245,245,245,0.2)" }}>
                    or continue with
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              )}
              {mode === "signin" && (
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-xs" style={{ color: "rgba(245,245,245,0.2)" }}>
                    or continue with
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(245,245,245,0.55)",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.borderColor = "rgba(183,135,245,0.3)";
                    target.style.color = "rgba(245,245,245,0.8)";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.borderColor = "rgba(255,255,255,0.08)";
                    target.style.color = "rgba(245,245,245,0.55)";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </motion.button>
              </div>
            </>
          )}

          <p
            className="text-center text-xs mt-6"
            style={{ color: "rgba(245,245,245,0.2)" }}
          >
            By continuing, you agree to SafePulse's{" "}
            <span
              className="cursor-pointer"
              style={{ color: "rgba(183,135,245,0.5)" }}
            >
              Terms
            </span>{" "}
            &{" "}
            <span
              className="cursor-pointer"
              style={{ color: "rgba(183,135,245,0.5)" }}
            >
              Privacy
            </span>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focused: string | null;
  onFocus: () => void;
  onBlur: () => void;
  id: string;
}

const InputField = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  focused,
  onFocus,
  onBlur,
  id,
}: InputFieldProps) => {
  const isFocused = focused === id;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium mb-1.5"
        style={{
          color: isFocused ? "#b787f5" : "rgba(245,245,245,0.4)",
          transition: "color 0.2s",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          background: isFocused
            ? "rgba(183,135,245,0.06)"
            : "rgba(255,255,255,0.04)",
          border: isFocused
            ? "1px solid rgba(183,135,245,0.4)"
            : "1px solid rgba(255,255,255,0.07)",
          color: "#f5f5f5",
          boxShadow: isFocused
            ? "0 0 20px rgba(183,135,245,0.08)"
            : "none",
        }}
      />
    </div>
  );
};

export default Login;
