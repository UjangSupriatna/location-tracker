// API Configuration
export const API_BASE_URL = 'https://admin.itsacademics.com';
export const API_KEY_PRIVATE = 'TRACK_PRIVATE_456';
export const API_KEY_PUBLIC = 'TRACK_PUBLIC_123';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/apilogin/login_google`,
  
  // Tracking
  createSession: `${API_BASE_URL}/Apitracker/create_session`,
  getSession: `${API_BASE_URL}/Apitracker/get_session`,
  getAllSessions: `${API_BASE_URL}/Apitracker/get_all_sessions`,
  saveLocation: `${API_BASE_URL}/Apitracker/save_location`,
  getLocations: `${API_BASE_URL}/Apitracker/get_locations`,
  deleteSession: `${API_BASE_URL}/Apitracker/delete_session`,
};
