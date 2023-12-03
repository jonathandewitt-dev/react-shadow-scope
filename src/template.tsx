import React from 'react';
import ReactDOM from 'react-dom';
import { StyleSheet, isCSSStyleSheet } from './css-utils';
import { ShadowScopeConfig, ShadowScopeContext } from './context';
import { parseSlots } from './children-utils';

// caching the result out here avoids parsing a fragment for each component instance
let declarativeShadowDOMSupported: boolean | null = null;
function checkDSDSupport(): boolean {

  // If it's rendering server side, just proceed as if it's supported.
  if (typeof window === 'undefined') return true;
  if (declarativeShadowDOMSupported !== null) return declarativeShadowDOMSupported;
  if (typeof DOMParser === 'undefined') return false;

  // Parse a DSD fragment to check
  const fragment = new DOMParser().parseFromString(
    '<div><template shadowrootmode="open"></template></div>',
    'text/html',

    // @ts-ignore-next-line; TS doesn't know `parseFromString` supports a 3rd argument.
    { includeShadowRoots: true },
  );
  declarativeShadowDOMSupported = !!fragment.querySelector('div')?.shadowRoot;
  return declarativeShadowDOMSupported;
}

/**
 * Proxying these types works around the error:
 * "Exported variable <variable name> has or is using private name <private name>"
 * @see https://github.com/microsoft/TypeScript/issues/6307
 */
type AriaAttrs = React.AriaAttributes;
type DomAttrs<T> = React.DOMAttributes<T>;

// We have to patch React's interface for HTML attributes for now, since it currently errors on `shadowrootmode`
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttrs, DomAttrs<T> {
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
     * A list of constructed stylesheets to adopt. (This feature is not natively available.)
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet
     *
     * @defaultValue `[]`
     */
    adoptedStyleSheets?: StyleSheet[];
  } & React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLTemplateElement>,
    HTMLTemplateElement
  >
>;

const ATTACH_SHADOW_ERR = `Could not attach the shadow root. The element may already have a shadow root attached. This could be due to HMR in development, and may not indicate a problem. Try refreshing the page to see if this warning goes away.

If the issue persists, other code may be conflicting by attaching a shadow root before this \`<Template>\` instance does.`;

const RENDER_SHADOW_ERR = `Could not render the contents in the shadow root. This could be due to HMR and a failure to reattach a closed shadow root. Refresh the page to initialize a new shadow root.

If you are experiencing this issue at runtime and not during development, you may be directly re-mounting the \`<Template>\` component. This should be avoided in favor of re-mounting its parent.`;

const getMismatchErr = (type: 'mode' | 'delegatesFocus') =>
  `Could not update \`${type}\` in the shadow root options because the shadow root can only be initialized once. Refresh the page or replace the parent node with an entirely new instance.`;

