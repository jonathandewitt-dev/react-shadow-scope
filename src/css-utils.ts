export const adoptedStylesSupported = (): boolean =>
	typeof window !== 'undefined' &&
	window.ShadowRoot?.prototype.hasOwnProperty('adoptedStyleSheets') &&
	window.CSSStyleSheet?.prototype.hasOwnProperty('replace');

// This should be a string if constructible stylesheets are not supported
export type StyleSheet = CSSStyleSheet | string;

export const isCSSStyleSheet = (stylesheet?: StyleSheet): stylesheet is CSSStyleSheet => {
	return typeof CSSStyleSheet !== 'undefined' && stylesheet instanceof CSSStyleSheet;
};

const getTaggedTemplateStr = (strArr: TemplateStringsArray, ...interpolated: unknown[]) => {
	return strArr.reduce((resultStr, currentStr, i) => {
		const _value = interpolated[i];
		const isInvalid = typeof _value === 'object' || _value === null || typeof _value === 'undefined';
		const value = isInvalid ? '' : String(_value as unknown);
		return resultStr + currentStr + value;
	}, '');
};

export const getCSSText = (stylesheet: CSSStyleSheet): string =>
	Array.from(stylesheet.cssRules)
		.map((rule) => rule.cssText)
		.join('');

/**
 * A tagged template function that returns the provided CSS as a constructed stylesheet, or a plain string in case of no support.
 *
 * @example
 * ```ts
 * css`
 *   .content {
 *      color: green;
 *    }
 * `
 * ```
 */
export const css = (strArr: TemplateStringsArray, ...interpolated: unknown[]): StyleSheet => {
	const styles = getTaggedTemplateStr(strArr, ...interpolated);
	if (adoptedStylesSupported()) {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(styles);
		return sheet;
	}
	return styles;
};

/**
 * Using this map as a persisted reference so stylesheets can be shared
 * between all instances of a component using the `useCSS` hook.
 */
const stylesheetMap = new Map<symbol, StyleSheet>();

/**
 * Return the `css` utility for HMR support without sacrificing performance.
 */
export const useCSS = (key?: symbol) => {
	return (strArr: TemplateStringsArray, ...interpolated: unknown[]): StyleSheet => {
		const symbol = key ?? Symbol();
		const existingStylesheet = stylesheetMap.get(symbol);
		if (existingStylesheet) {
			const styles = getTaggedTemplateStr(strArr, ...interpolated);
			if (isCSSStyleSheet(existingStylesheet)) {
				existingStylesheet.replaceSync(styles);
				return existingStylesheet;
			}
			stylesheetMap.set(symbol, styles);
			return styles;
		}
		const stylesheet = css(strArr, ...interpolated);
		stylesheetMap.set(symbol, stylesheet);
		return stylesheet;
	};
};

/**
 * Adapted from normalize.css for use with scopes
 * @see https://necolas.github.io/normalize.css/8.0.1/normalize.css
 */
export const normalizedScope = `
@layer normalize {
  main { display: block; }
  h1 { font-size: 2em; margin: 0.67em 0; }
  hr { box-sizing: content-box; height: 0; overflow: visible; }
  pre { font-family: monospace, monospace; font-size: 1em; }
  a { background-color: transparent; }
  abbr[title] { border-bottom: none; text-decoration: underline; text-decoration: underline dotted; }
  b, strong { font-weight: bolder; }
  code, kbd, samp { font-family: monospace, monospace; font-size: 1em; }
  small { font-size: 80%; }
  sub, sup { font-size: 75%; line-height: 0; position: relative; vertical-align: baseline; }
  sub { bottom: -0.25em; }
  sup { top: -0.5em; }
  img { border-style: none; }
  button, input, optgroup, select, textarea { font-family: inherit; font-size: 100%; line-height: 1.15; margin: 0; }
  button, input { overflow: visible; }
  button, select { text-transform: none; }
  button, [type="button"], [type="reset"], [type="submit"] { -webkit-appearance: button; }
  button::-moz-focus-inner, [type="button"]::-moz-focus-inner, [type="reset"]::-moz-focus-inner, [type="submit"]::-moz-focus-inner { border-style: none; padding: 0; }
  button:-moz-focusring, [type="button"]:-moz-focusring, [type="reset"]:-moz-focusring, [type="submit"]:-moz-focusring { outline: 1px dotted ButtonText; }
  fieldset { padding: 0.35em 0.75em 0.625em; }
  legend { box-sizing: border-box; color: inherit; display: table; max-width: 100%; padding: 0; white-space: normal; }
  progress { vertical-align: baseline; }
  textarea { overflow: auto; }
  [type="checkbox"], [type="radio"] { box-sizing: border-box; padding: 0; }
  [type="number"]::-webkit-inner-spin-button, [type="number"]::-webkit-outer-spin-button { height: auto; }
  [type="search"] { -webkit-appearance: textfield; outline-offset: -2px; }
  [type="search"]::-webkit-search-decoration { -webkit-appearance: none; }
  ::-webkit-file-upload-button { -webkit-appearance: button; font: inherit; }
  details { display: block; }
  summary { display: list-item; }
  [hidden] { display: none; }
}
`;

export const normalizedStyles = `
@layer normalize {
  html { line-height: 1.15; -webkit-text-size-adjust: 100%; }
  body { margin: 0; }
  template { display: none; }
}
${normalizedScope}
`;
