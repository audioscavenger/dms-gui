// https://icons.getbootstrap.com/
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RBCard from 'react-bootstrap/Card';
import Collapse from 'react-bootstrap/Collapse';
// https://react-bootstrap.netlify.app/docs/components/placeholder/
// import Placeholder from 'react-bootstrap/Placeholder';   // TODO: Our cards are more like containers, let's create another Card component when Placeholder are needed
import {
  Button,
  LoadingSpinner,
  Translate,
} from './index.jsx';

/**
 * Reusable card component using react-bootstrap, exposing sub-components like Card.Text
 * @param {Object} props Component props
 * @param {string} props.title Card title (translation key)
 * @param {string} props.titleExtra Card titleExtra
 * @param {string} props.iconExtra Card
 * @param {string} props.icon Card icon
 * @param {function} props.refresh Card refresh action
 * @param {bool} props.collapse Card icon action
 * @param {startOpen} props.startOpen starts the Card open
 * @param {React.ReactNode} props.children Card content
 * @param {string} props.className Additional CSS classes
 * @param {boolean} props.noPadding Remove padding from card body
 * @param {React.ReactNode} props.headerContent Custom content for the header
 */
const Card = ({
  title,
  titleExtra,
  iconExtra,
  titleRefresh,
  headerContent,
  icon,
  isLoading = false,
  children,
  onClickRefresh,
  collapsible = true,
  startOpen = true,
  className = '',
  noPadding = false,
  translate = true,
  ...rest
}) => {
  const { t } = useTranslation();
  const bodyClassName   = noPadding      == true ? 'p-0' : '';
  const showRefresher   = (typeof onClickRefresh  == "function") ? true : false;
  const overrideTitleRefresh   = (typeof titleRefresh  == "string") ? true : false;
  
  // https://stackoverflow.com/questions/18672452/left-align-and-right-align-within-div-in-bootstrap
  // "d-flex justify-content-between" works only for exactly 2 div as children, not span
  const titleClassName  = (showRefresher || collapsible) ? "mb-0 d-flex justify-content-between" : "mb-0";

  const [open, setOpen] = useState(startOpen);
  return (
    <>
    <RBCard className={className} {...rest}>
      {(title || headerContent) && (
        <RBCard.Header>
          {title && (
            <RBCard.Title as="h5" className="mb-0 d-flex align-items-center w-100">
              
              {/* 1. LEFT SIDE: Title Text and Icons */}
              <div className="d-flex align-items-center">
                {icon && <i className={`me-2 bi bi-${icon}`}></i>}
                {Translate(title, translate)}
                {isLoading && <span className="ms-2"><LoadingSpinner isInline="true" size="sm"/></span>}
              </div>

              {/* 2. RIGHT SIDE WRAPPER: Pushed to the far right using 'ms-auto' */}
              <div className="d-flex align-items-center ms-auto gap-3">
                
                {/* Extra link/icon content - sits on the left side of the button cluster */}
                {(iconExtra || titleExtra) && (
                  <div className="d-flex align-items-center">
                    {iconExtra && ( 
                      <img 
                        src={t(iconExtra)} 
                        alt="Card Icon" 
                        style={{ width: '24px', height: '24px' }} 
                        className="me-2"
                      />
                    )}
                    {typeof titleExtra === 'string' ? Translate(titleExtra, translate) : titleExtra}
                  </div>
                )}

                {/* Control Action Buttons */}
                {(showRefresher || collapsible) && (
                  <div className="d-flex align-items-center border-start ps-3" style={{ gap: '0.5rem' }}>
                    {showRefresher && (
                      <Button
                        variant="warning"
                        size="sm"
                        icon="arrow-repeat"
                        title={overrideTitleRefresh ? titleRefresh : t('common.refresh')}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onClickRefresh(e);
                        }}
                      />
                    )}
                    {collapsible && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="arrows-collapse"
                        title="common.collapse"
                        onClick={() => setOpen(!open)}
                        aria-controls="collapsible"
                        aria-expanded={open}
                      />
                    )}
                  </div>
                )}
                
              </div>

            </RBCard.Title>
          )}
          {headerContent}
        </RBCard.Header>
      )}
      <Collapse in={open}>
        <RBCard.Body className={bodyClassName} id="collapsible">{children}</RBCard.Body>
      </Collapse>
    </RBCard>
    </>
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

            // <RBCard.Title as="h5" className={titleClassName}>
            // <div>
            //   {(icon) && <i className={`me-2 bi bi-${icon}`}></i>}
            //   {Translate(title, translate)}
            //   {isLoading && <span><LoadingSpinner isInline="true" size="sm"/></span>}
            // </div>
            // {(iconExtra || titleExtra) && (
            //   <div>
            //     {iconExtra && ( 
            //       <img 
            //         src={t(iconExtra)} 
            //         alt="Card Icon" 
            //         style={{ width: '32px', height: '32px', marginBottom: '10px' }} 
            //       />
            //     )}
            //     {titleExtra && Translate(titleExtra, translate)}
            //   </div>
            // )}
            // {(showRefresher || collapsible) && (
            //   <div>
            //   {showRefresher && (
            //     <Button
            //       variant="warning"
            //       size="sm"
            //       icon="arrow-repeat"
            //       title={(overrideTitleRefresh) ? titleRefresh : t('common.refresh')}
            //       className="me-2"
            //       onClick={(e) => {
            //         e.stopPropagation(); // Stops the click from bubbling up to the card
            //         e.preventDefault();  // Prevents the card link from opening
            //         onClickRefresh(e);   // Calls your actual refresh function
            //       }}
            //     />
            //   )}
            //   {collapsible && (
            //     <Button
            //       variant="secondary"
            //       size="sm"
            //       icon="arrows-collapse"
            //       title="common.collapse"
            //       onClick={() => setOpen(!open)}
            //       aria-controls="collapsible"
            //       aria-expanded={open}
            //     />
            //   )}
            //   </div>
            // )}
            // </RBCard.Title>
