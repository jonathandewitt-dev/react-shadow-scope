'use client';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { adoptedStylesSupported, type StyleSheet } from './css-utils';

// caching the result out here avoids parsing a fragment for each component instance
let declarativeShadowDOMSupported: boolean | null = null;
function checkDSDSupport(): boolean {
	if (typeof window === 'undefined') return false;
	if (declarativeShadowDOMSupported !== null) return declarativeShadowDOMSupported;

	// Parse a DSD fragment to check
	const fragment = Document.parseHTMLUnsafe('<div><template shadowrootmode="open"></template></div>');
	declarativeShadowDOMSupported = fragment.querySelector('div')!.shadowRoot !== null;
	return declarativeShadowDOMSupported;
}

export type TemplateProps = React.PropsWithChildren<
	{
		/**
		 * Creates a shadow root for the parent element. It is a declarative version of the Element.attachShadow() method and accepts the same enumerated values.
		 *
		 * `open` - Exposes the internal shadow root DOM for JavaScript.
		 *
		 * `closed` - Hides the internal shadow root DOM from JavaScript.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#shadowrootmode
		 */
		shadowRootMode?: ShadowRootMode;
		/**
		 * Sets the value of the clonable property of a `ShadowRoot` created using this element to `true`. If set, a clone of the shadow host (the parent element of this `<template>`) created with `Node.cloneNode()` or `Document.importNode()` will include a shadow root in the copy.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#shadowrootclonable
		 *
		 * @defaultValue `false`
		 */
		shadowRootClonable?: boolean;
		/**
		 * Sets the value of the serializable property of a `ShadowRoot` created using this element to `true`. If set, the shadow root may be serialized by calling the `Element.getHTML()` or `ShadowRoot.getHTML()` methods with the `options.serializableShadowRoots` parameter set true.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#shadowrootserializable
		 *
		 * @defaultValue `false`
		 */
		shadowRootSerializable?: boolean;
		/**
		 * When a non-focusable part of the shadow DOM is clicked, the first focusable part is given focus, and the shadow host is given any available :focus styling.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#shadowrootdelegatesfocus
		 *
		 * @defaultValue `false`
		 */
		shadowRootDelegatesFocus?: boolean;
		/**
		 * A list of constructed stylesheets to adopt. (This feature is not natively available as part of `<template>` elements.)
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
		 *
		 * @defaultValue `[]`
		 */
		adoptedStyleSheets?: StyleSheet[];
	} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLTemplateElement>, HTMLTemplateElement>
>;

const DEFAULT_TEMPLATE_ATTRS: TemplateProps = {
	shadowRootMode: 'open',
	shadowRootClonable: false,
	shadowRootSerializable: false,
	shadowRootDelegatesFocus: false,
} as const;

declare global {
	interface ShadowRootInit {
		clonable?: boolean; // missing from typescript but present in the spec
	}
}

const DEFAULT_SHADOWROOT_INIT: ShadowRootInit = {
	mode: 'closed',
	delegatesFocus: false,
	clonable: false,
	serializable: false,
	slotAssignment: 'named',
} as const;

const mapAttrsToInit = (props: TemplateProps): ShadowRootInit => ({
	mode: props.shadowRootMode ?? 'open',
	clonable: props.shadowRootClonable ?? false,
	serializable: props.shadowRootSerializable,
	delegatesFocus: props.shadowRootDelegatesFocus,
});

export const Template = React.forwardRef<HTMLTemplateElement, TemplateProps>((props: TemplateProps, forwardedRef) => {
	const { children, adoptedStyleSheets, ...forwardedProps } = props;
	const _props = {
		...DEFAULT_TEMPLATE_ATTRS,
		...forwardedProps,
	};
	const isClient = useIsClient();

	if (isClient) {
		return (
			<ClientTemplate adoptedStyleSheets={adoptedStyleSheets} {..._props} ref={forwardedRef}>
				{children}
			</ClientTemplate>
		);
	}

	// By the time React hydrates, the browser has already removed the template element
	if (checkDSDSupport()) return null;

	// Convert props to native attributes
	const nativeAttrs = Object.keys(_props).reduce(
		(p, k) => ({ ...p, [k.toLowerCase()]: String(_props[k as keyof typeof _props]) }),
		{},
	);

	const serverStyles = adoptedStyleSheets as string[] | undefined;

	// for SSR, use DSD template
	return (
		<template {...nativeAttrs} ref={forwardedRef}>
			<style>{serverStyles?.join('')}</style>
			{children}
		</template>
	);
});

const ClientTemplate = React.forwardRef<HTMLTemplateElement, TemplateProps>((props: TemplateProps, forwardedRef) => {
	const { children, adoptedStyleSheets, ...forwardedProps } = props;
	const templateRef = React.useRef<HTMLTemplateElement>(null);
	const [shadowRoot, setShadowRoot] = React.useState<ShadowRoot | null>(null);

	React.useLayoutEffect(() => {
		// Synchronize internal template ref with the forwarded ref
		if (typeof forwardedRef === 'function') {
			forwardedRef(templateRef.current);
		} else if (forwardedRef && typeof forwardedRef === 'object') {
			(forwardedRef as React.RefObject<unknown>).current = templateRef.current;
		}

		const parent = templateRef.current?.parentElement;
		if (!parent) return;

		if (parent.shadowRoot !== null) {
			parent.shadowRoot.replaceChildren();
		}

		queueMicrotask(() => {
			ReactDOM.flushSync(() => {
				try {
					const _shadowRoot =
						parent.shadowRoot ??
						parent.attachShadow({
							...DEFAULT_SHADOWROOT_INIT,
							...mapAttrsToInit(forwardedProps),
						});
					setShadowRoot(_shadowRoot);
				} catch {
					// The error is most likely thrown because the shadow root is already attached.
					// This is fine, since the state is already set in this case.
				}
			});
		});

		return () => setShadowRoot(null);
	}, []);

	React.useEffect(() => {
		if (adoptedStyleSheets === undefined || shadowRoot === null) return;
		if (adoptedStylesSupported()) {
			shadowRoot.adoptedStyleSheets = adoptedStyleSheets as CSSStyleSheet[];
		} else {
			const style = document.createElement('style');
			style.textContent = (adoptedStyleSheets as string[]).join('');
			shadowRoot?.appendChild(style);
		}
	}, [shadowRoot, adoptedStyleSheets]);

	return shadowRoot ? ReactDOM.createPortal(children, shadowRoot) : <template ref={templateRef} />;
});

const NOOP_SUBSCRIBE = () => () => void 0;

/**
 * Check if the component is being rendered on the client.
 * This is necessary for avoiding hydration issues with declarative shadow DOM.
 */
const useIsClient = () => {
	return React.useSyncExternalStore(
		NOOP_SUBSCRIBE,
		() => true,
		() => false,
	);
};
