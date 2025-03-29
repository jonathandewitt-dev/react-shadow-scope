export type FormControlValue = File | string | FormData | null;

type SharedFormControlProps = {
	/**
	 * The value of the form control element.
	 */
	value?: FormControlValue;
	/**
	 * The name of the form control element.
	 */
	name?: string;
	/**
	 * The disabled state of the form control element.
	 */
	disabled?: boolean;
	/**
	 * The required state of the form control element.
	 */
	required?: boolean;
	/**
	 * The readonly state of the form control element.
	 */
	readonly?: boolean;
};

type PlaceholderFormControlProps = {
	/**
	 * The placeholder of the form control element.
	 */
	placeholder?: string;
};

type RangeFormControlProps = {
	/**
	 * The minimum value of the form control element.
	 */
	min?: string | number;
	/**
	 * The maximum value of the form control element.
	 */
	max?: string | number;
	/**
	 * The step value of the form control element.
	 */
	step?: string | number;
};

type SimpleFormControl = SharedFormControlProps & {
	/**
	 * The input type or tag name of the form control element.
	 */
	control: 'hidden' | 'select' | 'textarea' | 'file' | 'color';
};

const RANGE_CONTROLS = ['range', 'time', 'date', 'datetime-local', 'month', 'week'] as const;

export const isRangeOrNumberFormControl = (
	formControl: FormControlType,
): formControl is RangeFormControl | NumberFormControl =>
	formControl.control === 'number' || RANGE_CONTROLS.includes(formControl.control as (typeof RANGE_CONTROLS)[number]);

type RangeFormControl = SharedFormControlProps &
	RangeFormControlProps & {
		/**
		 * The input type or tag name of the form control element.
		 */
		control: (typeof RANGE_CONTROLS)[number];
	};

type NumberFormControl = SharedFormControlProps &
	RangeFormControlProps &
	PlaceholderFormControlProps & {
		/**
		 * The input type or tag name of the form control element.
		 */
		control: 'number';
	};

type TextFormControl = SharedFormControlProps &
	PlaceholderFormControlProps & {
		/**
		 * The input type or tag name of the form control element.
		 */
		control: 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';
	};

export const isPlaceholderFormControl = (
	formControl?: FormControlType,
): formControl is TextFormControl | NumberFormControl =>
	formControl !== undefined &&
	['text', 'password', 'email', 'tel', 'url', 'search', 'number'].includes(formControl.control);

type CheckboxFormControl = SharedFormControlProps & {
	/**
	 * The input type or tag name of the form control element.
	 */
	control: 'checkbox' | 'radio';
	/**
	 * The checked state of the input element.
	 */
	checked?: boolean;
	/**
	 * The default checked state of the input element.
	 */
	defaultChecked?: boolean;
};

type ButtonFormControl = SharedFormControlProps & {
	/**
	 * The input type or tag name of the form control element.
	 */
	control: 'button' | 'image';
	/**
	 * The type of the button element.
	 *
	 * @defaultValue `'button'`
	 */
	type?: 'button' | 'submit' | 'reset';
};

export type FormControlType =
	| TextFormControl
	| CheckboxFormControl
	| ButtonFormControl
	| RangeFormControl
	| NumberFormControl
	| SimpleFormControl;

export type HTMLFormControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const DEFAULT_FORM_CONTROL: FormControlType = {
	control: 'text',
	value: null,
	disabled: false,
	required: false,
	readonly: false,
} as const;

export const MISSING_MESSAGE = 'Please fill out this field.';
export const RANGE_UNDERFLOW_MESSAGE = 'Value must be greater than or equal to ';
export const RANGE_OVERFLOW_MESSAGE = 'Value must be less than or equal to ';
export const STEP_MISMATCH_MESSAGE = 'Please enter a valid value. The two nearest valid values are ';
export const TYPE_MISMATCH_MESSAGE = 'Please enter a valid value.';

