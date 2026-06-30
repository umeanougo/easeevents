import { supabase } from "@/integrations/supabase/client";

import { hasSupabaseConfig } from "./config";
import type { EventFile, FileCategory, MessageVisibility } from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uploadEventFile(params: {
  file: File;
  organizationId: string;
  projectId?: string;
  leadId?: string;
  eventId?: string;
  uploadedById?: string;
  category: FileCategory;
  visibility?: MessageVisibility;
  caption?: string;
}): Promise<EventFile> {
  if (!params.projectId && !params.eventId) {
    throw new Error("Choose a project or event before uploading a file.");
  }

  const maxSizeBytes = 15 * 1024 * 1024;
  if (params.file.size > maxSizeBytes) {
    throw new Error("File is too large. Upload files up to 15 MB.");
  }

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const mimeType = params.file.type || "application/octet-stream";
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error("Unsupported file type. Use PDF, image, document, sheet, text, or CSV files.");
  }

  const fileId = crypto.randomUUID();
  const folder = slugify(params.category);
  const scope = params.projectId ? `projects/${params.projectId}` : `events/${params.eventId}`;
  const storagePath = `${params.organizationId}/${scope}/${folder}/${Date.now()}-${slugify(
    params.file.name,
  )}`;

  if (hasSupabaseConfig()) {
    const { error } = await supabase.storage.from("event-files").upload(storagePath, params.file, {
      upsert: false,
      contentType: mimeType,
    });

    if (error) throw error;
  }

  return {
    id: fileId,
    organizationId: params.organizationId,
    projectId: params.projectId,
    leadId: params.leadId,
    eventId: params.eventId ?? "",
    uploadedById: params.uploadedById,
    name: params.file.name,
    category: params.category,
    storagePath,
    mimeType,
    sizeBytes: params.file.size,
    visibility: params.visibility ?? "Client",
    originalFilename: params.file.name,
    caption: params.caption,
    createdAt: new Date().toISOString(),
  };
}
