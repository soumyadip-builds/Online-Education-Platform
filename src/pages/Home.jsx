// src/pages/Home.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import CourseCard from '../components/CourseCard';
import '../styles/home.css';

// Hero art
import GenAI from '/images/GenAI.png';
import ITCert from '/images/IT_Certifications.png';
import DataScience from '/images/Data_Science.png';
import ChatGPT from '/images/ChatGPT.png';
import PromptEng from '/images/Promp_Eng.png';
import MachineLearning from '/images/Machine_Learning.png';
import AiAgents from '/images/AI-Agents.png';

import HeroSlide_1 from '/images/HeroSlide_1.png';
import HeroSlide_2 from '/images/HeroSlide_2.png';
import HeroSlide_3 from '/images/HeroSlide_3.png';

// Trusted Company Logos
import Cog from '/images/Logos/Cognizant.png';
import Cisco from '/images/Logos/Cisco.png';
import Citi from '/images/Logos/Citi.png';
import Ericsson from '/images/Logos/Ericsson.png';
import HP from '/images/Logos/HP.png';
import Samsung from '/images/Logos/Samsung.png';

// Certifications
import Aws from '/images/certifications/AWS.png';
import CompTia from '/images/certifications/CompTIA.png';
import Pmi from '/images/certifications/PMI.png';

// Accelerators
import Acc1 from '/images/accelerators/Acc1.png';
import Acc2 from '/images/accelerators/Acc3.png';
import Acc3 from '/images/accelerators/Acc4.png';

import NavbarComponent from '../components/NavbarComponent';
import Footer from '../components/FooterComponent';
import { useNavigate } from 'react-router-dom';

const heroSlides = [
	{
		title: 'Move forward on your goals',
		desc: 'Close your skill gaps with courses that make the biggest impact.',
		cta: 'Explore top picks',
		img: HeroSlide_1,
	},
	{
		title: 'Learn essential career and life skills',
		desc: 'Build in‑demand skills fast and advance your career in a changing job market.',
		cta: 'Browse essential skills',
		img: HeroSlide_2,
	},
	{
		title: 'Skills to transform your career',
		desc: 'From AI to DevOps—discover learning paths hand‑curated for you.',
		cta: 'See learning paths',
		img: HeroSlide_3,
	},
];

const categories = [
	{ key: 'genai', title: 'Generative AI', img: GenAI },
	{ key: 'it-cert', title: 'IT Certifications', img: ITCert },
	{ key: 'data', title: 'Data Science', img: DataScience },
	{ key: 'chatgpt', title: 'ChatGPT', img: ChatGPT },
	{ key: 'prompt', title: 'Prompt Engineering', img: PromptEng },
	{ key: 'ml', title: 'Machine Learning', img: MachineLearning },
	{ key: 'aiagents', title: 'AI Agents', img: AiAgents },
];

const logos = [
	{ key: 'samsung', alt: 'Samsung', src: Samsung },
	{ key: 'cisco', alt: 'Cisco', src: Cisco },
	{ key: 'hpe', alt: 'Hewlett Packard Enterprise', src: HP },
	{ key: 'citi', alt: 'Citi', src: Citi },
	{ key: 'ericsson', alt: 'Ericsson', src: Ericsson },
	{ key: 'cognizant', alt: 'Cognizant', src: Cog },
];

const certifications = [
	{ key: 'compTia', title: 'CompTIA', src: CompTia },
	{ key: 'aws', title: 'AWS', src: Aws },
	{ key: 'pmi', title: 'PMI', src: Pmi },
];

const tabs = [
	{ key: 'all', label: 'All' },
	{ key: 'frontend', label: 'Frontend' },
	{ key: 'backend', label: 'Backend & APIs' },
	{ key: 'devops', label: 'DevOps' },
	{ key: 'testing', label: 'Testing' },
	{ key: 'mobile', label: 'Mobile' },
	{ key: 'database', label: 'Database' },
	{ key: 'bestseller', label: 'Bestsellers' },
];

