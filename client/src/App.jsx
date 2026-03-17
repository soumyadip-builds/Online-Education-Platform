// src/App.jsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMemo, useEffect } from "react";
import CoursePage from "./pages/CoursePage";
import CourseDetails from "./components/CourseDetails";
import AssignmentPage from "./pages/AssignmentPage";
import QuizPage from "./pages/QuizPage";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import NavbarComponent from "./components/NavbarComponent";
import Footer from "./components/FooterComponent";
import ForumPage from "./pages/ForumPage";
import EditProfile from "./components/EditProfile";
import InstructorHome from "./pages/InstructorHomePage";
import CourseCreator from "./components/CourseCreator";
import InstructorDashboard from "./pages/InstructorDashboard";
import StudentDashboard from "./pages/StudentMetrics";
import { Toaster, toast } from "react-hot-toast";

// --- local auth helpers (see section 0) ---
import {
  getAuthUser,
  isAuthed,
  clearLocalSession,
} from "./lib/authLocal"; // or paste helpers here

// Helpers ----------------------------------------------------------------
function roleHomePath(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
  if (roles.includes("instructor") || user?.role === "instructor") return "/instructor-home";
  if (roles.includes("learner") || user?.role === "learner") return "/student-home";
  return "/not-authorized";
}
// allows to access the current location object
function RequireRole({ role, children }) {
  const location = useLocation();
  const user = isAuthed() ? getAuthUser() : null;
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

// If a logged-in user visits /auth, send them to role home
function AuthOrRedirect() {
  const user = isAuthed() ? getAuthUser() : null;
  return user ? <Navigate to={roleHomePath(user)} replace /> : <AuthPage />;
}

// Root route: show Home or role home
function RootOrRoleHome() {
  const user = isAuthed() ? getAuthUser() : null;
  return user ? <Navigate to={roleHomePath(user)} replace /> : <Home />;
}

// Simple Not Authorized
function NotAuthorized() {
  const navigate = useNavigate();
  const role = useMemo(() => {
    const u = isAuthed() ? getAuthUser() : null;
    const r = (u?.role ?? "").toLowerCase();
    if (["learner", "student"].includes(r)) return "learner";
    if (["instructor", "mentor", "teacher"].includes(r)) return "instructor";
    return null;
  }, []);
  const handleGoHome = (e) => {
    e.preventDefault();
    if (role === "learner") navigate("/student-home", { replace: true });
    else if (role === "instructor") navigate("/instructor-home", { replace: true });
    else navigate("/", { replace: true });
  };
  return (
    <div className="container py-5">
      <h2 className="mb-2">Not authorized</h2>
      <p className="text-muted">You don’t have permission to view this page.</p>
      <a href="#" onClick={handleGoHome} className="btn btn-primary">
        Go to Home
      </a>
    </div>
  );
}

// /logout route component (clears localStorage keys)
function Logout() {
  const navigate = useNavigate();
  useEffect(() => {
    clearLocalSession();
    // toast.success("You’ve been logged out.");
    navigate("/auth", { replace: true });
  }, [navigate]);
  return null;
}

// Shell with global Toaster
function AppShell({ children }) {

  const location = useLocation();
  const isQuizPage = location.pathname.startsWith("/quiz");
  
  return (
    <>
      <Toaster position="top-right" />
      {!isQuizPage && <NavbarComponent />}
      {children}
      {!isQuizPage && <Footer />}
    </>
  );
}

export default function App() {
  const StudentHome = Home; // swap if you have a dedicated student home

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Public or smart root */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthOrRedirect />} />
          <Route path="/logout" element={<Logout />} />

          {/* Public routes */}
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/coursepage" element={<CoursePage />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          <Route path="/quiz/:quizId" element={<QuizPage />} />
          <Route path="/assignment/:assignmentId" element={<AssignmentPage />} />
          <Route path="/course-creator" element={<CourseCreator />} />
          <Route path="/edit-profile" element={<EditProfile />} />

          {/* Role-guarded */}
          <Route
            path="/performance-instructor"
            element={
              <RequireRole role="instructor">
                <InstructorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/performance-student"
            element={
              <RequireRole role="learner">
                <StudentDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/student-home"
            element={
              <RequireRole role="learner">
                <Home />
              </RequireRole>
            }
          />
          <Route
            path="/instructor-home"
            element={
              <RequireRole role="instructor">
                <InstructorHome />
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