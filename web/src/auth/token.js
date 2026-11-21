// The current Supabase access token, read by the API client to sign every request.
// Kept in its own module so the API client and the auth context do not import each other.
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token || null; };
