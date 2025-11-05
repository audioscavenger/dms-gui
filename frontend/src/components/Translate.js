import React from 'react';
import { Trans } from 'react-i18next';

/**
 * Reusable form field component using react-bootstrap
 * @param {string} [props.string] string to translate
 * @param {boolean} [props.translate] Whether the field is translated
 */
// const Translate = ({
  // string,
  // translate = true,
  // ...rest // Pass any other props
// }) => {
  // const i18nHtmlComponents = { strong: <strong />, i: <i />, br: <br />, a: <a />, };   // html tags authorized in translation.js
  // return (translate) ? <Trans i18nKey={string} components={i18nHtmlComponents} /> : string;

// };
function Translate(string, translate=true) {
  const i18nHtmlComponents = { strong: <strong />, i: <i />, br: <br />, a: <a />, pre: <pre />, };   // html tags authorized in translation.js
  return (translate && string) ? <Trans i18nKey={string} components={i18nHtmlComponents} /> : (string ? string : "");

};

export default Translate;
