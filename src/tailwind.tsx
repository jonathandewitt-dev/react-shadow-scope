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

const cache = { stylesheets: [] };

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
            const stylesheet = css`
              ${tailwind}
              ${`
                /* apply base styles to host element since html is out of scope */
                @layer base {
                  :host {
                    display: contents;
                    line-height: 1.5;
                    -webkit-text-size-adjust: 100%;
                    -moz-tab-size: 4;
                    -o-tab-size: 4;
                      tab-size: 4;
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                    font-feature-settings: normal;
                    font-variation-settings: normal;
                  }
                }
              `}
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
