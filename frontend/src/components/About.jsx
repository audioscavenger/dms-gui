import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Translate from './Translate';

/**
 * Reusable "About" content block
 * @param {Object} props Component props
 * @param {string} props.descriptionKey Translation key for the description text (defaults to 'settings.aboutDescription')
 * @param {string} [props.buttonHref] URL for the GitHub link (defaults to t('common.DMS_GUIurl'))
 * @param {string} [props.buttonTextKey] Translation key for the button label (defaults to 'settings.githubLink')
 * @param {string} [props.variant] Button variant (defaults to 'outline-primary')
 * @param {string} [props.icon] Bootstrap icon name (defaults to 'github')
 * @param {string} [props.className] Additional CSS classes for the wrapper
 * @param {React.ReactNode} [props.children] Optional extra content appended after the button
 */
const About = ({
  descriptionKey = 'settings.aboutDescription',
  buttonHref,
  buttonTextKey = 'settings.githubLink',
  variant = 'outline-primary',
  icon = 'github',
  className = '',
  children,
}) => {
  const { t } = useTranslation();
  const href = buttonHref ?? t('common.DMS_GUIurl');

  return (
    <>
    <div className={className}>
      {Translate(descriptionKey)}
      <br />
      <Button
        variant={variant}
        icon={icon}
        text={buttonTextKey}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      />
      {children}
    </div>
    </>
  );
};

export default About;