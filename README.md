
# React Shadow Scope

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

```jsx
<Scope stylesheet={styles}>
```

Traditional global CSS risks naming collisions, specificity conflicts, and unwanted style inheritance. Modern tools have been designed to solve these problems by using simulated encapsulation, but nothing can protect from inherited styles except for shadow DOM.

This package does *not* burden you with all the boilerplate around shadow DOM, nor force you to use web components. Did you know you can attach a shadow root to regular elements, like a `<div>`? That's essentially what `react-shadow-scope` does behind the curtain.

> This package supports scoped Tailwind with a `<Tailwind>` component. Using Tailwind globally risks naming collisions with other utility classes. This can be especially important for library authors.

As a rule of thumb, you should limit your global CSS to little or nothing. The native `@scope` rule can get you pretty far, but it still doesn't protect from inherited styles. Shadow DOM encapsulation is the *single best tool we have*.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```
npm i react-shadow-scope
```

---

## Usage

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

> NOTES:
> - By default, `<Scope>` applies `display: contents;` to avoid problems with layouts. (This preserves accessibility because it lacks semantics to interfere with anyway.) You may override this with `:host { /* overrides */ }`.
> - `<Scope>` creates a `<react-shadow-scope>` element, but doesn't define it as a custom element. This avoids cases where `<div>` or `<span>` would break HTML validation.
> - In some cases, HTML requires certain nesting rules to be valid. For example, `<ul>` may only contain `<li>` tags as direct children. To work around this, you can either render all `<li>` tags in one parent `<Scope>`, or apply your own semantics with `role="list"` and `role="listitem"` to your markup instead of using `<ul>` and `<li>`.

---

### Normalize CSS

This package borrows from [normalize.css](https://necolas.github.io/normalize.css/8.0.1/normalize.css) to make style defaults more consistent across browsers. This feature is opt-in by default to hopefully save you some hassle, but you can opt-out any time by setting the `normalize` prop to false.

```jsx
<Scope stylesheet={styles} normalize={false}>
```

All normalized styles are contained inside a `@layer` called `normalize`, which gives them the lowest priority, making them easy to override.

---

### Constructed Style Sheets

For better performance, you can create a new `CSSStyleSheet` object and pass it to the `stylesheet` prop.

`react-shadow-scope` exports a tagged template function (`css`) that will take care of this for you. It will detect support for the feature and fallback to a string if necessary. When rendering on the server, the styles will render in a `<style>` tag.

> For best results, avoid creating a new `CSSStyleSheet` each render.

```jsx
import { css, Scope } from 'react-shadow-scope';

const styles = css`h1 { color: red }`;

const MyComponent = () => (
  <>
    <Scope stylesheet={styles}>
      <h1>title here</h1>
    </Scope>
  </>
);
```

To use multiple stylesheets, you can also use the `stylesheets` prop (plural) and pass an array.

```jsx
<Scope stylesheets={[theme, styles]}>
```

---

### Excluding Children From the Scope

Most of the time, you won't want the children to be rendered in the same CSS scope as the component. In such a case, you will want to use `<slot>` tags and pass children to the `slottedContent` prop.

```jsx
<Scope stylesheet={styles} slottedContent={children}>
  <slot></slot>
</Scope>
```

This is just an abstraction over shadow DOM, so anything you can do with shadow DOM, you can do with `slottedContent`. This includes named slots and so on. But at that point, you may be entering territory where it becomes more practical to just use the bare syntax of declarative shadow DOM... which you can also do with this package!

---

### Declarative Shadow DOM

If you want to use declarative shadow DOM directly, without the `<Scope>` component, you can use `<Template>`. This adds support to React for the native `<template>` element, with some added features.

```jsx
import { css, Template } from 'react-shadow-scope';

const styles = css`/* styles here */`;

const MyComponent = () => (
  <card-element>
    {/* Note the declarative `adoptedStyleSheets` prop! */}
    <Template
      shadowrootmode="closed"
      adoptedStyleSheets={[styles]}
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
```

---

### Tailwind

Tailwind support is already built-in so you don't have to roll your own solution.

```jsx
<Tailwind slottedContent={children}>
  <h1 className="text-slate-900 font-extrabold text-4xl">
    Hello from the Shadow DOM!
  </h1>
  <slot></slot>
</Tailwind>
```

> Your output CSS file should be in the `/public` folder (or wherever your static assets are served from.) Be sure to *remove* it from the `<link>` tag in your HTML. You may want to add this in its place:
> ```html
> <style>
>   body {
>     margin: 0;
>     line-height: inherit;
>   }
> </style>
> ```

#### Tailwind Props
- `href` - This is `/tailwind.css` by default. This will be fetched once and cached.
- `customStyles` - Pass a string or `CSSStyleSheet` (the `css` tagged template function is recommended)
- `slottedContent` - Works the same as `slottedContent` on the `<Scope>` component.

---

## Maintainers

[@jonathandewitt-dev](https://github.com/jonathandewitt-dev)

## License

MIT © 2023 Jonathan DeWitt
