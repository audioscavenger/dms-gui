import React from 'react';
// import { useTranslation } from 'react-i18next';
import RBCard from 'react-bootstrap/Card'; // Import react-bootstrap Card
import RBBadge from 'react-bootstrap/Badge'; // Import react-bootstrap Badge
import { useNavigate } from 'react-router-dom';
import {
  LoadingSpinner,
  Translate,
} from '.';

/**
 * Dashboard card component using react-bootstrap
 * @param {Object} props Component props
 * @param {string} props.title Card title (translation key)
 * @param {string} props.icon Bootstrap icon class name (without 'bi-' prefix)
 * @param {string|number} props.value Value to display
 * @param {boolean} props.isLoading LoadingSpinner
 * @param {string} props.iconColor Bootstrap text color class
 * @param {string} props.badgeColor Bootstrap badge color (if value should be displayed as badge)
 * @param {string} props.badgeText Text for badge (translation key)
 * @param {string} props.className Additional CSS classes
 * @param {string} props.href href link
 * @param {boolean} props.translate use Translate
 */
const DashboardCard = ({
  title,
  icon,
  value,
  isLoading= false,
  iconColor = 'primary',
  badgeColor,
  badgeText,
  className = null,
  href = null,
  translate = true,
  ...rest
}) => {
  // const { t } = useTranslation();
  const navigate = useNavigate();

  function handleNavigate(to) {
    to && navigate(to);
  }
  
  // text loading spinner
  return (
    <RBCard
      className={`dashboard-card ${className} ${isLoading ? "opacity-25" : ""} ${href ? "card-clickable" : ""}`}
      onClick={() => handleNavigate(href)}
      {...rest}
    >
      <RBCard.Body>
        <div className={`dashboard-icon text-${iconColor}`}>
          <i className={`bi bi-${icon}`}></i>
        </div>
        <RBCard.Title as="h5">
        {Translate(title, translate)}
        </RBCard.Title>
        {badgeColor
          ? <RBBadge bg={badgeColor}>{badgeText ? Translate(badgeText, translate) : value}</RBBadge>
          : (isLoading
            ? <LoadingSpinner size="sm"/>
            : <p className="card-text">{value}</p>
          
        )}
      </RBCard.Body>
    </RBCard>
  );
};

export default DashboardCard;
    // icon loading spinner
    // <RBCard className={`dashboard-card ${className}`} {...rest}>
      // <RBCard.Body>
        // <div className={`dashboard-icon text-${iconColor}`}>
        // {(isLoading) ?
          // <LoadingSpinner /> :
          // <i className={`bi bi-${icon}`}></i>
        // }
        // </div>
        // <RBCard.Title as="h5">{t(title)}</RBCard.Title>
        // {badgeColor ? (
          // <RBBadge bg={badgeColor}>{badgeText ? t(badgeText) : value}</RBBadge>
        // ) : (
          // <p className="card-text">{value}</p>
        // )}
      // </RBCard.Body>
    // </RBCard>
