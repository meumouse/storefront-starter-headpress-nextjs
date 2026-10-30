import { CloudOff } from "lucide-react";

import { EmptyState } from "@/components/ui/feedback";
import { t } from "@/i18n";

/** WordPress did not answer. Never a 404: the page exists and comes back with the backend. */
export function StoreUnavailable() {
  return (
    <EmptyState
      icon={<CloudOff />}
      title={t.common.unavailableTitle}
      description={t.common.unavailableDescription}
    />
  );
}
