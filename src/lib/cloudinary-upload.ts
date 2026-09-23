export type CloudinaryUploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  deliveryType: "upload" | "authenticated";
};

export type CloudinaryUploadResult = {
  public_id: string;
  resource_type: "image" | "raw";
  type: "upload" | "authenticated";
  format?: string;
  bytes: number;
  secure_url: string;
  error?: { message?: string };
};

export async function uploadDirectlyToCloudinary(file: File, data: CloudinaryUploadSignature) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("api_key", data.apiKey);
  formData.set("timestamp", String(data.timestamp));
  formData.set("signature", data.signature);
  formData.set("public_id", data.publicId);
  if (data.deliveryType !== "upload") formData.set("type", data.deliveryType);
  const response = await fetch(data.uploadUrl, { method: "POST", body: formData });
  const result = await response.json() as CloudinaryUploadResult;
  if (!response.ok || result.error) throw new Error(result.error?.message ?? "Cloudinary upload failed.");
  return result;
}
