'use client';
import React from 'react';
import { StyleSheet, css, normalizedScope } from './css-utils';
import { CustomElement, Template } from './template';
import { ShadowScopeConfig } from './context';

export type CustomIntrinsicElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  class?: string,
  for?: string,
};

// Declare the custom tag name as JSX
declare global {
  namespace ReactShadowScope {
    interface CustomElements {
      'react-shadow-scope': CustomIntrinsicElement;
    }
  }
  namespace JSX {
    interface IntrinsicElements extends ReactShadowScope.CustomElements {}
  }
}

export type ScopeProps = React.PropsWithChildren<Partial<{
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
  /**
   * Configure this instance of `<Scope>`. (Overrides `ShadowScopeConfigProvider`)
   */
  config?: ShadowScopeConfig;
  /**
   * For internal use only. This is not a stable feature and may be removed at any time.
   */
  __transform: (cssString: string) => string,
}> & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>>;

type Cache = {
  base: StyleSheet,
  normalize: StyleSheet,
  stylesheets: Map<string, StyleSheet>,
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
      tag = 'react-shadow-scope',
      stylesheet,
      stylesheets = [],
      href,
      hrefs = [],
      pendingStyles = css`:host { visibility: hidden; }`,
      slottedContent,
      normalize = true,
      config,
      __transform = s => s,
      className,
      ...forwardedProps
    } = props;

    const [hrefsLoaded, setHrefsLoaded] = React.useState<boolean>(false);
    const allHrefs = React.useMemo(
      () => typeof href !== 'undefined' ? [href, ...hrefs] : hrefs,
      [href, hrefs],
    );
    const pending = typeof window !== 'undefined' && allHrefs.length > 0 && !hrefsLoaded;

    const localStyleSheets = React.useMemo(
      () => {
        const _localStylesheets = [
          cache.normalize,
          cache.base,
          ...stylesheets,
        ];
        if (pending) _localStylesheets.push(pendingStyles);
        if (typeof stylesheet !== 'undefined') _localStylesheets.push(stylesheet);
        return _localStylesheets;
      },
      [pending, stylesheet, stylesheets],
    );
    const [allStyleSheets, setAllStyleSheets] = React.useState<StyleSheet[]>(localStyleSheets);

    // load all stylesheets
    React.useEffect(() => {
      const _allStyleSheets: StyleSheet[] = [...localStyleSheets];

      // Request or load from cache
      const abortControllers: AbortController[] = [];
      const requests: Promise<CSSResponse>[] = [];
      for (const currentHref of allHrefs) {
        if (cache.stylesheets.has(currentHref)) {
          const currentCssStyleSheet = cache.stylesheets.get(currentHref);
          if (typeof currentCssStyleSheet !== 'undefined') {
            _allStyleSheets.push(currentCssStyleSheet);
            continue; // skip the request if it was cached
          }
        }

        // fetch the stylesheet as text
        const abortController = new AbortController();
        abortControllers.push(abortController);
        requests.push(
          fetch(currentHref, { signal: abortController.signal })
            .then(async (response: Response) =>
              ({ currentHref, text: __transform(await response.text()) })
            ),
        );
      }

      // concurrently run all requests
      if (requests.length > 0) {
        Promise.all(requests).then((cssResponses) => {
          for (const { currentHref, text } of cssResponses) {
            const currentCssStyleSheet = css`${text}`;
            _allStyleSheets.push(currentCssStyleSheet);
            cache.stylesheets.set(currentHref, currentCssStyleSheet);
          }
          setAllStyleSheets(_allStyleSheets);
          setHrefsLoaded(true);
        });
      } else {

        // if there are no requests to wait for, set immediately
        setAllStyleSheets(_allStyleSheets);
        setHrefsLoaded(true);
      }

      // cleanup any unfinished requests
      return () => {
        for (const abortController of abortControllers) {
          abortController.abort();
        }
      };
    }, [pending]);

    const convertedProps = className ? { class: className } : {};

    return (
      <CustomElement
        // @ts-ignore // TODO: figure out this absurd TS error - casting, narrowing, fallbacks... nothing works here.
        ref={forwardedRef}
        tag={tag}
        config={config}
        {...convertedProps}
        {...forwardedProps}
      >
        <Template shadowrootmode="open" adoptedStyleSheets={allStyleSheets}>
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
          {children}
        </Template>
        {slottedContent}
      </CustomElement>
    );
  },
);
