import { AdaptedStyleSheet, adoptedStylesSupported, css } from './css-utils';
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

    const [
      cssStyleSheets,
      setCssStyleSheets,
    ] = React.useState<CSSStyleSheet[]>([]);

    React.useEffect(() => {
      if (cache.stylesheets.length === 0) {
       	fetch(href)
          .then((response: Response) => response.text())
          .then((tailwind: string) => {

            // since html is out of scope, we have to replace it with :host...
            const scopedTailwind = tailwind.replace(
              /(?:^|\s)(html)(?:[^-_a-z])/gi,
              ':host',
            );
            const stylesheet = css`
              :host {
                display: contents;
              }
              ${scopedTailwind}
            `;
            if (adoptedStylesSupported) {
              if (stylesheet instanceof CSSStyleSheet) {
                cache.stylesheets.push(stylesheet);
              }
              if (customStyles instanceof CSSStyleSheet) {
                cache.stylesheets.push(customStyles);
              }
            }
            setCssStyleSheets(cache.stylesheets);
          });
      } else {
        setCssStyleSheets(cache.stylesheets);
      }
    }, []);

    return (
      <react-shadow-scope ref={forwardedRef} {...forwardedProps}>
        <Template shadowrootmode="open" adoptedStyleSheets={cssStyleSheets}>
          <style>
            {adoptedStylesSupported
              ? ''
              : `
                @import url('${href}');
                ${customStyles}
                `
            }
          </style>
          {children}
        </Template>
        {slottedContent}
      </react-shadow-scope>
    );
  },
);
