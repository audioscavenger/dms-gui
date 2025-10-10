import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RBCard from 'react-bootstrap/Card';
import Collapse from 'react-bootstrap/Collapse';
import {
  Button,
} from './';

/**
 * Reusable card component using react-bootstrap, exposing sub-components like Card.Text
 * @param {Object} props Component props
 * @param {string} props.title Card title (translation key)
 * @param {string} props.titleExtra Card titleExtra
 * @param {string} props.icon Card icon
 * @param {bool} props.refresh Card icon action
 * @param {bool} props.collapse Card icon action
 * @param {startOpen} props.startOpen starts the Card open
 * @param {React.ReactNode} props.children Card content
 * @param {string} props.className Additional CSS classes
 * @param {boolean} props.noPadding Remove padding from card body
 * @param {React.ReactNode} props.headerContent Custom content for the header
 */
const Card = ({
  title,
  headerContent,
  titleExtra,
  icon,
  onClickRefresh,
  children,
  refresh = false,
  collapse = true,
  startOpen = true,
  className = '',
  noPadding = false,
  ...rest
}) => {
  const { t } = useTranslation();
  const bodyClassName   = noPadding == "true" ? 'p-0' : '';
  const refresher       = refresh   == "true" ? true : false;
  const collapser       = collapse  == "true" ? true : false;
  // https://stackoverflow.com/questions/18672452/left-align-and-right-align-within-div-in-bootstrap
  // "d-flex justify-content-between" works only for exactly 2 div as children, not span
  const titleClassName  = (refresher || collapser) ? "mb-0 d-flex justify-content-between" : "mb-0";

  const [open, setOpen] = useState(startOpen);

  return (
    <RBCard className={className} {...rest}>
      {(title || headerContent) && (
        <RBCard.Header>
          {title && (
            <RBCard.Title as="h5" className={titleClassName}>
            <div>{(icon) && <i className={`me-2 bi bi-${icon}`}></i>} {t(title)} {titleExtra} </div>
            {(refresher || collapser) && (
              <div>
              {refresher && (
                <Button
                  variant="info"
                  size="sm"
                  icon="recycle"
                  title={t('common.refresh')}
                  className="me-2"
                  onClick={onClickRefresh} aria-controls="collapsible" aria-expanded={open}
                />
              )}
              {collapser && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon="arrows-collapse"
                  title={t('common.refresh')}
                  onClick={() => setOpen(!open)}
                />
              )}
              </div>
            )}
            </RBCard.Title>
          )}
          {headerContent}
        </RBCard.Header>
      )}
      <Collapse in={open}>
        <RBCard.Body className={bodyClassName} id="collapsible">{children}</RBCard.Body>
      </Collapse>
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
