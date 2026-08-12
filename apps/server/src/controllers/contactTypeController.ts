import { Request, Response } from "express";
import * as service from "../services/contactTypeService";

export const getContactTypes = async (req: Request, res: Response) => {
  try {
    const types = await service.getContactTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: "שגיאה בשליפת סוגי פניות" });
  }
};