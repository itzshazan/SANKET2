import React from 'react';
import './brand.css';

const BASE = import.meta.env.BASE_URL || '/';
const LOGO = `${BASE}branding/sanket-logo.png`;
const ICON = `${BASE}branding/sanket-icon.png`;

// Display the supplied artwork in a horizontal lockup without changing its pixels.
export default function Brand({ inverse = false }) {
  return (
    <span className={`sanket-brand${inverse ? ' sanket-brand-inverse' : ''}`} role="img" aria-label="SANKET">
      {inverse ? <img className="sanket-brand-symbol" src={ICON} alt="" /> : (
        <svg className="sanket-brand-symbol" viewBox="410 135 640 660" aria-hidden="true">
          <image href={LOGO} width="1448" height="1086" />
        </svg>
      )}
      <svg className="sanket-brand-wordmark" viewBox="135 810 1180 190" aria-hidden="true">
        <image href={LOGO} width="1448" height="1086" />
      </svg>
    </span>
  );
}
