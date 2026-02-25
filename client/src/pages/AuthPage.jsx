import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/auth.css";
import { useNavigate } from "react-router-dom";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { addUser, findUser } from "../utils/userStorage";
import { createSession, getCurrentUser } from "../utils/session";

const STUDENT_HOME_PATH = "/student-home";
const INSTRUCTOR_HOME_PATH = "/instructor-home";

const AuthPage = () => {
    const navigate = useNavigate();

    // Always start on Login
    const [activeTab, setActiveTab] = useState("login"); // 'login' | 'register'

    // ---- LOGIN STATE ----
    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
        remember: false,
    });
    const [loginErrors, setLoginErrors] = useState({});
    const [loginStatus, setLoginStatus] = useState(null); // { type: 'success'|'error', message: string }

    // ---- REGISTER STATE ----
    const [registerData, setRegisterData] = useState({
        role: "", // 'instructor' | 'learner'
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        dob: "",
        gender: "", // 'male' | 'female' | 'other'
        // instructor-only
        experience: "",
        skills: [],
        currentSkill: "",
        // learner-only
        domainInterests: [],
        currentInterest: "",
        occupation: "", // 'student' | 'working'
    });
    const [registerErrors, setRegisterErrors] = useState({});
    const [registerStatus, setRegisterStatus] = useState(null); // { type: 'success'|'error', message: string }

    // If already authenticated, redirect to role home
    useEffect(() => {
        const u = getCurrentUser();
        // If u.roles is array, use it; else if u.role exists, make it an array; else empty array
        const roles = Array.isArray(u?.roles)
            ? u.roles
            : u?.role
              ? [u.role]
              : [];
        if (roles.includes("instructor")) {
            navigate(INSTRUCTOR_HOME_PATH, { replace: true });
        } else if (roles.includes("learner")) {
            navigate(STUDENT_HOME_PATH, { replace: true });
        }
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

        // 🚫 Removed:
        // - instructor: experience/skills requirements
        // - learner: occupation/domainInterests requirements

        return errs;
    };

    // ---- NAVIGATION Helper method to navigate the User to the designated home page after user login ----
    const navigateToUserHome = (user) => {
        const roles = Array.isArray(user?.roles)
            ? user.roles
            : user?.role
              ? [user.role]
              : [];
        if (roles.includes("learner")) {
            navigate(STUDENT_HOME_PATH, { replace: true });
        } else if (roles.includes("instructor")) {
            navigate(INSTRUCTOR_HOME_PATH, { replace: true });
        } else {
            navigate("/not-authorized", { replace: true });
        }
    };

    // ---- SUBMIT: LOGIN ----
    const handleLoginSubmit = (e) => {
        e.preventDefault();
        const errs = validateLogin(loginData);
        setLoginErrors(errs);
        setLoginStatus(null);
        if (Object.keys(errs).length !== 0) {
            setActiveTab("login");
            return;
        }

        // Check user existence If it not found, switch to Register tab with prefilled email
        const user = findUser(loginData.email);
        if (!user) {
            setRegisterData((prev) => ({ ...prev, email: loginData.email }));
            setRegisterStatus({
                type: "error",
                message:
                    "No account found with this email. Please register to continue.",
            });
            setActiveTab("register");
            return;
        }

        // Check password validity for the existing user
        if (user.password !== loginData.password) {
            setLoginStatus({
                type: "error",
                message: "Invalid password. Please try again.",
            });
            setActiveTab("login");
            return;
        }

        // Create session on login, then redirect to role-based home for successful login
        const sessionRes = createSession(user);
        if (!sessionRes.ok) {
            setLoginStatus({
                type: "error",
                message: "Could not start a session. Please try again.",
            });
            setActiveTab("login");
            return;
        }

        // Navigate to user home
        navigateToUserHome(user);
    };

    // ---- SUBMIT: REGISTER ----
    const handleRegisterSubmit = (e) => {
        e.preventDefault();
        const errs = validateRegister(registerData);
        setRegisterErrors(errs);
        setRegisterStatus(null);

        if (Object.keys(errs).length !== 0) {
            setActiveTab("register");
            return;
        }

        const { ok, error, user: createdUser } = addUser(registerData);
        if (!ok) {
            // Stay on Register and show the error (e.g., duplicate email)
            setRegisterStatus({
                type: "error",
                message: error ?? "Registration failed. Try again.",
            });
            setActiveTab("register");
            return;
        }

        // ✅ Do NOT create a session here.
        // ✅ Switch to Login tab, prefill email, and show success message
        setLoginData((prev) => ({
            ...prev,
            email: createdUser.email,
            password: "", // never prefill password
        }));
        setLoginStatus({
            type: "success",
            message: "Registration successful! Please sign in to continue.",
        });
        setActiveTab("login");
    };

    return (
        <div className="auth-wrapper d-flex align-items-center justify-content-center">
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
