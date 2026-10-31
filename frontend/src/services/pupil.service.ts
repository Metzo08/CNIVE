import { apiClient } from './auth.service';

export const pupilService = {
    getAll: async (skip = 0, limit = 100) => {
        const response = await apiClient.get(`/pupils/?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get(`/pupils/${id}`);
        return response.data;
    },

    create: async (pupilData: any) => {
        const response = await apiClient.post('/pupils/', pupilData);
        return response.data;
    },

    getAssessments: async (pupilId: string) => {
        const response = await apiClient.get(`/vulnerabilities/${pupilId}`);
        return response.data;
    },

    assess: async (assessmentData: any) => {
        const response = await apiClient.post('/vulnerabilities/assess', assessmentData);
        return response.data;
    }
};
