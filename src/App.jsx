import NavbarComponent from './components/NavbarComponent';
import './App.css';
import Footer from './components/FooterComponent';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';


function App() {
  
  return (
    <div>
      <NavbarComponent />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
        </Routes>
      </BrowserRouter>
      
      <Footer />
    </div>
  );
}

export default App;
