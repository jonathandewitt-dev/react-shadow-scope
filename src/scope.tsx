import React from 'react';
import { AdaptedStyleSheet, adoptedStylesSupported, css, normalizedScope } from './css-utils';
import { Template } from './template';

export type ScopeProps = React.PropsWithChildren<{
  /**
   * The stylesheet to encapsulate. Should be created by the exported `css` tagged template function.
   */
  stylesheet?: AdaptedStyleSheet,
  /**
   * Multiple stylesheets to encapsulate. Each should be created by the exported `css` tagged template function.
   *
   * @defaultValue `[]`
   */
  stylesheets?: AdaptedStyleSheet[],
  /**
   * The HREF of the stylesheet to encapsulate.
   */
  href?: string,
  /**
   * Multiple HREFs of stylesheets to encapsulate.
   *
   * @defaultValue `[]`
   */
  hrefs?: string[],
  /**
   * Styles that will apply only when an external stylesheet is in the process of being fetched.
   * 
   * @defaultValue `:host { visibility: hidden; }`
   */
  pendingStyles?: AdaptedStyleSheet,
  /**
   * Light DOM content reflected by the given template; this can be useful for excluding children from the scope.
   */
  slottedContent?: React.ReactNode,
  /**
   * Some styles are included to make default behavior consistent across different browsers. Opt-out by setting this to false.
   *
   * @defaultValue `true`
   */
  normalize?: boolean,
}>;

type Cache = {
  base: AdaptedStyleSheet,
  normalize: AdaptedStyleSheet,
  stylesheets: Map<string, CSSStyleSheet>,
};

type CSSResponse = {
  currentHref: string,
  text: string,
};

// This object is kept in memory to prevent fetching and/or
// constructing the stylesheet(s) more than once.
const cache: Cache = {
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
  normalize: css`${normalizedScope}`,
  stylesheets: new Map(),
};

// Declare the custom tag name as JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'react-shadow-scope': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

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
export const Scope = React.forwardRef<HTMLElement, ScopeProps>(
  (props, forwardedRef) => {
    const {
      children,
      stylesheet,
      stylesheets = [],
      href,
      hrefs = [],
      pendingStyles = css`:host { visibility: hidden; }`,
      slottedContent,
      normalize = true,
      ...forwardedProps
    } = props;

    const [hrefsLoaded, setHrefsLoaded] = React.useState<boolean>(false);
    const allHrefs = React.useMemo(
      () => typeof href !== 'undefined' ? [href, ...hrefs] : hrefs,
      [href, hrefs],
    );
    const pending = typeof window !== 'undefined' && allHrefs.length > 0 && !hrefsLoaded;

    const { cssStyleSheets, cssStrings } = React.useMemo(
      () => {
        const allStylesheets = [
          cache.normalize,
          cache.base,
          ...stylesheets,
        ];
        if (pending) allStylesheets.push(pendingStyles);
        if (typeof stylesheet !== 'undefined') allStylesheets.push(stylesheet);
        const cssStyleSheets: CSSStyleSheet[] = [];
        const cssStrings: string[] = [];
        for (const currentStylesheet of allStylesheets) {
          if (currentStylesheet instanceof CSSStyleSheet) {
            cssStyleSheets.push(currentStylesheet);
          } else if (typeof currentStylesheet === 'string') {
            cssStrings.push(currentStylesheet);
          } else {
            console.warn(
              'An invalid stylesheet was passed to `<Scope>`, skipping...',
            );
          }
        }
        return { cssStyleSheets, cssStrings };
      },
      [pending, stylesheet, stylesheets],
    );
    const [allCSSStyleSheets, setAllCSSStyleSheets] = React.useState<CSSStyleSheet[]>(cssStyleSheets);

    // load all stylesheets
    React.useEffect(() => {
      const currentCssStyleSheets: CSSStyleSheet[] = [];

      // add stylesheets from props
      for (const currentCssStyleSheet of cssStyleSheets) {
        currentCssStyleSheets.push(currentCssStyleSheet);
      }

      // Request or load from cache
      const abortControllers: AbortController[] = [];
      const requests: Promise<CSSResponse>[] = [];
      for (const currentHref of allHrefs) {
        if (cache.stylesheets.has(currentHref)) {
          const currentCssStyleSheet = cache.stylesheets.get(currentHref);
          if (typeof currentCssStyleSheet !== 'undefined') {
            currentCssStyleSheets.push(currentCssStyleSheet);
            continue; // skip the request if it was cached
          }
        }

        // fetch the stylesheet as text
        const abortController = new AbortController();
        abortControllers.push(abortController);
        requests.push(
          fetch(currentHref, { signal: abortController.signal })
          .then(async (response: Response) =>
            ({ currentHref, text: await response.text() })
          ),
        );
      }

      // concurrently run all requests
      if (requests.length > 0) {
        Promise.all(requests).then((cssResponses) => {
          for (const { currentHref, text } of cssResponses) {
            const currentCssStyleSheet = css`${text}`;
            if (adoptedStylesSupported) {
              if (currentCssStyleSheet instanceof CSSStyleSheet) {
                currentCssStyleSheets.push(currentCssStyleSheet);
                cache.stylesheets.set(currentHref, currentCssStyleSheet);
              }
            }
          }
          setAllCSSStyleSheets(currentCssStyleSheets);
          setHrefsLoaded(true);
        });
      } else {

        // if there are no requests to wait for, set immediately
        setAllCSSStyleSheets(currentCssStyleSheets);
        setHrefsLoaded(true);
      }

      // cleanup any unfinished requests
      return () => {
        for (const abortController of abortControllers) {
          abortController.abort();
        }
      };
    }, [pending]);

    const styleContents = React.useMemo(
      () => `
        ${normalize && typeof cache.normalize === 'string' ? cache.normalize : ''}
        ${typeof cache.base === 'string' ? cache.base : ''}
        ${cssStrings.length > 0 ? cssStrings.join('\n') : ''}
      `.trim(),
      [hrefsLoaded, normalize, cache.normalize, cache.base, cssStrings],
    );

    return (
      <react-shadow-scope ref={forwardedRef} {...forwardedProps}>
        <Template shadowrootmode="open" adoptedStyleSheets={allCSSStyleSheets}>
          {!hrefsLoaded

            /**
             * Use preload link to avoid FOUC (when rendered on the server)
             * @see https://webcomponents.guide/learn/components/styling/ - scroll to `Using <link rel="stylesheet">`
             */
            ? allHrefs.map((href) => (
                <React.Fragment key={href}>
                  <link rel="preload" href={href} as="style" />
                  <link rel="stylesheet" href={href} />
                </React.Fragment>
              ))
            : <></>
          }
          {styleContents !== ''
            ? <style>{styleContents}</style>
            : <></>
          }
          {children}
        </Template>
        {slottedContent}
      </react-shadow-scope>
    );
  },
);
