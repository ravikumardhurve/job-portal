"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Download, ShieldCheck, Trash2, UploadCloud, XCircle } from "lucide-react";
import type { CandidateDocumentType } from "@/lib/portal";
import { uploadDirectlyToCloudinary, type CloudinaryUploadSignature } from "@/lib/cloudinary-upload";

const documentTypes: Array<{ type: CandidateDocumentType; label: string; accept: string }> = [
  { type: "RESUME", label: "Resume", accept: ".pdf,.doc,.docx" },
  { type: "PHOTO", label: "Passport size photo", accept: "image/*" },
  { type: "AADHAAR_FRONT", label: "Aadhaar card (front)", accept: "image/*" },
  { type: "AADHAAR_BACK", label: "Aadhaar card (back)", accept: "image/*" },
  { type: "PAN", label: "PAN card", accept: "image/*" },
  { type: "EDUCATION_CERTIFICATE", label: "Education certificate", accept: ".pdf,image/*" },
  { type: "EXPERIENCE_CERTIFICATE", label: "Experience certificate", accept: ".pdf,image/*" },
  { type: "OTHER", label: "Other document", accept: ".pdf,image/*" },
];

type DocumentRow = { type: CandidateDocumentType; status: "PENDING" | "VERIFIED" | "REJECTED"; createdAt: string; updatedAt?: string; retentionReviewAt?: string; rejectionReason?: string };

export function DocumentsStep() {
  const [documents, setDocuments] = useState<DocumentRow[]>();
  const [uploading, setUploading] = useState<CandidateDocumentType>();
  const [working, setWorking] = useState<CandidateDocumentType>();
  const [documentConsent, setDocumentConsent] = useState(false);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const inputRefs = useRef<Partial<Record<CandidateDocumentType, HTMLInputElement | null>>>({});

  async function refresh() {
    const response = await fetch("/api/candidate/documents");
    const result = await response.json() as { data: DocumentRow[]; consent?: { accepted: boolean; acceptedAt?: string } };
    setDocuments(result.data);
    setDocumentConsent(Boolean(result.consent?.accepted));
    setConsentAcceptedAt(result.consent?.acceptedAt);
  }

  useEffect(() => {
    fetch("/api/candidate/documents").then(async (response) => {
      const result = await response.json() as { data: DocumentRow[]; consent?: { accepted: boolean; acceptedAt?: string } };
      setDocuments(result.data);
      setDocumentConsent(Boolean(result.consent?.accepted));
      setConsentAcceptedAt(result.consent?.acceptedAt);
    });
  }, []);

  async function handleFile(type: CandidateDocumentType, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!documentConsent) { setError("Please accept document processing consent before uploading."); return; }
    setUploading(type);
    setError(undefined);
    try {
      const presignResponse = await fetch("/api/candidate/documents/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, fileName: file.name, contentType: file.type, fileSize: file.size, consent: true }) });
      const presignResult = await presignResponse.json() as { data?: CloudinaryUploadSignature; error?: string };
      if (!presignResponse.ok || !presignResult.data) throw new Error(presignResult.error ?? "Could not start upload.");
      const uploaded = await uploadDirectlyToCloudinary(file, presignResult.data);
      const confirmResponse = await fetch("/api/candidate/documents/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, publicId: uploaded.public_id, resourceType: uploaded.resource_type, deliveryType: uploaded.type, format: uploaded.format }) });
      const confirmResult = await confirmResponse.json() as { error?: string };
      if (!confirmResponse.ok) throw new Error(confirmResult.error ?? "Could not confirm upload.");
      await refresh();
      setMessage(`${documentTypes.find((item) => item.type === type)?.label ?? "Document"} uploaded securely.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload file.");
    } finally {
      setUploading(undefined);
    }
  }

  async function download(type: CandidateDocumentType) {
    setWorking(type);
    setError(undefined);
    try {
      const response = await fetch("/api/candidate/documents/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const result = await response.json() as { data?: { url: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Document could not be opened.");
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Document could not be opened.");
    } finally {
      setWorking(undefined);
    }
  }

  async function remove(type: CandidateDocumentType, label: string) {
    if (!window.confirm(`${label} permanently delete karna hai? Is action ko undo nahi kiya ja sakta.`)) return;
    setWorking(type);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch("/api/candidate/documents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Document delete nahi hua.");
      await refresh();
      setMessage(result.message ?? "Document deleted securely.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Document delete nahi hua.");
    } finally {
      setWorking(undefined);
    }
  }

  if (!documents) return <p className="text-sm text-[#5C6B63]">Loading...</p>;

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-[#BFD8C9] bg-[#F0F8F3] p-4">
        <div className="flex gap-3"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-[#157A4A]" /><div><p className="font-black text-[#1E2B26]">Private document processing consent</p><p className="mt-1 text-xs leading-5 text-[#52665C]">Documents identity, qualification aur recruitment verification ke liye private Cloudinary storage me rakhe jaate hain. Sirf authorized admins aur aap signed, short-lived link se access kar sakte hain.</p></div></div>
        <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[#33473F]"><input type="checkbox" checked={documentConsent} onChange={(event) => setDocumentConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>I consent to document storage and verification as described in the <Link href="/privacy" target="_blank" className="font-black text-[#0F5C38] underline">Privacy Policy</Link>.</span></label>
        {consentAcceptedAt && <p className="mt-2 text-[11px] text-[#71837A]">Consent recorded: {new Date(consentAcceptedAt).toLocaleString("en-IN")}</p>}
      </div>
      {documentTypes.map(({ type, label, accept }) => {
        const document = documents.find((row) => row.type === type);
        return (
          <div key={type} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D5E3DB] p-4">
            <div>
              <p className="font-bold text-[#1E2B26]">{label}</p>
              <StatusBadge document={document} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={(el) => { inputRefs.current[type] = el; }} type="file" accept={accept} className="hidden" onChange={(event) => handleFile(type, event)} />
              {document && <button type="button" disabled={working === type} onClick={() => void download(type)} className="inline-flex items-center gap-2 rounded-lg border border-[#B9D6C6] px-3 py-2 text-sm font-bold text-[#0F5C38] disabled:opacity-60"><Download size={15} />Open</button>}
              <button type="button" disabled={uploading === type || !documentConsent} onClick={() => inputRefs.current[type]?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#157A4A] px-4 py-2 text-sm font-bold text-[#0F5C38] disabled:opacity-60">
                <UploadCloud size={16} /> {uploading === type ? "Uploading..." : document ? "Replace" : "Upload"}
              </button>
              {document && <button type="button" disabled={working === type} onClick={() => void remove(type, label)} aria-label={`Delete ${label}`} className="grid h-9 w-9 place-items-center rounded-lg border border-[#F0C5BB] text-[#B7442C] disabled:opacity-60"><Trash2 size={15} /></button>}
            </div>
          </div>
        );
      })}
      {message && <p className="rounded-md bg-[#E3F3EA] px-3 py-2 text-sm font-bold text-[#1F7A4D]">{message}</p>}
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}
    </div>
  );
}

function StatusBadge({ document }: { document?: DocumentRow }) {
  if (!document) return <p className="mt-1 text-xs font-semibold text-[#5C6B63]">Not uploaded</p>;
  if (document.status === "VERIFIED") return <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#1F7A4D]"><CheckCircle2 size={13} /> Verified</p>;
  if (document.status === "REJECTED") return <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#0F5C38]"><XCircle size={13} /> Rejected{document.rejectionReason ? `: ${document.rejectionReason}` : ""}</p>;
  return <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#A3821F]"><Clock3 size={13} /> Pending review</p>;
}
