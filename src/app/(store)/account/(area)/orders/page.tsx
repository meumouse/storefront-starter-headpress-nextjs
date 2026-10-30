import { OrdersList } from "@/features/account/components/Orders";
import { t } from "@/i18n";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{t.account.ordersTitle}</h1>
      <OrdersList />
    </div>
  );
}
