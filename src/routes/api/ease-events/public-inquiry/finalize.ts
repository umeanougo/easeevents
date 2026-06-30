import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getSubmissionByUploadToken } from "@/lib/ease-events/public-inquiry.server";

const FinalizeSchema = z.object({
  uploadToken: z.string().min(1),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to finalize inquiry.";
}

export const Route = createFileRoute("/api/ease-events/public-inquiry/finalize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = FinalizeSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Invalid finalize request." }, { status: 400 });
        }

        try {
          const { supabase, submission } = await getSubmissionByUploadToken(
            parsed.data.uploadToken,
          );

          await supabase
            .from("public_inquiry_uploads")
            .update({
              status: "abandoned",
              error_message: "Inquiry finalized before this file uploaded.",
            })
            .eq("submission_id", submission.id)
            .eq("status", "pending");

          const { data: uploads, error: uploadError } = await supabase
            .from("public_inquiry_uploads")
            .select("*")
            .eq("submission_id", submission.id);
          if (uploadError) throw uploadError;

          await supabase
            .from("public_inquiry_submissions")
            .update({
              status: "finalized",
              metadata: {
                ...(submission.metadata ?? {}),
                finalized_at: new Date().toISOString(),
                finalized_upload_count: (uploads ?? []).filter(
                  (upload) => upload.status === "finalized",
                ).length,
              },
            })
            .eq("id", submission.id);

          return Response.json({
            status: "finalized",
            uploads:
              uploads?.map((upload) => ({
                id: upload.id,
                clientFileId: upload.client_file_id,
                status: upload.status,
                errorMessage: upload.error_message,
                fileId: upload.file_id,
                storagePath: upload.storage_path,
              })) ?? [],
          });
        } catch (error) {
          return Response.json({ error: getErrorMessage(error) }, { status: 400 });
        }
      },
    },
  },
});
