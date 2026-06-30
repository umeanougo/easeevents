import * as React from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEaseEventsAuth } from "@/lib/ease-events/auth";
import { uploadEventFile } from "@/lib/ease-events/files";
import { useEaseEventsStore } from "@/lib/ease-events/store";
import {
  fileCategories,
  type EventFile,
  type FileCategory,
  type MessageVisibility,
} from "@/lib/ease-events/types";

export function FileUploadPanel({
  eventId,
  projectId,
  leadId,
  frameless = false,
  defaultVisibility = "Client",
  onUploaded,
}: {
  eventId?: string;
  projectId?: string;
  leadId?: string;
  frameless?: boolean;
  defaultVisibility?: MessageVisibility;
  onUploaded?: (file: EventFile) => void | Promise<void>;
}) {
  const { currentUser } = useEaseEventsAuth();
  const { data, addFile } = useEaseEventsStore();
  const [selectedEventId, setSelectedEventId] = React.useState(eventId ?? data.events[0]?.id ?? "");
  const [category, setCategory] = React.useState<FileCategory>("Event Documents");
  const [visibility, setVisibility] = React.useState<MessageVisibility>(defaultVisibility);
  const [caption, setCaption] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (eventId) setSelectedEventId(eventId);
  }, [eventId]);

  async function handleUpload() {
    const targetEventId = eventId ?? selectedEventId;
    if (!file || (!targetEventId && !projectId) || !currentUser) return;
    setIsUploading(true);
    setStatus("");

    try {
      const duplicate = data.files.some(
        (item) =>
          (projectId ? item.projectId === projectId : item.eventId === targetEventId) &&
          (item.originalFilename ?? item.name).toLowerCase() === file.name.toLowerCase(),
      );
      if (duplicate) {
        throw new Error("A file with this name already exists in this workspace.");
      }

      const uploaded = await uploadEventFile({
        file,
        organizationId: currentUser.organizationId,
        projectId,
        leadId,
        eventId: targetEventId,
        uploadedById: currentUser.id,
        category,
        visibility,
        caption: caption.trim() || undefined,
      });
      await addFile(uploaded);
      await onUploaded?.(uploaded);
      setFile(null);
      setCaption("");
      setStatus("File added to the project workspace.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  const content = (
    <>
      {!frameless ? (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base tracking-normal text-slate-950">
            <UploadCloud className="h-4 w-4" />
            Upload file
          </CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={frameless ? "space-y-4 p-0" : "space-y-4"}>
        {!eventId && !projectId ? (
          <div className="space-y-2">
            <Label htmlFor="event-file-event">Event</Label>
            <select
              id="event-file-event"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="event-file-category">Category</Label>
          <select
            id="event-file-category"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"
            value={category}
            onChange={(event) => setCategory(event.target.value as FileCategory)}
          >
            {fileCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-file-visibility">Visibility</Label>
            <select
              id="event-file-visibility"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as MessageVisibility)}
            >
              <option value="Internal">Internal</option>
              <option value="Client">Client</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-file-caption">Caption</Label>
            <Input
              id="event-file-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional context"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-file">File</Label>
          <Input
            id="event-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button className="w-full" disabled={!file || isUploading} onClick={handleUpload}>
          {isUploading ? "Uploading..." : "Add file"}
        </Button>
        {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      </CardContent>
    </>
  );

  if (frameless) {
    return <div className="space-y-4">{content}</div>;
  }

  return <Card className="rounded-lg border-slate-200 bg-white shadow-sm">{content}</Card>;
}
