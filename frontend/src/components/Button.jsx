// https://icons.getbootstrap.com/
import React from 'react';
import { useTranslation } from 'react-i18next';
import RBButton from 'react-bootstrap/Button';

/**
 * Reusable button component using react-bootstrap.
 * Renders a <button> by default, or an <a> when `href` is provided.
 *
 * @param {Object} props Component props
 * @param {string} [props.type='button'] Button type: 'button' | 'submit' | 'reset'. Ignored when `href` is set.
 * @param {string} [props.variant='primary'] Button variant: 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'link', 'outline-primary', etc.
 * @param {function} [props.onClick] Click handler. Ignored when `href` is set (use native link behavior).
 * @param {string} [props.text] Button text — a translation key.
 * @param {string} [props.title] Tooltip/title — a translation key.
 * @param {string} [props.icon] Bootstrap icon name (without the 'bi-' prefix), e.g. 'github'.
 * @param {string} [props.size] Button size: 'sm' | 'lg'.
 * @param {boolean} [props.disabled=false] Whether the button is disabled.
 * @param {string} [props.href] If set, the button renders as an <a> tag.
 * @param {string} [props.target] target attribute (only meaningful with `href`), e.g. '_blank'.
 * @param {string} [props.rel] rel attribute (only meaningful with `href`), e.g. 'noopener noreferrer'.
 * @param {string} [props.className] Additional CSS classes.
 * @param {React.ReactNode} [props.children] Children elements (alternative to `text`).
 *
 * @example
 * <Button variant="primary" icon="gear" text="common.save" onClick={save} />
 *
 * @example
 * <Button variant="outline-primary" icon="github" text="settings.githubLink"
 *         href="https://github.com/..." target="_blank" rel="noopener noreferrer" />
 */
const Button = ({
  type = 'button',
  variant = 'primary',
  onClick,
  text,
  title,
  href,
  target,
  rel,
  icon,
  size,
  disabled = false,
  className = '',
  children,
  ...rest
}) => {
  const { t } = useTranslation();

  const hasLabel = Boolean(text) || React.isValidElement(children) || (typeof children === 'string' && children.length > 0);

  // When acting as a link, drop button-only props to keep the <a> valid.
  const isLink = Boolean(href);

  return (
    <RBButton
      as={isLink ? 'a' : 'button'}
      // Only set button-only attrs when it's actually a button
      {...(!isLink && { type, onClick })}
      // Only set link-only attrs when it's actually a link
      {...(isLink && { href, target, rel })}
      variant={variant}
      size={size}
      disabled={!!disabled}
      title={title ? t(title) : undefined}
      className={className || undefined}
      {...rest}
    >
      {icon && (
        <i className={`bi bi-${icon}${hasLabel ? ' me-2' : ''}`} aria-hidden="true" />
      )}
      {text && t(text)}
      {children}
    </RBButton>
  );
};

export default Button;
