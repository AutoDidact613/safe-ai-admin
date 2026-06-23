import { apiCall, API_ENDPOINTS } from "../../../config/api";

//שליפת כל הארגונים הממתינים לאישור מערכת (ל- admin בלבד!)
export const getPendingOrganizations = async (): Promise<any> => {
    return apiCall<any>(API_ENDPOINTS.adminOrganizations.pending, { method: "GET", });
}