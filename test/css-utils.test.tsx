import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { css, useCSS, isCSSStyleSheet, adoptedStylesSupported } from '../src/css-utils';

describe('CSS Utils', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('css tagged template', () => {
		it('returns CSSStyleSheet when supported', () => {
			const styles = css`
				.test {
					color: red;
				}
			`;
			if (adoptedStylesSupported()) {
				expect(styles).toBeInstanceOf(CSSStyleSheet);
				expect((styles as CSSStyleSheet).cssRules[0].cssText).toBe('.test { color: red; }');
			}
		});

		// it('returns string when constructible stylesheets not supported', () => {
		// 	vi.stubGlobal('CSSStyleSheet', undefined);
		// 	const styles = css`
		// 		.test {
		// 			color: red;
		// 		}
		// 	`;
		// 	expect(typeof styles).toBe('string');
		// 	expect(styles).toContain('.test { color: red; }');
		// });

		it('handles interpolated values correctly', () => {
			const color = 'blue';
			const styles = css`
				.test {
					color: ${color};
				}
			`;
			if (adoptedStylesSupported()) {
				expect((styles as CSSStyleSheet).cssRules[0].cssText).toBe('.test { color: blue; }');
			} else {
				expect(styles).toContain('.test { color: blue; }');
			}
		});

		it('handles invalid interpolated values', () => {
			const invalidValue = null;
			const styles = css`
				.test {
					color: ${invalidValue};
				}
			`;
			if (adoptedStylesSupported()) {
				expect((styles as CSSStyleSheet).cssRules[0].cssText).toBe('.test { }');
			} else {
				expect(styles).toContain('.test { color: ; }');
			}
		});
	});

	describe('useCSS hook', () => {
		it('returns same stylesheet for same symbol key', () => {
			const key = Symbol();
			const hook = useCSS(key);

			const styles1 = hook`
				.test { color: red; }
			`;
			const styles2 = hook`
				.test { color: blue; }
			`;

			expect(styles1).toBe(styles2);
		});

		it('returns different stylesheets for different symbol keys', () => {
			const key1 = Symbol();
			const key2 = Symbol();
			const hook1 = useCSS(key1);
			const hook2 = useCSS(key2);

			const styles1 = hook1`.test { color: red; }`;
			const styles2 = hook2`.test { color: blue; }`;

			expect(styles1).not.toBe(styles2);
		});

		it('updates existing stylesheet content', () => {
			const key = Symbol();
			const hook = useCSS(key);

			const styles1 = hook`.test { color: red; }`;
			const styles2 = hook`.test { color: blue; }`;

			if (adoptedStylesSupported()) {
				expect((styles1 as CSSStyleSheet).cssRules[0].cssText).toBe('.test { color: blue; }');
				expect((styles2 as CSSStyleSheet).cssRules[0].cssText).toBe('.test { color: blue; }');
			} else {
				expect(styles1).toContain('.test { color: blue; }');
				expect(styles2).toContain('.test { color: blue; }');
			}
		});
	});

	describe('isCSSStyleSheet', () => {
		it('returns true for CSSStyleSheet instances', () => {
			if (adoptedStylesSupported()) {
				const sheet = new CSSStyleSheet();
				expect(isCSSStyleSheet(sheet)).toBe(true);
			}
		});

		it('returns false for strings', () => {
			expect(isCSSStyleSheet('.test { color: red; }')).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isCSSStyleSheet(undefined)).toBe(false);
		});
	});
});
