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

type SimpleFormControl = SharedFormControlProps & {
	/**
	 * The form control element to use.
	 */
	is: 'hidden' | 'select' | 'textarea';
};

type TextFormControl = SharedFormControlProps & {
	/**
	 * The form control element to use.
	 */
	is: 'input';
	/**
	 * The placeholder of the form control element.
	 */
	placeholder?: string;
};

type CheckboxFormControl = SharedFormControlProps & {
	/**
	 * The form control element to use.
	 */
	is: 'checkbox' | 'radio';
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
	 * The form control element to use.
	 */
	is: 'button';
	/**
	 * The type of the button element.
	 *
	 * @defaultValue `'button'`
	 */
	type?: 'button' | 'submit';
};

export type FormControl = TextFormControl | CheckboxFormControl | ButtonFormControl | SimpleFormControl;

export type HTMLFormControlElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const DEFAULT_FORM_CONTROL: FormControl = {
	is: 'input',
	value: null,
	name: '',
	disabled: false,
	required: false,
	readonly: false,
	placeholder: '',
};

export const getFormControlElement = () =>
	class FormControlElement extends HTMLElement {
		static formAssociated = true;
		static observedAttributes = ['value', 'checked', 'disabled', 'required', 'readonly', 'placeholder'];
		#internals = this.attachInternals();
		#formControl: FormControl = DEFAULT_FORM_CONTROL;

		get formControl() {
			return this.#formControl;
		}
		set formControl(newValue: FormControl) {
			this.#formControl = newValue;
			this.#initInternals();
		}

		#busy = false;

		#initialValue: FormControlValue = null;
		#value: FormControlValue = null;
		set value(newValue: FormControlValue) {
			if (this.#busy) return;
			this.#busy = true;
			this.#value = newValue;
			this.#internals.setFormValue(newValue);
			requestAnimationFrame(() => {
				this.#updateValidity();
				this.#busy = false;
			});
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

		set checked(newValue: boolean) {
			if (this.#busy) return;
			this.#busy = true;
			if (this.#formControl.is === 'radio') {
				const parent = this.#internals.form ?? document;
				const radios = parent.querySelectorAll(`[name="${this.#formControl.name}"]`);
				for (const radio of radios) {
					if (radio === this) continue;
					if (radio instanceof HTMLInputElement && this.#internals.form === null && radio.form !== null) continue;
					if (radio.role === 'radio' || (radio instanceof HTMLInputElement && radio.type === 'radio')) {
						(radio as FormControlElement).checked = false;
					}
				}
			}
			this.#internals.ariaChecked = newValue ? 'true' : 'false';
			requestAnimationFrame(() => {
				this.#busy = false;
				this.value = newValue ? (this.#initialValue ?? 'on') : null;
			});
		}
		get checked() {
			return this.#internals.ariaChecked === 'true';
		}

		#handleClick = (() => {
			if (this.#formControl.is !== 'button') return;
			const type = this.#formControl.type ?? 'submit';
			if (type === 'submit') this.#internals.form?.requestSubmit();
		}).bind(this);

		#handleEnter = ((event: KeyboardEvent) => {
			if (event.key === 'Enter') this.#handleClick();
		}).bind(this);

		#handleReset = (() => {
			this.value = this.#initialValue;
		}).bind(this);

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
			this.#internals.form?.removeEventListener('keydown', this.#handleEnter);
			this.#internals.form?.removeEventListener('reset', this.#handleReset);
		}

		#initInternals() {
			this.#resetInternals();
			this.#updateValidity();
			const { form } = this.#internals;
			this.#initialValue = this.#formControl.value ?? null;
			this.#internals.ariaDisabled = String(this.#formControl.disabled);
			this.#internals.ariaRequired = String(this.#formControl.required);
			this.#internals.ariaReadOnly = String(this.#formControl.readonly);
			form?.addEventListener('reset', this.#handleReset);
			switch (this.#formControl?.is) {
				case 'button':
					this.#internals.role = 'button';
					this.addEventListener('mousedown', () => {
						this.#internals.ariaPressed = 'true';
					});
					this.addEventListener('mouseup', () => {
						this.#internals.ariaPressed = 'false';
					});
					if (form === null) break;
					this.addEventListener('click', this.#handleClick);
					form.addEventListener('keydown', this.#handleEnter);
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
					this.#internals.ariaChecked =
						this.#formControl.checked || this.#formControl.defaultChecked ? 'true' : 'false';
					this.checked = (this.#formControl.checked ?? false) || (this.#formControl.defaultChecked ?? false);
					break;
				case 'radio':
					this.#internals.role = 'radio';
					this.#internals.ariaChecked =
						this.#formControl.checked || this.#formControl.defaultChecked ? 'true' : 'false';
					this.checked = (this.#formControl.checked ?? false) || (this.#formControl.defaultChecked ?? false);
					break;
				case 'textarea':
					this.#internals.role = 'textbox';
					this.#internals.ariaMultiLine = 'true';
					break;
				case 'input':
					this.#internals.role = 'textbox';
					this.#internals.ariaPlaceholder = this.#formControl.placeholder ?? null;
					break;
			}
		}

		connectedCallback() {
			this.#initInternals();
		}

		disconnectedCallback() {
			this.#resetInternals();
		}

		attributeChangedCallback(name: string, oldValue: string, newValue: string | null) {
			if (oldValue === newValue) return;
			const bool = newValue === 'true' || newValue === '';
			if (name === 'value') this.value = newValue;
			if (name === 'checked') this.checked = bool;
			if (name === 'disabled') this.#internals.ariaDisabled = String(bool);
			if (name === 'required') this.#internals.ariaRequired = String(bool);
			if (name === 'readonly') this.#internals.ariaReadOnly = String(bool);
			if (name === 'placeholder') this.#internals.ariaPlaceholder = newValue;
		}

		get #input(): HTMLFormControlElement | null {
			if (this.#formControl.is === 'button') return null;
			const tagnameMap = {
				input: 'input',
				checkbox: 'input',
				radio: 'input',
				hidden: 'input',
				textarea: 'textarea',
				select: 'select',
				button: 'button',
			} as const;
			const tagname = tagnameMap[this.#formControl.is];
			return this.shadowRoot?.querySelector(tagname) ?? null;
		}

		#updateValidity() {
			const input = this.#input;
			if (input === null) return;
			this.#internals.setValidity(input.validity, input.validationMessage, input);
		}

		get validity(): ValidityState {
			return this.#internals.validity;
		}

		get validationMessage(): string {
			return this.#internals.validationMessage;
		}

		checkValidity() {
			return this.#internals.checkValidity();
		}

		reportValidity() {
			return this.#internals.reportValidity();
		}

		formDisabledCallback(disabled: boolean) {
			this.#internals.ariaDisabled = String(disabled);
		}
	};
