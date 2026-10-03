import gsap from 'gsap';

const DRAG_THRESHOLD_MOUSE = 8;
const DRAG_THRESHOLD_TOUCH = 4;
const VELOCITY_SAMPLES = 5;
const MOMENTUM_MS = 380;
const MIN_VELOCITY = 0.05;
const SWAP_OUT_MS = 700;
const SWAP_IN_MS = 1100;

function padIndex(n: number) {
	return String(n).padStart(2, '0');
}

type ProjectData = {
	id: string;
	title: string;
	dateLabel: string;
	services: string;
	shortDescription: string;
	coverImageUrl: string;
	coverAlt: string;
	externalUrl: string;
	index: number;
};

function readProject(strip: HTMLElement): ProjectData {
	return {
		id: strip.dataset.id ?? '',
		title: strip.dataset.title ?? '',
		dateLabel: strip.dataset.date ?? '',
		services: strip.dataset.services ?? '',
		shortDescription: strip.dataset.desc ?? '',
		coverImageUrl: strip.dataset.cover ?? '',
		coverAlt: strip.dataset.coverAlt ?? '',
		externalUrl: strip.dataset.external ?? '',
		index: Number(strip.dataset.index) || 0,
	};
}

export function bindPortfolio(root: HTMLElement): () => void {
	const email = root.dataset.email ?? 'edgar.cuenot@gmail.com';
	const track = root.querySelector<HTMLElement>('.folio__track');
	const content = root.querySelector<HTMLElement>('.folio__track-inner');
	const trackWrap = root.querySelector<HTMLElement>('.folio__track-wrap');
	const pager = root.querySelector<HTMLElement>('.folio__pager');
	const floatTitle = root.querySelector<HTMLElement>('.folio__float-title');
	const floatMask = root.querySelector<HTMLElement>('.folio__float-mask');
	const detail = root.querySelector<HTMLElement>('[data-folio-detail]');
	const detailClose = root.querySelector<HTMLElement>('[data-folio-close]');
	const detailMedia = root.querySelector<HTMLElement>('.folio__detail-media');
	const detailContent = root.querySelector<HTMLElement>('.folio__detail-content');
	const emailBtn = root.querySelector<HTMLButtonElement>('[data-folio-email]');

	const strips = () =>
		Array.from(content?.querySelectorAll<HTMLElement>('[data-project-strip]') ?? []);

	const projects = strips().map(readProject);
	const total = projects.length;

	const drag = {
		pointerId: null as number | null,
		startX: 0,
		startY: 0,
		originX: 0,
		dragging: false,
		axis: null as null | 'x' | 'y',
		samples: [] as Array<{ x: number; t: number }>,
	};
	const pointer = { x: 0, y: 0, inside: false };
	const xState = { current: 0, target: 0, min: 0, max: 0 };

	let hoveredStrip: HTMLElement | null = null;
	let activeIndex = 0;
	let hoveredTitle: string | null = null;
	let hoveredIndex: number | null = null;
	let displayTitle: string | null = null;
	let selectedId: string | null = null;
	let galleryPaused = false;
	let swapBusy = false;
	let swapPhase: 'idle' | 'out' | 'in' = 'idle';
	let swapDir: 1 | -1 = 1;
	let hasSwapped = false;
	let suppressClick = false;
	let emailCopiedTimer: number | null = null;
	const swapTimers: number[] = [];

	let vel = 0;
	let lastX = 0;
	let amount = 0;
	let tickerActive = false;
	const parallaxSmooth = new Map<HTMLElement, number>();

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const snapMq = window.matchMedia('(max-width: 860px)');
	const isSnapMode = () => snapMq.matches;

	const clearSwapTimers = () => {
		swapTimers.forEach((id) => window.clearTimeout(id));
		swapTimers.length = 0;
	};

	const selected = () => projects.find((p) => p.id === selectedId) ?? null;
	const selectedIndex = () =>
		selectedId ? projects.findIndex((p) => p.id === selectedId) : -1;

	const updatePager = () => {
		if (!pager) return;
		if (total === 0) {
			pager.textContent = '—';
			return;
		}
		const idx = hoveredIndex ?? activeIndex;
		pager.innerHTML = `<span>${padIndex(idx + 1)}</span><span class="folio__pager-sep" aria-hidden="true">/</span><span>${padIndex(total)}</span>`;
	};

	const updateFloatTitle = () => {
		if (!floatTitle || !floatMask) return;
		const overlayOpen = Boolean(selectedId);
		const target = overlayOpen ? null : (hoveredTitle ?? projects[activeIndex]?.title ?? null);

		if (target === displayTitle) return;

		if (!target) {
			displayTitle = null;
			floatTitle.classList.remove('is-visible');
			floatTitle.setAttribute('aria-hidden', 'true');
			floatMask.replaceChildren();
			return;
		}

		displayTitle = target;
		floatTitle.classList.add('is-visible');
		floatTitle.setAttribute('aria-hidden', 'false');
		const name = document.createElement('span');
		name.className = 'folio__float-name';
		name.textContent = target;
		floatMask.replaceChildren(name);
	};

	const setActiveStrip = (index: number) => {
		activeIndex = index;
		strips().forEach((strip, i) => {
			strip.classList.toggle('is-active', i === index);
			if (i === index) strip.setAttribute('aria-current', 'true');
			else strip.removeAttribute('aria-current');
		});
		updatePager();
		updateFloatTitle();
	};

	const fillDetail = (project: ProjectData) => {
		if (!detail || !detailMedia || !detailContent) return;
		const idx = projects.findIndex((p) => p.id === project.id);

		detailMedia.replaceChildren();
		const img = document.createElement('img');
		img.src = project.coverImageUrl;
		img.alt = project.coverAlt;
		img.width = 900;
		img.height = 1400;
		detailMedia.appendChild(img);

		const indexEl = document.createElement('p');
		indexEl.className = 'folio__detail-index';
		indexEl.append(
			document.createTextNode(padIndex((idx >= 0 ? idx : project.index) + 1)),
			Object.assign(document.createElement('span'), {
				textContent: ' / ',
			}),
			document.createTextNode(padIndex(total)),
		);
		indexEl.querySelector('span')?.setAttribute('aria-hidden', 'true');

		const title = document.createElement('h2');
		title.id = 'folio-detail-title';
		title.className = 'folio__detail-title';
		title.textContent = project.title;

		const meta = document.createElement('dl');
		meta.className = 'folio__meta';
		for (const [label, value] of [
			['Date', project.dateLabel],
			['Prestations', project.services || '—'],
		] as const) {
			const row = document.createElement('div');
			const dt = document.createElement('dt');
			dt.textContent = label;
			const dd = document.createElement('dd');
			dd.textContent = value;
			row.append(dt, dd);
			meta.append(row);
		}

		detailContent.replaceChildren(indexEl, title, meta);

		const description = project.shortDescription?.trim();
		if (description) {
			const desc = document.createElement('p');
			desc.className = 'folio__detail-desc';
			desc.textContent = description;
			detailContent.append(desc);
		}

		if (project.externalUrl) {
			const link = document.createElement('a');
			link.className = 'folio__cta';
			link.href = project.externalUrl;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = 'Voir le site';
			detailContent.append(link);
		} else {
			const soon = document.createElement('span');
			soon.className = 'folio__cta folio__cta--disabled';
			soon.textContent = 'Site bientôt en ligne';
			detailContent.append(soon);
		}
	};

	const setDetailClasses = () => {
		if (!detail) return;
		detail.className = 'folio__detail';
		if (swapPhase === 'out') {
			detail.classList.add('is-swap-out', swapDir > 0 ? 'is-swap-next' : 'is-swap-prev');
		} else if (swapPhase === 'in') {
			detail.classList.add('is-swap-in', swapDir > 0 ? 'is-swap-next' : 'is-swap-prev');
		} else if (hasSwapped) {
			detail.classList.add('is-swapped');
		}
	};

	const openProject = (id: string) => {
		if (drag.dragging) return;
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		const project = projects.find((p) => p.id === id);
		if (!project || !detail) return;

		clearSwapTimers();
		swapBusy = false;
		swapPhase = 'idle';
		hasSwapped = false;
		selectedId = id;
		galleryPaused = true;
		document.body.classList.add('portfolio-locked');
		root.classList.add('is-detail');
		trackWrap?.setAttribute('aria-hidden', 'true');
		fillDetail(project);
		detail.hidden = false;
		setDetailClasses();
		updateFloatTitle();
	};

	const openAtIndex = (index: number) => {
		const project = projects[index];
		if (!project) return;
		openProject(project.id);
	};

	const closeProject = () => {
		clearSwapTimers();
		swapBusy = false;
		swapPhase = 'idle';
		hasSwapped = false;
		const idx = selectedIndex() >= 0 ? selectedIndex() : activeIndex;
		selectedId = null;
		galleryPaused = false;
		document.body.classList.remove('portfolio-locked');
		root.classList.remove('is-detail');
		trackWrap?.removeAttribute('aria-hidden');
		if (detail) detail.hidden = true;
		setDetailClasses();
		updateFloatTitle();
		requestAnimationFrame(() => scrollToProject(idx, true));
	};

	const goToProjectByOffset = (delta: number) => {
		if (!selectedId || projects.length < 2 || swapBusy) return;
		const current = projects.findIndex((p) => p.id === selectedId);
		if (current < 0) return;
		const next = (current + delta + projects.length) % projects.length;
		if (next === current) return;

		const direction = (delta > 0 ? 1 : -1) as 1 | -1;
		swapBusy = true;
		swapDir = direction;
		swapPhase = 'out';
		setDetailClasses();

		clearSwapTimers();
		const tOut = window.setTimeout(() => {
			selectedId = projects[next].id;
			setActiveStrip(next);
			scrollToProject(next, true);
			fillDetail(projects[next]);
			swapPhase = 'in';
			hasSwapped = true;
			setDetailClasses();

			const tIn = window.setTimeout(() => {
				swapPhase = 'idle';
				swapBusy = false;
				setDetailClasses();
			}, SWAP_IN_MS);
			swapTimers.push(tIn);
		}, SWAP_OUT_MS);
		swapTimers.push(tOut);
	};

	/* ——— Gallery motion (same timing / easing as React version) ——— */
	if (!track || !content || total === 0) {
		requestAnimationFrame(() => root.classList.add('is-ready'));
		updatePager();
		const onHomeEmpty = () => {};
		window.addEventListener('folio:home', onHomeEmpty);
		return () => {
			window.removeEventListener('folio:home', onHomeEmpty);
			document.body.classList.remove('portfolio-locked');
		};
	}

	const imgs = () => Array.from(content.querySelectorAll<HTMLImageElement>('img'));

	gsap.set(content, { x: 0, force3D: true });
	gsap.set(strips(), { scale: 1, x: 0, force3D: true });
	gsap.set(imgs(), { xPercent: 0, yPercent: 0, scale: 1.32, force3D: true });

	const measure = () => {
		const trackW = track.clientWidth;
		const contentW = content.scrollWidth;
		xState.max = 0;
		xState.min = Math.min(0, trackW - contentW);
	};

	const clampX = (x: number) => gsap.utils.clamp(xState.min, xState.max, x);

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
		const dragging = drag.dragging;

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
			gsap.set(strip, { scale: 1, x: 0, force3D: true });

			if (img) {
				if (reduced) {
					gsap.set(img, { xPercent: 0, scale: 1.32, force3D: true });
				} else {
					const raw = gsap.utils.clamp(-12, 12, n * 10);
					const paraPrev = parallaxSmooth.get(strip) ?? raw;
					const paraNext = paraPrev + (raw - paraPrev) * 0.22;
					parallaxSmooth.set(strip, paraNext);
					gsap.set(img, { xPercent: paraNext, scale: 1.32, force3D: true });
				}
			}
		});

		if (closest !== activeIndex) setActiveStrip(closest);
	};

	const sampleVelocity = () => {
		const x = Number(gsap.getProperty(content, 'x')) || 0;
		vel = vel * 0.8 + (x - lastX) * 0.2;
		lastX = x;
		xState.current = x;
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
		if (Math.abs(vel) < 0.01 && amount < 0.005 && !drag.dragging) {
			gsap.ticker.remove(tick);
			tickerActive = false;
			vel = 0;
			amount = 0;
			track.classList.remove('is-moving');
			syncParallaxToPosition();
		}
	};

	const ensureTicker = () => {
		if (tickerActive || reduced) return;
		tickerActive = true;
		gsap.ticker.add(tick);
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
		xState.target = v;

		if (immediate || reduced) {
			gsap.set(content, { x: v, overwrite: true });
			lastX = v;
			xState.current = v;
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

		setActiveStrip(index);
	};

	const snapToNearest = (velocity = 0) => {
		measure();
		const projected = clampX(
			xState.target + (Math.abs(velocity) > MIN_VELOCITY ? velocity * MOMENTUM_MS * 0.55 : 0),
		);
		const index = getCenteredIndex(projected);
		setActiveStrip(index);
		const dest = getProjectDest(index);
		const duration = reduced ? 0.01 : 0.7;

		xState.target = dest;
		gsap.to(content, {
			x: dest,
			duration,
			ease: 'power3.out',
			overwrite: true,
			onUpdate: () => {
				sampleVelocity();
				updateMotion();
				ensureTicker();
			},
			onComplete: () => {
				vel = 0;
				amount = 0;
				lastX = dest;
				xState.current = dest;
				track.classList.remove('is-moving');
				setActiveStrip(index);
				syncParallaxToPosition();
			},
		});
		ensureTicker();
	};

	const clearHoveredStrip = () => {
		if (hoveredStrip) {
			hoveredStrip.classList.remove('is-hovered');
			hoveredStrip = null;
		}
		hoveredTitle = null;
		hoveredIndex = null;
		track.classList.remove('has-hover');
		updatePager();
		updateFloatTitle();
	};

	const updateHoveredStrip = () => {
		if (galleryPaused || drag.dragging || !pointer.inside) {
			clearHoveredStrip();
			return;
		}

		const el = document.elementFromPoint(pointer.x, pointer.y);
		const strip = el?.closest<HTMLElement>('[data-project-strip]') ?? null;

		if (strip === hoveredStrip) return;
		if (hoveredStrip) hoveredStrip.classList.remove('is-hovered');
		hoveredStrip = strip;

		if (strip) {
			strip.classList.add('is-hovered');
			hoveredTitle = strip.dataset.title ?? null;
			const idx = Number(strip.dataset.index);
			hoveredIndex = Number.isFinite(idx) ? idx : null;
			track.classList.add('has-hover');
		} else {
			hoveredTitle = null;
			hoveredIndex = null;
			track.classList.remove('has-hover');
		}
		updatePager();
		updateFloatTitle();
	};

	const pushSample = (x: number) => {
		drag.samples.push({ x, t: performance.now() });
		if (drag.samples.length > VELOCITY_SAMPLES) drag.samples.shift();
	};

	const getVelocity = () => {
		if (drag.samples.length < 2) return 0;
		const first = drag.samples[0];
		const last = drag.samples[drag.samples.length - 1];
		const dt = last.t - first.t;
		if (dt <= 0) return 0;
		return (last.x - first.x) / dt;
	};

	const onWheel = (e: WheelEvent) => {
		if (galleryPaused) return;
		e.preventDefault();
		const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
		setX(xState.target - delta * 1.2);
	};

	const resetDrag = () => {
		drag.pointerId = null;
		drag.dragging = false;
		drag.axis = null;
		drag.samples = [];
		track.classList.remove('is-dragging');
	};

	const dragTo = (x: number) => {
		const v = clampX(x);
		xState.target = v;
		gsap.set(content, { x: v, overwrite: true });
		sampleVelocity();
		updateMotion();
		ensureTicker();
	};

	const settleDrag = (velocity: number) => {
		if (isSnapMode()) {
			snapToNearest(velocity);
		} else if (Math.abs(velocity) > MIN_VELOCITY) {
			setX(xState.target + velocity * MOMENTUM_MS);
		}
		suppressClick = true;
		window.setTimeout(() => {
			suppressClick = false;
		}, 80);
	};

	const releasePointer = (pointerId: number) => {
		try {
			if (track.hasPointerCapture?.(pointerId)) {
				track.releasePointerCapture(pointerId);
			}
		} catch {
			/* ignore */
		}
	};

	const onPointerDown = (e: PointerEvent) => {
		if (galleryPaused) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;

		// Reprend depuis la position visuelle (pas une tween en cours)
		gsap.killTweensOf(content);
		const currentX = Number(gsap.getProperty(content, 'x')) || 0;
		xState.current = currentX;
		xState.target = currentX;
		lastX = currentX;
		vel = 0;

		drag.pointerId = e.pointerId;
		drag.startX = e.clientX;
		drag.startY = e.clientY;
		drag.originX = currentX;
		drag.dragging = false;
		drag.axis = null;
		drag.samples = [{ x: e.clientX, t: performance.now() }];

		// Capture tôt sur touch — sinon iOS vole le geste
		if (e.pointerType !== 'mouse') {
			try {
				track.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	};

	const onPointerMove = (e: PointerEvent) => {
		pointer.x = e.clientX;
		pointer.y = e.clientY;
		pointer.inside = true;

		if (drag.pointerId !== e.pointerId) {
			updateHoveredStrip();
			return;
		}

		const dx = e.clientX - drag.startX;
		const dy = e.clientY - drag.startY;
		const threshold =
			e.pointerType === 'mouse' ? DRAG_THRESHOLD_MOUSE : DRAG_THRESHOLD_TOUCH;

		if (!drag.dragging) {
			if (drag.axis === null) {
				if (Math.hypot(dx, dy) < threshold) return;
				drag.axis = Math.abs(dx) >= Math.abs(dy) * 0.85 ? 'x' : 'y';
				if (drag.axis === 'y') {
					releasePointer(e.pointerId);
					resetDrag();
					return;
				}
			} else if (drag.axis === 'y') {
				return;
			}

			drag.dragging = true;
			track.classList.add('is-dragging');
			clearHoveredStrip();
			try {
				track.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}

		e.preventDefault();
		pushSample(e.clientX);
		// Suivi 1:1 au doigt / souris (pas de tween pendant le drag)
		dragTo(drag.originX + dx);
	};

	const endDrag = (e: PointerEvent) => {
		if (drag.pointerId !== e.pointerId) return;

		const wasDragging = drag.dragging;
		const pointerId = e.pointerId;
		pushSample(e.clientX);
		const velocity = getVelocity();

		resetDrag();
		releasePointer(pointerId);

		if (wasDragging) {
			settleDrag(velocity);
		} else if (!galleryPaused && e.pointerType === 'mouse') {
			// Touch : ouverture via click (évite le double open pointerup+click)
			const strip = document
				.elementFromPoint(e.clientX, e.clientY)
				?.closest<HTMLElement>('[data-project-strip]');
			if (strip && track.contains(strip)) {
				const idx = Number(strip.dataset.index);
				if (Number.isFinite(idx)) openAtIndex(idx);
			}
		}

		// Touch : pas de hover fantôme qui masque l’état actif
		if (e.pointerType !== 'mouse') {
			pointer.inside = false;
			clearHoveredStrip();
		} else {
			updateHoveredStrip();
		}
	};

	const onLostPointerCapture = (e: PointerEvent) => {
		if (drag.pointerId !== e.pointerId) return;
		const wasDragging = drag.dragging;
		const velocity = getVelocity();
		resetDrag();
		if (wasDragging) settleDrag(velocity);
		updateHoveredStrip();
	};

	const onPointerLeaveWindow = () => {
		pointer.inside = false;
		clearHoveredStrip();
	};

	const onResize = () => {
		measure();
		if (isSnapMode()) {
			scrollToProject(activeIndex, true);
		} else {
			setX(xState.target, true);
		}
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			clearSwapTimers();
			swapBusy = false;
			swapPhase = 'idle';
			hasSwapped = false;
			const idx = selectedIndex();
			if (selectedId) {
				selectedId = null;
				galleryPaused = false;
				document.body.classList.remove('portfolio-locked');
				root.classList.remove('is-detail');
				trackWrap?.removeAttribute('aria-hidden');
				if (detail) detail.hidden = true;
				setDetailClasses();
				updateFloatTitle();
				if (idx >= 0) requestAnimationFrame(() => scrollToProject(idx, true));
			}
			return;
		}

		if (!selectedId) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
			e.preventDefault();
			goToProjectByOffset(1);
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
			e.preventDefault();
			goToProjectByOffset(-1);
		}
	};

	let detailWheelAccum = 0;
	const onOverlayWheel = (e: WheelEvent) => {
		if (!selectedId) return;
		e.preventDefault();
		if (swapBusy) return;
		const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
		detailWheelAccum += dy;
		const THRESHOLD = 72;
		if (Math.abs(detailWheelAccum) < THRESHOLD) return;
		const direction = detailWheelAccum > 0 ? 1 : -1;
		detailWheelAccum = 0;
		goToProjectByOffset(direction);
	};

	const onHome = () => {
		clearSwapTimers();
		swapBusy = false;
		swapPhase = 'idle';
		hasSwapped = false;
		selectedId = null;
		galleryPaused = false;
		document.body.classList.remove('portfolio-locked');
		root.classList.remove('is-detail');
		trackWrap?.removeAttribute('aria-hidden');
		if (detail) detail.hidden = true;
		setDetailClasses();
		updateFloatTitle();
		requestAnimationFrame(() => scrollToProject(0, false, true));
	};

	const copyEmail = async () => {
		if (!emailBtn) return;
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
		emailBtn.textContent = 'Email copié';
		emailBtn.setAttribute('aria-label', 'Email copié');
		if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
		emailCopiedTimer = window.setTimeout(() => {
			emailBtn.textContent = 'Email';
			emailBtn.setAttribute('aria-label', `Copier l’email ${email}`);
			emailCopiedTimer = null;
		}, 2000);
	};

	const onStripClick = (e: Event) => {
		if (drag.dragging) return;
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		const strip = (e.currentTarget as HTMLElement) ?? null;
		if (!strip) return;
		const id = strip.dataset.id;
		if (id) openProject(id);
	};

	measure();
	requestAnimationFrame(() => {
		measure();
		scrollToProject(activeIndex, true);
		requestAnimationFrame(updateMotion);
		root.classList.add('is-ready');
	});

	let pending = imgs().length;
	const onImageDone = () => {
		pending -= 1;
		if (pending <= 0) {
			measure();
			scrollToProject(activeIndex, true);
		}
	};
	if (pending > 0) {
		imgs().forEach((img) => {
			if (img.complete) onImageDone();
			else {
				img.addEventListener('load', onImageDone, { once: true });
				img.addEventListener('error', onImageDone, { once: true });
			}
		});
	}

	strips().forEach((strip) => strip.addEventListener('click', onStripClick));
	track.addEventListener('pointerdown', onPointerDown);
	track.addEventListener('lostpointercapture', onLostPointerCapture);
	window.addEventListener('wheel', onWheel, { passive: false });
	window.addEventListener('wheel', onOverlayWheel, { passive: false });
	window.addEventListener('pointermove', onPointerMove, { passive: false });
	window.addEventListener('pointerup', endDrag);
	window.addEventListener('pointercancel', endDrag);
	window.addEventListener('blur', onPointerLeaveWindow);
	window.addEventListener('resize', onResize);
	window.addEventListener('keydown', onKey);
	window.addEventListener('folio:home', onHome);
	detailClose?.addEventListener('click', closeProject);
	emailBtn?.addEventListener('click', copyEmail);

	updatePager();
	updateFloatTitle();

	return () => {
		if (tickerActive) gsap.ticker.remove(tick);
		clearHoveredStrip();
		clearSwapTimers();
		resetDrag();
		if (emailCopiedTimer) window.clearTimeout(emailCopiedTimer);
		strips().forEach((strip) => strip.removeEventListener('click', onStripClick));
		track.removeEventListener('pointerdown', onPointerDown);
		track.removeEventListener('lostpointercapture', onLostPointerCapture);
		window.removeEventListener('wheel', onWheel);
		window.removeEventListener('wheel', onOverlayWheel);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', endDrag);
		window.removeEventListener('pointercancel', endDrag);
		window.removeEventListener('blur', onPointerLeaveWindow);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('keydown', onKey);
		window.removeEventListener('folio:home', onHome);
		detailClose?.removeEventListener('click', closeProject);
		emailBtn?.removeEventListener('click', copyEmail);
		document.body.classList.remove('portfolio-locked');
		gsap.killTweensOf(content);
		gsap.killTweensOf(imgs());
		gsap.killTweensOf(strips());
	};
}
