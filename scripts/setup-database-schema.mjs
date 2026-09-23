import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME ?? "cg_job_care";

if (!uri) {
  console.error("MONGODB_URI is missing from .env.local.");
  process.exit(1);
}

const client = new MongoClient(uri);
const string = { bsonType: "string" };
const optionalString = { bsonType: ["string", "null"] };

const collections = [
  ["users", { required: ["id", "name", "email", "passwordHash", "role", "status", "createdAt", "updatedAt"], properties: { id: string, name: string, email: string, passwordHash: string, role: { enum: ["SUPER_ADMIN", "ADMIN", "RECRUITER", "PARTNER_ADMIN", "CANDIDATE", "EMPLOYER"] }, businessVerticals: { bsonType: "array", items: { enum: ["RECRUITMENT", "SECURITY", "BABY_CARE", "HOUSEKEEPING", "PEST_CONTROL"] } }, status: { enum: ["ACTIVE", "SUSPENDED", "BLOCKED"] }, lastLoginAt: optionalString, lastActivityAt: optionalString, loginCount: { bsonType: ["int", "long", "double"] }, passwordChangedAt: optionalString, createdAt: string, updatedAt: string } }],
  ["candidates", { required: ["id", "fullName", "mobile", "verificationStatus", "createdAt"], properties: { id: string, fullName: string, mobile: { bsonType: "string", pattern: "^[0-9]{10}$" }, email: optionalString, city: optionalString, preferredRole: optionalString, verificationStatus: { enum: ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "BLOCKED"] }, availability: { enum: ["AVAILABLE", "INTERVIEWING", "SELECTED", "WORKING", "NOT_AVAILABLE"] }, profileCompletion: { bsonType: ["int", "long", "double"] }, resumeUploaded: { bsonType: "bool" }, identityDocumentsUploaded: { bsonType: "bool" }, experienceType: { enum: ["FRESHER", "EXPERIENCED"] }, totalExperienceYears: { bsonType: ["int", "long", "double"] }, highestQualification: optionalString, currentAddress: { bsonType: "object" }, permanentAddress: { bsonType: "object" }, jobPreference: { bsonType: "object" }, consents: { bsonType: "object" }, retentionReviewAt: optionalString, deletionRequestedAt: optionalString, blockReason: optionalString, adminNotes: optionalString, createdAt: string, updatedAt: optionalString, deletedAt: optionalString } }],
  ["candidateEducations", { required: ["candidateId", "qualification", "createdAt"], properties: { candidateId: string, qualification: string, course: optionalString, specialization: optionalString, institution: optionalString, passingYear: optionalString, percentage: optionalString, createdAt: string } }],
  ["candidateExperiences", { required: ["candidateId", "createdAt"], properties: { candidateId: string, company: optionalString, jobRole: optionalString, salary: optionalString, startDate: optionalString, endDate: optionalString, responsibilities: optionalString, createdAt: string } }],
  ["candidateDocuments", { required: ["candidateId", "type", "storageKey", "status", "createdAt"], properties: { candidateId: string, type: { enum: ["RESUME", "AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO", "POLICE_VERIFICATION", "EXPERIENCE_CERTIFICATE", "EDUCATION_CERTIFICATE", "OTHER"] }, storageKey: string, status: { enum: ["PENDING", "VERIFIED", "REJECTED"] }, rejectionReason: optionalString, verifiedBy: optionalString, verifiedAt: optionalString, consentVersion: optionalString, consentAcceptedAt: optionalString, retentionReviewAt: optionalString, createdAt: string, updatedAt: optionalString } }],
  ["candidatePrivacyRequests", { required: ["id", "candidateId", "type", "status", "createdAt"], properties: { id: string, candidateId: string, type: { enum: ["DATA_DELETION"] }, status: { enum: ["SUBMITTED", "IN_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"] }, reason: optionalString, resolutionNote: optionalString, resolvedBy: optionalString, createdAt: string, updatedAt: optionalString } }],
  ["employers", { required: ["id", "companyName", "contactName", "mobile", "email", "status", "createdAt"], properties: { id: string, companyName: string, contactName: string, mobile: string, email: string, city: optionalString, district: optionalString, gstNumber: optionalString, status: { enum: ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] }, createdAt: string, updatedAt: optionalString, deletedAt: optionalString } }],
  ["employerRequirements", { required: ["id", "company", "contactName", "mobile", "jobTitle", "category", "candidatesRequired", "city", "status", "createdAt"], properties: { id: string, company: string, contactName: string, mobile: string, contactEmail: optionalString, jobTitle: string, category: string, businessVertical: { enum: ["RECRUITMENT", "SECURITY", "BABY_CARE", "HOUSEKEEPING", "PEST_CONTROL"] }, candidatesRequired: { bsonType: ["int", "long", "double"] }, city: string, status: { enum: ["NEW", "CONTACTED", "VERIFIED", "APPROVED", "RECRUITING", "FILLED", "CLOSED", "REJECTED", "ON_HOLD"] }, assignedTo: optionalString, internalNotes: optionalString, nextFollowUpAt: optionalString, createdAt: string, updatedAt: optionalString } }],
  ["jobs", { required: ["id", "title", "company", "category", "city", "district", "salaryMin", "salaryMax", "employmentType", "vacancies", "status", "urgent", "postedAt"], properties: { id: string, title: string, company: string, employerId: optionalString, category: string, businessVertical: { enum: ["RECRUITMENT", "SECURITY", "BABY_CARE", "HOUSEKEEPING", "PEST_CONTROL"] }, city: string, district: string, salaryMin: { bsonType: ["int", "long", "double"] }, salaryMax: { bsonType: ["int", "long", "double"] }, employmentType: { enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"] }, vacancies: { bsonType: ["int", "long", "double"] }, status: { enum: ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"] }, urgent: { bsonType: "bool" }, featured: { bsonType: "bool" }, applicationDeadline: optionalString, archivedAt: optionalString, duplicatedFrom: optionalString, postedAt: string, updatedAt: optionalString, deletedAt: optionalString } }],
  ["applications", { required: ["id", "candidateId", "jobId", "status", "statusHistory", "appliedAt"], properties: { id: string, candidateId: string, jobId: string, status: { enum: ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "JOINING_SCHEDULED", "JOINED", "REJECTED", "WITHDRAWN", "NO_SHOW", "ON_HOLD", "NOT_JOINED"] }, statusHistory: { bsonType: "array" }, appliedAt: string, updatedAt: optionalString, deletedAt: optionalString } }],
  ["savedJobs", { required: ["candidateId", "jobId", "createdAt"], properties: { candidateId: string, jobId: string, createdAt: string } }],
  ["interviews", { required: ["id", "candidateId", "applicationId", "jobId", "scheduledAt", "mode", "status", "createdAt"], properties: { id: string, candidateId: string, applicationId: string, jobId: string, scheduledAt: string, mode: { enum: ["OFFLINE", "PHONE", "VIDEO"] }, status: { enum: ["SCHEDULED", "RESCHEDULED", "COMPLETED", "SELECTED", "REJECTED", "NO_SHOW", "CANCELLED"] }, address: optionalString, meetingLink: optionalString, contactPerson: optionalString, contactMobile: optionalString, instructions: optionalString, internalNotes: optionalString, cancelReason: optionalString, createdAt: string, updatedAt: optionalString } }],
  ["placements", { required: ["id", "candidateId", "jobId", "employerId", "joiningDate", "salary", "status", "createdAt"], properties: { id: string, candidateId: string, jobId: string, employerId: string, joiningDate: string, salary: { bsonType: ["int", "long", "double"] }, status: { enum: ["JOINED", "ACTIVE", "LEFT", "TERMINATED", "REPLACEMENT_REQUIRED", "COMPLETED"] }, recruiterId: optionalString, remarks: optionalString, createdAt: string } }],
  ["policeVerifications", { required: ["candidateId", "required", "status", "createdAt"], properties: { candidateId: string, required: { bsonType: "bool" }, status: { enum: ["NOT_STARTED", "SUBMITTED", "UNDER_VERIFICATION", "VERIFIED", "FAILED"] }, certificateNumber: optionalString, issueDate: optionalString, expiryDate: optionalString, policeStation: optionalString, storageKey: optionalString, adminRemarks: optionalString, createdAt: string } }],
  ["serviceRequests", { required: ["id", "customerName", "mobile", "serviceType", "city", "address", "status", "createdAt"], properties: { id: string, customerName: string, mobile: string, serviceType: { enum: ["SECURITY", "BABY_CARE", "CARETAKER", "HOUSEKEEPING", "PEST_CONTROL", "MANPOWER", "OTHER"] }, city: string, address: string, staffRequired: { bsonType: ["int", "long", "double", "null"] }, status: { enum: ["NEW", "CONTACTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }, assignedTo: optionalString, assignedStaff: optionalString, assignedVendor: optionalString, scheduledAt: optionalString, internalNotes: optionalString, createdAt: string, updatedAt: optionalString } }],
  ["serviceReviews", { required: ["id", "serviceSlug", "customerName", "rating", "comment", "status", "createdAt"], properties: { id: string, serviceSlug: { enum: ["job-placement", "security-services", "baby-care", "housekeeping", "pest-control"] }, customerName: string, city: optionalString, rating: { bsonType: ["int", "long"], minimum: 1, maximum: 5 }, comment: string, status: { enum: ["PENDING", "APPROVED", "REJECTED"] }, createdAt: string, updatedAt: optionalString } }],
  ["staffAssignments", { required: ["serviceRequestId", "candidateId", "startDate", "status", "createdAt"], properties: { serviceRequestId: string, candidateId: string, startDate: string, shift: optionalString, rate: { bsonType: ["int", "long", "double", "null"] }, status: { enum: ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"] }, createdAt: string } }],
  ["announcements", { required: ["id", "title", "active", "createdAt"], properties: { id: string, title: string, link: optionalString, active: { bsonType: "bool" }, startDate: optionalString, endDate: optionalString, createdAt: string } }],
  ["websitePosts", { required: ["id", "title", "excerpt", "category", "published", "createdAt"], properties: { id: string, title: string, excerpt: string, category: { enum: ["JOB_TIP", "COMPANY_NEWS", "SERVICE_UPDATE"] }, published: { bsonType: "bool" }, createdAt: string, updatedAt: optionalString } }],
  ["notifications", { required: ["id", "title", "message", "audience", "channel", "createdAt"], properties: { id: string, title: string, message: string, audience: { enum: ["CANDIDATES", "EMPLOYERS", "ALL_USERS"] }, channel: { enum: ["WEBSITE", "EMAIL", "SMS", "WHATSAPP"] }, deliveryStatus: { enum: ["PENDING", "SENT", "FAILED"] }, recipientCount: { bsonType: ["int", "long", "double"] }, deliveredAt: optionalString, deliveryError: optionalString, createdAt: string } }],
  ["notificationTemplates", { required: ["event", "channel", "subject", "body", "active", "createdAt"], properties: { event: string, channel: { enum: ["EMAIL", "SMS", "WHATSAPP"] }, subject: optionalString, body: string, active: { bsonType: "bool" }, createdAt: string } }],
  ["notificationReads", { required: ["candidateId", "notificationId", "readAt"], properties: { candidateId: string, notificationId: string, readAt: string } }],
  ["followUps", { required: ["entityType", "entityId", "scheduledAt", "status", "createdAt"], properties: { entityType: { enum: ["CANDIDATE", "EMPLOYER_REQUIREMENT", "SERVICE_REQUEST"] }, entityId: string, scheduledAt: string, assignedTo: optionalString, remarks: optionalString, status: { enum: ["PENDING", "COMPLETED", "MISSED", "CANCELLED"] }, createdAt: string } }],
  ["auditLogs", { required: ["actorId", "action", "targetType", "targetId", "createdAt"], properties: { actorId: string, action: string, targetType: string, targetId: string, metadata: { bsonType: "object" }, ipAddress: optionalString, createdAt: string } }],
  ["settings", { required: ["key", "value", "updatedAt"], properties: { key: string, value: {}, updatedAt: string, updatedBy: optionalString } }],
  ["counters", { required: ["sequence"], properties: { sequence: { bsonType: ["int", "long", "double"] } } }],
];

const indexes = [
  ["users", [{ key: { email: 1 }, options: { unique: true } }, { key: { role: 1, businessVerticals: 1, status: 1 } }]],
  ["candidates", [{ key: { mobile: 1 }, options: { unique: true } }, { key: { email: 1 }, options: { unique: true, sparse: true } }, { key: { city: 1, preferredRole: 1, verificationStatus: 1, availability: 1 } }]],
  ["jobs", [{ key: { id: 1 }, options: { unique: true } }, { key: { status: 1, city: 1, postedAt: -1 } }, { key: { businessVertical: 1, status: 1, postedAt: -1 } }, { key: { title: "text", company: "text", category: "text" } }]],
  ["applications", [{ key: { id: 1 }, options: { unique: true } }, { key: { candidateId: 1, jobId: 1 }, options: { unique: true } }, { key: { jobId: 1, status: 1, appliedAt: -1 } }]],
  ["savedJobs", [{ key: { candidateId: 1, jobId: 1 }, options: { unique: true } }]],
  ["candidateEducations", [{ key: { candidateId: 1 } }]],
  ["candidateExperiences", [{ key: { candidateId: 1 } }]],
  ["candidateDocuments", [{ key: { candidateId: 1, type: 1 }, options: { unique: true } }]],
  ["candidatePrivacyRequests", [{ key: { id: 1 }, options: { unique: true } }, { key: { status: 1, createdAt: -1 } }, { key: { candidateId: 1, createdAt: -1 } }]],
  ["notificationReads", [{ key: { candidateId: 1, notificationId: 1 }, options: { unique: true } }]],
  ["settings", [{ key: { key: 1 }, options: { unique: true } }]],
  ["interviews", [{ key: { id: 1 }, options: { unique: true } }, { key: { candidateId: 1, scheduledAt: 1 } }, { key: { status: 1, scheduledAt: 1 } }]],
  ["placements", [{ key: { id: 1 }, options: { unique: true } }, { key: { candidateId: 1, status: 1 } }]],
  ["employers", [{ key: { id: 1 }, options: { unique: true } }, { key: { email: 1 }, options: { unique: true } }, { key: { mobile: 1 }, options: { unique: true } }]],
  ["employerRequirements", [{ key: { id: 1 }, options: { unique: true } }, { key: { status: 1, createdAt: -1 } }, { key: { businessVertical: 1, status: 1, createdAt: -1 } }]],
  ["serviceRequests", [{ key: { id: 1 }, options: { unique: true } }, { key: { status: 1, createdAt: -1 } }, { key: { serviceType: 1, status: 1, createdAt: -1 } }]],
  ["serviceReviews", [{ key: { id: 1 }, options: { unique: true } }, { key: { serviceSlug: 1, status: 1, createdAt: -1 } }]],
  ["announcements", [{ key: { id: 1 }, options: { unique: true } }, { key: { active: 1, createdAt: -1 } }]],
  ["websitePosts", [{ key: { id: 1 }, options: { unique: true } }, { key: { published: 1, createdAt: -1 } }]],
  ["notifications", [{ key: { id: 1 }, options: { unique: true } }, { key: { audience: 1, createdAt: -1 } }]],
  ["followUps", [{ key: { assignedTo: 1, status: 1, scheduledAt: 1 } }]],
  ["auditLogs", [{ key: { targetType: 1, targetId: 1, createdAt: -1 } }, { key: { action: 1, createdAt: -1 } }, { key: { actorId: 1, createdAt: -1 } }, { key: { createdAt: 1 }, options: { expireAfterSeconds: 31536000 } }]],
];

async function ensureCollection(db, name, schema) {
  const validator = { $jsonSchema: { bsonType: "object", additionalProperties: true, ...schema } };
  try { await db.createCollection(name, { validator, validationLevel: "moderate", validationAction: "error" }); } catch (error) { if (error?.codeName !== "NamespaceExists") throw error; await db.command({ collMod: name, validator, validationLevel: "moderate", validationAction: "error" }); }
}

async function deduplicateIds(db, name) {
  const duplicates = await db.collection(name).aggregate([
    { $match: { id: { $type: "string" } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: "$id", retainedId: { $first: "$_id" }, duplicateIds: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  for (const duplicate of duplicates) {
    const removeIds = duplicate.duplicateIds.filter((documentId) => !documentId.equals(duplicate.retainedId));
    if (removeIds.length) await db.collection(name).deleteMany({ _id: { $in: removeIds } });
  }
}

try {
  await client.connect();
  const db = client.db(databaseName);
  for (const [name, schema] of collections) await ensureCollection(db, name, schema);
  for (const [name] of indexes) await deduplicateIds(db, name);
  for (const [name, definitions] of indexes) await db.collection(name).createIndexes(definitions.map(({ key, options = {} }) => ({ key, ...options })));
  console.log(`Database schema applied successfully to ${databaseName}.`);
  console.log(`${collections.length} collections validated and ${indexes.length} index groups created.`);
} catch (error) {
  console.error("Could not apply MongoDB schema. No credentials were printed.");
  console.error(error instanceof Error ? error.message : "Unknown database setup error.");
  process.exitCode = 1;
} finally {
  await client.close();
}