const testimonials = [
	{
		key: 1,
		testimony:
			'EdStream helped me focus on practical skills and confidence. The projects and pacing made all the difference.',
	},
	{
		key: 2,
		testimony:
			'EdStream was truly a game-changer and a great guide for me as we brought Dimensional to life.',
	},
	{
		key: 3,
		testimony:
			'EdStream gives you the ability to be persistent. I learned exactly what I needed to know in the real world. It helped me sell myself to get a new role.',
	},
	{
		key: 4,
		testimony:
			'EdStream gives us confidence that we’re providing our students high‑quality education that furthers their career opportunities.',
	},
];

export default function Home() {
	const [heroIndex, setHeroIndex] = useState(0);
	const [catIndex, setCatIndex] = useState(0);
	const [activeTab, setActiveTab] = useState('all');

	const navigate = useNavigate();

	const catRef = useRef(null);
	const courseRowRef = useRef(null);

	const [courses, setcourses] = useState([]);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch('/data/courseDetails.json', {
					cache: 'no-store',
				});
				if (!res.ok)
					throw new Error(`Failed to load courseDetails.json (${res.status})`);
				const data = await res.json();
				const data_fetched = Array.isArray(data) ? data : [];
				setcourses(data_fetched);
			} catch (err) {
				console.log(err);
			}
		};
		load();
	}, []);

	const byAnyTag = (c, tags) => (c.tags ?? []).some((t) => tags.includes(t));

	const filteredcourses = useMemo(() => {
		switch (activeTab) {
			case 'frontend':
				return courses.filter((c) =>
					byAnyTag(c, ['react', 'frontend', 'typescript']),
				);
			case 'backend':
				return courses.filter((c) =>
					byAnyTag(c, ['backend', 'api', 'express', 'node']),
				);
			case 'devops':
				return courses.filter((c) =>
					byAnyTag(c, ['devops', 'docker', 'kubernetes', 'containers']),
				);
			case 'testing':
				return courses.filter((c) => byAnyTag(c, ['testing', 'jest']));
			case 'mobile':
				return courses.filter((c) => byAnyTag(c, ['react-native', 'mobile']));
			case 'database':
				return courses.filter((c) => byAnyTag(c, ['database', 'mongodb', 'orm']));
			case 'bestseller':
				return courses.filter((c) => c.isBestseller);
			default:
				return courses;
		}
		// IMPORTANT: Depend on both activeTab and courses so it recomputes after initial load too.
	}, [activeTab, courses]);

	const nextHero = () => setHeroIndex((i) => (i + 1) % heroSlides.length);
	const prevHero = () =>
		setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
	const scrollBy = (el, px) => el?.scrollBy({ left: px, behavior: 'smooth' });

	return (
		<main className="home">
			<div className="nav-spacer">
				<NavbarComponent />
			</div>

			{/* HERO SECTION */}
			<section className="hero" aria-roledescription="carousel">
				<button
					className="nav-arrow left"
					onClick={prevHero}
					aria-label="Previous slide"
				>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<path
							d="M15.5 4.5 8 12l7.5 7.5"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>

				<div
					className="hero-track"
					style={{ transform: `translateX(-${heroIndex * 100}%)` }}
				>
					{heroSlides.map((s, i) => (
						<div className="hero-slide" key={i} aria-hidden={heroIndex !== i}>
							<div className="hero-text">
								<h1 className="slideHeading">{s.title}</h1>
								<p className="slideHeading">{s.desc}</p>
								<button className="primary-btn">{s.cta}</button>
							</div>
							<div className="hero-art">
								<div className="blob" />
								<div className="blob small" />
								<img
									src={s.img}
									alt={`Slide_${i + 1}_Img`}
									className="hero-image"
								/>
							</div>
						</div>
					))}
				</div>

				<button
					className="nav-arrow right"
					onClick={nextHero}
					aria-label="Next slide"
				>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
						<path
							d="M8.5 4.5 16 12l-7.5 7.5"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>

				<div className="dots" role="tablist" aria-label="Hero slides">
					{heroSlides.map((_, i) => (
						<button
							key={i}
							className={`dot ${heroIndex === i ? 'active' : ''}`}
							aria-label={`Go to slide ${i + 1}`}
							aria-selected={heroIndex === i}
							onClick={() => setHeroIndex(i)}
						/>
					))}
				</div>
			</section>

			{/* COURSES / TABS */}
			<section className="courses">
				<div className="section-head">
					<h2>Skills to transform your career and life</h2>
					<div className="tabs" role="tablist" aria-label="Course filters">
						{tabs.map((t) => (
							<button
								key={t.key}
								role="tab"
								aria-selected={activeTab === t.key}
								className={`tab ${activeTab === t.key ? 'active' : ''}`}
								onClick={() => setActiveTab(t.key)}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>

				<div className="course-row">
					<button
						className="row-arrow left"
						aria-label="Scroll courses left"
						onClick={() => scrollBy(courseRowRef.current, -420)}
					>
						<svg
							viewBox="0 0 24 24"
							width="18"
							height="18"
							aria-hidden="true"
						>
							<path
								d="M15.5 4.5 8 12l7.5 7.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					<div className="row-track" ref={courseRowRef}>
						{filteredcourses.map((c) => (
							<div key={c.id} className="col-12 col-sm-6 col-lg-4">
								<div className="card h-100 shadow-sm border-0">
									<CourseCard course={c} />
								</div>
								{/* End Inline Course Card */}
							</div>
						))}
					</div>
					{/* <div className="row-track" ref={courseRowRef}>
						{filteredcourses.map((c) => (
							<CourseCard key={c.id} course={c} />
						))}
					</div> */}

					<button
						className="row-arrow right"
						aria-label="Scroll courses right"
						onClick={() => scrollBy(courseRowRef.current, 420)}
					>
						<svg
							viewBox="0 0 24 24"
							width="18"
							height="18"
							aria-hidden="true"
						>
							<path
								d="M8.5 4.5 16 12l-7.5 7.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
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
							/>
						</li>
					))}
				</ul>
			</section>

			{/* TESTIMONIALS */}
			<section className="testimonials">
				<h2>Join others transforming their lives through learning</h2>
				<div className="testimonial-row">
					{testimonials.map((i) => (
						<blockquote className="testimonial" key={i.key}>
							<p>“{i.testimony}”</p>
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
						<p>
							Prep with comprehensive courses, practice tests, and exam
							voucher tips.
						</p>
						<button className="ghost-btn">
							Explore certifications and vouchers
						</button>
					</div>

					<div className="cert-grid">
						{certifications.map((c) => (
							<div className="cert-card" key={c.key}>
								<div className="cert-icon">
									<img
										src={c.src}
										className="cert-icon"
										alt={`${c.title} logo`}
									/>
								</div>
								<div className="cert-title">{c.title}</div>
								<div className="cert-sub">
									Cloud • Networking • Management
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CAREER ACCELERATORS */}
			<section className="accelerators">
				<h2>Ready to reimagine your career?</h2>
				<p className="sub">
					Get the skills and real-world experience employers want with Career
					Accelerators.
				</p>

				<div className="accel-grid">
					{[
						{
							title: 'Full‑Stack Web Developer',
							rating: 4.7,
							hours: '88 total hours',
							src: Acc1,
						},
						{
							title: 'Digital Marketer',
							rating: 4.5,
							hours: '28.4 total hours',
							src: Acc2,
						},
						{
							title: 'Data Scientist',
							rating: 4.6,
							hours: '47.1 total hours',
							src: Acc3,
						},
					].map((a, i) => (
						<div className="accel-card" key={i}>
							<div className="accel-art">
								<img src={a.src} alt={`${a.title} program`} />
							</div>
							<div className="accel-body">
								<h5>{a.title}</h5>
								<button
									className="primary-btn light"
									onClick={() => {
										navigate('/coursepage');

										setTimeout(
											() =>
												window.scrollTo({
													top: 0,
													left: 0,
													behavior: 'instant',
												}),
											0,
										);
									}}
								>
									View courses
								</button>
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

			{/* Footer */}
			<div className="footer-spacer">
				<Footer />
			</div>
		</main>
	);
}
