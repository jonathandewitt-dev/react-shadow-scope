import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Template } from '../src/template';
import { type CustomIntrinsicElement } from '../src/scope';
import { csr, ssr } from './test-utils';
import { css } from '../src/css-utils';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'x-element': CustomIntrinsicElement;
		}
	}
}

declare module 'react' {
	namespace JSX {
		interface IntrinsicElements extends ReactShadowScope.CustomElements {}
	}
}

describe('Template component', () => {
	beforeEach(() => {
		vi.resetModules();
		cleanup();
		Document.parseHTMLUnsafe = vi.fn().mockImplementation((html: string) => {
			const template = document.createElement('template');
			template.innerHTML = html;
			return template.content;
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('handles shadow root mode prop', async () => {
		await csr(
			<x-element data-testid="parent">
				<Template shadowRootMode="open">
					<div>Test content</div>
				</Template>
			</x-element>,
		);

		const parent = screen.getByTestId('parent');
		expect(parent?.shadowRoot?.mode).toBe('open');
	});

	it('handles shadow root clonable prop', async () => {
		await csr(
			<x-element data-testid="parent">
				<Template shadowRootClonable={true}>
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		expect(parent?.shadowRoot?.clonable).toBe(true);
	});

	it('forwards ref correctly', () => {
		const ref = React.createRef<HTMLTemplateElement>();
		render(
			<x-element data-testid="parent">
				<Template ref={ref} />
			</x-element>,
		);
		expect(ref.current).toBeTruthy();
		expect(ref.current instanceof HTMLTemplateElement).toBe(true);
	});

	it('renders children correctly', async () => {
		await csr(
			<x-element data-testid="parent">
				<Template>
					<div>Child content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		const div = parent.shadowRoot?.querySelector('div');
		expect(div?.textContent).toBe('Child content');
	});

	it('handles adopted stylesheets', async () => {
		const mockStyleSheets = [
			css`
				.test1 {
					color: red;
				}
			`,
			css`
				.test2 {
					color: blue;
				}
			`,
		];
		await ssr(
			<x-element data-testid="parent">
				<Template adoptedStyleSheets={mockStyleSheets}>
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		const styles = parent.shadowRoot?.adoptedStyleSheets;
		expect(styles).toHaveLength(2);
		expect(styles?.[0].cssRules?.[0]?.cssText).toBe('.test1 { color: red; }');
		expect(styles?.[1].cssRules?.[0]?.cssText).toBe('.test2 { color: blue; }');
	});
});
