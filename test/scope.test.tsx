import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { type CustomIntrinsicElement, Scope } from '../src/scope';
import { css } from '../src/css-utils';
import { renderShadow } from './test-utils';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'x-custom': CustomIntrinsicElement;
		}
	}
}

describe('Scope component', () => {
	beforeEach(() => {
		vi.resetModules();
		cleanup();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Basic Rendering', () => {
		it('renders children in shadow DOM', async () => {
			await renderShadow(
				<Scope data-testid="scope">
					<div>Test content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const div = scope.shadowRoot?.querySelector('div');
			expect(div?.textContent).toBe('Test content');
		});

		it('applies provided stylesheet', async () => {
			await renderShadow(
				<Scope
					data-testid="scope"
					stylesheet={css`
						div {
							color: red;
						}
					`}
				>
					<div>Styled content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const styleSheets = scope.shadowRoot?.adoptedStyleSheets;
			expect(styleSheets?.[2]?.cssRules[0]?.cssText).toBe('div { color: red; }');
		});

		it('renders with custom tag', async () => {
			await renderShadow(
				<Scope tag="x-custom" data-testid="scope">
					<div>Custom tag content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			expect(scope.tagName.toLowerCase()).toBe('x-custom');
		});

		it('handles slotted content correctly', async () => {
			await renderShadow(
				<Scope data-testid="scope" slottedContent={<span>Slotted</span>}>
					<slot></slot>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const slotted = scope.querySelector('span');
			expect(slotted?.textContent).toBe('Slotted');
		});

		it('forwards ref correctly', () => {
			const ref = React.createRef<HTMLElement>();
			render(<Scope ref={ref} />);
			expect(ref.current).toBeTruthy();
		});
	});

	describe('Async stylesheets', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('applies pending styles', async () => {
			await renderShadow(
				<Scope
					data-testid="scope"
					href="/test1.css"
					pendingStyles={css`
						div {
							color: red;
						}
					`}
				>
					<div>Async content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const styleSheets = scope.shadowRoot?.adoptedStyleSheets;
			expect(styleSheets?.[2]?.cssRules[0]?.cssText).toBe('div { color: red; }');
		});

		it('renders with an async stylesheet', async () => {
			await renderShadow(
				<Scope data-testid="scope" href="/test1.css">
					<div>Async content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const link = scope.shadowRoot?.querySelector('link');
			expect(link?.getAttribute('href')).toBe('/test1.css');
		});

		it('renders with multiple async stylesheets', async () => {
			await renderShadow(
				<Scope data-testid="scope" hrefs={['/test1.css', '/test2.css']}>
					<div>Async content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const links = scope.shadowRoot?.querySelectorAll('link');
			expect(links?.[0]?.getAttribute('href')).toBe('/test1.css');
			expect(links?.[1]?.getAttribute('href')).toBe('/test2.css');
		});

		it('renders with multiple approaches together', async () => {
			await renderShadow(
				<Scope
					data-testid="scope"
					href="/test1.css"
					hrefs={['/test2.css']}
					stylesheet={css`
						div {
							color: blue;
						}
					`}
					pendingStyles={css`
						div {
							color: red;
						}
					`}
				>
					<div>Async content</div>
				</Scope>,
			);

			const scope = screen.getByTestId('scope');
			const styleSheets = scope.shadowRoot?.adoptedStyleSheets;
			expect(styleSheets?.[2]?.cssRules[0]?.cssText).toBe('div { color: red; }');
			expect(styleSheets?.[3]?.cssRules[0]?.cssText).toBe('div { color: blue; }');
			const links = scope.shadowRoot?.querySelectorAll('link');
			expect(links?.[0]?.getAttribute('href')).toBe('/test1.css');
			expect(links?.[1]?.getAttribute('href')).toBe('/test2.css');
		});
	});
});
