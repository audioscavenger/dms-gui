import React from 'react';
import { Trans } from 'react-i18next';

/**
 * Reusable form field component using react-bootstrap
 * @param {string} [props.key] string to translate
 * @param {boolean} [props.shouldTranslate] Whether the field is translated
 */

// this HAS to be a function, and I'm not sure why
function Translate(key, shouldTranslate=true, values = {}, ...rest) {

  const i18nHtmlComponents = { strong: <strong />, i: <i />, b: <b />, a: <a />, pre: <pre />, br: <br />, };   // html tags authorized in translation.js
  // console.debug('ddebug Translate key=',key)
  return (shouldTranslate) ? <Trans i18nKey={key} components={i18nHtmlComponents} values={values} {...rest} /> : key;

};

export default Translate;
