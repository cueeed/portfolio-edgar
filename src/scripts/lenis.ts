import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const header = document.querySelector('.site-header');
const headerOffset = header instanceof HTMLElement ? header.offsetHeight + 8 : 0;

new Lenis({
	autoRaf: true,
	anchors: {
		// Compense le header sticky (équivalent scroll-padding-top)
		offset: headerOffset,
	},
	lerp: 0.1,
	smoothWheel: true,
});
