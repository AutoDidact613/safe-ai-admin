import * as repo from "../repositories/contactTypeRepository";

export const getContactTypes = async () => {
  return await repo.getAllActiveTypes();
};