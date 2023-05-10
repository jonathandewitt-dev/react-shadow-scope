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
}

type CSSResponse = {
  currentHref: string,
  text: string,
}

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
      slottedContent,
      normalize = true,
      ...forwardedProps
    } = props;

    const [cssStyleSheets, setCssStyleSheets] = React.useState<CSSStyleSheet[]>([]);
    const allStyleSheets = React.useMemo(
      () => stylesheet ? [stylesheet, ...stylesheets] : stylesheets,
      [stylesheet, stylesheets],
    );
    const cssStrings = React.useMemo(
      () => allStyleSheets.filter(
        (stylesheet): stylesheet is string => typeof stylesheet === 'string',
      ),
      [allStyleSheets],
    );

    const [hrefsLoaded, setHrefsLoaded] = React.useState<boolean>(false);
    const allHrefs = React.useMemo(
      () => typeof href !== 'undefined' ? [href, ...hrefs] : hrefs,
      [href, hrefs],
    );

    // load all stylesheets
    React.useEffect(() => {
      const currentCssStyleSheets: CSSStyleSheet[] = [];

      // add stylesheets from props
      for (const currentCssStyleSheet of allStyleSheets) {
        if (currentCssStyleSheet instanceof CSSStyleSheet) {
          currentCssStyleSheets.push(currentCssStyleSheet);
        }
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
          setCssStyleSheets(currentCssStyleSheets);
          setHrefsLoaded(true);
        });
      } else {

        // if there are no requests to wait for, set immediately
        setCssStyleSheets(currentCssStyleSheets);
        setHrefsLoaded(true);
      }

      // cleanup any unfinished requests
      return () => {
        for (const abortController of abortControllers) {
          abortController.abort();
        }
      };
    }, []);

    const styleContents = React.useMemo(
      () => `
        ${!hrefsLoaded ? allHrefs.map((href) => `@import url(${href});`) : ''}
        ${normalize && typeof cache.normalize === 'string' ? cache.normalize : ''}
        ${typeof cache.base === 'string' ? cache.base : ''}
        ${cssStrings.length > 0 ? cssStrings : ''}
      `.trim(),
      [hrefsLoaded, normalize, cache.normalize, cache.base, cssStrings],
    );

    return (
      <react-shadow-scope ref={forwardedRef} {...forwardedProps}>
        <Template shadowrootmode="open" adoptedStyleSheets={cssStyleSheets}>
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
