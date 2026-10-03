export function prepareMaskText(el: HTMLElement) {
	if (el.dataset.maskReady === '1') return;

	const text = el.textContent ?? '';
	const label = text.replace(/\s+/g, ' ').trim();
	el.textContent = '';
	if (label) el.setAttribute('aria-label', label);

	[...text].forEach((char, index) => {
		const outer = document.createElement('span');
		outer.className = 'mask-text__char';
		outer.style.setProperty('--i', String(index));
		outer.setAttribute('aria-hidden', 'true');

		const inner = document.createElement('span');
		inner.className = 'mask-text__inner';
		inner.textContent = char === ' ' ? '\u00A0' : char;

		outer.appendChild(inner);
		el.appendChild(outer);
	});

	el.dataset.maskReady = '1';
}

export function playMaskText(el: HTMLElement) {
	prepareMaskText(el);
	el.classList.remove('is-in');
	void el.offsetWidth;
	requestAnimationFrame(() => {
		el.classList.add('is-in');
	});
}

export function playAllMaskTexts(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>('.mask-text').forEach(playMaskText);
}
