import React from 'react';
import ReactDOM from 'react-dom';

let declarativeShadowDOMSupported: boolean | null = null;
function checkDSDSupport(): boolean {
  if (declarativeShadowDOMSupported !== null) return declarativeShadowDOMSupported;
  const html = `<div><template shadowrootmode="open"></template></div>`;

  // @ts-ignore-next-line: TS doesn't know the DOMParser supports a 3rd argument.
  const fragment = new DOMParser().parseFromString(html, 'text/html', {
    includeShadowRoots: true,
  });
  declarativeShadowDOMSupported = !!fragment.querySelector('div')?.shadowRoot;
  return declarativeShadowDOMSupported;
}

// We have to patch React's interface for HTML attributes for now, since it currently errors on `shadowrootmode`
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    /**
     * The encapsulation mode for the shadow DOM tree.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#mode
     *
     * @defaultValue `'open'`
     */
    shadowrootmode?: ShadowRootMode;
  }
}

// We also have to patch ReactDOM's types to accept ShadowRoot as a valid portal
declare module 'react-dom' {
  function createPortal(children: React.ReactNode, container: Element | ShadowRoot, key?: null | string): React.ReactPortal;
}

export type TemplateProps = React.PropsWithChildren<
  {
    /**
     * When a non-focusable part of the shadow DOM is clicked, the first focusable part is given focus, and the shadow host is given any available :focus styling.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#delegatesfocus
     *
     * @defaultValue `false`
     */
    delegatesFocus?: boolean;
    /**
     * A list of constructed stylesheets to adopt.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
     */
    adoptedStyleSheets?: CSSStyleSheet[];
  } & React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLTemplateElement>,
    HTMLTemplateElement
  >
>;

const ATTACH_SHADOW_ERR = `Could not attach the shadow root. The element may already have a shadow root attached. This could be due to HMR in development, and may not indicate a problem. Try refreshing the page to see if this warning goes away.

If the issue persists, other code may be conflicting by attaching a shadow root before this \`<Template>\` instance does.`;

const NO_PARENT_ERR = `Could not attach shadow root because there is no valid parent to attach to.`;

const RENDER_SHADOW_ERR = `Could not render the contents in the shadow root. This could be due to HMR and a failure to reattach a closed shadow root. Refresh the page to initialize a new shadow root.

If you are experiencing this issue at runtime and not during development, you may be directly re-mounting the \`<Template>\` component. This should be avoided in favor of re-mounting its parent.`;

const getMismatchErr = (type: 'mode' | 'delegatesFocus') =>
  `Could not update \`${type}\` in the shadow root options because the shadow root can only be initialized once. Refresh the page or replace the parent node with an entirely new instance.`;

/**
 * Supports declarative shadow DOM with a ponyfill.
 *
 * @example
 * ```tsx
 * <custom-element>
 *   <Template shadowrootmode="closed">
 *     <header>
 *       <slot name="header"></slot>
 *     </header>
 *     <div>
 *       <slot></slot>
 *     </div>
 *   </Template>
 *   <h1 slot="header">Hello World!</h1>
 *   <p>This will be output in the default slot</p>
 * </custom-element>
 * ```
 */
export const Template = React.forwardRef<
  HTMLTemplateElement | HTMLSpanElement,
  TemplateProps
>((props, forwardedRef) => {
  const {
    children,
    delegatesFocus = false,
    shadowrootmode,
    adoptedStyleSheets,
    ...forwardedProps
  } = props;

  const shadowRootRef = React.useRef<ShadowRoot | null>(null);
  const templateRef = React.useRef<HTMLTemplateElement | null>(null);
  const shadowOptsRef = React.useRef<ShadowRootInit>({
    delegatesFocus,
    mode: shadowrootmode ?? 'open',
  });
  const [initialized, setInitialized] = React.useState(false);
  const [dsdSupported, setDsdSupported] = React.useState(true);

  // Check browser support for declarative shadow DOM only once
  React.useEffect(() => {
    setDsdSupported(checkDSDSupport());
  }, []);

  // Adopt/reset stylesheets if needed
  React.useEffect(() => {
    if (shadowRootRef.current && adoptedStyleSheets) {
      shadowRootRef.current.adoptedStyleSheets = adoptedStyleSheets;
    }
  }, [shadowRootRef, initialized, adoptedStyleSheets]);

  // Reconcile shadow root and refs
  React.useEffect(() => {
    if (!templateRef.current) return;

    const parent = templateRef.current.parentElement;

    if (!parent) {
      console.error(NO_PARENT_ERR);
      return;
    }

    // Synchronize internal template ref with the forwarded ref
    if (typeof forwardedRef === 'function') {
      forwardedRef(templateRef.current);
    } else if (forwardedRef && typeof forwardedRef === 'object') {
      (forwardedRef as React.MutableRefObject<unknown>).current = templateRef.current;
    }

    const shadowOpts = shadowOptsRef.current;
    if (shadowOpts.mode !== shadowrootmode) {
      console.error(getMismatchErr('mode'));
    } else if (shadowOpts.delegatesFocus !== delegatesFocus) {
      console.error(getMismatchErr('delegatesFocus'));
    }

    // If shadow DOM is needed, attach the shadow root to the parent element
    if (shadowrootmode && !shadowRootRef.current) {
      const existingShadowRoot = parent.shadowRoot;
      if (existingShadowRoot) {
        shadowRootRef.current = existingShadowRoot;
      } else {
        try {
          shadowRootRef.current = parent.attachShadow(shadowOpts);
        } catch (error) {
          console.warn(ATTACH_SHADOW_ERR);
          console.groupCollapsed('Original Error...');
          console.error(error);
          console.groupEnd();
        }
      }
    }
    setInitialized(true);
  }, [templateRef, shadowrootmode, forwardedRef, delegatesFocus]);

  // If declarative shadow DOM is not being used, just return the template
  if (!shadowrootmode)
    return (
      <template ref={templateRef} {...forwardedProps}>
        {children}
      </template>
    );

  // After everything is bootstrapped, forward all children to the shadow root
  if (initialized) {
    try {
      if (shadowRootRef.current === null) throw new Error('Shadow root cannot be null.')
      return ReactDOM.createPortal(children, shadowRootRef.current);
    } catch (error) {
      console.error(RENDER_SHADOW_ERR);
      console.groupCollapsed('Original Error...');
      console.error(error);
      console.groupEnd();
      return <></>;
    }
  }

  // Initially render as usual if declarative shadow DOM is supported, otherwise fallback
  return dsdSupported ? (
    <template
      ref={templateRef}
      shadowrootmode={shadowrootmode}
      {...forwardedProps}
    >
      {children}
    </template>
  ) : (
    <span ref={templateRef} {...forwardedProps}></span>
  );
});
