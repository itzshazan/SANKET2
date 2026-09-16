// Minimal stroke-icon set, matching PharmaBoard's lineIcons.jsx convention:
// 1.5-2px stroke, no fill, currentColor, no emoji anywhere.
import React from 'react';

const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconGrid = (p) => (<svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
export const IconMap = (p) => (<svg {...base} {...p}><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" /><line x1="8" y1="3" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="21" /></svg>);
export const IconMonitor = (p) => (<svg {...base} {...p}><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><polyline points="6 13 9 9 12 12 18 6" /></svg>);
export const IconCamera = (p) => (<svg {...base} {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="14" r="3.5" /></svg>);
export const IconBell = (p) => (<svg {...base} {...p}><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>);
export const IconList = (p) => (<svg {...base} {...p}><line x1="9" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="9" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.4" /><circle cx="4" cy="12" r="1.4" /><circle cx="4" cy="18" r="1.4" /></svg>);
export const IconHistory = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><polyline points="12 7 12 12 16 14" /><path d="M4 4l1.5 3" /></svg>);
export const IconChevronRight = (p) => (<svg {...base} {...p}><polyline points="9 6 15 12 9 18" /></svg>);
export const IconUpload = (p) => (<svg {...base} {...p}><path d="M12 16V4" /><polyline points="7 9 12 4 17 9" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>);
export const IconWifiOff = (p) => (<svg {...base} {...p}><line x1="2" y1="2" x2="22" y2="22" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 5.5-3.5" /><path d="M19 12.5a10 10 0 0 0-2.7-2.4" /><path d="M2 8.5a15 15 0 0 1 4.2-2.8" /><path d="M22 8.5a15 15 0 0 0-8-3.4" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>);
export const IconGlobe = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></svg>);
export const IconUser = (p) => (<svg {...base} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c1.5-4 5-6 7.5-6s6 2 7.5 6" /></svg>);
export const IconMapPin = (p) => (<svg {...base} {...p}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>);
export const IconAlertTriangle = (p) => (<svg {...base} {...p}><path d="M12 3.5 22 20H2z" /><line x1="12" y1="9.5" x2="12" y2="14" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>);
export const IconRoad = (p) => (<svg {...base} {...p}><path d="M6 3 3 21" /><path d="M18 3l3 18" /><line x1="12" y1="4" x2="12" y2="7" /><line x1="12" y1="10.5" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="20" /></svg>);
export const IconVillage = (p) => (<svg {...base} {...p}><path d="M4 21V11l5-4 5 4v10" /><path d="M14 21v-7l4-3 3 3v7" /><line x1="4" y1="21" x2="21" y2="21" /></svg>);
export const IconCloudRain = (p) => (<svg {...base} {...p}><path d="M7 16a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.4 2A4 4 0 0 1 18 16H7z" /><line x1="8" y1="19" x2="8" y2="21.5" /><line x1="12" y1="19" x2="12" y2="21.5" /><line x1="16" y1="19" x2="16" y2="21.5" /></svg>);
export const IconDroplet = (p) => (<svg {...base} {...p}><path d="M12 2.5s6.5 7.2 6.5 12A6.5 6.5 0 0 1 5.5 14.5C5.5 9.7 12 2.5 12 2.5z" /></svg>);
export const IconLeaf = (p) => (<svg {...base} {...p}><path d="M5 21c9 0 14-5 14-14V4c-9 0-14 5-14 14z" /><path d="M5 21c3-7 8-12 14-14" /></svg>);
export const IconMountain = (p) => (<svg {...base} {...p}><path d="M3 20 9 8l4 6 2-3 6 9z" /></svg>);
export const IconSatellite = (p) => (<svg {...base} {...p}><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" /><line x1="14.5" y1="9.5" x2="19" y2="5" /><line x1="9.5" y1="14.5" x2="5" y2="19" /><line x1="17" y1="7" x2="19" y2="5" /><line x1="19" y1="7" x2="21" y2="5" /></svg>);
export const IconRefresh = (p) => (<svg {...base} {...p}><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.5 9A9 9 0 0 0 4.6 6.4L1 10m22 4-3.6 3.6A9 9 0 0 1 3.5 15" /></svg>);
export const IconInfo = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><circle cx="12" cy="8" r="0.6" fill="currentColor" /></svg>);
export const IconCheckCircle = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><polyline points="8 12.5 11 15.5 16 9" /></svg>);
export const IconCheck = (p) => (<svg {...base} {...p}><polyline points="20 6 9 17 4 12" /></svg>);
export const IconClock = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg>);
export const IconLock = (p) => (<svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>);
export const IconBarChart = (p) => (<svg {...base} {...p}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>);
export const IconFileText = (p) => (<svg {...base} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>);
export const IconBuilding = (p) => (<svg {...base} {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="22" x2="9" y2="18" /><line x1="15" y1="22" x2="15" y2="18" /><line x1="9" y1="6" x2="9.01" y2="6" /><line x1="15" y1="6" x2="15.01" y2="6" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /><line x1="9" y1="14" x2="9.01" y2="14" /><line x1="15" y1="14" x2="15.01" y2="14" /></svg>);
export const IconLayers = (p) => (<svg {...base} {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
export const IconActivity = (p) => (<svg {...base} {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>);
export const IconSearch = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
export const IconHospital = (p) => (<svg {...base} {...p}><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><line x1="12" y1="7" x2="12" y2="13" /><line x1="9" y1="10" x2="15" y2="10" /></svg>);
export const IconDownload = (p) => (<svg {...base} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
