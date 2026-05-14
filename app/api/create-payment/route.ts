import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PlanKey = "pro-monthly" | "pro-yearly";

const PLAN_CONFIG: Record<PlanKey, { amount: number; label: string }> = {
  "pro-monthly": { amount: 9, label: "Lettro Pro Monthly" },
  "pro-yearly": { amount: 79, label: "Lettro Pro Yearly" },
};

type CreatePaymentBody = {
  plan?: PlanKey;
};

type NowPaymentsResponse = {
  invoice_url?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const supabase = createClient();

  if (!apiKey) {
    return NextResponse.json({ error: "NOWPAYMENTS_API_KEY is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please login before making a payment." }, { status: 401 });
  }

  const body = (await request.json()) as CreatePaymentBody;
  const plan = body.plan;

  if (!plan || !(plan in PLAN_CONFIG)) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  const selectedPlan = PLAN_CONFIG[plan as PlanKey];
  const origin = request.nextUrl.origin;
  const successUrl = `${origin}/payment-success?plan=${plan}`;
  const cancelUrl = `${origin}/pricing`;

  try {
    const response = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: selectedPlan.amount,
        price_currency: "USDTTRC20",
        pay_currency: "USDTTRC20",
        order_id: `${user.id}-${plan}-${Date.now()}`,
        order_description: selectedPlan.label,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `NOWPayments API error: ${errorBody}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as NowPaymentsResponse;

    if (!data.invoice_url) {
      return NextResponse.json({ error: "Payment URL was not returned by NOWPayments." }, { status: 502 });
    }

    return NextResponse.json({ paymentUrl: data.invoice_url });
  } catch {
    return NextResponse.json({ error: "Failed to create payment." }, { status: 500 });
  }
}
