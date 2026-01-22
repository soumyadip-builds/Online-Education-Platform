
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import { getCurrentUser } from "./utils/session";

// --- Helpers ---------------------------------------------------------------
function roleHomePath(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
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

  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  const allowed = roles.includes(role);
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
  return (
    <div className="container py-5">
      <h2 className="mb-2">Not authorized</h2>
      <p className="text-muted">You don’t have permission to view this page.</p>
      <a href="/">Go to Home</a>
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
          <Route path="/assignment/:assignmentId" element={<AssignmentPage />} />
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
