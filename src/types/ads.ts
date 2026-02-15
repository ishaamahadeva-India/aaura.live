export type AdCategory = 'temple' | 'pooja' | 'mandapa';
export type AdType = 'feed' | 'reel';
export type AdCta =
  | 'book_pooja'
  | 'donate'
  | 'visit_temple'
  | 'enquire'
  | 'learn_more';

export type AdStatus = 'pending_review' | 'approved' | 'rejected';

export interface AdPackageSelection {
  packageId: string;
  quantity: number;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  link: string;
  sponsoredBy: string;
  active: boolean;
  type: AdType;
  category: AdCategory;
  ctaLabel: AdCta;
  priority: number;
  createdAt?: string;
  status?: AdStatus;
  advertiserId?: string;
  packageSelections?: AdPackageSelection[];
  totalAmount?: number;
  impressionLimit?: number;
  impressions?: number;
  clicks?: number;
  refund?: {
    status: 'processed' | 'pending';
    amount: number;
    receiptId?: string;
    processedAt?: string;
  };
  targeting?: {
    sections?: string[];
  };
}

export const CTA_LABEL_MAP: Record<AdCta, string> = {
  book_pooja: 'Book Pooja',
  donate: 'Donate',
  visit_temple: 'Visit Temple',
  enquire: 'Enquire Now',
  learn_more: 'Learn More',
};

export const CTA_OPTIONS = Object.entries(CTA_LABEL_MAP).map(([value, label]) => ({
  value: value as AdCta,
  label,
}));
