import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFormControlElement, MISSING_MESSAGE } from '../src/aria-utils';

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
			});
		});

		it('updates internals', () => {
			element.placeholder = 'test';
			const internals = element.peekInternals();
			expect(internals.role).toBe('textbox');
			expect(internals.ariaPlaceholder).toBe('test');
		});

		it('updates formControl correctly', () => {
			element.formControl = { is: 'button' };
			expect(element.formControl.is).toBe('button');
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

		it('updates role correctly', () => {
			element.role = 'button';
			expect(element.role).toBe('button');
		});

		it('gets readonly copy of internals', () => {
			const internals = element.peekInternals();
			expect(element.ariaPressed).toBe(null);
			expect(internals.ariaPressed).toBe(null);
			internals.ariaPressed = 'true';
			expect(element.ariaPressed).toBe(null);
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

		const expectValidity = (valid: boolean, element: FormControlElement) => {
			expect(element.validity.valid).toBe(valid);
			expect(element.checkValidity()).toBe(valid);
			expect(element.reportValidity()).toBe(valid);
		};

		it('updates validity', () => {
			expect(element.validity.valid).toBe(true);
			element.setCustomValidity('test');
			expect(element.validationMessage).toBe('test');
			expect(element.validity.customError).toBe(true);
			expectValidity(false, element);
			element.setCustomValidity('');
			expect(element.validationMessage).toBe('');
			expect(element.validity.customError).toBe(false);
			expectValidity(true, element);
			element.required = true;
			expect(element.validity.valueMissing).toBe(true);
			expect(element.validationMessage).toBe(MISSING_MESSAGE);
			expectValidity(false, element);
			element.value = 'test';
			expect(element.validity.valueMissing).toBe(false);
			expectValidity(true, element);
		});
	});

	describe('Select behavior', () => {
		beforeEach(() => {
			element.formControl = { is: 'select' };
		});
		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('combobox');
			expect(internals.ariaExpanded).toBe('false');
			expect(internals.ariaHasPopup).toBe('listbox');
			expect(internals.ariaAutoComplete).toBe('list');
			expect(internals.ariaMultiSelectable).toBe('false');
		});
	});

	describe('Checkbox behavior', () => {
		beforeEach(() => {
			element.formControl = {
				is: 'checkbox',
				name: 'test-checkbox',
			};
		});

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('checkbox');
			expect(internals.ariaChecked).toBe('false');
		});

		it('handles checked state', () => {
			element.checked = true;
			expect(element.checked).toBe(true);
		});

		it('handles inner checkbox', () => {
			const innerCheckbox = document.createElement('input');
			innerCheckbox.type = 'checkbox';
			element.shadowRoot?.appendChild(innerCheckbox);
			element.checked = true;
			expect(innerCheckbox.checked).toBe(true);
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
			element = document.createElement('form-control') as FormControlElement;
			element2 = document.createElement('form-control') as FormControlElement;
			element3 = document.createElement('form-control') as FormControlElement;
			element.attachShadow({ mode: 'open' });
			document.body.appendChild(element);
			document.body.appendChild(element2);
			document.body.appendChild(element3);
			element.formControl = {
				is: 'radio',
				name: 'test-radio',
			};
			element2.formControl = { ...element.formControl };
			element3.formControl = { ...element.formControl };
		});

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('radio');
			expect(internals.ariaChecked).toBe('false');
		});

		it('handles default state', () => {
			element.formControl = {
				is: 'radio',
				defaultChecked: true,
			};
			expect(element.checked).toBe(true);
			element2.formControl = {
				is: 'radio',
				checked: true,
			};
			expect(element2.checked).toBe(true);
		});

		it('unchecks other radio buttons in same group', () => {
			// add a native radio
			const radio = document.createElement('input');
			radio.type = 'radio';
			radio.setAttribute('name', 'test-radio');
			document.body.appendChild(radio);

			radio.checked = true;
			element.checked = true;
			element2.checked = true;
			element3.checked = true;

			expect(radio.checked).toBe(false);
			expect(element.checked).toBe(false);
			expect(element2.checked).toBe(false);
			expect(element3.checked).toBe(true);

			element2.remove();
			element3.remove();
		});

		it('does not uncheck non-radios', () => {
			// add a checkbox
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = true;
			document.body.appendChild(checkbox);

			// add a custom element
			const customCheckbox = document.createElement('x-checkbox');
			(customCheckbox as FormControlElement).checked = true;
			customCheckbox.role = 'checkbox';
			document.body.appendChild(customCheckbox);

			element.checked = true;
			expect(checkbox.checked).toBe(true);
			expect(element.checked).toBe(true);
			checkbox.remove();
			customCheckbox.remove();
		});

		it('does not uncheck radios outside the same form', () => {
			const form = document.createElement('form');
			document.body.appendChild(form);

			// add a native radio
			const radio = document.createElement('input');
			radio.type = 'radio';
			radio.setAttribute('name', 'test-radio');
			form.append(element, element2, radio);

			radio.checked = true;
			element.checked = true;
			element2.checked = true;
			element3.checked = true;

			expect(radio.checked).toBe(false);
			expect(element.checked).toBe(false);
			expect(element2.checked).toBe(true);
			expect(element3.checked).toBe(true);

			form.remove();
		});

		it('handles inner radio', () => {
			const innerRadio = document.createElement('input');
			innerRadio.type = 'radio';
			element.shadowRoot?.appendChild(innerRadio);
			element.checked = true;
			expect(innerRadio.checked).toBe(true);
		});
	});

	describe('Textarea behavior', () => {
		beforeEach(() => {
			element.formControl = { is: 'textarea' };
		});

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('textbox');
			expect(internals.ariaMultiLine).toBe('true');
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

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('button');
		});

		it('handles mouse events', () => {
			element.dispatchEvent(new MouseEvent('mousedown'));
			expect(element.peekInternals().ariaPressed).toBe('true');
			element.dispatchEvent(new MouseEvent('mouseup'));
			expect(element.peekInternals().ariaPressed).toBe('false');
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

		it('resets to default value', () => {
			element.formControl = { is: 'checkbox', defaultChecked: true };
			element.checked = false;
			form.reset();
			expect(element.checked).toBe(true);
			element.formControl = { is: 'checkbox', defaultChecked: false };
			element.checked = true;
			form.reset();
			expect(element.checked).toBe(false);
		});
	});

	describe('Attribute behavior', () => {
		beforeEach(() => {
			element = document.createElement('form-control') as FormControlElement;
			element.formControl = { is: 'input' };
		});

		it('handles value', async () => {
			element.setAttribute('value', 'test');
			expect(element.value).toBe('test');
			await Promise.resolve();
			element.removeAttribute('value');
			expect(element.value).toBe(null);
		});

		it('handles name', () => {
			element.setAttribute('name', 'test');
			expect(element.name).toBe('test');
			element.removeAttribute('name');
			expect(element.name).toBe(undefined);
		});

		it('handles checked', () => {
			element.setAttribute('checked', '');
			expect(element.checked).toBe(true);
			element.removeAttribute('checked');
			expect(element.checked).toBe(false);
		});

		it('handles disabled', () => {
			element.setAttribute('disabled', '');
			expect(element.disabled).toBe(true);
			element.removeAttribute('disabled');
			expect(element.disabled).toBe(false);
		});

		it('handles required', () => {
			element.setAttribute('required', '');
			expect(element.required).toBe(true);
			element.removeAttribute('required');
			expect(element.required).toBe(false);
		});

		it('handles readonly', () => {
			element.setAttribute('readonly', '');
			expect(element.readOnly).toBe(true);
			element.removeAttribute('readonly');
			expect(element.readOnly).toBe(false);
		});

		it('handles placeholder', () => {
			element.setAttribute('placeholder', 'test');
			expect(element.placeholder).toBe('test');
			element.removeAttribute('placeholder');
			expect(element.placeholder).toBe(null);
		});

		it('handles role', () => {
			element.setAttribute('role', 'button');
			expect(element.role).toBe('button');
			element.removeAttribute('role');
			expect(element.role).toBe(null);
		});
	});
});
