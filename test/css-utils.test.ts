import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { css, useCSS, isCSSStyleSheet, adoptedStylesSupported, getCSSText } from '../src/css-utils';

describe('CSS Utils', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.resetAllMocks();
		vi.unstubAllGlobals();
	});

	describe('isCSSStyleSheet', () => {
		it('returns true for CSSStyleSheet instances', () => {
			const sheet = new CSSStyleSheet();
			expect(isCSSStyleSheet(sheet)).toBe(true);
		});

		it('returns false for strings', () => {
			expect(isCSSStyleSheet('.test { color: red; }')).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isCSSStyleSheet(undefined)).toBe(false);
		});
	});

	describe('getCSSText', () => {
		it('returns CSS text from stylesheet', () => {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync('.test { color: red; }');
			expect(getCSSText(sheet)).toBe('.test { color: red; }');
		});
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

		it('returns string when constructible stylesheets not supported', () => {
			vi.stubGlobal('CSSStyleSheet', undefined);
			const styles = css`
				.test {
					color: red;
				}
			`;
			expect(typeof styles).toBe('string');
			expect(styles).toContain(`
				.test {
					color: red;
				}
			`);
			const hook = useCSS();
			const styles2 = hook`
				.test {
					color: blue;
				}
			`;
			expect(typeof styles2).toBe('string');
			expect(styles2).toContain(`
				.test {
					color: blue;
				}
			`);
		});

		it('handles interpolated values correctly', () => {
			const color = 'blue';
			const styles = css`
				.test {
					color: ${color};
				}
			`;
			expect((styles as CSSStyleSheet).cssRules[0].cssText).toBe('.test { color: blue; }');
			vi.stubGlobal('CSSStyleSheet', undefined);

			const styles2 = css`
				.test {
					color: ${color};
				}
			`;
			expect(typeof styles2).toBe('string');
			expect(styles2).toBe(`
				.test {
					color: blue;
				}
			`);
		});

		it('handles invalid interpolated values', () => {
			const invalidValue = null;
			const styles = css`
				.test {
					color: ${invalidValue};
				}
			`;
			expect((styles as CSSStyleSheet).cssRules[0].cssText).toBe('.test { }');
			vi.stubGlobal('CSSStyleSheet', undefined);
			const styles2 = css`
				.test {
					color: ${invalidValue};
				}
			`;
			expect(typeof styles2).toBe('string');
			expect(styles2).toContain(`
				.test {
					color: ;
				}
			`);
		});
	});

	describe('useCSS hook', () => {
		it('returns same stylesheet for same symbol key', () => {
			const key = Symbol();
			const hook = useCSS(key);

			const styles1 = hook`.test { color: red; }`;
			const styles2 = hook`.test { color: blue; }`;

			expect(styles1).toBe(styles2);

			vi.stubGlobal('CSSStyleSheet', undefined);
			const styles3 = hook`.test { color: green; }`;
			const styles4 = hook`.test { color: yellow; }`;

			// Different strings when constructible stylesheets are not supported
			expect(styles3).toBe(`.test { color: green; }`);
			expect(styles4).toBe(`.test { color: yellow; }`);
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

		it('updates existing stylesheet content', async () => {
			const key = Symbol();
			const hook = useCSS(key);

			const stylesheet = hook`.test { color: red; }` as CSSStyleSheet;
			expect(stylesheet.cssRules[0].cssText).toBe('.test { color: red; }');

			const stylesheet2 = hook`.test { color: blue; }` as CSSStyleSheet;
			await Promise.resolve();

			expect(stylesheet.cssRules[0].cssText).toBe('.test { color: blue; }');
			expect(stylesheet2.cssRules[0].cssText).toBe('.test { color: blue; }');
		});
	});
});
