import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoursePage from './pages/CoursePage';
import CourseDetails from './components/CourseDetails';
import AssignmentPage from './pages/AssignmentPage';
import QuizPage from './pages/QuizPage';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home'; // your home page component
import NavbarComponent from './components/NavbarComponent';
import Footer from './components/FooterComponent';

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/coursepage" element={<CoursePage />} />
				<Route path="/courses/:id" element={<CourseDetails />} />
				<Route path="/quiz/:quizId" element={<QuizPage />} />
				<Route path="/assignment/:assignmentId" element={<AssignmentPage />} />
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
			</Routes>
		</BrowserRouter>
	);
}
