import React, { AriaAttributes, DOMAttributes } from 'react';
import ReactDOM from 'react-dom';
import { AdaptedStyleSheet, isCSSStyleSheet } from './css-utils';
import { ShadowScopeConfig, ShadowScopeContext } from './context';

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
type AriaAttrs = AriaAttributes;
type DomAttrs<T> = DOMAttributes<T>;

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
    adoptedStyleSheets?: AdaptedStyleSheet[];
    /**
     * Configure this instance of `<Template>`. (Overrides `ShadowScopeConfigProvider`)
     */
    config?: ShadowScopeConfig;
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
    adoptedStyleSheets = [],
    config,
    ...forwardedProps
  } = props;

  const shadowScopeContext = React.useContext(ShadowScopeContext);

  const dsd = config?.dsd ?? shadowScopeContext.dsd;

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
  const [afterClientRender, setAfterClientRender] = React.useState(false);
  React.useEffect(() => { setAfterClientRender(true); }, []);
  const dsdSupported = React.useMemo(
    () => checkDSDSupport() && dsd === 'on',
    [declarativeShadowDOMSupported, dsd],
  );

  // Adopt/reset stylesheets if needed
  React.useEffect(() => {
    if (shadowRootRef.current !== null) {
      shadowRootRef.current.adoptedStyleSheets = cssStyleSheets;
    }
  }, [shadowRootRef, initialized, cssStyleSheets]);

  // Reconcile shadow root and refs
  React.useEffect(() => {
    if (templateRef.current === null || !afterClientRender) return;

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
  }, [templateRef, shadowrootmode, forwardedRef, delegatesFocus, afterClientRender]);

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
    <>
      {afterClientRender || dsd === 'on'
        ? <template
            ref={templateRef}
            {...dsdProps}
            {...forwardedProps}
          >
            {childrenWithStyle}
          </template>
        : <></>
      }
      {dsd === 'simulated'
        ? <react-shadow-scope>
            <style dangerouslySetInnerHTML={{
              __html: `
                react-shadow-scope {
                  visibility: hidden;
                  display: contents;
                }
              `,
            }} />
            <noscript>
              <style dangerouslySetInnerHTML={{
                __html: `
                  react-shadow-scope {
                    visibility: visible;
                  }
                `,
              }} />
            </noscript>
            {children}
          </react-shadow-scope>
        : <></>
      }
    </>
  );
});
