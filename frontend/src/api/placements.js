import api from './axiosInstance';

export const getPlacements = (params) => api.get('/placements', { params });
export const createPlacement = (data) => api.post('/placements', data);
export const updatePlacement = (id, data) => api.put(`/placements/${id}`, data);
export const syncPlacementsSheet = () => api.post('/placements/sync');