// import NavbarComponent from './components/NavbarComponent';
// import './App.css';
// import Footer from './components/FooterComponent';



// // import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import AuthPage from './pages/AuthPage';
// import Home from './pages/Home';



// function App() {
  
//   return (
//     <div>
//       <NavbarComponent />
//       <AuthPage />
//       {/* <Home/> */}
//       <Footer />
//     </div>
//   );
// }

// export default App;


// Example in App.jsx (React Router v6)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home'; // your home page component
import NavbarComponent from './components/NavbarComponent';
import Footer from './components/FooterComponent';
import ForumPage from './pages/ForumPage';
import EditProfile from './components/EditProfile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<div>
              <NavbarComponent />
              <AuthPage />
              <Footer />
          </div>} />
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<div>
              {/* <NavbarComponent /> */}
              {/* <AuthPage />
              <Footer /> */}
              <Home />
              {/* <ForumPage/> */}
          </div>} />
        <Route path="/edit-profile" element={<div>
          <NavbarComponent/>
          <EditProfile/>
          <Footer/>
        </div>} />
      </Routes>
    </BrowserRouter>
  );
}

