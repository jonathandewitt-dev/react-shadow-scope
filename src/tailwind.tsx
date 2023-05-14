import { AdaptedStyleSheet, adoptedStylesSupported, css, isCSSStyleSheet } from './css-utils';
import { Template } from './template';
import * as React from 'react';

export type TailwindProps = React.PropsWithChildren<{
  /**
   * The relative path of the Tailwind stylesheet when serving the application.
   *
   * @defaultValue `'/tailwind.css'`
   */
  href?: string;
  /**
   * 
   */
  customStyles?: AdaptedStyleSheet;
  /**
   * Light DOM content reflected by the given template; this can be useful for excluding children from the scope.
   */
  slottedContent?: React.ReactNode,
}>;

// This object is kept in memory to prevent fetching the stylesheet(s) more than once.
const cache: {
  stylesheets: CSSStyleSheet[],
} = {
  stylesheets: [],
};

/**
 * Creates a shadow DOM encapsulated scope for Tailwind.
 *
 * @example
 * ```tsx
 * <Tailwind slottedContent={children}>
 *   <h1 className="text-slate-900 font-extrabold text-4xl">
 *     Hello From Shadow DOM
 *   </h1>
 *   <slot></slot>
 * </Tailwind>
 * ```
 */
export const Tailwind = React.forwardRef<HTMLElement, TailwindProps>(
  (props, forwardedRef) => {
    const { children, href = '/tailwind.css', customStyles, slottedContent, ...forwardedProps } = props;

    const [cssStyleSheets, setCssStyleSheets] = React.useState<CSSStyleSheet[]>([]);
    const [hrefLoaded, setHrefLoaded] = React.useState<boolean>(false);

    React.useEffect(() => {
      if (cache.stylesheets.length === 0) {
       	fetch(href)
          .then((response: Response) => response.text())
          .then((tailwind: string) => {

            // since html is out of scope, we have to replace it with :host...
            const tailwindForShadowDOM = tailwind.replace(
              /(?:^|\s)(html)(?:[^-_a-z])/gi,
              ':host',
            );
            const stylesheet = css`
              :host {
                display: contents;
              }
              ${tailwindForShadowDOM}
            `;
            if (adoptedStylesSupported) {
              if (isCSSStyleSheet(stylesheet)) {
                cache.stylesheets.push(stylesheet);
              }
              if (isCSSStyleSheet(customStyles)) {
                cache.stylesheets.push(customStyles);
              }
            }
            setCssStyleSheets(cache.stylesheets);
            setHrefLoaded(true);
          });
      } else {
        setCssStyleSheets(cache.stylesheets);
        setHrefLoaded(true);
      }
    }, []);

    const styleContents = React.useMemo(
      () => (!hrefLoaded || !adoptedStylesSupported) && typeof customStyles === 'string'
        ? customStyles
        : '',
      [customStyles, hrefLoaded, adoptedStylesSupported],
    );

    return (
      <react-shadow-scope ref={forwardedRef} {...forwardedProps}>
        <Template shadowrootmode="open" adoptedStyleSheets={cssStyleSheets}>
          {!hrefLoaded

            /**
             * This fallback will be missing some global defaults due to <html> being outside the scope.
             * @see https://github.com/tailwindlabs/tailwindcss/pull/11200
             */
            ? <>
                <link rel="preload" href={href} as="style" />
                <link rel="stylesheet" href={href} />
              </>
            : <></>
          }
          {typeof window !== 'undefined' && !hrefLoaded
            ? <style>{`:host { visibility: hidden; }`}</style>
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
