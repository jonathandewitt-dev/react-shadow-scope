'use client';
import { Scope, type CustomIntrinsicElement, css } from 'react-shadow-scope';

declare global {
	namespace ReactShadowScope {
		interface CustomElements {
			'x-splash': CustomIntrinsicElement;
		}
	}
}

const staticStyles = css`
	:host {
		display: grid;
		place-items: center;
		place-content: center;
		height: 100vh;
		width: 100vw;
		background-color: #333;
		color: #ddf;
	}
	h1 {
		margin: 0;
		font-size: 5em;
	}
	p {
		font-size: 2em;
	}
`;

export const Splash = () => {
	return (
		<Scope tag="x-splash" stylesheet={staticStyles}>
			<h1>React Shadow Scope</h1>
			<p>Documentation coming soon...</p>
		</Scope>
	);
};
