// https://icons.getbootstrap.com/
import React from 'react';
import { useTranslation } from 'react-i18next';
import RBAccordion from 'react-bootstrap/Accordion';

import Button from './Button';
import Translate from './Translate';

// const tabs = [
  // { id: 1, title: "Tab 1", icon: "person-plus-fill",   content: "Content of Tab 1" },
  // { id: 2, title: "Tab 2", icon: "person-lines-fill",  titleExtra: "smth extra", content: "Content of Tab 2" },
// ];

/**
 * Reusable card component using react-bootstrap, exposing sub-components like Card.Text
 * @param {Object} props Component props
 * @param {Object} props.tabs mapping content
 * @param {number} props.tabs.id
 * @param {string} props.tabs.title
 * @param {string} props.tabs.icon
 * @param {bool} props.refresh Accordion icon action but then you need onClickRefresh in some tabs
 * @param {function} props.onClickRefresh does smth
 * @param {React.ReactNode} props.tabs.content
 * @param {string} props.className Additional CSS classes
 * @param {boolean} props.noPadding Remove padding from card body
 * @param {number} props.defaultActiveKey
 * @param {object} props.children
 * @param {boolean} props.translate
 */
const Accordion = ({
  tabs,
  defaultActiveKey = 1,
  className = '',
  noPadding = false,
  children,
  titleRefresh,
  translate = true,
  ...rest
}) => {
  const { t } = useTranslation();
  const bodyClassName   = noPadding      == true ? 'p-0' : '';
  const overrideTitleRefresh   = (typeof titleRefresh  == "string") ? true : false;

  // not very clear what they want:
  // -key +eventKey: it works but we have an error
  // +key -eventKey: nothing works
  // +key +eventKey: all works but nowhere it says we need both
  
  // refresh button: Header is actually a button itself, we cannot inject anything inside
  return (
    <>
    <RBAccordion className={className} defaultActiveKey={defaultActiveKey} {...rest}>
      {tabs.map(tab => (
        <RBAccordion.Item key={tab.id} eventKey={tab.id}>
          {/* 1. Use a standard HTML h2 tag with Bootstrap's native header class instead of RBAccordion.Header because it will create a Button otherwise*/}
          <h2 className="accordion-header d-flex align-items-center justify-content-between custom-accordion-header">
            {/* 2. Wrap the text in the actual Accordion toggle button so it remains clickable */}
            <RBAccordion.Button className="flex-grow-1 min-w-0 d-flex align-items-center">
              {(tab.icon) && <i className={`me-2 bi bi-${tab.icon}`}></i>} 
              <span className="text-truncate">
                {Translate(tab.title, translate)} {Translate(tab.titleExtra, translate)}
              </span>
            </RBAccordion.Button>

            {/* 2. Inject the refresh button securely next to the RBAccordion.Button, not inside of it; display on the right side of the header wrapper */}
            {('onClickRefresh' in tab && typeof tab.onClickRefresh === "function") && (
              <div 
                className="accordion-header-actions-wrapper pe-3"
                onClick={(e) => {
                  e.stopPropagation(); // STOPS the click from bubbling up to the header toggle action
                  e.preventDefault();  // PREVENTS the panel from collapsing
                }}
              >
                <Button
                  variant="warning"
                  size="sm"
                  icon="arrow-repeat"
                  title={(overrideTitleRefresh) ? titleRefresh : t('common.refresh')}
                  onClick={(e) => {
                    e.stopPropagation(); // Safety backup stop
                    e.preventDefault();  // Safety backup prevent
                    tab.onClickRefresh(e);   
                  }}
                />
              </div>
            )}
          </h2>
          <RBAccordion.Body className={bodyClassName}>
            {tab.content}
          </RBAccordion.Body>
        </RBAccordion.Item>
      ))}
    </RBAccordion>
    </>
  );
};

// Expose sub-components from react-bootstrap Card
Accordion.Item = RBAccordion.Item;
Accordion.Header = RBAccordion.Header;
Accordion.Body = RBAccordion.Body;
// Add others as needed

export default Accordion;
