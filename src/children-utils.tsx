import React from 'react';

type Slots = { [key: string]: React.ReactNode[] };

/**
 * Replace `<slot>` elements with the content provided by the user.
 */
const replaceSlots = (children: React.ReactNode, slots: Slots) => {
	const resultChildren =
		React.Children.map(children, (child): React.ReactNode => {
			if (React.isValidElement(child)) {
				if (child.type === 'slot') {
					const slotName = child.props.name ?? 'default';
					return slotName in slots ? <>{slots[slotName]}</> : child;
				} else if ('children' in child.props) {
					return React.cloneElement(child, {
						children: replaceSlots(child.props.children as React.ReactNode, slots),
					} as React.Attributes);
				}
			}
			return child;
		}) ?? [];
	if (resultChildren.length === 0) return null;
	return resultChildren.length === 1 ? resultChildren[0] : resultChildren;
};

/**
 * Return template content with the slots filled in.
 */
export const parseSlots = (children: React.ReactNode[], template: React.ReactElement) => {
	const slots: { [key: string]: React.ReactNode[] } = {};
	for (const child of children) {
		if (React.isValidElement(child)) {
			const slotName = child.props.slot ?? 'default';
			if (!Array.isArray(slots[slotName])) {
				slots[slotName] = [];
			}
			slots[slotName].push(child);
		}
	}

	return replaceSlots(template.props.children, slots);
};
