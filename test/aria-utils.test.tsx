import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFormControlElement } from '../src/aria-utils';

describe('Form Control Element', () => {
	class FormControlElement extends getFormControlElement() {}
	let element: FormControlElement;
	customElements.define('form-control', FormControlElement);

	beforeEach(() => {
		element = document.createElement('form-control') as FormControlElement;
		element.attachShadow({ mode: 'open' });
		document.body.appendChild(element);
	});

	afterEach(() => {
		element.remove();
		vi.resetAllMocks();
	});

	describe('Basic functionality', () => {
		it('initializes with default form control', () => {
			expect(element.formControl).toEqual({
				is: 'input',
				value: null,
				name: '',
				disabled: false,
				required: false,
				readonly: false,
				placeholder: '',
			});
		});

		it('updates value correctly', () => {
			element.value = 'test';
			expect(element.value).toBe('test');
		});

		it('updates placeholder correctly', () => {
			element.placeholder = 'test';
			expect(element.placeholder).toBe('test');
		});

		it('updates name correctly', () => {
			element.name = 'test';
			expect(element.name).toBe('test');
		});

		it('handles disabled state', () => {
			element.disabled = true;
			expect(element.disabled).toBe(true);
		});

		it('handles required state', () => {
			element.required = true;
			expect(element.required).toBe(true);
		});

		it('handles readonly state', () => {
			element.readOnly = true;
			expect(element.readOnly).toBe(true);
		});
	});

	describe('Checkbox behavior', () => {
		beforeEach(() => {
			element.formControl = {
				is: 'checkbox',
				name: 'test-checkbox',
			};
		});

		it('handles checked state', () => {
			element.checked = true;
			expect(element.checked).toBe(true);
		});

		it('sets default checked state', () => {
			element.formControl = {
				is: 'checkbox',
				defaultChecked: true,
			};
			expect(element.checked).toBe(true);
		});
	});

	describe('Radio button behavior', () => {
		let element2: FormControlElement;
		let element3: FormControlElement;

		beforeEach(() => {
			element2 = document.createElement('form-control') as FormControlElement;
			element3 = document.createElement('form-control') as FormControlElement;
			document.body.appendChild(element2);
			document.body.appendChild(element3);
			element.formControl = {
				is: 'radio',
				name: 'test-radio',
			};
			element2.formControl = { ...element.formControl };
			element3.formControl = { ...element.formControl };
		});

		it('unchecks other radio buttons in same group', () => {
			element.checked = true;
			element2.checked = true;
			element3.checked = true;

			expect(element.checked).toBe(false);
			expect(element2.checked).toBe(false);
			expect(element3.checked).toBe(true);

			element2.remove();
			element3.remove();
		});
	});

	describe('Button behavior', () => {
		let form: HTMLFormElement;
		const onSubmit = (e: SubmitEvent) => e.preventDefault();

		beforeEach(() => {
			element.formControl = {
				is: 'button',
				type: 'submit',
			};
			form = document.createElement('form');
			form.appendChild(element);
			document.body.appendChild(form);
		});

		it('handles click events', () => {
			const mockSubmit = vi.fn().mockImplementation(onSubmit);
			form.addEventListener('submit', mockSubmit);

			element.click();
			expect(mockSubmit).toHaveBeenCalled();
			form.removeEventListener('submit', mockSubmit);
		});

		it('handles enter key for form submission', () => {
			const mockSubmit = vi.fn().mockImplementation(onSubmit);
			form.addEventListener('submit', mockSubmit);

			form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
			expect(mockSubmit).toHaveBeenCalled();
			form.removeEventListener('submit', mockSubmit);
		});
	});

	describe('Form reset behavior', () => {
		let form: HTMLFormElement;

		beforeEach(() => {
			element.formControl = { is: 'input' };
			form = document.createElement('form');
			form.appendChild(element);
			document.body.appendChild(form);
		});

		it('resets to initial value', () => {
			element.value = 'changed';
			form.reset();
			expect(element.value).toBe(null);
		});
	});
});
