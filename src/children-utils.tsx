import React from 'react';

/**
 * Return template content with the slots filled in.
 */
export const parseSlots = (
	children: React.ReactNode,
	template: React.ReactElement,
) => {
	const slots: { [key: string]: React.ReactNode[] } = {};
	React.Children.forEach(children, (child) => {
		if (React.isValidElement(child)) {
			const slotName = child.props.slot ?? 'default';
			if (!Array.isArray(slots[slotName])) {
				slots[slotName] = [];
			}
			slots[slotName].push(child);
		}
	});

	const replaceSlots = (children: React.ReactNode): React.ReactNode => {
		return React.Children.map(children, (child) => {
			if (React.isValidElement(child)) {
				if (child.type === 'slot') {
					const slotName = child.props.name ?? 'default';
					return slotName in slots ? <>{slots[slotName]}</> : child;
				} else if ('children' in child.props) {
					return React.cloneElement(child, {
						children: replaceSlots(child.props.children as React.ReactNode),
					} as React.Attributes);
				}
			}
			return child;
		});
	};

	return replaceSlots(template.props.children);
};
