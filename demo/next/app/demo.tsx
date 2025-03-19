'use client';

import { useEffect, useState } from 'react';
import { Scope, useCSS, Template, Tailwind, CustomIntrinsicElement, css } from 'react-shadow-scope';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'my-element': CustomIntrinsicElement;
			'card-element': CustomIntrinsicElement;
			'my-input': CustomIntrinsicElement;
			'my-custom-input': CustomIntrinsicElement;
			'my-button': CustomIntrinsicElement;
			'my-select': CustomIntrinsicElement;
			'my-checkbox': CustomIntrinsicElement;
			'my-radio': CustomIntrinsicElement;
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
const key2 = Symbol();

export default function Demo() {
	const css = useCSS(key);
	const css2 = useCSS(key2);
	const [test, setTest] = useState(false);
	const [value, setValue] = useState('');
	const [value2, setValue2] = useState('');
	const [selected, setSelected] = useState('');
	const [checked, setChecked] = useState(false);
	const [radio, setRadio] = useState<string | null>(null);
	useEffect(() => {
		setTimeout(() => void setTest(true), 1000);
	}, []);
	return (
		<div>
			<h1>Encapsulation is cool</h1>

			<style>{`p { color: darkred; font-weight: bold; font-family: sans-serif; }`}</style>
			<p>
				Global CSS selects directly on the &lt;p&gt; tag name. Yikes, they tell us not to do that because it can be
				difficult to opt-out of styles in a big website.
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

			<card-element>
				<Template shadowRootMode="closed" adoptedStyleSheets={[staticStyles]}>
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
					This card was rendered using the traditional declarative shadow DOM approach. Not everyone is a fan, but it's
					nice to expose optional complexity for greater flexibility and control.
				</p>
			</card-element>

			<Scope href="/styles.css">
				<p className="info">These styles were fetched with the `href` prop.</p>
			</Scope>

			<Tailwind>
				<h2 className="text-slate-900 font-extrabold text-4xl">Tailwind in Shadow DOM!</h2>
				<p>This block was rendered inside of a shadow DOM scope with Tailwind.</p>
			</Tailwind>

			<form
				onSubmit={(event) => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					console.log(formData.entries().toArray());
				}}
			>
				<p>
					Scope can now also work with forms! It's a little tricky, but it solves the problem of shadow DOM
					encapsulating HTML form controls.
				</p>
				<Scope tag="my-input" formControl={{ is: 'input', value, name: 'my-input' }}>
					<input onChange={(event) => setValue(event.currentTarget.value)} required />
				</Scope>
				<Scope
					tag="my-custom-input"
					formControl={{ is: 'input', value: value2, name: 'my-custom-input', required: true }}
					stylesheet={css2`
						:host {
							display: inline-block;
							width: 10rem;
							background-color: lightblue;
							overflow: hidden;
						}
						div {
							padding: 0.2rem;
							white-space: nowrap;
						}
					`}
				>
					<div contentEditable onInput={(event) => setValue2(event.currentTarget.textContent ?? '')}></div>
				</Scope>
				<Scope tag="my-select" formControl={{ is: 'select', value: selected, name: 'my-select', required: true }}>
					<select onChange={(event) => setSelected(event.currentTarget.value)}>
						<option></option>
						<option value="1">One</option>
						<option value="2">Two</option>
						<option value="3">Three</option>
					</select>
				</Scope>
				<Scope tag="my-checkbox" formControl={{ is: 'checkbox', value: 'checked', checked, name: 'my-checkbox' }}>
					<input
						type="checkbox"
						onChange={(event) => {
							setChecked(event.target.checked);
						}}
					/>
				</Scope>
				<Scope tag="my-radio" formControl={{ is: 'radio', value: 'one', checked: radio === 'one', name: 'my-radio' }}>
					<input
						type="radio"
						checked={radio === 'one'}
						onChange={() => {
							setRadio('one');
						}}
					/>
				</Scope>
				<Scope tag="my-radio" formControl={{ is: 'radio', value: 'two', checked: radio === 'two', name: 'my-radio' }}>
					<input
						type="radio"
						checked={radio === 'two'}
						onChange={() => {
							setRadio('two');
						}}
					/>
				</Scope>
				<Scope tag="my-button" formControl={{ is: 'button', type: 'submit' }}>
					<button>Submit</button>
				</Scope>
			</form>
		</div>
	);
}
