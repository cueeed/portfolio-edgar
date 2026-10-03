import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { playMaskText } from '../scripts/maskText';

function MaskLink({
	href,
	text,
	className,
	delayMs = 0,
}: {
	href: string;
	text: string;
	className?: string;
	delayMs?: number;
}) {
	const ref = useRef<HTMLAnchorElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		playMaskText(el);
	}, [text]);

	return (
		<a
			ref={ref}
			className={`mask-text${className ? ` ${className}` : ''}`}
			href={href}
			aria-label={text}
			data-mask-ready="1"
			style={{ ['--mask-delay' as string]: `${delayMs}ms` }}
		>
			{[...text].map((char, index) => (
				<span
					key={`${char}-${index}`}
					className="mask-text__char"
					style={{ ['--i' as string]: index }}
					aria-hidden="true"
				>
					<span className="mask-text__inner">{char === ' ' ? '\u00A0' : char}</span>
				</span>
			))}
		</a>
	);
}

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

const DRAG_THRESHOLD = 8;
const VELOCITY_SAMPLES = 5;
const MOMENTUM_MS = 380;
const MIN_VELOCITY = 0.05;

function padIndex(n: number) {
	return String(n).padStart(2, '0');
}

export default function Portfolio({ projects, email = 'edgar.cuenot@gmail.com' }: Props) {
	const trackRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<{
		pointerId: number | null;
		startX: number;
		originX: number;
		dragging: boolean;
		samples: Array<{ x: number; t: number }>;
	}>({
		pointerId: null,
		startX: 0,
		originX: 0,
		dragging: false,
		samples: [],
	});
	const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({
		x: 0,
		y: 0,
		inside: false,
	});
	const hoveredStripRef = useRef<HTMLElement | null>(null);
	const xRef = useRef({ current: 0, target: 0, min: 0, max: 0 });
	const galleryPausedRef = useRef(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const activeIndexRef = useRef(0);
	activeIndexRef.current = activeIndex;
	const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [displayTitle, setDisplayTitle] = useState<string | null>(null);
	const [titleKey, setTitleKey] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [entered, setEntered] = useState(false);
	const [swapPhase, setSwapPhase] = useState<'idle' | 'out' | 'in'>('idle');
	const [swapDir, setSwapDir] = useState<1 | -1>(1);
	const [hasSwapped, setHasSwapped] = useState(false);
	const [emailCopied, setEmailCopied] = useState(false);
	const emailCopiedTimerRef = useRef<number | null>(null);

	const selected = projects.find((p) => p.id === selectedId) ?? null;
	const selectedIndex = selected ? projects.findIndex((p) => p.id === selected.id) : -1;
	const total = projects.length;
	const overlayOpen = Boolean(selected);
	const overlayOpenRef = useRef(overlayOpen);
	overlayOpenRef.current = overlayOpen;
	const selectedIdRef = useRef(selectedId);
	selectedIdRef.current = selectedId;
	const swapBusyRef = useRef(false);
	const swapTimersRef = useRef<number[]>([]);
	const scrollToProjectRef = useRef<
		(index: number, immediate?: boolean, pronounced?: boolean) => void
	>(() => {});
	const suppressClickRef = useRef(false);
	const openAtIndexRef = useRef<(index: number) => void>(() => {});

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
		const onHome = () => {
			clearSwapTimers();
			swapBusyRef.current = false;
			setSwapPhase('idle');
			setHasSwapped(false);
			setSelectedId(null);
			requestAnimationFrame(() => scrollToProjectRef.current(0, false, true));
		};
		window.addEventListener('folio:home', onHome);
		return () => window.removeEventListener('folio:home', onHome);
	}, []);

	useEffect(() => {
		document.body.classList.toggle('portfolio-locked', overlayOpen);
		galleryPausedRef.current = overlayOpen;
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
				if (idx >= 0) {
					requestAnimationFrame(() => scrollToProjectRef.current(idx, true));
				}
				return;
			}

			if (!selectedIdRef.current) return;

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
	}, [goToProjectByOffset, projects]);

	/* Scroll dans l’overlay → projet suivant / précédent */
	useEffect(() => {
		if (!selected) return;

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
	}, [selected, goToProjectByOffset]);

	/* Galerie horizontale — entrée directionnelle + scale + parallax */
	useEffect(() => {
		const track = trackRef.current;
		const content = contentRef.current;
		if (!track || !content || projects.length === 0) return;

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const snapMq = window.matchMedia('(max-width: 860px)');
		const isSnapMode = () => snapMq.matches;
		const imgs = Array.from(content.querySelectorAll<HTMLImageElement>('img'));
		const strips = () =>
			Array.from(content.querySelectorAll<HTMLElement>('[data-project-strip]'));

		let vel = 0;
		let lastX = 0;
		let amount = 0;
		let tickerActive = false;
		const parallaxSmooth = new Map<HTMLElement, number>();

		gsap.set(content, { x: 0, force3D: true });
		gsap.set(strips(), { scale: 1, x: 0, force3D: true });
		gsap.set(imgs, { xPercent: 0, yPercent: 0, scale: 1.32, force3D: true });

		const measure = () => {
			const trackW = track.clientWidth;
			const contentW = content.scrollWidth;
			xRef.current.max = 0;
			xRef.current.min = Math.min(0, trackW - contentW);
		};

		const clampX = (x: number) => gsap.utils.clamp(xRef.current.min, xRef.current.max, x);

		const getProjectDest = (index: number) => {
			const target = strips()[index];
			if (!target) return 0;
			return -(target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2);
		};

		const getCenteredIndex = (contentX: number) => {
			const trackW = track.clientWidth || 1;
			const viewCenter = trackW / 2;
			let closest = 0;
			let minDist = Infinity;
			strips().forEach((strip, i) => {
				const mid = strip.offsetLeft + strip.offsetWidth / 2 + contentX;
				const dist = Math.abs(mid - viewCenter);
				if (dist < minDist) {
					minDist = dist;
					closest = i;
				}
			});
			return closest;
		};

		const updateMotion = () => {
			const contentX = Number(gsap.getProperty(content, 'x')) || 0;
			const trackW = track.clientWidth || 1;
			const viewCenter = trackW / 2;
			const half = trackW * 0.5;
			const speed = Math.min(1, Math.abs(vel) / 0.85);
			const dragging = dragRef.current.dragging;

			const targetAmount = reduced
				? 0
				: dragging
					? Math.max(0.5, speed)
					: gsap.utils.clamp(0, 1, speed / 0.3);

			const lerp = targetAmount > amount ? 0.32 : 0.09;
			amount += (targetAmount - amount) * lerp;
			if (amount < 0.004 && targetAmount < 0.004) amount = 0;

			track.classList.toggle('is-moving', amount > 0.06 || dragging);

			let closest = 0;
			let minDist = Infinity;
			const items = strips();

			items.forEach((strip, i) => {
				const img = strip.querySelector('img');
				const mid = strip.offsetLeft + strip.offsetWidth / 2 + contentX;
				const dist = Math.abs(mid - viewCenter);
				if (dist < minDist) {
					minDist = dist;
					closest = i;
				}

				const n = (mid - viewCenter) / half;

				gsap.set(strip, {
					scale: 1,
					x: 0,
					force3D: true,
				});

				if (img) {
					if (reduced) {
						gsap.set(img, { xPercent: 0, scale: 1.32, force3D: true });
					} else {
						// Parallax lié à la position : gauche → droite, sans retour au centre
						const raw = gsap.utils.clamp(-12, 12, n * 10);
						const paraPrev = parallaxSmooth.get(strip) ?? raw;
						const paraNext = paraPrev + (raw - paraPrev) * 0.22;
						parallaxSmooth.set(strip, paraNext);

						gsap.set(img, {
							xPercent: paraNext,
							scale: 1.32,
							force3D: true,
						});
					}
				}
			});

			setActiveIndex((prev) => (prev === closest ? prev : closest));
		};

		const sampleVelocity = () => {
			const x = Number(gsap.getProperty(content, 'x')) || 0;
			vel = vel * 0.8 + (x - lastX) * 0.2;
			lastX = x;
			xRef.current.current = x;
		};

		const ensureTicker = () => {
			if (tickerActive || reduced) return;
			tickerActive = true;
			gsap.ticker.add(tick);
		};

		const syncParallaxToPosition = () => {
			const contentX = Number(gsap.getProperty(content, 'x')) || 0;
			const trackW = track.clientWidth || 1;
			const viewCenter = trackW / 2;
			const half = trackW * 0.5;

			strips().forEach((strip) => {
				const img = strip.querySelector('img');
				gsap.set(strip, { scale: 1, x: 0, force3D: true });
				if (!img) return;
				if (reduced) {
					gsap.set(img, { xPercent: 0, scale: 1.32, force3D: true });
					return;
				}
				const mid = strip.offsetLeft + strip.offsetWidth / 2 + contentX;
				const n = (mid - viewCenter) / half;
				const para = gsap.utils.clamp(-12, 12, n * 10);
				parallaxSmooth.set(strip, para);
				gsap.set(img, { xPercent: para, scale: 1.32, force3D: true });
			});
		};

		const tick = () => {
			sampleVelocity();
			updateMotion();
			vel *= 0.945;
			if (
				Math.abs(vel) < 0.01 &&
				amount < 0.005 &&
				!dragRef.current.dragging
			) {
				gsap.ticker.remove(tick);
				tickerActive = false;
				vel = 0;
				amount = 0;
				track.classList.remove('is-moving');
				syncParallaxToPosition();
			}
		};

		const tweenX = (
			x: number,
			{
				immediate = false,
				duration = 1.05,
				ease = 'power2.out',
			}: { immediate?: boolean; duration?: number; ease?: string } = {},
		) => {
			const v = clampX(x);
			xRef.current.target = v;

			if (immediate || reduced) {
				gsap.set(content, { x: v, overwrite: true });
				lastX = v;
				xRef.current.current = v;
				vel = 0;
				amount = 0;
				track.classList.remove('is-moving');
				syncParallaxToPosition();
				updateMotion();
				return;
			}

			gsap.to(content, {
				x: v,
				duration,
				ease,
				overwrite: true,
				onUpdate: () => {
					sampleVelocity();
					updateMotion();
					ensureTicker();
				},
			});
			ensureTicker();
		};

		const setX = (x: number, immediate = false) => {
			tweenX(x, { immediate });
		};

		const scrollToProject = (index: number, immediate = true, pronounced = false) => {
			const items = strips();
			if (!items[index]) return;
			measure();
			const dest = getProjectDest(index);

			if (pronounced && !immediate && !reduced) {
				tweenX(dest, { duration: 1.55, ease: 'expo.out' });
			} else {
				tweenX(dest, { immediate });
			}

			setActiveIndex(index);
		};
		scrollToProjectRef.current = scrollToProject;

		const snapToNearest = (velocity = 0) => {
			measure();
			const projected = clampX(
				xRef.current.target +
					(Math.abs(velocity) > MIN_VELOCITY ? velocity * MOMENTUM_MS * 0.55 : 0),
			);
			const index = getCenteredIndex(projected);
			tweenX(getProjectDest(index), {
				duration: reduced ? 0.01 : 0.7,
				ease: 'power3.out',
			});
			setActiveIndex(index);
		};

		const clearHoveredStrip = () => {
			if (hoveredStripRef.current) {
				hoveredStripRef.current.classList.remove('is-hovered');
				hoveredStripRef.current = null;
			}
			setHoveredTitle(null);
			setHoveredIndex(null);
			track.classList.remove('has-hover');
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
				const idx = Number(strip.dataset.index);
				setHoveredIndex(Number.isFinite(idx) ? idx : null);
				track.classList.add('has-hover');
			} else {
				setHoveredTitle(null);
				setHoveredIndex(null);
				track.classList.remove('has-hover');
			}
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
			return (last.x - first.x) / dt;
		};

		const onWheel = (e: WheelEvent) => {
			if (galleryPausedRef.current) return;
			e.preventDefault();
			const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			// Scroll bas → avance → nouveaux projets depuis la droite
			setX(xRef.current.target - delta * 1.2);
		};

		const onPointerDown = (e: PointerEvent) => {
			if (galleryPausedRef.current) return;
			if (e.pointerType === 'mouse' && e.button !== 0) return;

			try {
				track.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}

			dragRef.current = {
				pointerId: e.pointerId,
				startX: e.clientX,
				originX: xRef.current.target,
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
			if (isSnapMode()) {
				// Suivi direct du doigt, sans couper is-moving / parallax
				const v = clampX(drag.originX + dx);
				xRef.current.target = v;
				gsap.set(content, { x: v, overwrite: true });
				sampleVelocity();
				updateMotion();
				ensureTicker();
			} else {
				setX(drag.originX + dx);
			}
		};

		const endDrag = (e: PointerEvent) => {
			const drag = dragRef.current;
			if (drag.pointerId !== e.pointerId) return;

			const wasDragging = drag.dragging;
			pushSample(e.clientX);
			const velocity = getVelocity();

			drag.pointerId = null;
			drag.dragging = false;
			drag.samples = [];
			track.classList.remove('is-dragging');

			try {
				track.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}

			if (wasDragging) {
				if (isSnapMode()) {
					snapToNearest(velocity);
				} else if (Math.abs(velocity) > MIN_VELOCITY) {
					setX(xRef.current.target + velocity * MOMENTUM_MS);
				}
				// Empêche le click fantôme après un drag
				suppressClickRef.current = true;
			} else if (!galleryPausedRef.current) {
				// setPointerCapture retarget les events : ouvrir via hit-test, pas via click
				const strip = document
					.elementFromPoint(e.clientX, e.clientY)
					?.closest<HTMLElement>('[data-project-strip]');
				if (strip && track.contains(strip)) {
					const idx = Number(strip.dataset.index);
					if (Number.isFinite(idx)) openAtIndexRef.current(idx);
				}
			}

			updateHoveredStrip();
		};

		const onPointerLeaveWindow = () => {
			pointerRef.current.inside = false;
			clearHoveredStrip();
		};

		const onResize = () => {
			measure();
			if (isSnapMode()) {
				scrollToProject(activeIndexRef.current, true);
			} else {
				setX(xRef.current.target, true);
			}
		};

		measure();
		requestAnimationFrame(() => {
			measure();
			scrollToProject(activeIndexRef.current, true);
			requestAnimationFrame(updateMotion);
		});

		let pending = imgs.length;
		const onImageDone = () => {
			pending -= 1;
			if (pending <= 0) {
				measure();
				scrollToProject(activeIndexRef.current, true);
			}
		};
		if (pending > 0) {
			imgs.forEach((img) => {
				if (img.complete) onImageDone();
				else {
					img.addEventListener('load', onImageDone, { once: true });
					img.addEventListener('error', onImageDone, { once: true });
				}
			});
		}

		track.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('wheel', onWheel, { passive: false });
		window.addEventListener('pointermove', onPointerMove, { passive: false });
		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
		window.addEventListener('blur', onPointerLeaveWindow);
		window.addEventListener('resize', onResize);

		return () => {
			if (tickerActive) gsap.ticker.remove(tick);
			clearHoveredStrip();
			track.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('wheel', onWheel);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', endDrag);
			window.removeEventListener('pointercancel', endDrag);
			window.removeEventListener('blur', onPointerLeaveWindow);
			window.removeEventListener('resize', onResize);
			scrollToProjectRef.current = () => {};
			gsap.killTweensOf(content);
			gsap.killTweensOf(imgs);
			gsap.killTweensOf(strips());
		};
	}, [projects.length]);

	useEffect(() => {
		const target =
			overlayOpen ? null : (hoveredTitle ?? projects[activeIndex]?.title ?? null);

		if (target === displayTitle) return;

		if (!target) {
			setDisplayTitle(null);
			return;
		}

		setDisplayTitle(target);
		setTitleKey((k) => k + 1);
	}, [hoveredTitle, overlayOpen, displayTitle, activeIndex, projects]);

	const pagerIndex = hoveredIndex ?? activeIndex;

	const copyEmail = async () => {
		try {
			await navigator.clipboard.writeText(email);
		} catch {
			const field = document.createElement('textarea');
			field.value = email;
			field.setAttribute('readonly', '');
			field.style.position = 'fixed';
			field.style.opacity = '0';
			document.body.appendChild(field);
			field.select();
			document.execCommand('copy');
			document.body.removeChild(field);
		}

		setEmailCopied(true);
		if (emailCopiedTimerRef.current) window.clearTimeout(emailCopiedTimerRef.current);
		emailCopiedTimerRef.current = window.setTimeout(() => {
			setEmailCopied(false);
			emailCopiedTimerRef.current = null;
		}, 2000);
	};

	useEffect(() => {
		return () => {
			if (emailCopiedTimerRef.current) window.clearTimeout(emailCopiedTimerRef.current);
		};
	}, []);

	const openProject = (id: string) => {
		if (dragRef.current.dragging) return;
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}
		clearSwapTimers();
		swapBusyRef.current = false;
		setSwapPhase('idle');
		setHasSwapped(false);
		setSelectedId(id);
	};

	openAtIndexRef.current = (index: number) => {
		const project = projects[index];
		if (!project) return;
		openProject(project.id);
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
				<span className="folio__brand folio__brand--ghost" aria-hidden="true">
					Edgar
				</span>

				<div className="folio__pager" aria-live="polite">
					{total > 0 ? (
						<>
							<span>{padIndex(pagerIndex + 1)}</span>
							<span className="folio__pager-sep" aria-hidden="true">
								/
							</span>
							<span>{padIndex(total)}</span>
						</>
					) : (
						<span>—</span>
					)}
				</div>

				<MaskLink href="/a-propos" text="À propos" className="folio__link" delayMs={70} />
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
							aria-label="Projets — glisser pour parcourir"
						>
							<div ref={contentRef} className="folio__track-inner">
								{projects.map((project, i) => (
									<button
										key={project.id}
										type="button"
										data-project-strip
										data-title={project.title}
										data-index={i}
										className={`folio__strip${i === activeIndex ? ' is-active' : ''}`}
										onClick={() => openProject(project.id)}
										aria-label={project.title}
										aria-current={i === activeIndex ? 'true' : undefined}
									>
										<span className="folio__strip-media">
											<img
												src={project.coverImageUrl}
												alt=""
												draggable={false}
												loading={i < 3 ? 'eager' : 'lazy'}
												width="700"
												height="1100"
											/>
										</span>
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
							className="folio__link folio__detail-close"
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
				<div className="folio__contacts">
					<button
						type="button"
						className="folio__link"
						onClick={copyEmail}
						aria-label={emailCopied ? 'Email copié' : `Copier l’email ${email}`}
					>
						{emailCopied ? 'Email copié' : 'Email'}
					</button>
					<a
						className="folio__link"
						href="https://www.linkedin.com/in/edgarcuenot/"
						target="_blank"
						rel="noopener noreferrer"
					>
						LinkedIn
					</a>
				</div>
			</footer>
		</div>
	);
}
