type SharedFormControlProps = {
	/**
	 * The value of the form control element.
	 */
	value?: string;
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
	is: 'input' | 'textarea';
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
		static get formAssociated() {
			return true;
		}
		static get observedAttributes() {
			return ['value', 'type'];
		}
		#internals = this.attachInternals();
		connectedCallback() {
			this.#internals.setFormValue(formControl.value ?? '');
			this.#internals.ariaDisabled = String(formControl.disabled ?? false);
			const form = this.#internals.form;
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
					this.addEventListener('click', () => {
						const type = formControl.type ?? 'submit';
						if (type === 'submit') {
							form.dispatchEvent(new Event('submit', { cancelable: true }));
						}
					});
					form.addEventListener('keydown', (event) => {
						if (event.key === 'Enter') {
							this.click();
						}
					});
					form.addEventListener('submit', (event) => {
						if (event.isTrusted) return;
						form.requestSubmit();
					});
					break;
				case 'textarea':
					this.#internals.ariaMultiLine = 'true';
				case 'input':
					this.#internals.role = 'textbox';
					this.#internals.ariaPlaceholder = formControl.placeholder ?? null;
				default:
					this.#internals.ariaRequired = String(formControl.required ?? false);
					this.#internals.ariaReadOnly = String(formControl.readonly ?? false);
					form?.addEventListener('reset', () => {
						this.#internals.setFormValue('');
					});
					break;
			}
		}
		attributeChangedCallback(name: string, oldValue: string, newValue: string) {
			if (oldValue === newValue) return;
			switch (name) {
				case 'value': {
					this.#internals.setFormValue(newValue);
					break;
				}
				case 'required': {
					this.#internals.ariaRequired = newValue;
					break;
				}
				case 'readonly': {
					this.#internals.ariaReadOnly = newValue;
					break;
				}
				case 'placeholder': {
					this.#internals.ariaPlaceholder = newValue;
					break;
				}
			}
		}
	}
	customElements.define(tag, FormControlElement);
};