import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import AuthPage from './pages/AuthPage';
// import NavbarComponent from './components/NavbarComponent';
import Home from './pages/Home';


function App() {
  const [count, setCount] = useState(0)
  
return (
    // <BrowserRouter>
    //   <Routes>
    //     <Route path="/" element={<AuthPage />} />
    //   </Routes>
    // </BrowserRouter>
    // <AuthPage/>
    <Home />
    // <NavbarComponent/>
  );

}

export default App
