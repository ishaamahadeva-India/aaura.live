
export type Plan = {
    id: "sub_annual_49" | "donate_cow_feed" | "donate_sadhu_meal" | "donate_ayyappa_yatra" | "donate_temple_renovation";
    name: string;
    amount: number;
    currency: "INR";
    period: "year" | "one-time";
    type: "subscription" | "donation" | "custom_donation";
    description: string;
}

export const monetizationPlans: Plan[] = [
  {
    id: "sub_annual_49",
    name: "Aaura Annual Subscription",
    amount: 49,
    currency: "INR",
    period: "year",
    type: "subscription",
    description: "Access premium features for 1 year."
  },
  {
    id: "donate_cow_feed",
    name: "Feed a Cow (1 day)",
    amount: 9,
    currency: "INR",
    period: "one-time",
    type: "donation",
    description: "Donate ₹9 to feed one cow for a day. You can choose multiple cows."
  },
  {
    id: "donate_sadhu_meal",
    name: "Feed a Sadhu (1 meal)",
    amount: 36,
    currency: "INR",
    period: "one-time",
    type: "donation",
    description: "Donate ₹36 to provide one meal to a Sadhu. You can choose multiple Sadhus."
  },
  {
    id: "donate_ayyappa_yatra",
    name: "Sabarimala Yatra Support",
    amount: 99,
    currency: "INR",
    period: "one-time",
    type: "custom_donation",
    description: "Contribute to help Ayyappa Swamys with their pilgrimage costs. Suggested donation is ₹99."
  },
  {
    id: "donate_temple_renovation",
    name: "Temple Renovation Fund",
    amount: 101,
    currency: "INR",
    period: "one-time",
    type: "custom_donation",
    description: "Contribute to the restoration and upkeep of sacred temples. Suggested donation is ₹101."
  }
];
