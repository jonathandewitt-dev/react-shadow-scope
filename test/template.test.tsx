import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Template, checkDSDSupport, cache } from '../src/template';
import { type CustomIntrinsicElement } from '../src/scope';
import { renderShadow } from './test-utils';
import { css } from '../src/css-utils';
import ReactDOMServer from 'react-dom/server';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'x-element': CustomIntrinsicElement;
		}
	}
}

describe('Template component', () => {
	beforeEach(() => {
		vi.resetModules();
		cleanup();
	});

	afterEach(() => {
		vi.resetAllMocks();
		vi.unstubAllGlobals();
		cache.dsdSupported = null;
	});

	it('checks DSD support correctly', () => {
		expect(checkDSDSupport()).toBe(true);
		cache.dsdSupported = false;
		expect(checkDSDSupport()).toBe(false);
		cache.dsdSupported = null;
		vi.stubGlobal('Document', {
			parseHTMLUnsafe: (html: string) => {
				const domParser = new DOMParser();
				return domParser.parseFromString(html, 'text/html');
			},
		});
		expect(checkDSDSupport()).toBe(false);
		vi.unstubAllGlobals();
		cache.dsdSupported = null;
		vi.stubGlobal('Document', undefined);
		expect(checkDSDSupport()).toBe(false);
	});

	it('adds default props', async () => {
		await renderShadow(
			<x-element data-testid="parent">
				<Template>
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		expect(parent?.shadowRoot?.mode).toBe('open');
		expect(parent?.shadowRoot?.clonable).toBe(false);
		expect(parent?.shadowRoot?.serializable).toBe(false);
		expect(parent?.shadowRoot?.delegatesFocus).toBe(false);
	});

	it('handles manual props', async () => {
		await renderShadow(
			<x-element data-testid="parent">
				<Template shadowRootClonable={true} shadowRootSerializable={true} shadowRootDelegatesFocus={true}>
					<div>Test content</div>
				</Template>
			</x-element>,
		);

		const parent = screen.getByTestId('parent');
		expect(parent?.shadowRoot?.clonable).toBe(true);
		expect(parent?.shadowRoot?.serializable).toBe(true);
		expect(parent?.shadowRoot?.delegatesFocus).toBe(true);
		cleanup();
		await renderShadow(
			<x-element data-testid="parent2">
				<Template shadowRootMode="closed">
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent2 = screen.getByTestId('parent2');
		expect(parent2?.shadowRoot).toBe(null);
	});

	it('renders correct template source before mounting', () => {
		cache.dsdSupported = false;

		// For useIsClient to simulate SSR:
		vi.spyOn(React, 'useSyncExternalStore').mockImplementation(() => false);

		const jsx = (
			<x-element>
				<Template>
					<div>Test content</div>
				</Template>
			</x-element>
		);

		const html = ReactDOMServer.renderToString(jsx);
		expect(html).toBe(
			'<x-element>' +
				'<template ' +
				'shadowrootmode="open" shadowrootclonable="false" shadowrootserializable="false" shadowrootdelegatesfocus="false"' +
				'>' +
				'<style></style>' +
				'<div>Test content</div>' +
				'</template>' +
				'</x-element>',
		);
	});

	it('renders null after DSD mounts', async () => {
		const templateRef = React.createRef<HTMLTemplateElement>();
		await renderShadow(
			<x-element data-testid="parent">
				<Template ref={templateRef}>
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		expect(parent.querySelector('template')).toBeNull();
		expect(templateRef.current).toBeTruthy();
		expect(templateRef.current?.parentElement).toBeNull();
	});

	it('renders children correctly', async () => {
		await renderShadow(
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

	it('attaches a shadow root imperatively when DSD is not supported', async () => {
		cache.dsdSupported = false;
		await renderShadow(
			<x-element data-testid="parent">
				<Template>
					<div>Test content</div>
				</Template>
			</x-element>,
		);
		const parent = screen.getByTestId('parent');
		expect(parent.shadowRoot).toBeTruthy();
		const div = parent.shadowRoot?.querySelector('div');
		expect(div?.textContent).toBe('Test content');
	});

	it('forwards ref correctly', async () => {
		const ref = React.createRef<HTMLTemplateElement>();
		await renderShadow(
			<x-element data-testid="parent">
				<Template ref={ref} />
			</x-element>,
		);
		expect(ref.current).toBeTruthy();
		expect(ref.current instanceof HTMLTemplateElement).toBe(true);
	});

	it('forwards function ref correctly', async () => {
		let refValue: HTMLTemplateElement | null = null;
		const refCallback = (el: HTMLTemplateElement | null) => {
			refValue = el;
		};

		await renderShadow(
			<x-element>
				<Template ref={refCallback} />
			</x-element>,
		);

		expect(refValue).toBeInstanceOf(HTMLTemplateElement);
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
		await renderShadow(
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

	it('falls back to style element when adopted stylesheets not supported', async () => {
		vi.stubGlobal('CSSStyleSheet', undefined);

		const styles = ['.test1 { color: red; }', '.test2 { color: blue; }'];

		await renderShadow(
			<x-element data-testid="parent">
				<Template adoptedStyleSheets={styles}>
					<div>Test content</div>
				</Template>
			</x-element>,
		);

		const parent = screen.getByTestId('parent');
		const styleElement = parent.shadowRoot?.querySelector('style');

		expect(styleElement).toBeTruthy();
		expect(styleElement?.textContent).toBe('.test1 { color: red; }.test2 { color: blue; }');
	});
});
