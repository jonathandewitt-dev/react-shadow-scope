import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Template } from '../src/template';

vi.mock('../src/css-utils', async () => {
	const { adoptedStylesSupported } = await import('../src/css-utils');
	return { adoptedStylesSupported };
});

describe('Template component', () => {
	beforeEach(() => {
		vi.resetModules();
		cleanup();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('renders template element on server side', () => {
		const { container } = render(
			<Template>
				<div>Test content</div>
			</Template>,
		);
		expect(container.querySelector('template')).toBeTruthy();
	});

	it('handles shadow root mode prop', () => {
		const { container } = render(
			<Template shadowRootMode="closed">
				<div>Test content</div>
			</Template>,
		);
		const template = container.querySelector('template');
		expect(template?.getAttribute('shadowrootmode')).toBe('closed');
	});

	it('handles shadow root clonable prop', () => {
		const { container } = render(
			<Template shadowRootClonable={true}>
				<div>Test content</div>
			</Template>,
		);
		const template = container.querySelector('template');
		expect(template?.getAttribute('shadowrootclonable')).toBe('true');
	});

	it('handles adopted style sheets', () => {
		const mockStyleSheets = ['.test { color: red; }'];
		const { container } = render(
			<Template adoptedStyleSheets={mockStyleSheets}>
				<div>Test content</div>
			</Template>,
		);
		const style = container.querySelector('template style');
		expect(style?.textContent).toBe('.test { color: red; }');
	});

	it('forwards ref correctly', () => {
		const ref = React.createRef<HTMLTemplateElement>();
		render(<Template ref={ref} />);
		expect(ref.current).toBeTruthy();
		expect(ref.current instanceof HTMLTemplateElement).toBe(true);
	});

	it('preserves other HTML attributes', () => {
		const { container } = render(
			<Template id="test-id" className="test-class">
				<div>Test content</div>
			</Template>,
		);
		const template = container.querySelector('template');
		expect(template?.id).toBe('test-id');
		expect(template?.className).toBe('test-class');
	});

	it('renders children correctly', () => {
		const { container } = render(
			<Template>
				<div data-testid="child">Child content</div>
			</Template>,
		);
		const template = container.querySelector('template');
		expect(template?.innerHTML).toContain('Child content');
	});

	it('handles multiple adopted stylesheets', () => {
		const mockStyleSheets = ['.test1 { color: red; }', '.test2 { color: blue; }'];
		const { container } = render(
			<Template adoptedStyleSheets={mockStyleSheets}>
				<div>Test content</div>
			</Template>,
		);
		const style = container.querySelector('template style');
		expect(style?.textContent).toBe('.test1 { color: red; }.test2 { color: blue; }');
	});
});
