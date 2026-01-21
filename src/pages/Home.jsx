
// src/pages/Home.jsx
import React, { useMemo, useRef, useState } from "react";
import { COURSES } from "../data/courses";
import CourseCard from "../components/CourseCard";
import "../styles/home.css";

// Home.jsx (top of file)
import GenAI from "/images/GenAI.png";
import ITCert from "/images/IT_Certifications.png";
import DataScience from "/images/Data_Science.png";
import ChatGPT from "/images/ChatGPT.png";
import PromptEng from "/images/Promp_Eng.png";
import MachineLearning from "/images/Machine_Learning.png";
import AiAgents from "/images/AI-Agents.png"; // note: matches your filename
// (If you later add "AI-Agents" or "Machine_Learning", import them similarly.)

import HeroSlide_1 from "/images/HeroSlide_1.png";
import HeroSlide_2 from "/images/HeroSlide_2.png";
import HeroSlide_3 from "/images/HeroSlide_3.png";

// Importing the Trusted Company Logos
import Cog from "/images/Logos/Cognizant.png";
import Cisco from "/images/Logos/Cisco.png";
import Citi from "/images/Logos/Citi.png";
import Ericsson from "/images/Logos/Ericsson.png";
import HP from "/images/Logos/HP.png";
import Samsung from "/images/Logos/Samsung.png";

// Importing certifications
import Aws from "/images/certifications/AWS.png";
import CompTia from "/images/certifications/CompTIA.png";
import Pmi from "/images/certifications/PMI.png";

// Import Accelerators
import Acc1 from "/images/accelerators/Acc1.png";
import Acc2 from "/images/accelerators/Acc3.png";
import Acc3 from "/images/accelerators/Acc4.png";
import NavbarComponent from "../components/NavbarComponent";
import Footer from "../components/FooterComponent";


const heroSlides = [
  {
    title: "Move forward on your goals",
    desc: "Close your skill gaps with courses that make the biggest impact.",
    cta: "Explore top picks",
    img: HeroSlide_1
  },
  {
    title: "Learn essential career and life skills",
    desc: "Build in‑demand skills fast and advance your career in a changing job market.",
    cta: "Browse essential skills",
    img: HeroSlide_2
  },
  {
    title: "Skills to transform your career",
    desc: "From AI to DevOps—discover learning paths hand‑curated for you.",
    cta: "See learning paths",
    img: HeroSlide_3
  }
];


const categories = [
  { key: "genai",    title: "Generative AI",     img: GenAI },
  { key: "it-cert",  title: "IT Certifications", img: ITCert },
  { key: "data",     title: "Data Science",      img: DataScience },
  { key: "chatgpt",  title: "ChatGPT",           img: ChatGPT },
  { key: "prompt",   title: "Prompt Engineering",img: PromptEng },
  { key: "ml",   title: "Machine Learning",img: MachineLearning },
  { key: "aiagents",   title: "AI Agents",img: AiAgents },
];


const logos = [
  { key: "samsung",  alt: "Samsung",                      src: Samsung },
  { key: "cisco",    alt: "Cisco",                        src: Cisco },
  { key: "hpe",      alt: "Hewlett Packard Enterprise",   src: HP },
  { key: "citi",     alt: "Citi",                         src: Citi },
  { key: "ericsson", alt: "Ericsson",                     src: Ericsson },
  { key: "cognizant", alt: "Cognizant",                     src: Cog }
];

const certifications = [
    {key: "compTia", title: "CompTIA", src: CompTia},
    {key: "aws", title: "AWS", src: Aws},
    {key: "pmi", title: "PMI", src: Pmi}
]



const tabs = [
  { key: "all", label: "All" },
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend & APIs" },
  { key: "devops", label: "DevOps" },
  { key: "testing", label: "Testing" },
  { key: "mobile", label: "Mobile" },
  { key: "database", label: "Database" },
  { key: "bestseller", label: "Bestsellers" }
];

