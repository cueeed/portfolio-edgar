import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface PortfolioProject {
	id: string;
	title: string;
	dateLabel: string;
	services: string[];
	shortDescription: string;
	coverImageUrl: string;
	coverAlt: string;
	externalUrl?: string | null;
	index: number;
}

interface Props {
	projects: PortfolioProject[];
	email?: string;
}

const DRAG_THRESHOLD = 10;
const VELOCITY_SAMPLES = 5;
const MOMENTUM_MS = 280;
const MIN_VELOCITY = 0.08; // px/ms

function padIndex(n: number) {
	return String(n).padStart(2, '0');
}

function easeOutExpo(t: number) {
	return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function Portfolio({ projects, email = 'bonjour@exemple.com' }: Props) {
	const trackRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const lenisRef = useRef<Lenis | null>(null);
	const dragRef = useRef<{
		pointerId: number | null;
		startX: number;
		scrollLeft: number;
		dragging: boolean;
		samples: Array<{ x: number; t: number }>;
	}>({
		pointerId: null,
		startX: 0,
		scrollLeft: 0,
		dragging: false,
		samples: [],
	});
	const scrollIdleRef = useRef<number | null>(null);
	const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({
		x: 0,
		y: 0,
		inside: false,
	});
	const hoveredStripRef = useRef<HTMLElement | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
	const [displayTitle, setDisplayTitle] = useState<string | null>(null);
	const [titleKey, setTitleKey] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [entered, setEntered] = useState(false);
	const [swapPhase, setSwapPhase] = useState<'idle' | 'out' | 'in'>('idle');
	const [swapDir, setSwapDir] = useState<1 | -1>(1);
	const [hasSwapped, setHasSwapped] = useState(false);

	const selected = projects.find((p) => p.id === selectedId) ?? null;
	const selectedIndex = selected ? projects.findIndex((p) => p.id === selected.id) : -1;
	const total = projects.length;
	const overlayOpen = Boolean(selected) || aboutOpen;
	const overlayOpenRef = useRef(overlayOpen);
	overlayOpenRef.current = overlayOpen;
	const selectedIdRef = useRef(selectedId);
	selectedIdRef.current = selectedId;
	const swapBusyRef = useRef(false);
	const swapTimersRef = useRef<number[]>([]);
	const scrollToProjectRef = useRef<(index: number, immediate?: boolean) => void>(() => {});

	const SWAP_OUT_MS = 700;
	const SWAP_IN_MS = 1100;

	const clearSwapTimers = () => {
		swapTimersRef.current.forEach((id) => window.clearTimeout(id));
		swapTimersRef.current = [];
	};

	useEffect(() => {
		const id = requestAnimationFrame(() => setEntered(true));
		return () => cancelAnimationFrame(id);
	}, []);

	useEffect(() => {
		document.body.classList.toggle('portfolio-locked', overlayOpen);
		return () => document.body.classList.remove('portfolio-locked');
	}, [overlayOpen]);

	useEffect(() => {
		return () => clearSwapTimers();
	}, []);

	const goToProjectByOffset = useCallback(
		(delta: number) => {
			const currentId = selectedIdRef.current;
			if (!currentId || projects.length < 2 || swapBusyRef.current) return;

			const current = projects.findIndex((p) => p.id === currentId);
			if (current < 0) return;

			const next = (current + delta + projects.length) % projects.length;
			if (next === current) return;

			const direction = (delta > 0 ? 1 : -1) as 1 | -1;
			swapBusyRef.current = true;
			setSwapDir(direction);
			setSwapPhase('out');

			clearSwapTimers();
			const tOut = window.setTimeout(() => {
				setSelectedId(projects[next].id);
				setActiveIndex(next);
				scrollToProjectRef.current(next, true);
				setSwapPhase('in');
				setHasSwapped(true);

				const tIn = window.setTimeout(() => {
					setSwapPhase('idle');
					swapBusyRef.current = false;
				}, SWAP_IN_MS);
				swapTimersRef.current.push(tIn);
			}, SWAP_OUT_MS);
			swapTimersRef.current.push(tOut);
		},
		[projects],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				clearSwapTimers();
				swapBusyRef.current = false;
				setSwapPhase('idle');
				setHasSwapped(false);
				const idx = projects.findIndex((p) => p.id === selectedIdRef.current);
				setSelectedId(null);
				setAboutOpen(false);
				if (idx >= 0) {
					requestAnimationFrame(() => scrollToProjectRef.current(idx, true));
				}
				return;
			}

			if (!selectedIdRef.current || aboutOpen) return;

			if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
				e.preventDefault();
				goToProjectByOffset(1);
			} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
				e.preventDefault();
				goToProjectByOffset(-1);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [aboutOpen, goToProjectByOffset, projects]);

	/* Scroll dans l’overlay → projet suivant / précédent */
	useEffect(() => {
		if (!selected || aboutOpen) return;

		let accum = 0;
		const THRESHOLD = 72;

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			if (swapBusyRef.current) return;

			const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			accum += dy;

			if (Math.abs(accum) < THRESHOLD) return;

			const direction = accum > 0 ? 1 : -1;
			accum = 0;
			goToProjectByOffset(direction);
		};

		window.addEventListener('wheel', onWheel, { passive: false });
		return () => window.removeEventListener('wheel', onWheel);
	}, [selected, aboutOpen, goToProjectByOffset]);

	const updateActiveFromScroll = useCallback(() => {
		const track = trackRef.current;
		if (!track || projects.length === 0) return;

		const center = track.scrollLeft + track.clientWidth / 2;
		const items = Array.from(track.querySelectorAll<HTMLElement>('[data-project-strip]'));
		let closest = 0;
		let minDist = Infinity;

		items.forEach((el, i) => {
			const mid = el.offsetLeft + el.offsetWidth / 2;
			const dist = Math.abs(mid - center);
			if (dist < minDist) {
				minDist = dist;
				closest = i;
			}
		});

		setActiveIndex((prev) => (prev === closest ? prev : closest));
	}, [projects.length]);

	useEffect(() => {
		const track = trackRef.current;
		const content = contentRef.current;
		if (!track || !content || projects.length === 0) return;

		const lenis = new Lenis({
			wrapper: track,
			content,
			orientation: 'horizontal',
			gestureOrientation: 'vertical',
			eventsTarget: window,
			smoothWheel: true,
			lerp: 0.16,
			wheelMultiplier: 1.5,
			touchMultiplier: 1.4,
			autoRaf: true,
			syncTouch: true,
			syncTouchLerp: 0.12,
		});

		lenisRef.current = lenis;

		const clearHoveredStrip = () => {
			if (hoveredStripRef.current) {
				hoveredStripRef.current.classList.remove('is-hovered');
				hoveredStripRef.current = null;
			}
			setHoveredTitle(null);
		};

		const updateHoveredStrip = () => {
			if (overlayOpenRef.current || dragRef.current.dragging || !pointerRef.current.inside) {
				clearHoveredStrip();
				return;
			}

			const el = document.elementFromPoint(pointerRef.current.x, pointerRef.current.y);
			const strip = el?.closest<HTMLElement>('[data-project-strip]') ?? null;

			if (strip === hoveredStripRef.current) return;
			if (hoveredStripRef.current) {
				hoveredStripRef.current.classList.remove('is-hovered');
			}
			hoveredStripRef.current = strip;

			if (strip) {
				strip.classList.add('is-hovered');
				setHoveredTitle(strip.dataset.title ?? null);
			} else {
				setHoveredTitle(null);
			}
		};

		let rafId = 0;
		const onScroll = () => {
			track.classList.add('is-scrolling');
			if (scrollIdleRef.current) window.clearTimeout(scrollIdleRef.current);
			scrollIdleRef.current = window.setTimeout(() => {
				track.classList.remove('is-scrolling');
			}, 140);

			updateHoveredStrip();

			if (rafId) return;
			rafId = requestAnimationFrame(() => {
				rafId = 0;
				updateActiveFromScroll();
			});
		};

		const scrollToProject = (index: number, immediate = true) => {
			const items = content.querySelectorAll<HTMLElement>('[data-project-strip]');
			const target = items[index];
			if (!target) return;
			const left = target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2;
			lenis.scrollTo(Math.max(0, left), { immediate, force: true });
			setActiveIndex(index);
		};
		scrollToProjectRef.current = scrollToProject;

		// Démarre sur le premier projet (centré)
		const startOnFirst = () => {
			scrollToProject(0, true);
		};
		requestAnimationFrame(() => {
			startOnFirst();
			requestAnimationFrame(startOnFirst);
		});
		// Recale après chargement des images (layout stable)
		const images = Array.from(content.querySelectorAll('img'));
		let pending = images.length;
		const onImageDone = () => {
			pending -= 1;
			if (pending <= 0) startOnFirst();
		};
		if (pending === 0) {
			startOnFirst();
		} else {
			images.forEach((img) => {
				if (img.complete) onImageDone();
				else {
					img.addEventListener('load', onImageDone, { once: true });
					img.addEventListener('error', onImageDone, { once: true });
				}
			});
		}

		lenis.on('scroll', onScroll);

		const onPointerLeaveWindow = () => {
			pointerRef.current.inside = false;
			clearHoveredStrip();
		};

		const pushSample = (x: number) => {
			const samples = dragRef.current.samples;
			samples.push({ x, t: performance.now() });
			if (samples.length > VELOCITY_SAMPLES) samples.shift();
		};

		const getVelocity = () => {
			const samples = dragRef.current.samples;
			if (samples.length < 2) return 0;
			const first = samples[0];
			const last = samples[samples.length - 1];
			const dt = last.t - first.t;
			if (dt <= 0) return 0;
			// Drag à droite → scroll diminue : vitesse de scroll = -(dx/dt)
			return -(last.x - first.x) / dt;
		};

		const onPointerDown = (e: PointerEvent) => {
			if (overlayOpenRef.current || e.button !== 0) return;
			if (e.pointerType === 'touch') return;

			dragRef.current = {
				pointerId: e.pointerId,
				startX: e.clientX,
				scrollLeft: track.scrollLeft,
				dragging: false,
				samples: [{ x: e.clientX, t: performance.now() }],
			};
		};

		const onPointerMove = (e: PointerEvent) => {
			pointerRef.current.x = e.clientX;
			pointerRef.current.y = e.clientY;
			pointerRef.current.inside = true;

			const drag = dragRef.current;
			if (drag.pointerId !== e.pointerId) {
				updateHoveredStrip();
				return;
			}

			const dx = e.clientX - drag.startX;

			if (!drag.dragging) {
				if (Math.abs(dx) < DRAG_THRESHOLD) return;
				drag.dragging = true;
				track.classList.add('is-dragging');
				clearHoveredStrip();
			}

			e.preventDefault();
			pushSample(e.clientX);
			lenis.scrollTo(drag.scrollLeft - dx, { immediate: true, force: true });
		};

		const endDrag = (e: PointerEvent) => {
			const drag = dragRef.current;
			if (drag.pointerId !== e.pointerId) return;

			const wasDragging = drag.dragging;
			pushSample(e.clientX);

			const velocity = getVelocity(); // px/ms
			drag.pointerId = null;
			drag.dragging = false;
			drag.samples = [];
			track.classList.remove('is-dragging');

			if (wasDragging) {
				if (Math.abs(velocity) > MIN_VELOCITY) {
					const distance = velocity * MOMENTUM_MS;
					const duration = Math.min(1.35, Math.max(0.45, Math.abs(distance) / 900));
					lenis.scrollTo(track.scrollLeft + distance, {
						duration,
						easing: easeOutExpo,
						force: true,
					});
				}

				const blockClick = (ev: Event) => {
					ev.preventDefault();
					ev.stopPropagation();
					track.removeEventListener('click', blockClick, true);
				};
				track.addEventListener('click', blockClick, true);
			}

			updateHoveredStrip();
		};

		track.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove, { passive: false });
		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
		window.addEventListener('blur', onPointerLeaveWindow);

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (scrollIdleRef.current) window.clearTimeout(scrollIdleRef.current);
			clearHoveredStrip();
			track.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', endDrag);
			window.removeEventListener('pointercancel', endDrag);
			window.removeEventListener('blur', onPointerLeaveWindow);
			scrollToProjectRef.current = () => {};
			lenis.destroy();
			lenisRef.current = null;
		};
	}, [projects.length, updateActiveFromScroll]);

	useEffect(() => {
		const lenis = lenisRef.current;
		if (!lenis) return;
		if (overlayOpen) lenis.stop();
		else lenis.start();
	}, [overlayOpen]);

	useEffect(() => {
		const target = overlayOpen ? null : hoveredTitle;
		if (target === displayTitle) return;

		if (!target) {
			setDisplayTitle(null);
			return;
		}

		setDisplayTitle(target);
		setTitleKey((k) => k + 1);
	}, [hoveredTitle, overlayOpen, displayTitle]);

	const openProject = (id: string) => {
		if (dragRef.current.dragging) return;
		clearSwapTimers();
		swapBusyRef.current = false;
		setSwapPhase('idle');
		setHasSwapped(false);
		setAboutOpen(false);
		setSelectedId(id);
	};

	const closeProject = () => {
		clearSwapTimers();
		swapBusyRef.current = false;
		setSwapPhase('idle');
		setHasSwapped(false);
		const idx = selectedIndex >= 0 ? selectedIndex : activeIndex;
		setSelectedId(null);
		requestAnimationFrame(() => scrollToProjectRef.current(idx, true));
	};

	const detailSwapClass =
		swapPhase === 'out'
			? ` is-swap-out is-swap-${swapDir > 0 ? 'next' : 'prev'}`
			: swapPhase === 'in'
				? ` is-swap-in is-swap-${swapDir > 0 ? 'next' : 'prev'}`
				: hasSwapped
					? ' is-swapped'
					: '';

	return (
		<div className={`folio${entered ? ' is-ready' : ''}${selected ? ' is-detail' : ''}`}>
			<header className="folio__chrome folio__chrome--top">
				<a className="folio__brand" href="/" aria-label="Edgar — accueil">
					Edgar
				</a>

				<div className="folio__pager" aria-live="polite">
					{total > 0 ? (
						<>
							<span>{padIndex(activeIndex + 1)}</span>
							<span className="folio__pager-sep" aria-hidden="true">
								/
							</span>
							<span>{padIndex(total)}</span>
						</>
					) : (
						<span>—</span>
					)}
				</div>

				<button
					type="button"
					className="folio__link"
					onClick={() => {
						setSelectedId(null);
						setAboutOpen(true);
					}}
				>
					À propos
				</button>
			</header>

			<main className="folio__stage">
				{total === 0 ? (
					<p className="folio__empty">
						Aucun projet publié. Lance le Studio pour en créer.
					</p>
				) : (
					<div className="folio__track-wrap" aria-hidden={Boolean(selected) || undefined}>
						<div
							ref={trackRef}
							className="folio__track"
							aria-label="Projets — faire défiler horizontalement"
						>
							<div ref={contentRef} className="folio__track-inner">
								{projects.map((project, i) => (
									<button
										key={project.id}
										type="button"
										data-project-strip
										data-title={project.title}
										className="folio__strip"
										onClick={() => openProject(project.id)}
										aria-label={project.title}
									>
										<img
											src={project.coverImageUrl}
											alt=""
											draggable={false}
											loading={i < 3 ? 'eager' : 'lazy'}
											width="700"
											height="1100"
										/>
									</button>
								))}
							</div>
						</div>

						<p
							className={`folio__float-title${displayTitle ? ' is-visible' : ''}`}
							aria-hidden={!displayTitle}
						>
							<span className="folio__float-mask">
								{displayTitle && (
									<span key={titleKey} className="folio__float-name">
										{displayTitle}
									</span>
								)}
							</span>
						</p>
					</div>
				)}

				{selected && (
					<section
						className={`folio__detail${detailSwapClass}`}
						aria-modal="true"
						role="dialog"
						aria-labelledby="folio-detail-title"
					>
						<button
							type="button"
							className="folio__detail-close"
							onClick={closeProject}
							aria-label="Fermer"
						>
							Fermer
						</button>

						<div className="folio__detail-media">
							<img
								key={selected.id}
								src={selected.coverImageUrl}
								alt={selected.coverAlt}
								width="900"
								height="1400"
							/>
						</div>

						<div className="folio__detail-content" key={selected.id}>
							<p className="folio__detail-index">
								{padIndex((selectedIndex >= 0 ? selectedIndex : selected.index) + 1)}
								<span aria-hidden="true"> / </span>
								{padIndex(total)}
							</p>

							<h2 id="folio-detail-title" className="folio__detail-title">
								{selected.title}
							</h2>

							<dl className="folio__meta">
								<div>
									<dt>Date</dt>
									<dd>{selected.dateLabel}</dd>
								</div>
								<div>
									<dt>Prestations</dt>
									<dd>{selected.services.join(' · ') || '—'}</dd>
								</div>
							</dl>

							<p className="folio__detail-desc">{selected.shortDescription}</p>

							{selected.externalUrl ? (
								<a
									className="folio__cta"
									href={selected.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
								>
									Voir le site
									<span aria-hidden="true"> ↗</span>
								</a>
							) : (
								<span className="folio__cta folio__cta--disabled">Site bientôt en ligne</span>
							)}
						</div>
					</section>
				)}
			</main>

			<footer className="folio__chrome folio__chrome--bottom">
				<p className="folio__status">Digital designer</p>
				<a className="folio__link" href={`mailto:${email}`}>
					Email
				</a>
			</footer>

			{aboutOpen && (
				<aside
					className="folio__about"
					aria-modal="true"
					role="dialog"
					aria-labelledby="folio-about-title"
				>
					<button
						type="button"
						className="folio__detail-close"
						onClick={() => setAboutOpen(false)}
						aria-label="Fermer"
					>
						Fermer
					</button>
					<div className="folio__about-inner">
						<h2 id="folio-about-title">À propos</h2>
						<p>
							Digital designer — je conçois des identités et des expériences web
							claires, soignées et mémorables. Chaque projet part d’un besoin précis
							et d’une intention visuelle forte.
						</p>
						<a className="folio__cta" href={`mailto:${email}`}>
							Me contacter
							<span aria-hidden="true"> ↗</span>
						</a>
					</div>
				</aside>
			)}
		</div>
	);
}
