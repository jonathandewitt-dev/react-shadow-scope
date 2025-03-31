import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { type CustomIntrinsicElement } from '../src/scope';
import { Tailwind } from '../src/tailwind';
import { css } from '../src/css-utils';
import { renderShadow } from './test-utils';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'x-tailwind': CustomIntrinsicElement;
		}
	}
}

describe('Tailwind component', () => {
	beforeEach(() => {
		vi.resetModules();
		cleanup();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('renders children in shadow DOM', async () => {
		await renderShadow(
			<Tailwind data-testid="tailwind">
				<div>Test content</div>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		const div = tailwind.shadowRoot?.querySelector('div');
		expect(div?.textContent).toBe('Test content');
	});

	it('renders with custom tag', async () => {
		await renderShadow(
			<Tailwind tag="x-tailwind" data-testid="tailwind">
				<div>Custom tag content</div>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		expect(tailwind.tagName.toLowerCase()).toBe('x-tailwind');
	});

	it('handles custom styles correctly', async () => {
		await renderShadow(
			<Tailwind
				data-testid="tailwind"
				customStyles={css`
					div {
						color: red;
					}
				`}
			>
				<div>Styled content</div>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		const styles = tailwind.shadowRoot?.adoptedStyleSheets;
		expect(styles?.[2]?.cssRules[0]?.cssText).toBe('div { color: red; }');
	});

	it('handles slotted content correctly', async () => {
		await renderShadow(
			<Tailwind data-testid="tailwind" slottedContent={<span>Slotted</span>}>
				<slot></slot>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		const slotted = tailwind.querySelector('span');
		expect(slotted?.textContent).toBe('Slotted');
	});

	it('forwards ref correctly', () => {
		const ref = React.createRef<HTMLElement>();
		render(<Tailwind ref={ref} />);
		expect(ref.current).toBeTruthy();
	});

	it('applies default pending styles', async () => {
		await renderShadow(
			<Tailwind data-testid="tailwind">
				<div>Content</div>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		const styles = tailwind.shadowRoot?.adoptedStyleSheets;
		expect(styles?.[1]?.cssRules[0]?.cssText).toContain(':host { visibility: hidden; }');
	});

	it('uses custom href for stylesheet', async () => {
		const customHref = '/custom-tailwind.css';
		await renderShadow(
			<Tailwind data-testid="tailwind" href={customHref}>
				<div>Content</div>
			</Tailwind>,
		);

		const tailwind = screen.getByTestId('tailwind');
		const link = tailwind.shadowRoot?.querySelector('link');
		expect(link?.getAttribute('href')).toBe(customHref);
	});
});