export const getFormControlElement = () =>
	class FormControlElement extends HTMLElement {
		static formAssociated = true;
		#internals = this.attachInternals();
		#formControl: FormControlType = DEFAULT_FORM_CONTROL;

		get formControl() {
			return this.#formControl;
		}
		set formControl(newValue: FormControlType) {
			this.#formControl = newValue;
			this.#initInternals();
		}

		#name?: string;
		set name(newValue: string | undefined) {
			this.#name = newValue;
			const attr = this.getAttribute('name');
			if (attr !== null && newValue === undefined) {
				this.removeAttribute('name');
			} else if (newValue !== undefined) {
				this.setAttribute('name', newValue);
			}
		}
		get name(): string | undefined {
			return this.#name;
		}

		#initialValue: FormControlValue = null;

		#valueSource = 'property';
		#value: FormControlValue = null;
		set value(newValue: FormControlValue) {
			if (this.#value === newValue) return;
			this.#internals.setFormValue(newValue);
			this.#value = newValue;
			if (this.#input !== undefined && this.#valueSource !== 'input') {
				// @ts-expect-error // value accepts more than just strings
				this.#input.value = newValue;
			}
			this.#updateValidity();
			this.#valueSource = 'property';
		}
		get value() {
			return this.#value;
		}

		set role(newValue: string | null) {
			this.#internals.role = newValue;
		}
		get role() {
			return this.#internals.role;
		}

		get form() {
			return this.#internals.form;
		}

		#checkedSource = 'property';
		set checked(newChecked: boolean) {
			if (this.#internals.ariaChecked !== null && this.checked === newChecked) return;
			this.#internals.ariaChecked = String(newChecked);
			if (newChecked && this.#formControl.control === 'radio') {
				const parent = this.#internals.form ?? document;
				const radios = parent.querySelectorAll<HTMLInputElement | FormControlElement>(
					`[name="${this.#formControl.name}"]`,
				);
				for (const radio of radios) {
					if (radio === this || this.#internals.form !== radio.form) continue;
					const isInput = radio instanceof HTMLInputElement;
					if (radio.role === 'radio' || (isInput && radio.type === 'radio')) {
						if (radio.checked) radio.checked = false;
					}
				}
			}
			if (
				this.#input !== undefined &&
				this.#input instanceof HTMLInputElement &&
				this.#input.type === this.#formControl.control &&
				this.#checkedSource !== 'input'
			) {
				this.#input.checked = newChecked;
			}
			this.#valueSource = 'checked';
			this.value = newChecked ? (this.#initialValue ?? 'on') : null;
			this.#checkedSource = 'property';
		}
		get checked() {
			return this.#internals.ariaChecked === 'true';
		}

		set required(newValue: boolean) {
			this.#internals.ariaRequired = String(newValue);
			this.#updateValidity();
		}
		get required() {
			return this.#internals.ariaRequired === 'true';
		}

		set disabled(newValue: boolean) {
			this.#internals.ariaDisabled = String(newValue);
		}
		get disabled() {
			return this.#internals.ariaDisabled === 'true';
		}

		set readOnly(newValue: boolean) {
			this.#internals.ariaReadOnly = String(newValue);
		}
		get readOnly() {
			return this.#internals.ariaReadOnly === 'true';
		}

		set placeholder(newValue: string | null) {
			this.#internals.ariaPlaceholder = newValue;
		}
		get placeholder() {
			return this.#internals.ariaPlaceholder;
		}

		get min() {
			return this.#internals.ariaValueMin;
		}
		set min(newValue: string | null) {
			this.#internals.ariaValueMin = newValue;
			this.#updateValidity();
		}

		get max() {
			return this.#internals.ariaValueMax;
		}
		set max(newValue: string | null) {
			this.#internals.ariaValueMax = newValue;
			this.#updateValidity();
		}

		get step() {
			return this.#internals.ariaValueNow;
		}
		set step(newValue: string | null) {
			this.#internals.ariaValueNow = newValue;
			this.#updateValidity();
		}

		#handleSubmit = ((event: Event) => {
			if (this.#formControl.control !== 'button' && this.#formControl.control !== 'image') return;
			const form = this.#internals.form;
			const type = this.#formControl.type ?? (form === null ? 'button' : 'submit');
			if (type !== 'submit' || this.disabled) return;

			// preserve the ability to cancel events before submit
			queueMicrotask(() => {
				if (event.defaultPrevented) return;
				form?.requestSubmit();
			});
		}).bind(this);

		#handleClickSubmit = ((event: MouseEvent) => {
			this.#handleSubmit(event);
		}).bind(this);

		#handleKeyboardSubmit = ((event: KeyboardEvent) => {
			if (event.key === 'Enter') this.#handleSubmit(event);
		}).bind(this);

		#handleButtonPressed = (() => {
			this.#internals.ariaPressed = 'true';
		}).bind(this);

		#handleButtonReleased = (() => {
			this.#internals.ariaPressed = 'false';
		}).bind(this);

		peekInternals() {
			return this.#internals;
		}

		#initInternals() {
			this.#resetInternals();
			const { form } = this.#internals;
			this.#initialValue = this.#formControl.value ?? null;
			this.name = this.#formControl.name;
			this.#internals.ariaDisabled = String(this.#formControl.disabled ?? false);
			this.#internals.ariaRequired = String(this.#formControl.required ?? false);
			this.#internals.ariaReadOnly = String(this.#formControl.readonly ?? false);
			this.#updateValidity();
			switch (this.#formControl?.control) {
				case 'image':
				case 'button':
					this.#internals.role = 'button';
					this.addEventListener('mousedown', this.#handleButtonPressed);
					this.addEventListener('mouseup', this.#handleButtonReleased);
					if (form === null) break;
					this.addEventListener('click', this.#handleClickSubmit);
					form.addEventListener('keydown', this.#handleKeyboardSubmit);
					break;
				case 'select':
					this.#internals.role = 'combobox';
					this.#internals.ariaExpanded = 'false';
					this.#internals.ariaHasPopup = 'listbox';
					this.#internals.ariaAutoComplete = 'list';
					this.#internals.ariaMultiSelectable = 'false';
					break;
				case 'checkbox':
					this.#internals.role = 'checkbox';
					this.#checkedSource = 'init-checkbox';
					this.checked = (this.#formControl.checked ?? false) || (this.#formControl.defaultChecked ?? false);
					break;
				case 'radio':
					this.#internals.role = 'radio';
					this.#checkedSource = 'init-radio';
					this.checked = (this.#formControl.checked ?? false) || (this.#formControl.defaultChecked ?? false);
					break;
				case 'textarea':
					this.#internals.role = 'textbox';
					this.#internals.ariaMultiLine = 'true';
					break;
				case 'password':
				case 'email':
				case 'tel':
				case 'url':
				case 'search':
				case 'text':
					this.#internals.role = 'textbox';
					this.#internals.ariaPlaceholder = this.#formControl.placeholder ?? null;
					break;
				case 'number':
				case 'range':
				case 'time':
				case 'date':
				case 'datetime-local':
				case 'month':
				case 'week':
					this.#internals.role = this.#formControl.control === 'range' ? 'slider' : 'spinbutton';
					this.#internals.ariaValueMin = String(this.#formControl.min) ?? null;
					this.#internals.ariaValueMax = String(this.#formControl.max) ?? null;
					this.#internals.ariaValueNow = String(this.#formControl.step) ?? null;
					break;
				case 'hidden':
					this.#internals.role = 'none';
					break;
			}
		}

		#resetInternals() {
			this.#internals.role = null;
			this.#internals.ariaDisabled = null;
			this.#internals.ariaRequired = null;
			this.#internals.ariaReadOnly = null;
			this.#internals.ariaPressed = null;
			this.#internals.ariaExpanded = null;
			this.#internals.ariaHasPopup = null;
			this.#internals.ariaAutoComplete = null;
			this.#internals.ariaMultiSelectable = null;
			this.#internals.ariaChecked = null;
			this.#internals.ariaMultiLine = null;
			this.#internals.ariaPlaceholder = null;
			this.#internals.ariaValueMin = null;
			this.#internals.ariaValueMax = null;
			this.#internals.ariaValueNow = null;
			this.removeEventListener('mousedown', this.#handleButtonPressed);
			this.removeEventListener('mouseup', this.#handleButtonReleased);
			this.removeEventListener('click', this.#handleClickSubmit);
			this.#internals.form?.removeEventListener('keydown', this.#handleKeyboardSubmit);
		}

		#inputSubscribers = new Set<(input: HTMLFormControlElement) => void>();
		#subscribeToInput(callback: (input: HTMLFormControlElement) => void) {
			if (this.#input !== undefined) callback(this.#input);
			this.#inputSubscribers.add(callback);
		}
		#input: HTMLFormControlElement | undefined;
		#inputObserver = new MutationObserver(this.#updateInput.bind(this));
		#updateInput() {
			const { control } = this.#formControl;
			if (control === 'button') return;
			const tagnameMap = {
				text: 'input',
				checkbox: 'input',
				radio: 'input',
				hidden: 'input',
				password: 'input',
				email: 'input',
				number: 'input',
				tel: 'input',
				url: 'input',
				image: 'input',
				file: 'input',
				month: 'input',
				week: 'input',
				date: 'input',
				'datetime-local': 'input',
				color: 'input',
				range: 'input',
				time: 'input',
				search: 'input',
				textarea: 'textarea',
				select: 'select',
			} as const;
			const tagname = tagnameMap[control];
			const _selector = tagname === 'input' ? `input[type="${control}"]` : tagname;
			const selector = _selector.endsWith('[type="text"]') ? `${_selector}, input:not([type])` : _selector;
			const input = this.shadowRoot?.querySelector<HTMLFormControlElement>(selector) ?? undefined;
			if (input !== undefined) {
				this.#inputSubscribers.forEach((callback) => callback(input));
			}
			this.#input = input;
		}

		#convertForComparison(_value: number | FormControlValue): number | Date {
			const value = typeof _value === 'number' ? String(_value) : _value;
			if (typeof value !== 'string') return 0;
			if (this.#formControl.control === 'date') {
				return new Date(value);
			}
			if (this.#formControl.control === 'time') {
				const today = new Date();
				const iso = today.toISOString().slice(0, 10);
				return new Date(`${iso}T${value}`);
			}
			if (this.#formControl.control === 'datetime-local') {
				return new Date(value);
			}
			if (this.#formControl.control === 'month') {
				return new Date(`${value}-01`);
			}
			if (this.#formControl.control === 'week') {
				const decimal = value.replace('-W', '.');
				return decimal === '' ? 0 : Number(decimal);
			}
			return Number(value);
		}

		#updateValidity() {
			const input = this.#input;
			const empty = this.#value === null || this.#value === '';
			const valueMissing = this.#internals.ariaRequired === 'true' && empty;

			// check for range control validity
			const rangeUnderflow =
				isRangeOrNumberFormControl(this.#formControl) &&
				this.#value !== null &&
				this.#formControl.min !== undefined &&
				this.#convertForComparison(this.#value) < this.#convertForComparison(this.#formControl.min);
			const rangeOverflow =
				isRangeOrNumberFormControl(this.#formControl) &&
				this.#value !== null &&
				this.#formControl.max !== undefined &&
				this.#convertForComparison(this.#value) > this.#convertForComparison(this.#formControl.max);
			let numbers = { min: NaN, max: NaN, step: NaN, value: NaN };
			if (this.#formControl.control === 'number') {
				numbers = {
					min: Number(this.#formControl.min),
					max: Number(this.#formControl.max),
					step: Number(this.#formControl.step),
					value: Number(this.#value),
				};
			}
			const stepMismatch =
				this.#formControl.control === 'number' &&
				this.#value !== null &&
				this.#formControl.step !== undefined &&
				!isNaN(numbers.min) &&
				!isNaN(numbers.step) &&
				!isNaN(numbers.value) &&
				numbers.value % numbers.step !== 0;
			const badInput = this.#formControl.control === 'number' && isNaN(numbers.value);

			// determine the validity message
			let message = '';
			if (valueMissing) message = MISSING_MESSAGE;
			if (isRangeOrNumberFormControl(this.#formControl) && rangeUnderflow)
				message = RANGE_UNDERFLOW_MESSAGE + this.#formControl.min;
			if (isRangeOrNumberFormControl(this.#formControl) && rangeOverflow)
				message = RANGE_OVERFLOW_MESSAGE + this.#formControl.max;
			if (isRangeOrNumberFormControl(this.#formControl) && stepMismatch) {
				const min = Number(this.#formControl.min);
				const max = Number(this.#formControl.max);
				const step = Number(this.#formControl.step);
				const value = Number(this.#value);
				if (!isNaN(min) || !isNaN(max) || !isNaN(step) || !isNaN(value)) {
					let lowNearest = min;
					let highNearest = max;
					for (let i = min; i <= value + step; i += step) {
						if (i < value) lowNearest = i;
						if (i > value && highNearest === max) highNearest = i;
					}
					message = STEP_MISMATCH_MESSAGE + lowNearest + ' and ' + highNearest;
				}
			}
			if (badInput) message = TYPE_MISMATCH_MESSAGE;

			// set the validity state
			if (input === undefined) {
				this.#internals.setValidity({ valueMissing, rangeOverflow, rangeUnderflow, stepMismatch, badInput }, message);
			} else {
				this.#internals.setValidity(
					{ ...input.validity, valueMissing, rangeOverflow, rangeUnderflow, stepMismatch, badInput },
					message !== '' ? message : input.validationMessage,
					input,
				);
			}
		}

		get validity(): ValidityState {
			return this.#internals.validity;
		}

		get validationMessage(): string {
			return this.#internals.validationMessage;
		}

		setCustomValidity(message: string) {
			const validity = this.#input?.validity ?? {};
			this.#internals.setValidity({ ...validity, customError: message !== '' }, message, this.#input);
		}

		checkValidity() {
			return this.#internals.checkValidity();
		}

		reportValidity() {
			return this.#internals.reportValidity();
		}

		formResetCallback() {
			if ('defaultChecked' in this.#formControl) {
				this.#checkedSource = 'reset';
				this.checked = this.#formControl.defaultChecked ?? false;
			} else {
				this.#valueSource = 'reset';
				this.value = this.#initialValue;
			}
			this.#initInternals();
		}

		#syncValue = (() => {
			const input = this.#input!;
			this.#valueSource = 'input';
			this.value = input.value;
			if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
				this.#checkedSource = 'input';
				this.checked = input.checked;
			}
		}).bind(this);

		connectedCallback() {
			this.#initInternals();
			this.#updateInput();
			this.#subscribeToInput((input) => {
				input.addEventListener('input', this.#syncValue);
				input.addEventListener('change', this.#syncValue);
			});
			this.#inputObserver.observe(this, {
				childList: true,
				subtree: true,
			});
		}

		disconnectedCallback() {
			this.#resetInternals();
		}

		static observedAttributes = [
			'value',
			'name',
			'checked',
			'disabled',
			'required',
			'readonly',
			'placeholder',
			'role',
			'min',
			'max',
			'step',
		];

		attributeChangedCallback(name: string, oldValue: string, newValue: string | null) {
			if (oldValue === newValue) return;
			const bool = newValue !== null;
			if (name === 'value') {
				this.#valueSource = 'attribute';
				this.value = newValue;
			}
			if (name === 'checked') {
				this.#checkedSource = 'attribute';
				this.checked = bool;
			}
			if (name === 'name') this.#name = newValue ?? undefined;
			if (name === 'disabled') this.#internals.ariaDisabled = String(bool);
			if (name === 'required') this.#internals.ariaRequired = String(bool);
			if (name === 'readonly') this.#internals.ariaReadOnly = String(bool);
			if (name === 'placeholder') this.#internals.ariaPlaceholder = newValue;
			if (name === 'role') this.role = newValue;
			if (name === 'min') this.min = newValue;
			if (name === 'max') this.max = newValue;
			if (name === 'step') this.step = newValue;
		}
	};
