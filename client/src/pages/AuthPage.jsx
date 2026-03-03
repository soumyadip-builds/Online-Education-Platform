import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/auth.css";
import { useNavigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { Toaster, toast } from "react-hot-toast";

// --- local auth helpers (see section 0) ---
import { getAuthUser, isAuthed, createLocalSession } from "../lib/authLocal"; // or paste helpers here

const STUDENT_HOME_PATH = "/student-home";
const INSTRUCTOR_HOME_PATH = "/instructor-home";

// Resolve API base from env or fallback
const API_BASE = "http://localhost:8000/edstream";

const AuthPage = () => {
    const navigate = useNavigate();

    // Tabs
    const [activeTab, setActiveTab] = useState("login");

    // ---- LOGIN ----
    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
        remember: false,
    });
    const [loginErrors, setLoginErrors] = useState({});
    const [loginStatus, setLoginStatus] = useState(null);

    // ---- REGISTER ----
    const [registerData, setRegisterData] = useState({
        role: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        dob: "",
        gender: "",
    });
    const [registerErrors, setRegisterErrors] = useState({});
    const [registerStatus, setRegisterStatus] = useState(null);

    // If already authenticated, redirect to role home
    useEffect(() => {
        if (!isAuthed()) return;
        const u = getAuthUser();
        const role = u?.role;
        if (role === "instructor")
            navigate(INSTRUCTOR_HOME_PATH, { replace: true });
        else if (role === "learner")
            navigate(STUDENT_HOME_PATH, { replace: true });
    }, [navigate]);

    // ---- VALIDATION ----
    const isEmailValid = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
    const isStrongPassword = (password) =>
        /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(String(password ?? ""));

    const validateLogin = (data) => {
        const errs = {};
        if (!data.email.trim()) errs.email = "Email is required.";
        else if (!isEmailValid(data.email)) errs.email = "Enter a valid email.";
        if (!data.password.trim()) errs.password = "Password is required.";
        return errs;
    };

    const validateRegister = (data) => {
        const errs = {};
        if (!data.role) errs.role = "Please select a role.";
        if (!data.name.trim()) errs.name = "Name is required.";
        if (!data.email.trim()) errs.email = "Email is required.";
        else if (!isEmailValid(data.email)) errs.email = "Enter a valid email.";
        if (!data.password) errs.password = "Password is required.";
        else if (!isStrongPassword(data.password))
            errs.password =
                "Password must be at least 8 chars, include an uppercase and a number.";
        if (!data.confirmPassword)
            errs.confirmPassword = "Confirm your password.";
        else if (data.password !== data.confirmPassword)
            errs.confirmPassword = "Passwords do not match.";
        if (!data.gender) errs.gender = "Please select gender.";
        return errs;
    };

    const navigateToUserHome = (user) => {
        if (user?.role === "learner")
            navigate(STUDENT_HOME_PATH, { replace: true });
        else if (user?.role === "instructor")
            navigate(INSTRUCTOR_HOME_PATH, { replace: true });
        else navigate("/not-authorized", { replace: true });
    };

    // ---- SUBMIT: LOGIN (creates localStorage keys) ----
    const handleLoginSubmit = async (e) => {
        e.preventDefault();

        // validate first
        const errs = validateLogin(loginData);
        setLoginErrors(errs);
        setLoginStatus(null);
        if (Object.keys(errs).length) {
            setActiveTab("login");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: loginData.email,
                    password: loginData.password,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data?.ok) {
                throw new Error(data?.error || "Login failed");
            }

            // ✅ Save ONLY to localStorage (consistent key names)
            // localStorage.setItem("auth-token", data.token); // <-- hyphen
            // localStorage.setItem("auth_user", JSON.stringify(data.user)); // <-- underscore

            createLocalSession({ user: data.user, token: data.token });

            // ✅ Role-based redirect from the stored user (auth_user)
            const storedUserRaw = localStorage.getItem("auth_user");
            const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
            const role = storedUser?.role;
            toast.success("Login successful! ");

            setTimeout(() => {
                if (role === "learner") {
                    navigate("/student-home", { replace: true });
                } else if (role === "instructor") {
                    navigate("/instructor-home", { replace: true });
                } else {
                    // Unknown/unsupported role
                    navigate("/not-authorized", { replace: true });
                }
            }, 1000); // Small delay to ensure toast is visible before navigation
        } catch (err) {
            setLoginStatus({
                type: "error",
                message: err.message || "Login failed.",
            });
            setActiveTab("login");
            toast.error(err.message || "Login failed.");
        }
    };

    // ---- SUBMIT: REGISTER (NO session creation) ----
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        const errs = validateRegister(registerData);
        setRegisterErrors(errs);
        setRegisterStatus(null);
        if (Object.keys(errs).length) {
            setActiveTab("register");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: registerData.name,
                    email: registerData.email,
                    password: registerData.password,
                    role: registerData.role,
                    dob: registerData.dob || undefined,
                    gender: registerData.gender || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data?.error || "Registration failed");
            }

            // ❗ Do NOT create local session here.
            // Switch to Login, prefill email, and toast success.
            setLoginData((prev) => ({
                ...prev,
                email: registerData.email,
                password: "",
            }));
            setActiveTab("login");
            toast.success(
                "Registration successful! Please sign in to continue.",
            );
        } catch (err) {
            setRegisterStatus({
                type: "error",
                message: err.message || "Registration failed.",
            });
            setActiveTab("register");
            toast.error(err.message || "Registration failed.");
        }
    };

    return (
        <div className="auth-wrapper d-flex align-items-center justify-content-center">
            {/* 🔔 React Hot Toast Toaster */}
            <Toaster position="top-right" />

            <div className="auth-card container">
                <div className="row justify-content-center">
                    <div className="col-12 col-lg-10">
                        <div className="glass-panel p-4 p-md-5 shadow-lg">
                            {/* Toggle Header */}
                            <div className="toggle-header d-flex justify-content-center mb-4">
                                <div className="toggle-pill">
                                    <button
                                        className={`pill-btn ${activeTab === "login" ? "active" : ""}`}
                                        onClick={() => setActiveTab("login")}
                                        type="button"
                                        aria-label="Show Login"
                                    >
                                        Login
                                    </button>
                                    <button
                                        className={`pill-btn ${activeTab === "register" ? "active" : ""}`}
                                        onClick={() => setActiveTab("register")}
                                        type="button"
                                        aria-label="Show Register"
                                    >
                                        Register
                                    </button>
                                </div>
                            </div>

                            {/* Panels */}
                            <div className="position-relative overflow-hidden">
                                {/* LOGIN */}
                                <div
                                    className={`auth-panel ${activeTab === "login" ? "show" : "hide"}`}
                                >
                                    <LoginPage
                                        data={loginData}
                                        setData={setLoginData}
                                        errors={loginErrors}
                                        status={loginStatus}
                                        onSubmit={handleLoginSubmit}
                                        onSwitchToRegister={() =>
                                            setActiveTab("register")
                                        }
                                    />
                                </div>

                                {/* REGISTER */}
                                <div
                                    className={`auth-panel ${activeTab === "register" ? "show" : "hide"}`}
                                >
                                    <RegisterPage
                                        data={registerData}
                                        setData={setRegisterData}
                                        errors={registerErrors}
                                        status={registerStatus}
                                        onSubmit={handleRegisterSubmit}
                                        onSwitchToLogin={() =>
                                            setActiveTab("login")
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center small text-muted">
                    © {new Date().getFullYear()} EdStream • Learn. Teach. Grow.
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
