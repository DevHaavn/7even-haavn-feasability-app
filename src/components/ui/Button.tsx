import React from 'react';

export type ButtonVariant =
  | 'primary'    // the ONE main action per screen
  | 'glass'      // the default
  | 'outline'    // secondary, inside panels
  | 'quiet'      // cancel / dismiss
  | 'glassDark'  // on forest surfaces only
  | 'mint';      // primary on forest surfaces

export type ButtonShape = 'default' | 'square' | 'circle' | 'fab';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  /** Icon rendered before the label. Omit label for icon-only shapes. */
  icon?: React.ReactNode;
}

const SHAPE_CLASS: Record<ButtonShape, string> = {
  default: '',
  square: 'atr-btn--sq',
  circle: 'atr-btn--ci',
  fab: 'atr-btn--fab',
};

/**
 * Icon-only shapes (square, circle, fab) MUST be given an aria-label.
 * <Button shape="square" aria-label="Search" icon={<SearchIcon/>} />
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'glass', shape = 'default', icon, className = '', children, ...rest },
    ref,
  ) {
    const shapeCls = SHAPE_CLASS[shape];
    // fab carries its own colour; don't stack a variant on top of it
    const variantCls = shape === 'fab' ? '' : `atr-btn--${variant}`;
    return (
      <button
        ref={ref}
        className={`atr-btn ${variantCls} ${shapeCls} ${className}`.trim()}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  },
);

export default Button;
