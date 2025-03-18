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

export const defineAria = (tag: keyof ReactShadowScope.CustomElements, formControl: FormControl) => {
	if (customElements.get(tag) !== undefined) return;
	class FormControlElement extends HTMLElement {
		static formAssociated = true;
		static observedAttributes = ['value', 'checked', 'disabled', 'required', 'readonly', 'placeholder'];
		#internals = this.attachInternals();

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

		#checked = false;
		set checked(newValue: boolean) {
			if (this.#busy) return;
			this.#busy = true;
			if (formControl.is === 'radio') {
				const parent = this.#internals.form ?? document;
				const radios = parent.querySelectorAll(`[name="${formControl.name}"]`);
				for (const radio of radios) {
					if (radio === this) continue;
					if (radio instanceof HTMLInputElement && this.#internals.form === null && radio.form !== null) continue;
					if (radio.role === 'radio' || (radio instanceof HTMLInputElement && radio.type === 'radio')) {
						(radio as FormControlElement).checked = false;
					}
				}
			}
			this.#checked = newValue;
			if (newValue) this.setAttribute('checked', '');
			else this.removeAttribute('checked');
			requestAnimationFrame(() => {
				this.#busy = false;
				this.value = newValue ? (this.#initialValue ?? 'on') : null;
			});
		}
		get checked() {
			return this.#checked;
		}

		#handleClick = (() => {
			if (formControl.is !== 'button') return;
			const type = formControl.type ?? 'submit';
			if (type === 'submit') this.#internals.form?.requestSubmit();
		}).bind(this);

		#handleEnter = ((event: KeyboardEvent) => {
			if (event.key === 'Enter') this.#handleClick();
		}).bind(this);

		#handleReset = (() => {
			this.value = this.#initialValue;
		}).bind(this);

		connectedCallback() {
			this.#updateValidity();
			const { form } = this.#internals;
			this.#initialValue = formControl.value ?? null;
			this.#internals.ariaDisabled = String(formControl.disabled);
			this.#internals.ariaRequired = String(formControl.required);
			this.#internals.ariaReadOnly = String(formControl.readonly);
			form?.addEventListener('reset', this.#handleReset);
			switch (formControl?.is) {
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
					this.#internals.ariaChecked = formControl.checked || formControl.defaultChecked ? 'true' : 'false';
					this.checked = (formControl.checked ?? false) || (formControl.defaultChecked ?? false);
					break;
				case 'radio':
					this.#internals.role = 'radio';
					this.#internals.ariaChecked = formControl.checked || formControl.defaultChecked ? 'true' : 'false';
					this.checked = (formControl.checked ?? false) || (formControl.defaultChecked ?? false);
					break;
				case 'textarea':
					this.#internals.role = 'textbox';
					this.#internals.ariaMultiLine = 'true';
					break;
				case 'input':
					this.#internals.role = 'textbox';
					this.#internals.ariaPlaceholder = formControl.placeholder ?? null;
			}
		}

		disconnectedCallback() {
			this.#internals.form?.removeEventListener('keydown', this.#handleEnter);
			this.#internals.form?.removeEventListener('reset', this.#handleReset);
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

		#updateValidity() {
			if (formControl.is === 'button') return;
			const input = this.shadowRoot?.querySelector(formControl.is) ?? null;
			if (input === null) return;
			const _input = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
			this.#internals.setValidity(_input.validity, _input.validationMessage, _input);
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
	}

	customElements.define(tag, FormControlElement);
};
