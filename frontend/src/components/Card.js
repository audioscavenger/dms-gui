import React from 'react';
import { useTranslation } from 'react-i18next';
import RBCard from 'react-bootstrap/Card'; // Import react-bootstrap Card

/**
 * Reusable card component using react-bootstrap, exposing sub-components like Card.Text
 * @param {Object} props Component props
 * @param {string} props.title Card title (translation key)
 * @param {React.ReactNode} props.children Card content
 * @param {string} props.className Additional CSS classes
 * @param {boolean} props.noPadding Remove padding from card body
 * @param {React.ReactNode} props.headerContent Custom content for the header
 */
const Card = ({
  title,
  children,
  className = '',
  noPadding = false,
  headerContent,
  ...rest
}) => {
  const { t } = useTranslation();
  const bodyClassName = noPadding ? 'p-0' : '';

  return (
    <RBCard className={className} {...rest}>
      {(title || headerContent) && (
        <RBCard.Header>
          {title && (
            <RBCard.Title as="h5" className="mb-0">
              {t(title)}
            </RBCard.Title>
          )}
          {headerContent}
        </RBCard.Header>
      )}
      <RBCard.Body className={bodyClassName}>{children}</RBCard.Body>
    </RBCard>
  );
};

// Expose sub-components from react-bootstrap Card
Card.Text = RBCard.Text;
Card.Title = RBCard.Title;
Card.Subtitle = RBCard.Subtitle;
Card.Body = RBCard.Body;
Card.Header = RBCard.Header;
Card.Footer = RBCard.Footer;
Card.Img = RBCard.Img;
// Add others as needed

export default Card;
