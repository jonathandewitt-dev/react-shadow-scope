import { render, type RenderOptions } from '@testing-library/react';
import { type ReactNode } from 'react';

export const renderShadow = async (ui: ReactNode, options?: RenderOptions) => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const result = render(ui, { ...options, container });
	// wait for shadow root to be attached
	await Promise.resolve();
	return result;
};
