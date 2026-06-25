import * as repo from "../repositories/tenderBoardRepository";
import logger from "../logger";

// הרשימה הסטטית של התחומים 
const STATIC_FIELDS = [
  'AI',
  'Security',
  'Healthcare',
  'Finance',
  'Logistics',
  'Design',
  'Data',
  'Web',
  'Mobile',
  'DevOps',
  'ML Ops',
  'Robotics'
];

export async function getFieldsList() {
  return STATIC_FIELDS;
}

export async function createTender(data: any) {
  try {
    const tender = await repo.createTender(data);

    logger.info("Tender created", { tenderId: tender._id });

    return tender;
  } catch (error) {
    logger.error("Failed to create tender", { error });
    throw error;
  }
}

export async function listTenders() {
  return repo.getTenders();
}

export async function getTenderById(id: string) {
  return repo.getTenderById(id);
}

export async function updateTender(id: string, data: any) {
  return repo.updateTender(id, data);
}

export async function deleteTender(id: string) {
  try {
    const result = await repo.deleteTender(id);

    logger.info("Tender deleted", { tenderId: id });

    return result;
  } catch (error) {
    logger.error("Failed to delete tender", { error });
    throw error;
  }
}
/**
 * Apply to a tender as an applicant
 * Validates that applicant details are provided and prevents duplicate applications
 */
export async function applyToTender(
  tenderId: string,
  applicant: {
    name: string;
    email: string;
    details: string;
    proposal?: string;
    contactMethod?: string;
  }
) {
  if (!applicant.name || !applicant.name.trim()) {
    throw new Error("Applicant name is required");
  }
  if (!applicant.email || !applicant.email.trim()) {
    throw new Error("Applicant email is required");
  }
  if (!applicant.details || !applicant.details.trim()) {
    throw new Error("Applicant details are required");
  }

  const tender = await repo.getTenderById(tenderId);
  if (!tender) {
    throw new Error("Tender not found");
  }

  const normalizedName = applicant.name.trim();
  const normalizedEmail = applicant.email.trim().toLowerCase();

  const alreadyApplied = tender.applicants?.some(
    (a: any) => 
      a.name?.trim() === normalizedName && 
      a.email?.trim().toLowerCase() === normalizedEmail
  );

  if (alreadyApplied) {
    throw new Error("Applicant already exists");
  }

  const normalizedApplicant = {
    name: normalizedName,
    email: normalizedEmail,
    details: applicant.details.trim(),
    proposal: applicant.proposal?.trim() || undefined,
    contactMethod: applicant.contactMethod?.trim() || undefined,
  };

  const updatedApplicants = [
    ...(tender.applicants || []),
    normalizedApplicant,
  ];

  return repo.updateTenderApplicants(tenderId, updatedApplicants);
}