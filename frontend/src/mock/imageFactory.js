const encode = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const makeProductImage = (label, color = '#2563eb', accent = '#dbeafe') =>
  encode(`
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${accent}"/>
          <stop offset="1" stop-color="#ffffff"/>
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${color}"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
      </defs>
      <rect width="700" height="700" rx="48" fill="url(#bg)"/>
      <ellipse cx="350" cy="605" rx="180" ry="28" fill="#94a3b8" opacity=".25"/>
      <g transform="translate(210 70)">
        <rect width="280" height="510" rx="42" fill="#0f172a"/>
        <rect x="11" y="11" width="258" height="488" rx="33" fill="url(#screen)"/>
        <rect x="105" y="23" width="70" height="14" rx="7" fill="#020617"/>
        <circle cx="140" cy="285" r="80" fill="#fff" opacity=".13"/>
        <circle cx="140" cy="285" r="48" fill="#fff" opacity=".13"/>
        <path d="M70 400 C130 335 165 455 220 360" fill="none" stroke="#fff" stroke-width="14" opacity=".55"/>
      </g>
      <text x="350" y="650" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#0f172a">${label}</text>
    </svg>
  `);

export const makeAccessoryImage = (label, color = '#0ea5e9') =>
  encode(`
    <svg xmlns="http://www.w3.org/2000/svg" width="700" height="700" viewBox="0 0 700 700">
      <rect width="700" height="700" rx="48" fill="#f8fafc"/>
      <circle cx="350" cy="300" r="205" fill="${color}" opacity=".12"/>
      <rect x="190" y="190" width="320" height="240" rx="70" fill="${color}"/>
      <circle cx="285" cy="310" r="58" fill="#fff" opacity=".9"/>
      <circle cx="415" cy="310" r="58" fill="#fff" opacity=".9"/>
      <path d="M285 310 C285 480 205 475 205 545" fill="none" stroke="${color}" stroke-width="28" stroke-linecap="round"/>
      <path d="M415 310 C415 480 495 475 495 545" fill="none" stroke="${color}" stroke-width="28" stroke-linecap="round"/>
      <text x="350" y="635" text-anchor="middle" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#0f172a">${label}</text>
    </svg>
  `);

export const makeBannerImage = (title, subtitle, colorA, colorB) =>
  encode(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="560" viewBox="0 0 1600 560">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${colorA}"/>
          <stop offset="1" stop-color="${colorB}"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="560" fill="url(#g)"/>
      <circle cx="1370" cy="60" r="260" fill="#fff" opacity=".08"/>
      <circle cx="1250" cy="420" r="360" fill="#fff" opacity=".07"/>
      <text x="120" y="230" font-family="Arial,sans-serif" font-size="78" font-weight="800" fill="#fff">${title}</text>
      <text x="125" y="305" font-family="Arial,sans-serif" font-size="34" fill="#fff" opacity=".9">${subtitle}</text>
      <rect x="125" y="355" width="205" height="64" rx="32" fill="#fff"/>
      <text x="227" y="397" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="${colorA}">Khám phá ngay</text>
      <g transform="translate(1050 48) rotate(8)">
        <rect width="250" height="450" rx="40" fill="#0f172a"/>
        <rect x="11" y="11" width="228" height="428" rx="32" fill="#fff" opacity=".92"/>
        <rect x="91" y="24" width="70" height="13" rx="7" fill="#0f172a"/>
        <circle cx="125" cy="235" r="82" fill="${colorB}" opacity=".55"/>
      </g>
    </svg>
  `);
