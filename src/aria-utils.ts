type FormControlValue = File | string | FormData | null;

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
};

type GenericFormControl = SharedFormControlProps & {
	/**
	 * The tag name of the form control element to use.
	 */
	is: 'input' | 'textarea' | 'select';
	/**
	 * The required state of the form control element.
	 */
	required?: boolean;
	/**
	 * The readonly state of the form control element.
	 */
	readonly?: boolean;
	/**
	 * The placeholder of the form control element.
	 */
	placeholder?: string;
};

type ButtonFormControl = SharedFormControlProps & {
	/**
	 * The tag name of the form control element to use.
	 */
	is: 'button';
	/**
	 * The type of the button element.
	 *
	 * @defaultValue `'button'`
	 */
	type?: 'button' | 'submit';
};

export type FormControl = GenericFormControl | ButtonFormControl;

export const defineAria = (tag: keyof ReactShadowScope.CustomElements, formControl: FormControl) => {
	if (customElements.get(tag) !== undefined) return;
	class FormControlElement extends HTMLElement {
		static formAssociated = true;
		static observedAttributes = ['value'];
		#internals = this.attachInternals();

		#value: FormControlValue = null;
		#busy = false;
		set value(newValue: FormControlValue) {
			if (this.#busy) return;
			this.#busy = true;
			this.#value = newValue;
			this.#internals.setFormValue(newValue);
			this.setAttribute('value', String(newValue ?? ''));
			this.#updateValidity();
			requestAnimationFrame(() => {
				this.#busy = false;
			});
		}
		get value() {
			return this.#value;
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
			this.value = '';
		}).bind(this);

		connectedCallback() {
			this.#updateValidity();
			const { form } = this.#internals;
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
				case 'textarea':
					this.#internals.ariaMultiLine = 'true';
				case 'input':
					this.#internals.role = 'textbox';
					this.#internals.ariaPlaceholder = formControl.placeholder ?? null;
				default:
					form?.addEventListener('reset', this.#handleReset);
					break;
			}
		}

		disconnectedCallback() {
			this.#internals.form?.removeEventListener('keydown', this.#handleEnter);
			this.#internals.form?.removeEventListener('reset', this.#handleReset);
		}

		attributeChangedCallback(name: string, oldValue: string, newValue: string | null) {
			if (oldValue === newValue) return;
			if (name === 'value') this.value = newValue;
		}

		#updateValidity() {
			if (formControl.is === 'button') return;
			setTimeout(() => {
				const input = this.shadowRoot?.querySelector(formControl.is) ?? document.createElement(formControl.is);
				this.#internals.setValidity(input.validity, input.validationMessage, input);
			}, 100);
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