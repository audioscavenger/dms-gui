import React from 'react';
import { Trans } from 'react-i18next';

/**
 * Reusable form field component using react-bootstrap
 * @param {string} [props.string] string to translate
 * @param {boolean} [props.translate] Whether the field is translated
 */

// this HAS to be a function, and I'm not sure why
function Translate(string, translate=true, ...rest) {

  const i18nHtmlComponents = { strong: <strong />, i: <i />, br: <br />, a: <a />, pre: <pre />, };   // html tags authorized in translation.js
  // console.debug('ddebug Translate string=',string)
  return (translate && string) ? <Trans i18nKey={string} components={i18nHtmlComponents} {...rest} /> : (string ? string : "");

};

export default Translate;
