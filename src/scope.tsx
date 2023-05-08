import React from 'react';
import { AdaptedStyleSheet, adoptedStylesSupported, normalizedScope } from './css-utils';
import { Template } from './template';

export type ScopeProps = React.PropsWithChildren<{
  /**
   * The stylesheet to encapsulate. Should be created by the exported `css` tagged template function.
   */
  stylesheet?: AdaptedStyleSheet;
  /**
   * Multiple stylesheets to encapsulate. Each should be created by the exported `css` tagged template function.
   *
   * @defaultValue `[]`
   */
  stylesheets?: AdaptedStyleSheet[];
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

type ExtractedStyleSheets = {
  cssStrings: string[];
  cssStyleSheets: CSSStyleSheet[];
};

const extractStyleSheets = (
  stylesheets: AdaptedStyleSheet[],
): ExtractedStyleSheets => {
  const cssStrings: string[] = [];
  const cssStyleSheets: CSSStyleSheet[] = [];
  for (const stylesheet of stylesheets) {
    if (typeof stylesheet === 'string') {
      cssStrings.push(stylesheet);
    } else if (adoptedStylesSupported && stylesheet instanceof CSSStyleSheet) {
      cssStyleSheets.push(stylesheet);
    } else {
      console.warn(
        'An invalid stylesheet was passed to `<Scope>`, skipping...',
      );
    }
  }
  return { cssStrings, cssStyleSheets };
};

// Apply some defaults to make the scope more intuitive, these can be easily overridden by user-defined style
const getDefaults = (normalize: boolean) => `
/* note:
  Accessibility concerns of \`display: contents;\` have been fixed as of 2022.
  Remaining issues only affect certain tags, but divs are safe.
*/
:host { display: contents; }
${normalize ? normalizedScope : ''}
`

// Declare the custom tag name as JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'react-shadow-scope': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export const Scope = React.forwardRef<HTMLElement, ScopeProps>(
  (props, forwardedRef) => {
    const { children, stylesheet, stylesheets = [], slottedContent, normalize = true, ...forwardedProps } = props;

    const allStyleSheets = stylesheet
      ? [stylesheet, ...stylesheets]
      : stylesheets;

    const { cssStrings, cssStyleSheets } = extractStyleSheets(allStyleSheets);

    return (
      <react-shadow-scope ref={forwardedRef} {...forwardedProps}>
        <Template shadowrootmode="open" adoptedStyleSheets={cssStyleSheets}>
          <style>
            {getDefaults(normalize)}
            {cssStrings.map((styles) => styles)}
          </style>
          {children}
        </Template>
        {slottedContent}
      </react-shadow-scope>
    );
  },
);