const testimonials = [
    {key: 1, testimony: "EdStream helped me focus on practical skills and confidence. The projects and pacing made all the difference."},
    {key: 2, testimony: "EdStream was truly a game-changer and a great guide for me as we brought Dimensional to life."},
    {key: 3, testimony: "EdStream gives you the ability to be persistent. I learned exactly what I needed to know in the real world. It helped me sell myself to get a new role."},
    {key: 4, testimony: "EdStream gives us confidence that we’re providing our students high-quality education that furthers their career opportunities."}
];

export default function Home() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [catIndex, setCatIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  const catRef = useRef(null);
  const courseRowRef = useRef(null);

  // Placeholder space for Navbar. Plug in your <Navbar/> later.
  // <Navbar />
  // You can also adjust the .nav-spacer height in CSS.
  
  const filteredCourses = useMemo(() => {
    switch (activeTab) {
      case "frontend":
        return COURSES.filter(c => c.tags.includes("react") || c.tags.includes("frontend") || c.tags.includes("typescript"));
      case "backend":
        return COURSES.filter(c => c.tags.includes("backend") || c.tags.includes("api") || c.tags.includes("express") || c.tags.includes("node"));
      case "devops":
        return COURSES.filter(c => c.tags.includes("devops") || c.tags.includes("docker") || c.tags.includes("kubernetes") || c.tags.includes("containers"));
      case "testing":
        return COURSES.filter(c => c.tags.includes("testing") || c.tags.includes("jest"));
      case "mobile":
        return COURSES.filter(c => c.tags.includes("react-native") || c.tags.includes("mobile"));
      case "database":
        return COURSES.filter(c => c.tags.includes("database") || c.tags.includes("mongodb") || c.tags.includes("orm"));
      case "bestseller":
        return COURSES.filter(c => c.isBestseller);
      default:
        return COURSES;
    }
  }, [activeTab]);

  const nextHero = () => setHeroIndex((i) => (i + 1) % heroSlides.length);
  const prevHero = () => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);

  const scrollBy = (el, px) => el?.scrollBy({ left: px, behavior: "smooth" });

  const openCourse = (course) => {
    // Implement navigation here (e.g., useNavigate(`/course/${course.id}`))
    alert(`Open course: ${course.title}`);
  };

  return (
    <main className="home">
      <div className="nav-spacer">{/* Navbar placeholder */}
        <NavbarComponent/>
      </div>

      {/* HERO SECTION */}
      <section className="hero" aria-roledescription="carousel">
        <button className="nav-arrow left" onClick={prevHero} aria-label="Previous slide">
            
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

        </button>
        <div className="hero-track" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
          {heroSlides.map((s, i) => (
            <div className="hero-slide" key={i} aria-hidden={heroIndex !== i}>
              <div className="hero-text">
                <h1 className="slideHeading">{s.title}</h1>
                <p className="slideHeading">{s.desc}</p>
                <button className="primary-btn">{s.cta}</button>
              </div>
              <div className="hero-art">
                <div className="blob"></div>
                <div className="blob small"></div>
                <img
                    src={s.img}
                    alt="Slide_1_Img"
                    className="hero-image"
                />
              </div>
            </div>
          ))}
        </div>
        <button className="nav-arrow right" onClick={nextHero} aria-label="Next slide">
            
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M8.5 4.5 16 12l-7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

        </button>
        <div className="dots" role="tablist" aria-label="Hero slides">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              className={`dot ${heroIndex === i ? "active" : ""}`}
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={heroIndex === i}
              onClick={() => setHeroIndex(i)}
            />
          ))}
        </div>
      </section>

      {/* CATEGORY CAROUSEL */}
      <section className="category-wrap">
        <div className="section-head">
          <h2>Learn <em>essential</em> career and life skills</h2>
          <p>Discover categories curated for rapid upskilling.</p>
        </div>
        <div className="cat-carousel" ref={catRef}>
          {categories.map((c, i) => (
            <div className="cat-card" key={c.key} style={{ 
                backgroundImage: `url(${c.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
             }}>
                
                {/* Optional readable overlay (keeps text legible on busy images) */}
                <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.35))",
                    borderRadius: "inherit",
                }}
                />

              <div className="cat-title">{c.title}</div>
              <span className="cat-chevron">→</span>
            </div>
          ))}
        </div>
        <div className="dots">
          {categories.map((_, i) => (
            <button
              key={i}
              className={`dot ${catIndex === i ? "active" : ""}`}
              onClick={() => {
                setCatIndex(i);
                const w = catRef.current?.firstChild?.getBoundingClientRect().width || 320;
                catRef.current?.scrollTo({ left: w * i, behavior: "smooth" });
              }}
              aria-label={`Category ${i + 1}`}
            />
          ))}
        </div>
        {/* <div className="cat-nav">
          <button className="secondary-btn" onClick={() => scrollBy(catRef.current, -320)}></button>
          <button className="secondary-btn" onClick={() => scrollBy(catRef.current, 320)}></button>
        </div> */}
      </section>

      {/* TABBED COURSE ROW */}
      <section className="courses">
        <div className="section-head">
          <h2>Skills to transform your career and life</h2>
          <div className="tabs" role="tablist" aria-label="Course filters">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                className={`tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="course-row">
          <button className="row-arrow left" aria-label="Scroll courses left" onClick={() => scrollBy(courseRowRef.current, -420)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
          </button>
          <div className="row-track" ref={courseRowRef}>
            {filteredCourses.map((c) => (
              <CourseCard key={c.id} course={c} onClick={openCourse} />
            ))}
          </div>
          <button className="row-arrow right" aria-label="Scroll courses right" onClick={() => scrollBy(courseRowRef.current, 420)}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M8.5 4.5 16 12l-7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
          </button>
        </div>
      </section>

        {/* TRUST STRIP */}
        <section className="trust" aria-labelledby="trust-title">
        <p id="trust-title" className="trust-heading">
            Trusted by companies and millions of learners around the world
        </p>

        <ul className="logo-row" role="list">
            {logos.map((logo) => (
            <li className="logo" key={logo.key}>
                <img
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                decoding="async"
                height="40"
                // Width is auto based on SVG viewBox; height normalizes the row
                />
            </li>
            ))}
        </ul>
        </section>


      {/* TESTIMONIALS */}
      <section className="testimonials">
        <h2>Join others transforming their lives through learning</h2>
        <div className="testimonial-row">
          {testimonials.map((i)=>(
            <blockquote className="testimonial" key={i.key}>
              <p>
                “{i.testimony}”
              </p>
              <footer>
                <span className="name">Learner {i.key}</span>
                <a href="#">#Read full story →</a>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* CERTIFICATIONS */}
      <section className="certs">
        <div className="certs-inner">
          <div className="cert-copy">
            <h2>Get certified and get ahead in your career</h2>
            <p>Prep with comprehensive courses, practice tests, and exam voucher tips.</p>
            <button className="ghost-btn">Explore certifications and vouchers</button>
          </div>
          <div className="cert-grid">
            {certifications.map((c)=>(
              <div className="cert-card" key={c.key}>
                <div className="cert-icon"><img src={c.src} className="cert-icon"></img></div>
                <div className="cert-title">{c.title}</div>
                <div className="cert-sub">Cloud • Networking • Management</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAREER ACCELERATORS */}
      <section className="accelerators">
        <h2>Ready to reimagine your career?</h2>
        <p className="sub">Get the skills and real‑world experience employers want with Career Accelerators.</p>
        <div className="accel-grid">
          {[
            { title:"Full‑Stack Web Developer", rating:4.7, hours:"88 total hours", src: Acc1 },
            { title:"Digital Marketer", rating:4.5, hours:"28.4 total hours", src: Acc2 },
            { title:"Data Scientist", rating:4.6, hours:"47.1 total hours", src: Acc3 },
          ].map((a,i)=>(
            <div className="accel-card" key={i}>
              <div className="accel-art"><img src={a.src}></img></div>
              <div className="accel-body">
                <h5>{a.title}</h5>
                <button className="primary-btn light">View program</button>
                <div className="accel-meta">
                  <span>★ {a.rating}</span>
                  <span>•</span>
                  <span>{a.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer placeholder */}
      <div className="footer-spacer">{/* <Footer/> will be mounted here */}
        <Footer/>
      </div>
    </main>
  );
}