/**
 * Supports declarative shadow DOM with a ponyfill.
 *
 * @example
 * ```tsx
 * <CustomElement tag="my-element">
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
 * </CustomElement>
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
    adoptedStyleSheets = [],
    ...forwardedProps
  } = props;

  const shadowScopeContext = React.useContext(ShadowScopeContext);

  const { cssStyleSheets, cssStrings } = React.useMemo(
    () => {
      const cssStyleSheets: CSSStyleSheet[] = [];
      const cssStrings: string[] = [];
      for (const stylesheet of adoptedStyleSheets) {
        if (isCSSStyleSheet(stylesheet)) {
          cssStyleSheets.push(stylesheet);
        } else if (typeof stylesheet === 'string') {
          cssStrings.push(stylesheet);
        } else {
          console.warn(
            'An invalid stylesheet was passed to `<Template>`, skipping...',
          );
        }
      }
      return { cssStyleSheets, cssStrings };
    },
    [adoptedStyleSheets],
  );

  const shadowRootRef = React.useRef<ShadowRoot | null>(null);
  const templateRef = React.useRef<HTMLTemplateElement | null>(null);
  const shadowOptsRef = React.useRef<ShadowRootInit>({
    delegatesFocus,
    mode: shadowrootmode ?? 'open',
  });
  const [initialized, setInitialized] = React.useState(false);
  const dsdSupported = React.useMemo(
    () => checkDSDSupport() && shadowScopeContext.dsd === 'on',
    [declarativeShadowDOMSupported, shadowScopeContext.dsd],
  );

  // Adopt/reset stylesheets if needed
  React.useEffect(() => {
    if (shadowRootRef.current !== null) {
      shadowRootRef.current.adoptedStyleSheets = cssStyleSheets;
    }
  }, [shadowRootRef, initialized, cssStyleSheets]);

  // Reconcile shadow root and refs
  React.useEffect(() => {
    if (templateRef.current === null) return;

    const parent = templateRef.current.parentElement;

    if (!parent) {

      // If there is no parent, it's likely because it was already parsed as DSD.
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

  const childrenWithStyle = (
    <>
      <style dangerouslySetInnerHTML={{
        __html: cssStrings.length > 0 ? cssStrings.join('\n') : ''
      }} />
      {children}
    </>
  )

  // If declarative shadow DOM is not being used, just return the template
  if (!shadowrootmode) {
    return (
      <template ref={templateRef} {...forwardedProps}>
        {childrenWithStyle}
      </template>
    );
  }

  // After everything is bootstrapped, forward all children to the shadow root
  if (initialized) {
    try {
      if (shadowRootRef.current === null) throw new Error('Shadow root cannot be null.')
      return ReactDOM.createPortal(childrenWithStyle, shadowRootRef.current);
    } catch (error) {
      console.error(RENDER_SHADOW_ERR);
      console.groupCollapsed('Original Error...');
      console.error(error);
      console.groupEnd();
      return <></>;
    }
  }

  const dsdProps = dsdSupported ? { shadowrootmode } : {};

  // Initially render as usual until the shadowroot is initialized
  return (
    <template
      ref={templateRef}
      {...dsdProps}
      {...forwardedProps}
    >
      {childrenWithStyle}
    </template>
  );
});

/**
 * Emulate declarative shadow DOM by filling in the slots and returning light DOM.
 *
 * This is defined outside of CustomElement to avoid unnecessary overhead when not needed.
 * It's not in `children-utils.tsx` to avoid the circular dependency from `Template`.
 */
const emulateDSD = (children: React.ReactNode) => {
  const childrenArray = React.Children.toArray(children);

  const template = (childrenArray.find((child) => {
    return React.isValidElement(child) && child.type === Template;
  }) ?? <></>) as React.ReactElement;

  const lightDomChildren = childrenArray.filter((child) => {
    return !React.isValidElement(child) || child.type !== Template;
  });

  return parseSlots(lightDomChildren, template);
};

type CustomElementProps = React.PropsWithChildren<
  {
    /**
     * The tag name of the custom element.
     */
    tag: keyof ReactShadowScope.CustomElements;
    /**
     * Configure this instance of `<CustomElement>`. (Overrides `ShadowScopeConfigProvider`)
     */
    config?: ShadowScopeConfig;
  } & React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >
>;

/**
 * Supports declarative shadow DOM with a ponyfill.
 *
 * @example
 * ```tsx
 * <CustomElement tag="my-element">
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
 * </CustomElement>
 * ```
 */
export const CustomElement = React.forwardRef<
  HTMLElement,
  CustomElementProps
>((props, forwardedRef) => {
  const {
    tag: Tag,
    children,
    config,
    ...forwardedProps
  } = props;

  const shadowScopeContext = React.useContext(ShadowScopeContext);
  const dsd = config?.dsd ?? shadowScopeContext.dsd;

  const [hasHydrated, setHasHydrated] = React.useState(false);
  React.useEffect(() => { setHasHydrated(true); }, []);

  return (
    <Tag {...forwardedProps} ref={forwardedRef}>
      {dsd === 'emulated'
        ? hasHydrated
            ? children
            : (
                <>
                  <style>{`${Tag} { visibility: hidden; }`}</style>
                  <noscript>
                    <style>{`${Tag} { visibility: visible; }`}</style>
                  </noscript>
                  {emulateDSD(children)}
                </>
              )
        : children
      }
    </Tag>
  );
});
