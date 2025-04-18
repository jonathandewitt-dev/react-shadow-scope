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

type TextFormControlProps = {
	/**
	 * The placeholder of the form control element.
	 */
	placeholder?: string;
	/**
	 * The pattern of the form control element.
	 */
	pattern?: string;
	/**
	 * The minimum length of the form control value.
	 */
	minLength?: number;
	/**
	 * The maximum length of the form control value.
	 */
	maxLength?: number;
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
	control: 'hidden' | 'textarea' | 'color';
};

type SelectFormControl = SharedFormControlProps & {
	/**
	 * The input type or tag name of the form control element.
	 */
	control: 'select';
	/**
	 * When true, allows selecting multiple options.
	 */
	multiple?: boolean;
};

type FileFormControl = SharedFormControlProps & {
	/**
	 * The input type or tag name of the form control element.
	 */
	control: 'file';
	/**
	 * A comma-separated list of file types that the form control accepts.
	 */
	accept?: string;
	/**
	 * When true, allows selecting multiple files.
	 */
	multiple?: boolean;
	/**
	 * The files of the form control element.
	 */
	files?: FileList;
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
	TextFormControlProps & {
		/**
		 * The input type or tag name of the form control element.
		 */
		control: 'number';
	};

type TextFormControl = SharedFormControlProps &
	TextFormControlProps & {
		/**
		 * The input type or tag name of the form control element.
		 */
		control: 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';
	};

export const isTextFormControl = (formControl?: FormControlType): formControl is TextFormControl | NumberFormControl =>
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
	| SelectFormControl
	| FileFormControl
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
export const RANGE_UNDERFLOW_MESSAGE = 'Value must be greater than or equal to {}.';
export const RANGE_OVERFLOW_MESSAGE = 'Value must be less than or equal to {}.';
export const STEP_MISMATCH_MESSAGE = 'Please enter a valid value. The two nearest valid values are {} and {}.';
export const TYPE_MISMATCH_MESSAGE = 'Please enter a valid value.';
export const PATTERN_MISMATCH_MESSAGE = 'Please match the requested format.';
export const TOO_LONG_MESSAGE = 'Please shorten this text to no more than {} characters.';
export const TOO_SHORT_MESSAGE = 'Please lengthen this text to {} characters or more.';

export const parseVariables = (str: string, ...values: unknown[]) => {
	let i = 0;
	return str.replace(/\{\}/g, () => String(values[i++]));
};

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
			const prevDisabled = this.disabled;
			this.disabled = false;
			this.#internals.setFormValue(newValue);
			this.disabled = prevDisabled;
			if (prevDisabled) {
				console.warn(
					'FormControlElement: You are setting the value of a disabled form control. This may not be what you want. Disabled controls should not be editable.',
				);
			}
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
			if (this.#input !== undefined) this.#input.required = newValue;
			this.#updateValidity();
		}
		get required() {
			return this.#internals.ariaRequired === 'true';
		}

		set disabled(newValue: boolean) {
			this.#internals.ariaDisabled = String(newValue);
			if (this.#input !== undefined) this.#input.disabled = newValue;
		}
		get disabled() {
			return this.#internals.ariaDisabled === 'true';
		}

		set readOnly(newValue: boolean) {
			if (this.#input !== undefined) {
				if (newValue) this.#input.setAttribute('readonly', '');
				else this.#input.removeAttribute('readonly');
			}
			this.#internals.ariaReadOnly = String(newValue);
		}
		get readOnly() {
			return this.#internals.ariaReadOnly === 'true';
		}

		set placeholder(newValue: string | null) {
			if (this.#input !== undefined) {
				if (newValue !== null) this.#input.setAttribute('placeholder', newValue);
				else this.#input.removeAttribute('placeholder');
			}
			this.#internals.ariaPlaceholder = newValue;
		}
		get placeholder() {
			return this.#internals.ariaPlaceholder;
		}

		set min(newValue: string | number | null) {
			if (this.#input !== undefined) {
				if (newValue !== null) this.#input.setAttribute('min', String(newValue));
				else this.#input.removeAttribute('min');
			}
			this.#internals.ariaValueMin = newValue === null ? null : String(newValue);
			this.#updateValidity();
		}
		get min() {
			return this.#internals.ariaValueMin;
		}

		set max(newValue: string | number | null) {
			if (this.#input !== undefined) {
				if (newValue !== null) this.#input.setAttribute('max', String(newValue));
				else this.#input.removeAttribute('max');
			}
			this.#internals.ariaValueMax = newValue === null ? null : String(newValue);
			this.#updateValidity();
		}
		get max() {
			return this.#internals.ariaValueMax;
		}

		set step(newValue: string | number | null) {
			if (this.#input !== undefined) {
				if (newValue !== null) this.#input.setAttribute('step', String(newValue));
				else this.#input.removeAttribute('step');
			}
			this.#internals.ariaValueNow = newValue === null ? null : String(newValue);
			this.#updateValidity();
		}
		get step() {
			return this.#internals.ariaValueNow;
		}

		#files: FileList | null = null;
		set files(newValue: FileList | null) {
			this.#files = newValue;
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				this.#input.files = newValue;
			}
		}
		get files() {
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				this.#files = this.#input.files;
			}
			return this.#files;
		}

		#accept: string | null = null;
		set accept(newValue: string | null) {
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				if (newValue !== null) this.#input.accept = newValue;
			}
			this.#accept = newValue;
		}
		get accept() {
			return this.#accept;
		}

		set multiple(newValue: boolean) {
			const allowsMultiple = this.#formControl.control === 'file' || this.#formControl.control === 'select';
			if (this.#input !== undefined && allowsMultiple) {
				(this.#input as HTMLInputElement).multiple = newValue;
			}
			this.#internals.ariaMultiSelectable = String(newValue);
		}
		get multiple() {
			return this.#internals.ariaMultiSelectable === 'true';
		}

		#pattern: string | null = null;
		set pattern(newValue: string | null) {
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				if (newValue !== null) this.#input.pattern = newValue;
			}
			this.#pattern = newValue;
			this.#updateValidity();
		}
		get pattern() {
			return this.#pattern;
		}

		#minLength: number | null = null;
		set minLength(newValue: number | null) {
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				if (newValue !== null) this.#input.minLength = newValue;
			}
			this.#minLength = newValue;
			this.#updateValidity();
		}
		get minLength() {
			return this.#minLength;
		}

		#maxLength: number | null = null;
		set maxLength(newValue: number | null) {
			if (this.#input !== undefined && this.#input instanceof HTMLInputElement) {
				if (newValue !== null) this.#input.maxLength = newValue;
			}
			this.#maxLength = newValue;
			this.#updateValidity();
		}
		get maxLength() {
			return this.#maxLength;
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
			this.disabled = this.#formControl.disabled ?? false;
			this.required = this.#formControl.required ?? false;
			this.readOnly = this.#formControl.readonly ?? false;
			if (isTextFormControl(this.#formControl)) {
				this.placeholder = this.#formControl.placeholder ?? null;
			}
			if (isRangeOrNumberFormControl(this.#formControl)) {
				this.min = this.#formControl.min ?? null;
				this.max = this.#formControl.max ?? null;
				this.step = this.#formControl.step ?? null;
			}
			if (this.#formControl.control === 'file') {
				this.files = this.#formControl.files ?? null;
				this.accept = this.#formControl.accept ?? null;
			}
			if (this.#formControl.control === 'select' || this.#formControl.control === 'file') {
				this.multiple = this.#formControl.multiple ?? false;
			}
			this.#updateValidity();
			switch (this.#formControl?.control) {
				case 'file':
					this.#internals.role = 'button';
					this.#internals.ariaHasPopup = 'dialog';
					this.#internals.ariaMultiSelectable = String(this.#formControl.multiple ?? false);
					this.addEventListener('mousedown', this.#handleButtonPressed);
					this.addEventListener('mouseup', this.#handleButtonReleased);
					break;
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
					this.#internals.ariaMultiSelectable = String(this.#formControl.multiple ?? false);
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
			this.disabled = false;
			this.required = false;
			this.readOnly = false;
			this.placeholder = null;
			this.min = null;
			this.max = null;
			this.step = null;
			this.files = null;
			this.accept = null;
			this.multiple = false;
			this.#internals.role = null;
			this.#internals.ariaPressed = null;
			this.#internals.ariaExpanded = null;
			this.#internals.ariaHasPopup = null;
			this.#internals.ariaAutoComplete = null;
			this.#internals.ariaMultiSelectable = null;
			this.#internals.ariaChecked = null;
			this.#internals.ariaMultiLine = null;
			this.#internals.ariaValueMin = null;
			this.#internals.ariaValueMax = null;
			this.#internals.ariaValueNow = null;
			this.removeEventListener('mousedown', this.#handleButtonPressed);
			this.removeEventListener('mouseup', this.#handleButtonReleased);
			this.removeEventListener('click', this.#handleClickSubmit);
			this.#internals.form?.removeEventListener('keydown', this.#handleKeyboardSubmit);
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
			input?.addEventListener('input', this.#syncValue);
			input?.addEventListener('change', this.#syncValue);
			this.#input = input;
			this.#resetInternals();
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
				message = parseVariables(RANGE_UNDERFLOW_MESSAGE, this.#formControl.min);
			if (isRangeOrNumberFormControl(this.#formControl) && rangeOverflow)
				message = parseVariables(RANGE_OVERFLOW_MESSAGE, this.#formControl.max);
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
					message = parseVariables(STEP_MISMATCH_MESSAGE, lowNearest, highNearest);
				}
			}
			if (badInput) message = TYPE_MISMATCH_MESSAGE;
			const pattern = isTextFormControl(this.#formControl) && this.pattern !== null ? new RegExp(this.pattern) : null;
			const patternMismatch = pattern !== null && !pattern.test(String(this.#value));
			if (patternMismatch) message = PATTERN_MISMATCH_MESSAGE;
			const tooLong =
				isTextFormControl(this.#formControl) && this.maxLength !== null && this.maxLength < String(this.#value).length;
			if (tooLong) message = parseVariables(TOO_LONG_MESSAGE, this.maxLength);
			const tooShort =
				isTextFormControl(this.#formControl) && this.minLength !== null && this.minLength > String(this.#value).length;
			if (tooShort) message = parseVariables(TOO_SHORT_MESSAGE, this.minLength);

			// set the validity state
			const validity = {
				valueMissing,
				rangeOverflow,
				rangeUnderflow,
				stepMismatch,
				badInput,
				patternMismatch,
				tooLong,
				tooShort,
			};
			if (input === undefined) {
				this.#internals.setValidity(validity, message);
			} else {
				this.#internals.setValidity(
					{ ...input.validity, ...validity },
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

		connectedCallback() {
			this.#initInternals();
			this.#updateInput();
			this.#inputObserver.observe(this, {
				childList: true,
				subtree: true,
			});
			if (this.shadowRoot !== null) {
				this.#inputObserver.observe(this.shadowRoot, {
					childList: true,
					subtree: true,
				});
			}
		}

		disconnectedCallback() {
			this.#resetInternals();
			this.#inputObserver.disconnect();
			this.#input?.removeEventListener('input', this.#syncValue);
			this.#input?.removeEventListener('change', this.#syncValue);
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
			if (name === 'disabled') this.disabled = bool;
			if (name === 'required') this.required = bool;
			if (name === 'readonly') this.readOnly = bool;
			if (name === 'placeholder') this.placeholder = newValue;
			if (name === 'role') this.role = newValue;
			if (name === 'min') this.min = newValue;
			if (name === 'max') this.max = newValue;
			if (name === 'step') this.step = newValue;
		}
	};
