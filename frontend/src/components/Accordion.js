import React from 'react';
import { useTranslation } from 'react-i18next';
import RBAccordion from 'react-bootstrap/Accordion';

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
 * @param {React.ReactNode} props.tabs.content
 * @param {string} props.className Additional CSS classes
 * @param {boolean} props.noPadding Remove padding from card body
 * @param {number} props.defaultActiveKey
 */
const Accordion = ({
  tabs,
  defaultActiveKey = 1,
  className = '',
  noPadding = false,
  ...rest
}) => {
  const { t } = useTranslation();
  const bodyClassName = noPadding ? 'p-0' : '';

  // not very clear what they want:
  // -key +eventKey: it works but we have an error
  // +key -eventKey: nothing works
  // +key +eventKey: all works but nowhere it says we need both
  return (
    <>
    <RBAccordion className={className} defaultActiveKey={defaultActiveKey} {...rest}>
      {tabs.map(tab => (
        <RBAccordion.Item key={tab.id} eventKey={tab.id}>
          <RBAccordion.Header>{(tab.icon) && <i className={`me-2 bi bi-${tab.icon}`}></i>} {t(tab.title)} {t(tab.titleExtra)}</RBAccordion.Header>
          <RBAccordion.Body className={bodyClassName}>{tab.content}</RBAccordion.Body>
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
