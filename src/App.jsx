import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import AssignmentCard from './components/AssignmentCard'
import CourseCreator from './components/CourseCreator'
import CourseCollapsibleSection from './components/CourseCollapsibleSection'
// import CourseCollapsibleSection from './components/CourseCollapsibleSection'
function App() {
  // const [count, setCount] = useState(0)

const mockModules = [
    {
      id: "m1",
      title: "Introduction to React",
      description: "Core concepts and setup",
      items: [
        {
          id: "i1",
          type: "video",
          title: "What is React?",
          url: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
          estimatedMinutes: 10,
        },
        {
          id: "i2",
          type: "reading",
          title: "JSX Basics",
          url: "https://react.dev/learn/writing-markup-with-jsx",
          estimatedMinutes: 15,
        },
      ],
    },
    {
      id: "m2",
      title: "State & Props",
      description: "Data flow in React",
      items: [
        {
          id: "i3",
          type: "assignment",
          title: "Build a Counter App",
          estimatedMinutes: 30,
        },
        {
          id: "i4",
          type: "quiz",
          title: "State vs Props Quiz",
          estimatedMinutes: 10,
        },
      ],
    },
  ];

  return (
     <>
      {/* <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p> */}
      {/* <AssignmentCard /> */}
        <CourseCreator />

    
 {/* <div style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px" }}>
      <h2>🔥 CourseCollapsibleSection Test</h2>

      <CourseCollapsibleSection
        modules={mockModules}
        role="learner"   // ✅ change to "learner" to test student view  instructor
        defaultCollapsed={false}

        onEditModule={(id) => console.log("Edit module", id)}
        onDeleteModule={(id) => console.log("Delete module", id)}
        onEditItem={(mid, iid) => console.log("Edit item", mid, iid)}
        onDeleteItem={(mid, iid) => console.log("Delete item", mid, iid)}
      />
    </div> */}

    </>
    
  )
}

export default App
