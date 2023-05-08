
# React Shadow Scope

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)


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

## Usage

To create a new CSS scope, import the `Scope` component from the package and just pass a string to the `stylesheet` prop.

```jsx
import { Scope } from 'react-shadow-scope';

const MyComponent = () => (
  <>
    {/* Scope gives you protection from inherited styles! */}
    <style>{` #Demo h1 { color: blue; text-decoration: underline; } `}</style>
    <div id="Demo">
      <h1>This title is blue with underline</h1>
      <Scope stylesheet={` h1 { color: red } `}>
        <h1>This title is red without underline</h1>
        <Scope stylesheet={` h1 { font-style: italic } `}>
          <h1>This title is italicized without underline or color</h1>
      </Scope>
    </div>
  </>
);
```

### Constructed Style Sheets

For better performance, you can create a new `CSSStyleSheet` object and pass it to the `stylesheet` prop.

We export a handy utility function (`css`) that will take care of this for you, while also detecting support and using a fallback when necessary. When rendering on the server, the styles will render in a `<style>` tag.

> For best results, avoid creating a new `CSSStyleSheet` each render.

```jsx
import { useMemo } from 'react'
import { css, Scope } from 'react-shadow-scope';

const MyComponent = () => {

  const styles = useMemo(
    () => css` h1 { color: red } `,
    [],
  );

  return (
    <>
      <Scope stylesheet={styles}>
        <h1>title here</h1>
      </Scope>
    </>
  );
};
```

To use multiple stylesheets, you can also use the `stylesheets` prop (plural) and pass an array.

```jsx
<Scoped stylesheets={[theme, styles]}>
```

### Declarative Shadow DOM

If you want to use declarative shadow DOM directly, without the `<Scoped>` component, you can use `<Template>`, which adds support to React for the native `<template>` element, with some added features.

```jsx
import { css, Template } from 'react-shadow-scope';

const MyComponent = () => {

  const styles = useMemo(
    () => css`/* css styles here */`,
    [],
  );

  // Note the declarative `adoptedStyleSheets` prop!
  return (
    <card-element>
      <Template
        shadowrootmode="closed"
        adoptedStyleSheets={[styles]}
      >
        <article>
          <header>
            <h3><slot name="heading">(Untitled)</slot></h3>
          </header>
          <div className="body">
            <slot>(No content)</slot>
          </div>
        </article>
      </Template>
      <span slot="heading">Title Here</span>
      <p>Inside Default Slot</p>
    </card-element>
  );
};
```

## Maintainers

[@jonathandewitt-dev](https://github.com/jonathandewitt-dev)

## License

MIT © 2023 Jonathan DeWitt
