import { notFound } from "next/navigation";

import { VideoArchivePageView } from "@/components/video-archive-page-view";
import { VideoCamerasPageView } from "@/components/video-monitoring-cameras-page-view";
import { VideoLiveStreamPageView } from "@/components/video-live-stream-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function VideoSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("video", section)) {
    notFound();
  }

  if (section === "cameras") {
    return <VideoCamerasPageView />;
  }

  if (section === "archive") {
    return <VideoArchivePageView />;
  }

  if (section === "live") {
    return <VideoLiveStreamPageView />;
  }

  return <ModuleSectionPage pathname={`/video/${section}`} />;
}
