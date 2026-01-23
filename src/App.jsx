// src/App.jsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import React from "react";

import CoursePage from "./pages/CoursePage";
import CourseDetails from "./components/CourseDetails";
import AssignmentPage from "./pages/AssignmentPage";
import QuizPage from "./pages/QuizPage";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home"; // used as Student Home
import NavbarComponent from "./components/NavbarComponent";
import Footer from "./components/FooterComponent";
import ForumPage from "./pages/ForumPage";
import EditProfile from "./components/EditProfile";
import MentorHome from "./pages/InstructorHomePage"; // Instructor Home
import { getCurrentUser, isAuthenticated } from "./utils/session";
import { useMemo } from "react";

// --- Helpers ---------------------------------------------------------------
function roleHomePath(user) {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : [];
  if (roles.includes("instructor")) return "/mentor-home";
  if (roles.includes("learner")) return "/student-home";
  return "/not-authorized";
}

function RequireAuth({ children }) {
  const location = useLocation();
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return children;
}

function RequireRole({ role, children }) {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const roles = Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role]
      : [];
  const allowed = roles.includes(role);
  console.log(role);
  if (!allowed) {
    return <Navigate to="/not-authorized" replace />;
  }
  return children;
}

// If a logged-in user visits /auth, send them to their role home
function AuthOrRedirect() {
  const user = getCurrentUser();
  return user ? <Navigate to={roleHomePath(user)} replace /> : <AuthPage />;
}

// Optional: simple Not Authorized page
function NotAuthorized() {
  const navigate = useNavigate();

  // Derive role once from session (null-safe)
  const role = useMemo(() => {
    if (!isAuthenticated()) return null;
    const user = getCurrentUser();
    // Normalize role to handle common label variants
    const r = (user?.role || "").toLowerCase();
    if (["learner", "student"].includes(r)) return "learner";
    if (["instructor", "mentor", "teacher"].includes(r)) return "instructor";
    return null;
  }, []);

  const handleGoHome = (e) => {
    e.preventDefault();

    if (role === "learner") {
      navigate("/student-home", { replace: true });
    } else if (role === "instructor") {
      navigate("/mentor-home", { replace: true });
    } else {
      // Fallback if role is unknown or user not authed
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="container py-5">
      <h2 className="mb-2">Not authorized</h2>
      <p className="text-muted">You don’t have permission to view this page.</p>
      <a href="/" onClick={handleGoHome}>
        Go to Home
      </a>
    </div>
  );
}

// Optional shell wrapper
function AppShell({ children }) {
  return (
    <>
      {/* <NavbarComponent /> */}
      {children}
      <Footer />
    </>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoursePage from './pages/CoursePage';
import CourseDetails from './components/CourseDetails';
import AssignmentPage from './pages/AssignmentPage';
import QuizPage from './pages/QuizPage';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home'; // your home page component
import NavbarComponent from './components/NavbarComponent';
import Footer from './components/FooterComponent';
import MentorHome from './pages/InstructorHomePage';
import CourseCreator from './components/CourseCreator';
export default function App() {
  const StudentHome = Home; // replace with StudentHomePage if you add one later

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthOrRedirect />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/course/:courseId/details" element={<CourseDetails />} />
          <Route
            path="/assignment/:assignmentId"
            element={<AssignmentPage />}
          />
          <Route path="/quiz/:quizId" element={<QuizPage />} />
          <Route path="/edit-profile" element={<EditProfile />} />

          {/* Role-guarded routes */}
          <Route
            path="/student-home"
            element={
              <RequireRole role="learner">
                <StudentHome />
              </RequireRole>
            }
          />
          <Route
            path="/mentor-home"
            element={
              <RequireRole role="instructor">
                <MentorHome />
              </RequireRole>
            }
          />

          <Route path="/not-authorized" element={<NotAuthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
