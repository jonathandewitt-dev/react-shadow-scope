'use client';
import React from 'react';
import { type StyleSheet, css, getCSSText, isCSSStyleSheet, normalizedScope } from './css-utils';
import { Template } from './template';

export type CustomIntrinsicElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
	class?: string;
	for?: string;
};

// Declare the custom tag name as JSX
declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'react-shadow-scope': CustomIntrinsicElement;
		}
	}
}
declare module 'react' {
	namespace JSX {
		interface IntrinsicElements extends ReactShadowScope.CustomElements {}
	}
}

export type ScopeProps = React.PropsWithChildren<
	Partial<{
		/**
		 * The tag name of the custom element rendered by `<Scope>`
		 *
		 * @defaultValue `'react-shadow-scope'`
		 */
		tag: keyof ReactShadowScope.CustomElements;
		/**
		 * The stylesheet to encapsulate. Should be created by the exported `css` tagged template function.
		 */
		stylesheet: StyleSheet;
		/**
		 * Multiple stylesheets to encapsulate. Each should be created by the exported `css` tagged template function.
		 *
		 * @defaultValue `[]`
		 */
		stylesheets: StyleSheet[];
		/**
		 * The HREF of the stylesheet to encapsulate.
		 */
		href: string;
		/**
		 * Multiple HREFs of stylesheets to encapsulate.
		 *
		 * @defaultValue `[]`
		 */
		hrefs: string[];
		/**
		 * Event handler for when all remote stylesheets have been loaded. This also dispatches a `load` event on the host element.
		 */
		onLoad: (event: CustomEvent<{ hrefs: string[] }>) => void;
		/**
		 * Styles that will apply only when an external stylesheet is in the process of being fetched.
		 *
		 * @defaultValue `:host { visibility: hidden; }`
		 */
		pendingStyles: StyleSheet;
		/**
		 * Light DOM content reflected by the given template; this can be useful for excluding children from the scope.
		 */
		slottedContent: React.ReactNode;
		/**
		 * Some styles are included to make default behavior consistent across different browsers. Opt-out by setting this to false.
		 *
		 * @defaultValue `true`
		 */
		normalize: boolean;
	}> &
		React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
>;

type Cache = {
	cv: string;
	base: StyleSheet;
	normalize: StyleSheet;
	stylesheets: Map<string, CSSStyleSheet>;
};

// This object is kept in memory to prevent fetching and/or constructing the stylesheet(s) more than once.
// ATTN: This is exported for testing purposes only. Do not export this in the main module.
export const stylesheetCache: Cache = {
	cv: crypto.randomUUID(),
	base: css`
		@layer {
			/*
			Accessibility issues with display: contents; only affect semantic tags.
			<react-shadow-scope> lacks semantics (by default.)
			The @layer makes this trivial to override if necessary.
			*/
			:host {
				display: contents;
			}
		}
	`,
	normalize: css`
		${normalizedScope}
	`,
	stylesheets: new Map(),
};

const getLocation = () => {
	if (typeof location === 'undefined') return '';
	return location.origin;
};

/**
 * Creates a shadow DOM encapsulated scope for CSS.
 *
 * @example
 * ```tsx
 * <Scope stylesheet={styles} slottedContent={children}>
 *   <h1>Shadow DOM Content</h1>
 *   <slot></slot>
 * </Scope>
 * ```
 */
export const Scope = React.forwardRef<HTMLElement, ScopeProps>((props, forwardedRef) => {
	const {
		children,
		tag: Tag = 'react-shadow-scope',
		stylesheet,
		stylesheets = [],
		href,
		hrefs = [],
		pendingStyles = css`
			:host {
				visibility: hidden;
			}
		`,
		slottedContent,
		normalize = true,
		className,
		...forwardedProps
	} = props;

	const [hrefsLoaded, setHrefsLoaded] = React.useState<boolean>(false);
	const allHrefs = React.useMemo(() => (typeof href !== 'undefined' ? [href, ...hrefs] : hrefs), [href, hrefs.join()]);
	const pendingHrefs = React.useMemo(
		() => allHrefs.filter((href) => !stylesheetCache.stylesheets.has(href)),
		[allHrefs.join(), stylesheetCache.cv],
	);
	const pending = pendingHrefs.length > 0 && !hrefsLoaded;
	const [hrefStates, setHrefStates] = React.useState(
		pendingHrefs.map((href) => ({ href: href.replace(getLocation(), ''), loaded: false })),
	);

	const tagRef = React.useRef<HTMLElement | null>(null);

	React.useEffect(() => {
		// Synchronize internal tag ref with the forwarded ref
		if (typeof forwardedRef === 'function') {
			forwardedRef(tagRef.current);
		} else if (forwardedRef && typeof forwardedRef === 'object') {
			(forwardedRef as React.RefObject<unknown>).current = tagRef.current;
		}
	}, []);

	const onHrefLoad: React.EventHandler<React.SyntheticEvent<HTMLLinkElement>> = React.useCallback(
		(event) => {
			const link = event.target as HTMLLinkElement;
			const href = link.href.replace(location.origin, '');
			if (link.sheet !== null) {
				const constructedSheet = new CSSStyleSheet();
				constructedSheet.replaceSync(getCSSText(link.sheet));
				stylesheetCache.stylesheets.set(href, constructedSheet);
				stylesheetCache.cv = crypto.randomUUID();
			}
			const _hrefStates = hrefStates.map((state) => ({
				href: state.href,
				loaded: state.href === href || state.loaded,
			}));
			setHrefStates(_hrefStates);
			if (_hrefStates.every((state) => state.loaded)) {
				setHrefsLoaded(true);
				const event = new CustomEvent('load', { detail: { hrefs: allHrefs } });
				tagRef.current?.dispatchEvent(event);
				props.onLoad?.(event);
			}
		},
		[allHrefs.join()],
	);

	// Combine all stylesheets into a single string to use for change detection.
	// This may not be the most performant solution, but it may be necessary here...
	const styleText = [...stylesheets, stylesheet].map((s) => (isCSSStyleSheet(s) ? getCSSText(s) : s)).join('');

	const cssStyleSheets = React.useMemo(() => {
		const _cssStyleSheets: StyleSheet[] = [];
		if (normalize) _cssStyleSheets.push(stylesheetCache.normalize);
		_cssStyleSheets.push(stylesheetCache.base, ...stylesheets);
		if (pending) _cssStyleSheets.push(pendingStyles);
		for (const href of allHrefs) {
			const cachedSheet = stylesheetCache.stylesheets.get(href);
			if (cachedSheet !== undefined) _cssStyleSheets.push(cachedSheet);
		}
		if (typeof stylesheet !== 'undefined') _cssStyleSheets.push(stylesheet);
		return _cssStyleSheets;
	}, [pending, styleText, stylesheetCache.cv]);

	const convertedProps = className ? { class: className } : {};

	return (
		<Tag ref={tagRef} {...convertedProps} {...forwardedProps}>
			<Template
				shadowRootMode="open"
				shadowRootDelegatesFocus={true}
				shadowRootSerializable={true}
				adoptedStyleSheets={cssStyleSheets}
			>
				{hrefStates.map(({ href }) => (
					<React.Fragment key={href}>
						<link rel="stylesheet" href={href} onLoad={onHrefLoad} />
					</React.Fragment>
				))}
				{children}
			</Template>
			{slottedContent}
		</Tag>
	);
});
