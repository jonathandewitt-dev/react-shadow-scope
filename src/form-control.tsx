import React from 'react';
import { Scope, type ScopeProps } from './scope';
import {
	DEFAULT_FORM_CONTROL,
	type FormControlType,
	type FormControlValue,
	getFormControlElement,
	isTextFormControl,
	isRangeOrNumberFormControl,
} from './form-control-element';

export type FormControlProps = ScopeProps &
	FormControlType & {
		/**
		 * The tag name of the custom element rendered by `<FormControl>`
		 *
		 * This is required to be unique since a web component is needed for controls to reach forms across shadow DOM boundaries.
		 */
		tag: keyof ReactShadowScope.CustomElements;
	};

export const FormControl = React.forwardRef<HTMLElement, FormControlProps>((props, forwardedRef) => {
	const scopeRef = React.useRef<HTMLElement | null>(null);
	const id = React.useId();

	const { children, control, value, name, disabled, required, readonly, ...rest } = props;

	// @ts-expect-error // These props may be incompatible with some controls, but we still want to destructure them
	const { checked, defaultChecked, placeholder, min, max, step, files, multiple, accept, ...scopeProps } = rest;
	const Tag = scopeProps.tag ?? 'react-shadow-scope';
	const formControl: FormControlType = { ...DEFAULT_FORM_CONTROL };

	if (control !== undefined) formControl.control = control;
	const checkable = formControl.control === 'checkbox' || formControl.control === 'radio';
	const isPlaceholder = isTextFormControl(formControl);
	const isRangeOrNumber = isRangeOrNumberFormControl(formControl);
	const isButton = formControl.control === 'button' || formControl.control === 'image';
	if (value !== undefined) formControl.value = value;
	if (checked !== undefined && checkable) formControl.checked = checked;
	if (defaultChecked !== undefined && checkable) formControl.defaultChecked = defaultChecked;
	formControl.name = name ?? (isButton ? undefined : id);
	if (disabled !== undefined) formControl.disabled = disabled;
	if (required !== undefined) formControl.required = required;
	if (readonly !== undefined) formControl.readonly = readonly;
	if (placeholder !== undefined && isPlaceholder) formControl.placeholder = placeholder;
	if (min !== undefined && isRangeOrNumber) formControl.min = min;
	if (max !== undefined && isRangeOrNumber) formControl.max = max;
	if (step !== undefined && isRangeOrNumber) formControl.step = step;
	if (files !== undefined && formControl.control === 'file') formControl.files = files;
	const supportsMultiple = formControl.control === 'file' || formControl.control === 'select';
	if (multiple !== undefined && supportsMultiple) formControl.multiple = multiple;
	if (accept !== undefined && formControl.control === 'file') formControl.accept = accept;

	const [currentValue, setCurrentValue] = React.useState<FormControlValue>(formControl.value ?? null);
	const formControlValue = formControl.value ?? null;
	React.useEffect(() => {
		setCurrentValue(formControlValue);
	}, [formControlValue]);

	const [currentChecked, setCurrentChecked] = React.useState<boolean>((checkable && formControl.checked) ?? false);
	const formControlChecked = (checkable && formControl.checked) ?? false;
	React.useEffect(() => {
		setCurrentChecked(formControlChecked);
	}, [formControlChecked]);

	React.useEffect(() => {
		// Synchronize internal tag ref with the forwarded ref
		if (typeof forwardedRef === 'function') {
			forwardedRef(scopeRef.current);
		} else if (forwardedRef && typeof forwardedRef === 'object') {
			(forwardedRef as React.RefObject<unknown>).current = scopeRef.current;
		}
	}, []);

	React.useEffect(() => {
		// Define the custom element as a web component for the form control
		class FormControlElement extends getFormControlElement() {}
		if (customElements.get(Tag) === undefined) {
			customElements.define(Tag, FormControlElement);
		}
		(scopeRef.current as FormControlElement).formControl = formControl;
	}, [Tag, JSON.stringify(formControl)]);

	return (
		<Scope
			ref={scopeRef}
			// @ts-expect-error // name is valid for form controls
			name={formControl.name}
			value={currentValue}
			disabled={formControl.disabled ? '' : undefined}
			required={isButton ? undefined : formControl.required ? '' : undefined}
			readonly={isButton ? undefined : formControl.readonly ? '' : undefined}
			placeholder={isTextFormControl(formControl) ? formControl.placeholder : undefined}
			checked={checkable ? (currentChecked ? '' : undefined) : undefined}
			defaultChecked={checkable ? formControl.defaultChecked : undefined}
			{...scopeProps}
		>
			{children}
		</Scope>
	);
});
