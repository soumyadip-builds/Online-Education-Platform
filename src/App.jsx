import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoursePage from './pages/CoursePage';
import CourseDetails from './components/CourseDetails';
import AssignmentPage from './pages/AssignmentPage';
import QuizPage from './pages/QuizPage';

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<CoursePage />} />
				<Route path="/courses/:id" element={<CourseDetails />} />
				<Route path="/quiz/:quizId" element={<QuizPage />} />
				<Route path="/assignment/:assignmentId" element={<AssignmentPage />} />
			</Routes>
		</BrowserRouter>
	);
}
