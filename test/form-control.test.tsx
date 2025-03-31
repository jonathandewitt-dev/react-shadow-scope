import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderShadow } from './test-utils';
import { FormControl } from '../src/form-control';
import { cleanup, screen } from '@testing-library/react';

describe('Form control', () => {
	afterEach(() => {
		cleanup();
	});

	it('handles checked state', async () => {
		await renderShadow(
			<FormControl tag="x-input" data-testid="control" control="checkbox" checked={true} name="test-checkbox">
				<input type="checkbox" />
			</FormControl>,
		);

		const control = screen.getByTestId('control');
		expect(control.hasAttribute('checked')).toBe(true);
	});

	it('defines a custom element', async () => {
		await renderShadow(
			<FormControl tag="x-input" control="text">
				<input />
			</FormControl>,
		);

		const XInputClass = customElements.get('x-input');
		expect(XInputClass).toBeTruthy();
		cleanup();
		await renderShadow(
			<FormControl tag="x-input" control="text">
				<input />
			</FormControl>,
		);
		expect(customElements.get('x-input')).toBe(XInputClass);
	});

	it('handles default checked state and state changes', async () => {
		cleanup();

		let resolve: () => void;
		const promise = new Promise<void>((res) => {
			resolve = res;
		});

		const TestCheckbox = () => {
			const [checked, setChecked] = React.useState(true);
			React.useEffect(() => setChecked(false), []);
			React.useEffect(() => {
				queueMicrotask(() => {
					const control: HTMLInputElement = screen.getByTestId('control');
					expect(control.checked).toBe(false);
					resolve();
				});
			}, [checked]);
			return (
				<FormControl
					tag="x-input"
					data-testid="control"
					control="checkbox"
					checked={checked}
					defaultChecked={true}
					name="test-checkbox"
				>
					<input type="checkbox" />
				</FormControl>
			);
		};

		// Test state update
		await renderShadow(<TestCheckbox />);

		const control: HTMLInputElement = screen.getByTestId('control');
		expect(control.checked).toBe(true);
		await promise;
	});

	it('handles className to class conversion', async () => {
		await renderShadow(
			<FormControl tag="x-input" data-testid="control" control="text" className="test-class">
				<div>Test content</div>
			</FormControl>,
		);

		const control = screen.getByTestId('control');
		expect(control.getAttribute('class')).toBe('test-class');
	});

	it('only adds checked and defaultChecked attributes for checkboxes and radios', async () => {
		await renderShadow(
			<FormControl tag="x-input" data-testid="control" control="text" name="test-checkbox">
				<input type="text" />
			</FormControl>,
		);

		const control = screen.getByTestId('control');
		expect(control.hasAttribute('checked')).toBe(false);
	});

	it('forwards ref correctly', async () => {
		const ref = React.createRef<HTMLElement>();
		await renderShadow(<FormControl tag="x-input" control="text" ref={ref} />);
		expect(ref.current).toBeTruthy();
	});

	it('forwards function ref correctly', async () => {
		let refValue: HTMLElement | null = null;
		const refCallback = (el: HTMLElement | null) => {
			refValue = el;
		};

		await renderShadow(<FormControl tag="x-input" data-testid="control" control="text" ref={refCallback} />);
		const control = screen.getByTestId('control');
		expect(refValue).toBe(control);
	});
});
