import NavbarComponent from './components/NavbarComponent';
import './App.css';
import Footer from './components/FooterComponent';



// import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';



function App() {
  
  return (
    <div>
      {/* <NavbarComponent /> */}
      {/* <AuthPage /> */}
      <Home/>
      {/* <Footer /> */}
    </div>
  );
}

export default App;
