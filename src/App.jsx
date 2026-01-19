import NavbarComponent from './components/NavbarComponent';
import './App.css';
import Footer from './components/FooterComponent';
import ForumPage from './pages/ForumPage';


// import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';



function App() {
  
  return (
    <div>
      <NavbarComponent />
      <AuthPage />
      
      <Footer />
      {/* <ForumPage /> */}
    </div>
  );
}

export default App;
