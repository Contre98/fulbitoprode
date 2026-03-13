import { jsonResponse } from "#http";
import { requireAdminToken } from "../../../auth";
import { getJob } from "@fulbito/server-core/notifications-repo";

export async function GET(request: Request, context?: { params: Promise<{ jobId: string }> }) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  const { jobId } = await (context?.params ?? Promise.resolve({ jobId: "" }));
  if (!jobId) {
    return jsonResponse({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const job = await getJob(jobId);
    return jsonResponse(
      {
        id: job.id,
        eventId: job.event_id,
        status: job.status,
        totalRecipients: job.total_recipients,
        sent: job.sent,
        failed: job.failed,
        startedAt: job.started_at || null,
        completedAt: job.completed_at || null,
        error: job.error || null
      },
      { status: 200 }
    );
  } catch {
    return jsonResponse({ error: "Job not found" }, { status: 404 });
  }
}
