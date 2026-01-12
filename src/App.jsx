import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CoursePage from './pages/CoursePage';
import CourseDetails from './components/CourseDetails';

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<CoursePage />} />
				<Route path="/courses/:id" element={<CourseDetails />} />
			</Routes>
		</BrowserRouter>
	);
}
