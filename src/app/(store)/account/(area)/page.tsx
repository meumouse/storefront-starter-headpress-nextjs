import { OrdersList } from "@/features/account/components/Orders";
import { t } from "@/i18n";

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t.account.recentOrders}</h1>
      <OrdersList limit={5} />
    </div>
  );
}
