import { apiCall, API_ENDPOINTS } from "../../../config/api";

// שליפת כל הארגונים הממתינים לאישור מערכת (ל- admin בלבד!)
export const getPendingOrganizations = async (): Promise<any> => {
    return apiCall<any>(API_ENDPOINTS.adminOrganizations.pending, { method: "GET" });
}

// קריאת ה-PATCH החדשה לעדכון סטטוס הארגון (אישור/דחייה) ישירות בשרת
export const updateOrganizationStatus = async (id: string, status: "approved" | "rejected"): Promise<any> => {
    return apiCall<any>(`${API_ENDPOINTS.adminOrganizations.pending}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
}