import { randomUUID } from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";

import {
  detectMimeFromSignature,
  getPublicInquiryUploadLimits,
  getSubmissionByUploadToken,
  sanitizeFilename,
} from "@/lib/ease-events/public-inquiry.server";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to upload file.";
}

function isDuplicateStorageObjectError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("already exists") || message.includes("duplicate") || message.includes("409")
  );
}

export const Route = createFileRoute("/api/ease-events/public-inquiry/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let uploadId = "";
        let supabase: Awaited<ReturnType<typeof getSubmissionByUploadToken>>["supabase"] | null =
          null;

        try {
          const formData = await request.formData();
          const token = String(formData.get("uploadToken") ?? "");
          uploadId = String(formData.get("uploadId") ?? "");
          const file = formData.get("file");

          if (!token || !uploadId || !(file instanceof File)) {
            return Response.json(
              { error: "Upload token, upload id, and file are required." },
              { status: 400 },
            );
          }

          const resolved = await getSubmissionByUploadToken(token);
          supabase = resolved.supabase;
          const submission = resolved.submission;

          const { data: upload, error: uploadError } = await supabase
            .from("public_inquiry_uploads")
            .select("*")
            .eq("id", uploadId)
            .eq("submission_id", submission.id)
            .maybeSingle();
          if (uploadError) throw uploadError;
          if (!upload) return Response.json({ error: "Upload slot not found." }, { status: 404 });

          if (upload.status === "finalized" && upload.file_id) {
            return Response.json({
              uploadId: upload.id,
              status: upload.status,
              fileId: upload.file_id,
              storagePath: upload.storage_path,
            });
          }

          const limits = getPublicInquiryUploadLimits();
          if (file.size > limits.maxFileBytes) {
            throw new Error(
              `${file.name} is too large. Limit is ${Math.floor(limits.maxFileBytes / 1024 / 1024)} MB per file.`,
            );
          }
          if (file.size !== Number(upload.size_bytes)) {
            throw new Error("File size no longer matches the initialized upload slot.");
          }
          if (file.name !== upload.original_filename) {
            throw new Error("Filename no longer matches the initialized upload slot.");
          }
          if (file.type !== upload.mime_type) {
            throw new Error("File MIME type no longer matches the initialized upload slot.");
          }

          const bytes = new Uint8Array(await file.arrayBuffer());
          const detectedMime = detectMimeFromSignature(bytes);
          if (detectedMime !== upload.mime_type) {
            throw new Error(
              `File signature does not match ${upload.mime_type}. Detected ${detectedMime}.`,
            );
          }

          await supabase
            .from("public_inquiry_uploads")
            .update({ status: "uploading", error_message: null })
            .eq("id", upload.id);

          const { error: storageError } = await supabase.storage
            .from("event-files")
            .upload(upload.storage_path, bytes, {
              upsert: false,
              contentType: upload.mime_type,
            });
          if (storageError && !isDuplicateStorageObjectError(storageError)) throw storageError;

          const isImage = upload.mime_type.startsWith("image/");
          const { data: existingFile, error: existingFileError } = await supabase
            .from("files")
            .select("*")
            .eq("organization_id", submission.organization_id)
            .eq("storage_path", upload.storage_path)
            .maybeSingle();
          if (existingFileError) throw existingFileError;

          const fileId = existingFile?.id ?? randomUUID();
          const fileRecordResult = existingFile
            ? { data: existingFile, error: null }
            : await supabase
                .from("files")
                .insert({
                  id: fileId,
                  organization_id: submission.organization_id,
                  project_id: submission.project_id,
                  lead_id: submission.lead_id,
                  event_id: null,
                  uploaded_by: null,
                  category: isImage ? "Inspiration Images" : "Event Documents",
                  storage_path: upload.storage_path,
                  name: sanitizeFilename(upload.original_filename),
                  original_filename: upload.original_filename,
                  caption: "Public inquiry upload",
                  mime_type: upload.mime_type,
                  size_bytes: upload.size_bytes,
                  visibility: "Client",
                })
                .select("*")
                .single();
          const { data: fileRecord, error: fileError } = fileRecordResult;

          if (fileError || !fileRecord) {
            await supabase.storage.from("event-files").remove([upload.storage_path]);
            throw fileError ?? new Error("Unable to create file metadata.");
          }

          await supabase
            .from("public_inquiry_uploads")
            .update({
              status: "finalized",
              file_id: fileRecord.id,
              uploaded_at: new Date().toISOString(),
              finalized_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", upload.id);

          await supabase.from("project_activity_events").insert({
            organization_id: submission.organization_id,
            project_id: submission.project_id,
            activity_type: "file",
            title: "Inquiry file uploaded",
            body: upload.original_filename,
            metadata: {
              file_id: fileRecord.id,
              upload_id: upload.id,
              client_file_id: upload.client_file_id,
              test_identifier: submission.test_identifier,
            },
          });

          return Response.json({
            uploadId: upload.id,
            status: "finalized",
            fileId: fileRecord.id,
            storagePath: upload.storage_path,
          });
        } catch (error) {
          if (supabase && uploadId) {
            await supabase
              .from("public_inquiry_uploads")
              .update({
                status: "failed",
                error_message: getErrorMessage(error),
              })
              .eq("id", uploadId);
          }
          return Response.json({ error: getErrorMessage(error) }, { status: 400 });
        }
      },
    },
  },
});
