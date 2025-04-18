import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getFormControlElement,
	isTextFormControl,
	MISSING_MESSAGE,
	RANGE_OVERFLOW_MESSAGE,
	RANGE_UNDERFLOW_MESSAGE,
	STEP_MISMATCH_MESSAGE,
	TYPE_MISMATCH_MESSAGE,
	parseVariables,
	TOO_SHORT_MESSAGE,
	PATTERN_MISMATCH_MESSAGE,
	TOO_LONG_MESSAGE,
} from '../src/form-control-element';

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

	describe('Extra utilities', () => {
		it('checks if form control is a text control', () => {
			const result1 = isTextFormControl({ control: 'text' });
			const result2 = isTextFormControl({ control: 'number' });
			const result3 = isTextFormControl({ control: 'password' });
			const result4 = isTextFormControl({ control: 'email' });
			const result5 = isTextFormControl({ control: 'search' });
			const result6 = isTextFormControl({ control: 'tel' });
			const result7 = isTextFormControl({ control: 'url' });
			const result8 = isTextFormControl({ control: 'textarea' });
			const result9 = isTextFormControl(undefined);
			expect(result1).toBe(true);
			expect(result2).toBe(true);
			expect(result3).toBe(true);
			expect(result4).toBe(true);
			expect(result5).toBe(true);
			expect(result6).toBe(true);
			expect(result7).toBe(true);
			expect(result8).toBe(false);
			expect(result9).toBe(false);
		});
	});

	describe('Basic functionality', () => {
		it('initializes with default form control', () => {
			expect(element.formControl).toEqual({
				control: 'text',
				value: null,
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
			element.formControl = { control: 'button' };
			expect(element.formControl.control).toBe('button');
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
			element.pattern = '[a-z]{10}';
			expect(element.validity.patternMismatch).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(PATTERN_MISMATCH_MESSAGE));
			element.minLength = 5;
			expect(element.validity.tooShort).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(TOO_SHORT_MESSAGE, 5));
			element.maxLength = 10;
			element.value = 'testtesttest';
			expect(element.validity.tooLong).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(TOO_LONG_MESSAGE, 10));
		});

		it('parses values correctly', () => {
			expect(parseVariables('hello {} and {}.', 1, 2)).toBe('hello 1 and 2.');
			expect(parseVariables('hello {} and {}.', 'one', 'two')).toBe('hello one and two.');
		});

		it('updates validity for number inputs', async () => {
			element.formControl = { control: 'number', min: '10', max: '20', step: '1' };
			element.value = '9';
			expect(element.validity.rangeUnderflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_UNDERFLOW_MESSAGE, 10));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '21';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, 20));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '15.5';
			expect(element.validity.stepMismatch).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(STEP_MISMATCH_MESSAGE, 15, 16));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '16';
			expectValidity(true, element);
		});

		it('updates validity for date inputs', async () => {
			element.formControl = { control: 'date', min: '2021-01-01', max: '2021-12-31' };
			element.value = '2020-01-01';
			expect(element.validity.rangeUnderflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_UNDERFLOW_MESSAGE, '2021-01-01'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2022-01-01';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, '2021-12-31'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2021-02-01';
			expectValidity(true, element);
		});

		it('updates validity for time inputs', async () => {
			element.formControl = { control: 'time', min: '00:00', max: '12:00' };
			element.value = '23:00';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, '12:00'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '11:00';
			expectValidity(true, element);
		});

		it('updates validity for datetime-local inputs', async () => {
			element.formControl = { control: 'datetime-local', min: '2021-01-01T00:00', max: '2021-12-31T12:00' };
			element.value = '2020-01-01T00:00';
			expect(element.validity.rangeUnderflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_UNDERFLOW_MESSAGE, '2021-01-01T00:00'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2022-01-01T00:00';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, '2021-12-31T12:00'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2021-02-01T00:00';
			expectValidity(true, element);
		});

		it('updates validity for month inputs', async () => {
			element.formControl = { control: 'month', min: '2021-01', max: '2021-12' };
			element.value = '2020-01';
			expect(element.validity.rangeUnderflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_UNDERFLOW_MESSAGE, '2021-01'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2022-01';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, '2021-12'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2021-02';
			expectValidity(true, element);
		});

		it('updates validity for week inputs', async () => {
			element.formControl = { control: 'week', min: '2021-W01', max: '2021-W52' };
			element.value = '2020-W01';
			expect(element.validity.rangeUnderflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_UNDERFLOW_MESSAGE, '2021-W01'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2022-W01';
			expect(element.validity.rangeOverflow).toBe(true);
			expect(element.validationMessage).toBe(parseVariables(RANGE_OVERFLOW_MESSAGE, '2021-W52'));
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '2021-W02';
			expectValidity(true, element);
		});

		it('handles invalid values for range inputs', async () => {
			element.formControl = { control: 'number', min: '10', max: '20', step: '1' };
			element.value = 'test';
			expect(element.validity.badInput).toBe(true);
			expect(element.validationMessage).toBe(TYPE_MISMATCH_MESSAGE);
			expectValidity(false, element);
			await Promise.resolve();
			element.value = '11';
			expectValidity(true, element);
		});

		it('handles disabled state', () => {
			const consoleSpy = vi.spyOn(console, 'warn');
			element.disabled = true;
			expect(element.disabled).toBe(true);
			element.value = 'test';
			expect(element.value).toBe('test');
			expect(consoleSpy).toHaveBeenCalled();
		});

		it('syncs value from input to host element', async () => {
			const innerInput = document.createElement('input');
			innerInput.type = 'text';
			element.shadowRoot?.appendChild(innerInput);
			await Promise.resolve();
			element.value = 'test';
			expect(innerInput.value).toBe('test');
			element.formControl = { control: 'checkbox' };
			innerInput.type = 'checkbox';
			innerInput.checked = true;
			innerInput.dispatchEvent(new Event('change'));
			expect(element.checked).toBe(true);
			element.formControl = { control: 'radio' };
			innerInput.type = 'radio';
			innerInput.checked = false;
			innerInput.dispatchEvent(new Event('change'));
			expect(element.checked).toBe(false);
		});

		it('syncs props from host element to nested input', async () => {
			const innerInput = document.createElement('input');
			innerInput.type = 'text';
			element.shadowRoot?.appendChild(innerInput);
			await Promise.resolve();
			element.value = 'test';
			expect(innerInput.value).toBe('test');
			element.pattern = '[a-z]{10}';
			expect(innerInput.pattern).toBe('[a-z]{10}');
			element.minLength = 5;
			expect(innerInput.minLength).toBe(5);
			element.maxLength = 10;
			expect(innerInput.maxLength).toBe(10);
		});
	});

	describe('Select behavior', () => {
		beforeEach(() => {
			element.formControl = { control: 'select' };
		});
		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('combobox');
			expect(internals.ariaExpanded).toBe('false');
			expect(internals.ariaHasPopup).toBe('listbox');
			expect(internals.ariaAutoComplete).toBe('list');
			expect(internals.ariaMultiSelectable).toBe('false');
		});
		it('handles multiple select', () => {
			element.formControl = { control: 'select', multiple: true };
			const internals = element.peekInternals();
			expect(internals.ariaMultiSelectable).toBe('true');
		});
		it('syncs with native select', async () => {
			element.formControl = { control: 'select' };
			const innerSelect = document.createElement('select');
			const innerOption = document.createElement('option');
			innerOption.value = 'test';
			innerSelect.appendChild(innerOption);
			element.shadowRoot?.appendChild(innerSelect);
			await Promise.resolve();
			element.multiple = true;
			expect(element.multiple).toBe(true);
			expect(innerSelect.multiple).toBe(true);
			element.value = 'test';
			expect(innerSelect.value).toBe('test');
		});
	});

	describe('Checkbox behavior', () => {
		beforeEach(() => {
			element.formControl = {
				control: 'checkbox',
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

		it('handles inner checkbox', async () => {
			const innerCheckbox = document.createElement('input');
			innerCheckbox.type = 'checkbox';
			element.shadowRoot?.appendChild(innerCheckbox);
			await Promise.resolve();
			element.checked = true;
			expect(innerCheckbox.checked).toBe(true);
		});

		it('sets default checked state', () => {
			element.formControl = {
				control: 'checkbox',
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
				control: 'radio',
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
				control: 'radio',
				defaultChecked: true,
			};
			expect(element.checked).toBe(true);
			element2.formControl = {
				control: 'radio',
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

			// within the form
			radio.checked = true;
			element.checked = true;
			element2.checked = true;

			// orphan radio
			element3.checked = true;

			// within the form
			expect(radio.checked).toBe(false);
			expect(element.checked).toBe(false);
			expect(element2.checked).toBe(true);

			// orphan radio
			expect(element3.checked).toBe(true);

			form.remove();
		});

		it('handles inner radio', async () => {
			const innerRadio = document.createElement('input');
			innerRadio.type = 'radio';
			element.shadowRoot?.appendChild(innerRadio);
			await Promise.resolve();
			element.checked = true;
			expect(innerRadio.checked).toBe(true);
		});
	});

	describe('Textarea behavior', () => {
		beforeEach(() => {
			element.formControl = { control: 'textarea' };
		});

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('textbox');
			expect(internals.ariaMultiLine).toBe('true');
		});

		it('handles inner textarea', async () => {
			const innerTextarea = document.createElement('textarea');
			element.shadowRoot?.appendChild(innerTextarea);
			await Promise.resolve();
			element.value = 'test';
			expect(innerTextarea.value).toBe('test');
		});
	});

	describe('Button behavior', () => {
		let form: HTMLFormElement;
		const onSubmit = (e: SubmitEvent) => e.preventDefault();

		beforeEach(() => {
			element.formControl = {
				control: 'button',
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

		it('handles click events', async () => {
			const mockSubmit = vi.fn().mockImplementation(onSubmit);
			form.addEventListener('submit', mockSubmit);
			element.click();
			await Promise.resolve(); // wait for requestSubmit after microtask
			expect(mockSubmit).toHaveBeenCalled();
			form.removeEventListener('submit', mockSubmit);
		});

		it('handles enter key for form submission', async () => {
			const mockSubmit = vi.fn().mockImplementation(onSubmit);
			form.addEventListener('submit', mockSubmit);
			form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
			await Promise.resolve(); // wait for requestSubmit after microtask
			expect(mockSubmit).toHaveBeenCalled();
			form.removeEventListener('submit', mockSubmit);
		});
	});

	describe('Hidden input behavior', () => {
		beforeEach(() => {
			element.formControl = { control: 'hidden' };
		});

		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('none');
		});

		it('syncs with native hidden input', async () => {
			const innerInput = document.createElement('input');
			innerInput.type = 'hidden';
			element.shadowRoot?.appendChild(innerInput);
			await Promise.resolve();
			element.value = 'test';
			expect(innerInput.value).toBe('test');
		});
	});

	describe('All range inputs behavior', () => {
		it('updates internals', () => {
			element.formControl = { control: 'number' };
			const internals = element.peekInternals();
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'date' };
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'time' };
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'datetime-local' };
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'month' };
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'week' };
			expect(internals.role).toBe('spinbutton');
			element.formControl = { control: 'range' };
			expect(internals.role).toBe('slider');
		});
		it('handles inner range input', async () => {
			element.formControl = { control: 'range' };
			const innerRange = document.createElement('input');
			innerRange.type = 'range';
			element.shadowRoot?.appendChild(innerRange);
			await Promise.resolve();
			element.value = '10';
			expect(innerRange.value).toBe('10');
		});
		it('handles inner number input', async () => {
			element.formControl = { control: 'number' };
			const innerNumber = document.createElement('input');
			innerNumber.type = 'number';
			element.shadowRoot?.appendChild(innerNumber);
			await Promise.resolve();
			element.value = '10';
			element.min = 5;
			element.max = 15;
			element.step = 2;
			expect(innerNumber.value).toBe('10');
			expect(innerNumber.min).toBe('5');
			expect(innerNumber.max).toBe('15');
			expect(innerNumber.step).toBe('2');
		});
		it('handles inner date input', async () => {
			element.formControl = { control: 'date' };
			const innerDate = document.createElement('input');
			innerDate.type = 'date';
			element.shadowRoot?.appendChild(innerDate);
			await Promise.resolve();
			element.value = '2021-01-01';
			expect(innerDate.value).toBe('2021-01-01');
		});
		it('handles inner time input', async () => {
			element.formControl = { control: 'time' };
			const innerTime = document.createElement('input');
			innerTime.type = 'time';
			element.shadowRoot?.appendChild(innerTime);
			await Promise.resolve();
			element.value = '12:00';
			expect(innerTime.value).toBe('12:00');
		});
		it('handles inner datetime-local input', async () => {
			element.formControl = { control: 'datetime-local' };
			const innerDateTime = document.createElement('input');
			innerDateTime.type = 'datetime-local';
			element.shadowRoot?.appendChild(innerDateTime);
			await Promise.resolve();
			element.value = '2021-01-01T12:00';
			expect(innerDateTime.value).toBe('2021-01-01T12:00');
		});
		it('handles inner month input', async () => {
			element.formControl = { control: 'month' };
			const innerMonth = document.createElement('input');
			innerMonth.type = 'month';
			element.shadowRoot?.appendChild(innerMonth);
			await Promise.resolve();
			element.value = '2021-01';
			expect(innerMonth.value).toBe('2021-01');
		});
		it('handles inner week input', async () => {
			element.formControl = { control: 'week' };
			const innerWeek = document.createElement('input');
			innerWeek.type = 'week';
			element.shadowRoot?.appendChild(innerWeek);
			await Promise.resolve();
			element.value = '2021-W01';
			expect(innerWeek.value).toBe('2021-W01');
		});
	});

	describe('File input behavior', () => {
		beforeEach(() => {
			element.formControl = { control: 'file' };
		});
		it('updates internals', () => {
			const internals = element.peekInternals();
			expect(internals.role).toBe('button');
			expect(internals.ariaHasPopup).toBe('dialog');
		});
		it('handles inner file input', async () => {
			const innerFile = document.createElement('input');
			innerFile.type = 'file';
			element.shadowRoot?.appendChild(innerFile);
			await Promise.resolve();
			const file = new File(['test'], 'test.txt', { type: 'text/plain' });
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			innerFile.files = dataTransfer.files;
			element.files = dataTransfer.files;
			expect(innerFile.files.length).toBe(1);
			expect(innerFile.files[0].name).toBe('test.txt');
			expect(element.files.length).toBe(1);
			expect(element.files[0].name).toBe('test.txt');
		});
		it('handles accept attribute', async () => {
			element.formControl = { control: 'file' };
			const innerFile = document.createElement('input');
			innerFile.type = 'file';
			element.shadowRoot?.appendChild(innerFile);
			await Promise.resolve();
			element.accept = 'image/*';
			expect(element.accept).toBe('image/*');
			expect(innerFile.accept).toBe('image/*');
			element.formControl = { control: 'file', accept: '.txt' };
			expect(innerFile.accept).toBe('.txt');
			element.formControl = { control: 'file', accept: '' };
			expect(innerFile.accept).toBe('');
		});
		it('handles multiple attribute', async () => {
			element.formControl = { control: 'file' };
			const innerFile = document.createElement('input');
			innerFile.type = 'file';
			element.shadowRoot?.appendChild(innerFile);
			await Promise.resolve();
			element.multiple = true;
			expect(element.multiple).toBe(true);
			expect(innerFile.multiple).toBe(true);
			element.formControl = { control: 'file', multiple: false };
			expect(innerFile.multiple).toBe(false);
		});
	});

	describe('Form reset behavior', () => {
		let form: HTMLFormElement;

		beforeEach(() => {
			element.formControl = { control: 'text' };
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
			element.formControl = { control: 'checkbox', defaultChecked: true };
			element.checked = false;
			form.reset();
			expect(element.checked).toBe(true);
			element.formControl = { control: 'checkbox', defaultChecked: false };
			element.checked = true;
			form.reset();
			expect(element.checked).toBe(false);
		});
	});

	describe('Attribute behavior', () => {
		beforeEach(() => {
			element = document.createElement('form-control') as FormControlElement;
			element.formControl = { control: 'text' };
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

		it('handles min', () => {
			element.setAttribute('min', '1');
			expect(element.min).toBe('1');
			element.removeAttribute('min');
			expect(element.min).toBe(null);
		});

		it('handles max', () => {
			element.setAttribute('max', '10');
			expect(element.max).toBe('10');
			element.removeAttribute('max');
			expect(element.max).toBe(null);
		});

		it('handles step', () => {
			element.setAttribute('step', '2');
			expect(element.step).toBe('2');
			element.removeAttribute('step');
			expect(element.step).toBe(null);
		});
	});
});
