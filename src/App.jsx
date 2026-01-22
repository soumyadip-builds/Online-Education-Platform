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
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            <div>
              <NavbarComponent />
              <AuthPage />
              <Footer />
            </div>
          }
        />
        <Route path="/home" element={<Home />} />
        <Route
          path="*"
          element={
            <div>
              <NavbarComponent />
              <AuthPage />
              <Footer />
            </div>
          }
        />
        
        <Route
          path="/mentorhome"
          element={<MentorHome authorName={'Code Academy'} />}
        />
        {/* <Home />  */}
        {/* <Footer /> */}
        <Route path="/coursepage" element={<CoursePage />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/quiz/:quizId" element={<QuizPage />} />
        <Route path="/assignment/:assignmentId" element={<AssignmentPage />} />
        <Route path="/course-creator" element={<CourseCreator />} />
      </Routes>
    </BrowserRouter>
  );
}
