import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AuthStep =
  | "choose"
  | "phone-signup"
  | "phone-login"
  | "otp-verify"
  | "forgot"
  | "reset-otp"
  | "new-password"
  | "success";

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+880")) return cleaned;
  if (cleaned.startsWith("880")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+880" + cleaned.slice(1);
  return "+880" + cleaned;
}

const AuthModal = () => {
  const { isAuthModalOpen, setAuthModalOpen, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<AuthStep>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const reset = useCallback(() => {
    setStep("choose");
    setLoading(false);
    setError("");
    setSuccessMsg("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPassword(false);
    setResendTimer(0);
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen) reset();
  }, [isAuthModalOpen, reset]);

  const close = () => setAuthModalOpen(false);

  // ─── SIGNUP ───
  const handleSignup = async () => {
    if (!fullName.trim()) { setError("Please enter your name"); return; }
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { data, error: signupError } = await supabase.auth.signUp({
        phone: normalized,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      // If user is null, phone already registered
      if (!data.user) {
        setError("An account already exists with this number. Please login.");
        return;
      }

      setStep("otp-verify");
      setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      setSuccessMsg("Account created! 🎉");
      setStep("success");

      // Track lead event (signup completion)
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "lead",
        method: "phone_signup",
        phone: normalizePhone(phone),
      });

      setTimeout(close, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.resend({
        type: "sms",
        phone: normalized,
      });
      if (error) setError(error.message);
      else setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── LOGIN ───
  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) { setError("Please enter phone and password"); return; }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        phone: normalized,
        password,
      });

      if (loginError) {
        if (loginError.message.includes("not confirmed")) {
          setError("Phone number not verified. Please complete signup first.");
        } else if (loginError.message.includes("Invalid login")) {
          // Check if this phone number has an account
          const phoneWithout = normalized.replace("+", "");
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("phone", phoneWithout)
            .maybeSingle();

          if (!profileData) {
            setError("No account found with this number. Please sign up.");
          } else {
            setError("Incorrect password. Please try again.");
          }
        } else {
          setError(loginError.message);
        }
        return;
      }

      setSuccessMsg("Login successful! 🎉");
      setStep("success");
      setTimeout(close, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD ───
  const handleForgotSendOtp = async () => {
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: false },
      });

      if (error) {
        if (error.message.includes("Signups not allowed")) {
          setError("No account found with this phone number");
        } else {
          setError(error.message);
        }
        return;
      }

      setStep("reset-otp");
      setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      // Now user has a session, can set new password
      setStep("new-password");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmNewPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
        return;
      }

      setSuccessMsg("Password reset successful! 🎉");
      setStep("success");
      setTimeout(close, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      const normalized = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: false },
      });
      if (error) setError(error.message);
      else setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    close();
    signInWithGoogle();
  };

  if (!isAuthModalOpen) return null;

  const canGoBack = step !== "choose" && step !== "success";

  const goBack = () => {
    setError("");
    setOtp("");
    if (step === "otp-verify") setStep("phone-signup");
    else if (step === "reset-otp") setStep("forgot");
    else if (step === "new-password") setStep("reset-otp");
    else if (step === "forgot") setStep("phone-login");
    else setStep("choose");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-elevated overflow-hidden"
        >
          {/* Header */}
          <div className="relative flex items-center justify-between px-6 pt-6 pb-2">
            {canGoBack ? (
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                <ArrowLeft size={18} className="text-muted-foreground" />
              </button>
            ) : <div />}
            <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {/* CHOOSE */}
              {step === "choose" && (
                <StepWrapper key="choose">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">Welcome! 👋</h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">Sign up or log in to continue</p>

                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-medium text-foreground transition-colors mb-3">
                    <GoogleIcon /> Continue with Google
                  </motion.button>

                  <Divider />

                  <motion.button onClick={() => setStep("phone-login")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl gradient-brand text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity mb-3">
                    <Phone size={18} /> Login with Phone
                  </motion.button>

                  <div className="mt-4 pt-4 border-t border-border/50 text-center">
                    <p className="text-sm text-muted-foreground mb-2.5">New here? Join us in seconds ✨</p>
                    <motion.button onClick={() => setStep("phone-signup")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full h-11 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold transition-all duration-200 hover:border-primary/40">
                      Create an Account
                    </motion.button>
                  </div>
                </StepWrapper>
              )}

              {/* PHONE SIGNUP */}
              {step === "phone-signup" && (
                <StepWrapper key="signup">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">Sign Up</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">Create an account with your phone number</p>
                  <div className="space-y-3">
                    <InputField label="Your Name" value={fullName} onChange={setFullName} placeholder="Full name" index={0} />
                    <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="01XXXXXXXXX" type="tel" index={1} />
                    <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} index={2} />
                    <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} index={3} />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleSignup}>Continue</SubmitBtn>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Already have an account?{" "}
                    <button onClick={() => { setStep("phone-login"); setError(""); }} className="text-primary font-medium hover:underline">Login</button>
                  </p>
                </StepWrapper>
              )}

              {/* PHONE LOGIN */}
              {step === "phone-login" && (
                <StepWrapper key="login">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">Login</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">Enter your phone number and password</p>
                  <div className="space-y-3">
                    <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="01XXXXXXXXX" type="tel" index={0} />
                    <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} index={1} />
                  </div>
                  <div className="flex justify-end mt-1">
                    <button onClick={() => { setStep("forgot"); setError(""); }} className="text-xs text-primary hover:underline font-medium">Forgot password?</button>
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleLogin}>Login</SubmitBtn>
                  <Divider />
                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-card hover:bg-muted/40 text-sm font-medium text-foreground transition-colors">
                    <GoogleIcon /> Login with Google
                  </motion.button>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Don't have an account?{" "}
                    <button onClick={() => { setStep("phone-signup"); setError(""); }} className="text-primary font-medium hover:underline">Sign Up</button>
                  </p>
                </StepWrapper>
              )}

              {/* OTP VERIFY (signup) */}
              {step === "otp-verify" && (
                <StepWrapper key="otp-verify">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">OTP Verification</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">
                    Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>
                  </p>
                  <OtpInput value={otp} onChange={setOtp} />
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleVerifySignupOtp} disabled={otp.length !== 6}>Verify</SubmitBtn>
                  <ResendButton timer={resendTimer} loading={loading} onResend={handleResendSignupOtp} />
                </StepWrapper>
              )}

              {/* FORGOT PASSWORD */}
              {step === "forgot" && (
                <StepWrapper key="forgot">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">Reset Password</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">We'll send an OTP to your phone number</p>
                  <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="01XXXXXXXXX" type="tel" />
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleForgotSendOtp}>Send OTP</SubmitBtn>
                </StepWrapper>
              )}

              {/* RESET OTP */}
              {step === "reset-otp" && (
                <StepWrapper key="reset-otp">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">OTP Verification</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">
                    Enter the code sent to <span className="font-medium text-foreground">{phone}</span>
                  </p>
                  <OtpInput value={otp} onChange={setOtp} />
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleVerifyResetOtp} disabled={otp.length !== 6}>Verify</SubmitBtn>
                  <ResendButton timer={resendTimer} loading={loading} onResend={handleResendResetOtp} />
                </StepWrapper>
              )}

              {/* NEW PASSWORD */}
              {step === "new-password" && (
                <StepWrapper key="new-password">
                  <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">New Password</h2>
                  <p className="text-sm text-muted-foreground text-center mb-5">Set your new password</p>
                  <div className="space-y-3">
                    <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} index={0} />
                    <PasswordField label="Confirm New Password" value={confirmNewPassword} onChange={setConfirmNewPassword} show={showPassword} toggle={() => setShowPassword(!showPassword)} index={1} />
                  </div>
                  {error && <ErrorMsg msg={error} />}
                  <SubmitBtn loading={loading} onClick={handleResetPassword}>Set Password</SubmitBtn>
                </StepWrapper>
              )}

              {/* SUCCESS */}
              {step === "success" && (
                <StepWrapper key="success">
                  <div className="flex flex-col items-center py-6 relative">
                    {/* Ripple rings */}
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20"
                        initial={{ width: 40, height: 40, opacity: 0.6 }}
                        animate={{ width: 120 + i * 40, height: 120 + i * 40, opacity: 0 }}
                        transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity, repeatDelay: 1 }}
                      />
                    ))}
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, mass: 0.8 }}
                    >
                      <CheckCircle2 size={56} className="text-primary mb-4" />
                    </motion.div>
                    <motion.p
                      className="text-lg font-display font-semibold text-foreground"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {successMsg}
                    </motion.p>
                  </div>
                </StepWrapper>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Sub-components ───

const StepWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.97 }}
    transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
  >
    {children}
  </motion.div>
);

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 26, delay: i * 0.07 },
  }),
};

const InputField = ({ label, value, onChange, placeholder, type = "text", index = 0 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; index?: number;
}) => (
  <motion.div custom={index} variants={fieldVariants} initial="hidden" animate="visible">
    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-11 px-4 rounded-xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)] transition-all duration-200 font-body" />
  </motion.div>
);

const PasswordField = ({ label, value, onChange, show, toggle, index = 0 }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void; index?: number;
}) => (
  <motion.div custom={index} variants={fieldVariants} initial="hidden" animate="visible">
    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••"
        className="w-full h-11 px-4 pr-10 rounded-xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)] transition-all duration-200 font-body" />
      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </motion.div>
);

const OtpInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const handleChange = (idx: number, char: string) => {
    if (char.length > 1) char = char.slice(-1);
    if (char && !/\d/.test(char)) return;
    const arr = value.padEnd(6, " ").split("");
    arr[idx] = char || " ";
    const newVal = arr.join("").trimEnd();
    onChange(newVal);
    if (char && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
  };
  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.input
          key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ""} onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)} onPaste={i === 0 ? handlePaste : undefined}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{
            opacity: 1,
            scale: value[i] ? 1.05 : 1,
            y: 0,
            borderColor: value[i] ? "hsl(var(--primary))" : undefined,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.05 }}
          className="w-11 h-13 text-center text-lg font-bold rounded-xl bg-muted/40 border-2 border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-shadow duration-200 focus:shadow-[0_0_14px_hsl(var(--primary)/0.2)] font-body"
        />
      ))}
    </div>
  );
};

