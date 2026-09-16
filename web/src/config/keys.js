// SANKET Geospatial & Tactical Intelligence Credentials
// Configured from environment or authenticated user tokens

export const TACTICAL_KEYS = {
  CESIUM_ION_TOKEN:
    import.meta.env.VITE_CESIUM_ION_TOKEN ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IktaR3QzVWFKVUpoNzAtUEEiLCJqdGkiOiJhOTAzZTdjNC0zNDM0LTQ0NWQtYTVmZS0xMTBlZDA4YTRjMDEiLCJpZCI6NDgzNTEwLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODg4Nzg5Nzd9.pcrhj7GloUD8mB68lns6957iTxcaBQsjswlcrrhJH5g',

  GOOGLE_MAPS_3D_KEY:
    import.meta.env.VITE_GOOGLE_MAPS_3D_KEY ||
    'AIzaSyCAfrvU_Gall8Bkt-Ff1d650Bt1xBER0HQ',

  NASA_FIRMS_KEY:
    import.meta.env.VITE_NASA_FIRMS_KEY ||
    '1efcb6d2a94682964a1b98160ec89f5d',

  TOMTOM_KEY:
    import.meta.env.VITE_TOMTOM_KEY ||
    'sNqL4l8PVPcIj22p9mkD7ZIouv4IWLJ0',

  AISSTREAM_KEY:
    import.meta.env.VITE_AISSTREAM_KEY ||
    '3be93dcd34f76e4c3139631f86ea6e1298d68d9d',
};

export default TACTICAL_KEYS;
