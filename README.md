# React Shadow Scope

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

```jsx
<Scope stylesheet={styles}>
```

Traditional global CSS risks naming collisions, specificity conflicts, and unwanted style inheritance. Modern tools have been designed to solve these problems by using emulated encapsulation, but nothing can protect from inherited styles except for shadow DOM.

This package does _not_ burden you with all the boilerplate around shadow DOM, nor force you to use web components. Did you know you can attach a shadow root to regular elements, like a `<div>`? That's essentially what `react-shadow-scope` does behind the curtain.

> **Note** This package supports Tailwind in the shadow DOM via the [`<Tailwind>`](#tailwind) component. Using Tailwind globally risks naming collisions with other utility classes. This can be especially important for library authors.

As a rule of thumb, you should limit your global CSS to little or nothing. The native `@scope` rule can get you pretty far, but it still doesn't protect from inherited styles. Shadow DOM encapsulation is the _single best tool we have_.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Scope](#scope)
  - [Composing Styles](#composing-styles)
  - [Normalize](#normalize)
  - [Constructed Style Sheets](#constructed-style-sheets)
  - [Remote Style Sheets](#remote-style-sheets)
  - [Excluding Children From the Scope](#excluding-children-from-the-scope)
  - [Templates](#templates)
  - [Tailwind](#tailwind)
- [Maintainers](#maintainers)
- [License](#license)

## Install

```
npm i react-shadow-scope
```

## Usage

### Scope

To create a new CSS scope, import the `Scope` component from the package and just pass a string to the `stylesheet` prop.

```jsx
import { Scope } from 'react-shadow-scope';

const MyComponent = () => (
  <>
    {/* Scope gives you protection from inherited styles! */}
    <style>{`#Demo h1 { color: blue; text-decoration: underline; }`}</style>
    <div id="Demo">
      <h1>This title is blue with underline</h1>
      <Scope stylesheet={`h1 { color: red; }`}>
        <h1>This title is red without underline</h1>
        <Scope stylesheet={`h1 { font-style: italic; }`}>
          <h1>This title is italicized without underline or color</h1>
        </Scope>
      </Scope>
    </div>
  </>
);
```

#### Custom Tag Names

By default, `<Scope>` renders a `<react-shadow-scope>` element, but doesn't define it in the custom element registry. The custom tag name just avoids cases where `<div>` or `<span>` would break HTML validation.

This can be overridden via the `tag` prop, in case of conflicts or for better legibility in the dev tools.

```jsx
<Scope tag="my-element">
```

The above will output: `<my-element>`

If you're using TypeScript, you will need to merge with the interface where these element types are declared.

```ts
import { CustomIntrinsicElement } from 'react-shadow-scope';

declare global {
  namespace ReactShadowScope {
    interface CustomElements {
      'my-element': CustomIntrinsicElement;
    }
  }
}
```

> **Note**
>
> In some cases, HTML requires certain nesting rules to be valid. For example, `<ul>` may only contain `<li>` tags as direct children. To work around this, you can either render all `<li>` tags in one parent `<Scope>`, or apply your own semantics with `role="list"` and `role="listitem"` to your markup instead of using `<ul>` and `<li>`.

---

### Composing Styles

It's normally a good idea to contain the complexity of your design. In other words, instead of designing the different use cases _outside_ a component, design from the _inside_ by describing the use case, like `usedFor="page"` or `importance="urgent"`. The goal should be to eliminate the need for consumers of your component to write any CSS at all.

However, sometimes it's necessary to compose styles from the parent scope. In such an event, you may add a class to the `<Scope>` component and select that to style the outer element. Although React applies [some unique rules](https://react.dev/reference/react-dom/components#custom-html-elements) to custom elements, you can just use `className` as usual and we'll forward it to `class` internally.

This is a gray area that has some indirect impact on the shadow DOM via the cascade. You can also selectively reach into the shadow DOM with [shadow parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part). It's important to be aware this breaks encapsulation, so it's generally not the recommended approach. Although it's _sometimes_ necessary or beneficial, it often isn't, so be careful. It may require shifting your mental model a bit at first.

---

### Normalize CSS

This package borrows from [normalize.css](https://necolas.github.io/normalize.css/8.0.1/normalize.css) to make style defaults more consistent across browsers. This feature is opted-in by default to hopefully save you some hassle, but you can opt-out any time by setting the `normalize` prop to false.

```jsx
<Scope stylesheet={styles} normalize={false}>
```

All normalized styles are contained inside a `@layer` called `normalize`, which gives them the lowest priority, making them easy to override.

> **Note**
>
> By default, `<Scope>` applies `display: contents;` to avoid problems with layouts. (This preserves accessibility because it lacks semantics to interfere with anyway.) You may override this with `:host { /* overrides */ }`.

---

### Constructed Style Sheets

For best performance, you can create a new `CSSStyleSheet` object and pass it to the `stylesheet` prop.

`react-shadow-scope` exports a hook (`useCSS`) that returns a tagged template function that will take care of this for you. It will detect support for the feature and fallback to a string if necessary. When rendering on the server, the styles will render in a `<style>` tag.

```jsx
import { useCSS, Scope } from 'react-shadow-scope';

const MyComponent = () => {
  const css = useCSS();
  return (
    <Scope
      stylesheet={css`
        h1 {
          color: red;
        }
      `}
    >
      <h1>title here</h1>
    </Scope>
  );
};
```

To ensure that only one stylesheet gets constructed even when you use a component multiple times, you can create a `Symbol` outside the component function, then pass it to the `useCSS` hook. This will uniquely identify a single reference for each instance of the component.

```jsx
const key = Symbol();

const MyComponent = () => {
  const css = useCSS(key);
  ...
}
```

> **Note**
>
> When using a key, you may not use the resulting `css` function multiple times, because the same reference is shared between each function call. This means the last result will override all previous results. If you need multiple stylesheets, consider calling `useCSS` multiple times with different keys.
>
> ```jsx
> const key1 = Symbol();
> const key2 = Symbol();
>
> const MyComponent = () => {
>   const css1 = useCSS(key1);
>   const css2 = useCSS(key2);
>   ...
> }
> ```

You can also import the `css` function directly, but the `useCSS` hook works well with HMR without sacrificing performance.

```jsx
import { css } from 'react-shadow-scope';

const stylesheet = css`
  h1 {
    color: red;
  }
`;
```

To use multiple stylesheets, you can also use the `stylesheets` prop (plural) and pass an array.

```jsx
<Scope stylesheets={[theme, styles]}>
```

---

### Remote Style Sheets

If you'd rather save static assets, or you depend on a third-party stylesheet, you can pass a (relative or absolute) URL to the `href` prop.

```jsx
<Scope href="/mystyles.css">
```

When rendering on the server, this will simply add a `<link>` tag pointing to the given href.

Once the remote stylesheet has loaded, it will be cloned into a constructable `CSSStyleSheet` and cached by href, so they won't be loaded (or constructed) multiple times even if they were loaded by a different `<Scope>`.

You can also link multiple stylesheets using the `hrefs` (plural) prop.

```jsx
<Scope hrefs={['/theme.css', '/mystyles.css']}>
```

When linking external stylesheets, server-rendered components will appear as expected on the first paint. Client rendered components, however, would have a FOUC issue if not for some extra care. While the styles are busy loading on the client, we apply `:host { visibility: hidden; }` by default. These styles can be customized as well, and will only apply while the fetch promise is pending.

```jsx
<Scope href="/mystyles.css" pendingStyles={css`
  :host {
    display: block;
    opacity: 0.3;
  }
`}>
```

---

### Excluding Children From the Scope

Most of the time, you won't want the children to be rendered in the same CSS scope as the component. In such a case, you will want to use `<slot>` tags and pass children to the `slottedContent` prop.

```jsx
<Scope stylesheet={styles} slottedContent={children}>
  <slot></slot>
</Scope>
```

This is just an abstraction over shadow DOM, so anything you can do with shadow DOM, you can do with `slottedContent`, including named slots and so on.

But at the point you're taking full advantage these additional features, you may be entering territory where it becomes more practical to just use the bare syntax of declarative shadow DOM... which you can also do with this package!

---

### Form Controls

When you use shadow DOM, form elements inside the shadow root can't naturally connect to forms outside of it. This means features like form validation and submission won't work by default. The `FormControl` component solves this problem by creating a custom element that acts as the form control.

#### Basic Usage

```jsx
import { FormControl } from 'react-shadow-scope';

// A basic text input
<FormControl
  tag="x-input"
  stylesheets={[theme, css``]}
  control="text"
  value={value}
  onInput={handleInput}
>
  <input type="text" />
</FormControl>

// A checkbox
<FormControl
  tag="x-checkbox"
  stylesheets={[theme, css``]}
  control="checkbox"
  name="agree"
  checked={checked}
  onChange={handleChange}
>
  <input type="checkbox" />
</FormControl>

// A submit button
<FormControl
  tag="x-button"
  stylesheets={[theme, css``]}
  control="button"
  type="submit" // default when nested in a form
>
  <button>Submit</button>
</FormControl>
```

> **Note**
> While you can build your own custom controls using this API, it's recommended to nest a corresponding input with a matching type (or tag) inside. The library will keep the inner control in sync with its host element automatically.

#### Control Types

The `FormControl` component accepts different configurations based on the type of control:

- **Common Controls**: `text`, `password`, `email`, `tel`, `url`, `search`

  ```jsx
  <FormControl
    tag="x-input"
    stylesheets={[theme, css``]}
    control="text" // or any text type
    value={string} // current value
    name={string} // field name
    placeholder={string} // optional placeholder text
    required={boolean} // is the field required?
    readonly={boolean} // is the field read-only?
    disabled={boolean} // is the field disabled?
  />
  ```

- **Checkbox/Radio**: `checkbox`, `radio`

  ```jsx
  <FormControl
    tag="x-checkbox"
    stylesheets={[theme, css``]}
    control="checkbox" // or 'radio'
    checked={boolean} // is it checked?
  />
  ```

- **Number/Range/Date**: `number`, `range`, `date`, `time`, `datetime-local`, `month`, `week`

  ```jsx
  <FormControl
    tag="x-number-input"
    stylesheets={[theme, css``]}
    control="number" // or any range/date type
    value={string} // current value
    min={string | number} // minimum value
    max={string | number} // maximum value
    step={string | number} // step increment
  />
  ```

- **Buttons**: `<button>`, `image`

  ```jsx
  <FormControl
    tag="x-button"
    stylesheets={[theme, css``]}
    control="button" // or image
    type="button" // or submit, reset
  />
  ```

- **And so on**, including `hidden`, `<select>`, `<textarea>`, `file`, `color`,

The form control automatically:

- Associates with parent forms
- Supports form values and submission
- Handles validation states
- Works with form reset events
- Syncs the state of the host element with nested inputs

All while maintaining shadow DOM encapsulation for your styles.

### Templates

If you want to use declarative shadow DOM directly, without the `<Scope>` component, you can use `<Template>` as you usually would natively. This adds support to React for the native `<template>` element, with some added features.

```jsx
import { useCSS, Template, CustomElement } from 'react-shadow-scope';

const MyComponent = () => {
  const css = useCSS();
  return (
    <card-element>
      {/* Note the declarative `adoptedStyleSheets` prop! */}
      <Template
        shadowrootmode="closed"
        adoptedStyleSheets={[
          css`
            /* styles here */
          `,
        ]}
      >
        <h1>
          <slot name="heading">(Untitled)</slot>
        </h1>
        <slot>(No content)</slot>
      </Template>
      <span slot="heading">Title Here</span>
      <p>Inside Default Slot</p>
    </card-element>
  );
};
```

---

### Tailwind

Tailwind support is already built-in so you don't have to roll your own solution. Just install and set up the Tailwind package as usual, and this package will encapsulate it in the shadow DOM.

```jsx
<Tailwind slottedContent={children}>
  <h1 className="text-slate-900 font-extrabold text-4xl">
    Hello from the Shadow DOM!
  </h1>
  <slot></slot>
</Tailwind>
```

> **Note**
>
> Your output CSS file should be in the `/public` folder (or wherever your static assets are served from.) The expected filename is `tailwind.css` by default, but can be customized (see next section).
>
> Be sure to _remove_ tailwind from the `<link>` tag in your HTML. You may want to add this in its place:
>
> ```html
> <style>
>   body {
>     margin: 0;
>     line-height: inherit;
>   }
> </style>
> ```

#### Tailwind Props

- `href` - This is `/tailwind.css` if omitted. This will be fetched once and cached.
- `customStyles` - Pass a string or `CSSStyleSheet` (the `css` tagged template function is recommended)
- `pendingStyles` - Works the same as `pendingStyles` on the `<Scope>` component.
- `slottedContent` - Works the same as `slottedContent` on the `<Scope>` component.

## Maintainers

[@jonathandewitt-dev](https://github.com/jonathandewitt-dev)

## License

MIT © 2023 Jonathan DeWitt
