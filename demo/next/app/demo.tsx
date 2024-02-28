'use client';

import { useEffect, useState } from 'react';
// import { Scope, useCSS, Template, Tailwind } from 'react-shadow-scope';
import { Scope, useCSS, Template, Tailwind, CustomIntrinsicElement, ShadowScopeConfigProvider, CustomElement, css } from '../../../dist';

declare global {
  namespace ReactShadowScope {
    interface CustomElements {
      'my-element': CustomIntrinsicElement;
      'card-element': CustomIntrinsicElement;
    }
  }
}

const staticStyles = css`
article {
  background-color: #f0f0f0;
  border: 0 solid;
  border-radius: 0.5rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.2);
  font-family: sans-serif;
  overflow: hidden;
  margin: 0 auto;
  max-width: 20rem;
  text-align: center;
}
header {
  border-bottom: 0.1rem solid #ddd;
  padding: 1rem;
}
h3 {
  margin: 0;
  padding: 0;
}
.body {
  padding: 1rem 2rem;
  min-height: 10rem;
}
`;

const key = Symbol();

export default function Demo() {
  const css = useCSS(key);
  const [test, setTest] = useState(false);
  useEffect(() => {
    setTimeout(() => void setTest(true), 1000);
  }, []);
  return (
    <div>
      <h1>Encapsulation is cool</h1>

      <style>{`p { color: darkred; font-weight: bold; font-family: sans-serif; }`}</style>
      <p>
        Global CSS selects directly on the &lt;p&gt; tag name. Yikes, they tell us
        not to do that because it can be difficult to opt-out of styles in a big
        website.
      </p>

      {/* prettier-ignore */}
      <Scope tag="my-element" stylesheet={css`p { color: ${test ? 'green' : 'blue'}; font-family: sans-serif; }`}>
        <p>This scope solves the problem though!</p>
        <p>
          This &lt;p&gt; tag does not inherit the bold font from outside. The
          green color is not a cascading override either, all you have is a
          browser default in this scope.
        </p>
        <p>
          The tag name is directly selected in this scope again, but it's not a
          big deal because this is *encapsulated*.
        </p>
        <Scope>
          <p>
            This is a nested scope with no styles of its own. Look at that, it
            still inherits nothing! Browser defaults. No cascade problems.
          </p>
        </Scope>
      </Scope>
      <p>The global scope doesn't inherit the green style from inside either.</p>

      <h2>Prefer more fine-grained control?</h2>

      <CustomElement tag="card-element">
        <Template
          shadowrootmode="closed"
          adoptedStyleSheets={[staticStyles]}
        >
          <article>
            <header>
              <h3>
                <slot name="heading">(Untitled)</slot>
              </h3>
            </header>
            <div className="body">
              <slot>(No content)</slot>
            </div>
          </article>
        </Template>
        {/**
          * Everything below is technically in the light DOM, it just gets reflected in the slots of the shadow DOM. Therefore, this markup is exposed to the global scope.
          * @see https://stackoverflow.com/questions/61626493/slotted-css-selector-for-nested-children-in-shadowdom-slot/61631668#61631668
          */}
        <span slot="heading">Title Here</span>
        <p>
          This card was rendered using the traditional declarative shadow DOM
          approach. Not everyone is a fan, but it's nice to expose optional
          complexity for greater flexibility and control.
        </p>
      </CustomElement>

      <Scope href="/styles.css">
        <p className="info">These styles were fetched with the `href` prop.</p>
      </Scope>

      <Tailwind>
        <h2 className="text-slate-900 font-extrabold text-4xl">
          Tailwind in Shadow DOM!
        </h2>
        <p>
          This block was rendered inside of a shadow DOM scope with Tailwind.
        </p>
      </Tailwind>
    </div>
  )
}
