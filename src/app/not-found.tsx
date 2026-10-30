import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { paths } from "@/config/routes";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<Compass />}
        title={t.common.notFoundTitle}
        description={t.common.notFoundDescription}
        action={
          <Button asChild>
            <Link href={paths.home}>{t.common.backHome}</Link>
          </Button>
        }
      />
    </main>
  );
}
