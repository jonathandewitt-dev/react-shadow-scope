import { StyleSheet, css } from './css-utils';
import { Scope } from './scope';
import * as React from 'react';

export type TailwindProps = React.PropsWithChildren<{
  /**
   * The relative path of the Tailwind stylesheet when serving the application.
   *
   * @defaultValue `'/tailwind.css'`
   */
  href?: string;
  /**
   * Styles that will apply only while the Tailwind stylesheet is in the process of being fetched.
   * 
   * @defaultValue `:host { visibility: hidden; }`
   */
  pendingStyles?: StyleSheet,
  /**
   * 
   */
  customStyles?: StyleSheet;
  /**
   * Light DOM content reflected by the given template; this can be useful for excluding children from the scope.
   */
  slottedContent?: React.ReactNode,
}>;

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
    const {
      children,
      href = '/tailwind.css',
      customStyles,
      slottedContent,
      pendingStyles = css`:host { visibility: hidden; }`,
      ...forwardedProps
    } = props;

    const transformForTailwind = (cssString: string) => {
      return cssString.replace(
        /(?:^|\s)(html)(?:[^-_a-z])/gi,
        ':host',
      );
    }

    return (
      <Scope
        {...forwardedProps}
        ref={forwardedRef}
        stylesheet={customStyles}
        stylesheets={[]}
        href={href}
        hrefs={[]}
        pendingStyles={pendingStyles}
        normalize={false}
        slottedContent={slottedContent}
        __transform={transformForTailwind}
      >
        {children}
      </Scope>
    );
  },
);
