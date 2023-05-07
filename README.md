
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

```jsx
import { css, Scope, Template } from 'react-shadow-scope';

const App = () => (
  <>
    {/* Scope gives you protection from inherited styles! */}
    <style>{` #Demo h1 { color: blue; text-decoration: underline; } `}</style>
    <div id="Demo">
      <h1>This title is blue with underline</h1>
      <Scope stylesheet={css` h1 { color: red } `}>
        <h1>This title is red without underline</h1>
        <Scope stylesheet={css` h1 { font-style: italic } `}>
          <h1>This title is italicized without underline or color</h1>
      </Scope>
    </div>

    {/* If you want to use declarative shadow DOM directly... */}
    {/* Note the declarative adoptedStyleSheets syntax! */}
    <card-element>
      <Template
        shadowrootmode="closed"
        adoptedStyleSheets={[css` /* css styles here */ `]}
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
  </>
);
```

## Maintainers

[@jonathandewitt-dev](https://github.com/jonathandewitt-dev)

## License

MIT © 2023 Jonathan DeWitt
