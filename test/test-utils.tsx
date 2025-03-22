import { render, type RenderOptions } from '@testing-library/react';
import { type ReactNode } from 'react';
import ReactDOMServer from 'react-dom/server';

export const ssr = async (ui: ReactNode, options?: RenderOptions) => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	container.innerHTML = ReactDOMServer.renderToString(ui);
	const result = render(ui, { ...options, hydrate: true, container });
	// wait for hydration to complete
	await new Promise<void>((resolve) => queueMicrotask(resolve));
	return result;
};

export const csr = async (ui: ReactNode, options?: RenderOptions) => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const result = render(ui, { ...options, container });
	// wait for shadow root to be attached
	await new Promise<void>((resolve) => queueMicrotask(resolve));
	return result;
};