const SubmitBtn = ({ loading, onClick, disabled, children }: {
  loading: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) => (
  <motion.button
    onClick={onClick} disabled={loading || disabled}
    className="w-full h-12 rounded-xl gradient-brand text-primary-foreground text-sm font-medium mt-4 flex items-center justify-center gap-2 disabled:opacity-50 overflow-hidden relative"
    whileHover={{ scale: 1.02, boxShadow: "0 6px 20px hsl(var(--primary) / 0.3)" }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 500, damping: 28 }}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
      initial={{ x: "-100%" }}
      whileHover={{ x: "100%" }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    />
  </motion.button>
);

const Divider = () => (
  <div className="flex items-center gap-3 my-4 overflow-hidden">
    <motion.div
      className="flex-1 h-px bg-border"
      initial={{ scaleX: 0, originX: 1 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    />
    <motion.span
      className="text-xs text-muted-foreground"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25 }}
    >
      or
    </motion.span>
    <motion.div
      className="flex-1 h-px bg-border"
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    />
  </div>
);

const ResendButton = ({ timer, loading, onResend }: { timer: number; loading: boolean; onResend: () => void }) => (
  <motion.p
    className="text-center text-sm text-muted-foreground mt-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3 }}
  >
    Didn't receive OTP?{" "}
    {timer > 0 ? (
      <span className="text-foreground/60 inline-flex items-center gap-1.5">
        <motion.span
          className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        Resend in {timer}s
      </span>
    ) : (
      <motion.button
        onClick={onResend} disabled={loading}
        className="text-primary font-medium hover:underline disabled:opacity-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Resend
      </motion.button>
    )}
  </motion.p>
);

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

const ErrorMsg = ({ msg }: { msg: string }) => (
  <motion.p
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    variants={shakeVariants}
    whileInView="shake"
    className="text-sm text-destructive mt-3 text-center font-body"
  >
    {msg}
  </motion.p>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default AuthModal;
