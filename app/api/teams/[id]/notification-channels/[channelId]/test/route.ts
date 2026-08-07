import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { deliverTeamChannelTest } from "@/lib/teamNotificationDelivery";
import { teamApiError } from "@/lib/teamApiError";

type Context = { params: Promise<{ id: string; channelId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id, channelId } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    if (!/^[0-9a-f-]{36}$/i.test(channelId))
      return NextResponse.json(
        { error: "A valid channel id is required." },
        { status: 400 },
      );
    const db = serviceDb();
    const { data: channel, error } = await db
      .from("team_notification_channels")
      .select("id,kind,target_encrypted,enabled")
      .eq("id", channelId)
      .eq("team_id", id)
      .maybeSingle();
    if (error) throw error;
    if (!channel)
      return NextResponse.json(
        { error: "Notification channel not found." },
        { status: 404 },
      );
    if (!channel.enabled)
      return NextResponse.json(
        { error: "Enable this channel before sending a test." },
        { status: 409 },
      );

    try {
      const result = await deliverTeamChannelTest(channel);
      const validatedAt = result.delivered_at;
      await db
        .from("team_notification_channels")
        .update({
          last_validated_at: validatedAt,
          last_error: null,
          updated_at: validatedAt,
        })
        .eq("id", channel.id)
        .eq("team_id", id);
      return NextResponse.json({
        ok: true,
        provider: result.provider,
        delivered_at: validatedAt,
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Test delivery failed.";
      await db
        .from("team_notification_channels")
        .update({ last_error: message, updated_at: new Date().toISOString() })
        .eq("id", channel.id)
        .eq("team_id", id);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    const failure = teamApiError(
      error,
      "The notification test could not be completed.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
