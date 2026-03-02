
// src/data/courses.js
export const COURSES = [
  {
    "id": "react-basics",
    "title": "React Basics",
    "author": "365 Careers",
    "rating": 4.6,
    "learners": 14486,
    "thumbnail": "/images/courses/react-basics.jpg",
    "level": "Beginner",
    "duration": "3h 20m",
    "tags": ["react", "javascript", "frontend"],
    "description": "Learn the fundamentals of React: components, JSX, props, and state.",
    "videos": [
      { "title": "Intro to React", "url": "https://www.youtube.com/watch?v=dGcsHMXbSOA" },
      { "title": "JSX & Components", "url": "https://youtu.be/MhkGQAoc7bc" }
    ],
    "docs": [{ "title": "Slides", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "React Docs", "url": "https://react.dev" }],
    "isBestseller": true
  },
  {
    "id": "typescript-essentials",
    "title": "TypeScript Essentials",
    "author": "Code Academy",
    "rating": 4.7,
    "learners": 18340,
    "thumbnail": "/images/courses/typescript-essentials.jpg",
    "level": "Beginner",
    "duration": "3h",
    "tags": ["typescript", "javascript", "frontend", "backend"],
    "description": "Get started with TypeScript: types, interfaces, generics, and tooling for safer JavaScript.",
    "videos": [
      { "title": "TypeScript Crash Course", "url": "https://www.youtube.com/watch?v=BCg4U1FzODs" }
    ],
    "docs": [{ "title": "TypeScript Cheatsheet", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/" }],
    "isBestseller": true
  },
  {
    "id": "redux-toolkit",
    "title": "Redux Toolkit & Modern State Management",
    "author": "Code Academy",
    "rating": 4.5,
    "learners": 12650,
    "thumbnail": "/images/courses/redux-toolkit.jpg",
    "level": "Intermediate",
    "duration": "2h 30m",
    "tags": ["redux", "react", "state-management"],
    "description": "Learn Redux Toolkit patterns: slices, RTK Query, and best practices for scalable state management.",
    "videos": [
      { "title": "Redux Toolkit Overview", "url": "https://www.youtube.com/watch?v=9zySeP5vH9c" }
    ],
    "docs": [{ "title": "Redux Style Guide", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Redux Toolkit Docs", "url": "https://redux-toolkit.js.org/" }]
  },
  {
    "id": "express-auth",
    "title": "Express Authentication & Authorization",
    "author": "Code Academy",
    "rating": 4.4,
    "learners": 10987,
    "thumbnail": "/images/courses/express-auth.jpg",
    "level": "Intermediate",
    "duration": "2h 45m",
    "tags": ["express", "auth", "jwt", "backend"],
    "description": "Implement secure login flows with JWT, sessions, and role-based access control in Express.",
    "videos": [
      { "title": "JWT Auth with Express", "url": "https://www.youtube.com/watch?v=mbsmsi7l3r4" }
    ],
    "docs": [{ "title": "Auth Checklist", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "OWASP Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/" }]
  },
  {
    "id": "mongodb-basics",
    "title": "MongoDB Basics",
    "author": "KRISHAI Technologies",
    "rating": 4.5,
    "learners": 13452,
    "thumbnail": "/images/courses/mongodb-basics.jpg",
    "level": "Beginner",
    "duration": "2h",
    "tags": ["mongodb", "database", "backend"],
    "description": "Learn document modeling, CRUD operations, indexing, and aggregation in MongoDB.",
    "videos": [
      { "title": "MongoDB Crash Course", "url": "https://www.youtube.com/watch?v=ofme2o29ngU" }
    ],
    "docs": [{ "title": "MongoDB Notes", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "MongoDB Docs", "url": "https://www.mongodb.com/docs/" }]
  },
  {
    "id": "docker-basics",
    "title": "Docker Basics",
    "author": "KRISHAI Technologies",
    "rating": 4.5,
    "learners": 12014,
    "thumbnail": "/images/courses/docker-basics.jpg",
    "level": "Beginner",
    "duration": "2h 30m",
    "tags": ["docker", "devops", "containers"],
    "description": "Build, tag, and run containers; write efficient Dockerfiles and manage images/courses.",
    "videos": [
      { "title": "Docker Crash Course", "url": "https://www.youtube.com/watch?v=eB0nUzAI7M8" }
    ],
    "docs": [{ "title": "Docker Commands", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Docker Docs", "url": "https://docs.docker.com/" }]
  },
  {
    "id": "kubernetes-intro",
    "title": "Kubernetes Intro",
    "author": "Code Academy",
    "rating": 4.4,
    "learners": 9875,
    "thumbnail": "/images/courses/kubernetes-intro.jpg",
    "level": "Intermediate",
    "duration": "3h",
    "tags": ["kubernetes", "devops", "containers", "orchestration"],
    "description": "Core K8s concepts: pods, deployments, services, and basic YAML configuration.",
    "videos": [
      { "title": "Kubernetes Basics", "url": "https://www.youtube.com/watch?v=X48VuDVv0do" }
    ],
    "docs": [{ "title": "K8s Quickstart", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Kubernetes Docs", "url": "https://kubernetes.io/docs/home/" }]
  },
  {
    "id": "git-github-workflow",
    "title": "Git & GitHub Workflow",
    "author": "365 Careers",
    "rating": 4.6,
    "learners": 19270,
    "thumbnail": "/images/courses/git-github-workflow.jpg",
    "level": "Beginner",
    "duration": "2h",
    "tags": ["git", "github", "version-control", "workflow"],
    "description": "Branching strategies, pull requests, code reviews, and release tagging.",
    "videos": [
      { "title": "Git & GitHub Tutorial", "url": "https://www.youtube.com/watch?v=RGOj5yH7evk" }
    ],
    "docs": [{ "title": "Git Commands", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Pro Git Book", "url": "https://git-scm.com/book/en/v2" }],
    "isBestseller": true
  },
  {
    "id": "jest-testing",
    "title": "Testing React & Node with Jest",
    "author": "Code Academy",
    "rating": 4.5,
    "learners": 11204,
    "thumbnail": "/images/courses/jest-testing.jpg",
    "level": "Intermediate",
    "duration": "2h 15m",
    "tags": ["testing", "jest", "react", "node"],
    "description": "Write unit and integration tests with Jest, React Testing Library, and supertest.",
    "videos": [
      { "title": "Jest Crash Course", "url": "https://www.youtube.com/watch?v=7r4xVDI2vho" }
    ],
    "docs": [{ "title": "Testing Checklist", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Jest Docs", "url": "https://jestjs.io/docs/getting-started" }]
  },
  {
    "id": "prisma-orm",
    "title": "Prisma ORM with Node.js",
    "author": "KRISHAI Technologies",
    "rating": 4.4,
    "learners": 8742,
    "thumbnail": "/images/courses/prisma-orm.jpg",
    "level": "Intermediate",
    "duration": "2h",
    "tags": ["prisma", "node", "orm", "database"],
    "description": "Model data with Prisma, run migrations, and build type-safe queries in Node.js.",
    "videos": [
      { "title": "Prisma Crash Course", "url": "https://www.youtube.com/watch?v=RebA5J-rlwg" }
    ],
    "docs": [{ "title": "Prisma Notes", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Prisma Docs", "url": "https://www.prisma.io/docs" }]
  },
  {
    "id": "graphql-basics",
    "title": "GraphQL Basics",
    "author": "Code Academy",
    "rating": 4.3,
    "learners": 7654,
    "thumbnail": "/images/courses/graphql-basics.jpg",
    "level": "Beginner",
    "duration": "2h",
    "tags": ["graphql", "api", "frontend", "backend"],
    "description": "Define schemas, write resolvers, and query GraphQL from clients with best practices.",
    "videos": [
      { "title": "GraphQL Crash Course", "url": "https://www.youtube.com/watch?v=ed8SzALpx1Q" }
    ],
    "docs": [{ "title": "GraphQL Notes", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "GraphQL Docs", "url": "https://graphql.org/learn/" }]
  },
  {
    "id": "react-native-intro",
    "title": "React Native Intro",
    "author": "KRISHAI Technologies",
    "rating": 4.4,
    "learners": 8421,
    "thumbnail": "/images/courses/react-native-intro.jpg",
    "level": "Beginner",
    "duration": "2h 10m",
    "tags": ["react-native", "mobile", "frontend"],
    "description": "Build native mobile apps with React Native: components, navigation, and APIs.",
    "videos": [
      { "title": "React Native Tutorial", "url": "https://www.youtube.com/watch?v=0-S5a0eXPoc" }
    ],
    "docs": [{ "title": "RN Quickstart", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "React Native Docs", "url": "https://reactnative.dev/docs/getting-started" }]
  },
  {
    "id": "python-automation",
    "title": "Python Automation Basics",
    "author": "365 Careers",
    "rating": 4.6,
    "learners": 21034,
    "thumbnail": "/images/courses/python-automation.jpg",
    "level": "Beginner",
    "duration": "3h",
    "tags": ["python", "automation", "backend"],
    "description": "Automate tasks with Python: files, APIs, schedulers, and simple web scraping.",
    "videos": [
      { "title": "Python Automation", "url": "https://www.youtube.com/watch?v=PXMJ6FS7llk" }
    ],
    "docs": [{ "title": "Python Cheatsheet", "url": "/docs/dummy.pdf" }],
    "links": [{ "label": "Python Docs", "url": "https://docs.python.org/3/" }],
    "isBestseller": true
  }
];
