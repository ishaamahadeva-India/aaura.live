export {};

declare global {
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayPrefill {
    name?: string;
    email?: string;
    contact?: string;
  }

  interface RazorpayTheme {
    color?: string;
  }

  interface RazorpayModalOptions {
    ondismiss?: () => void;
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    image?: string;
    order_id: string;
    handler?: (response: RazorpaySuccessResponse) => void | Promise<void>;
    prefill?: RazorpayPrefill;
    theme?: RazorpayTheme;
    modal?: RazorpayModalOptions;
  }

  interface RazorpayInstance {
    open: () => void;
    on: (event: string, handler: (response: unknown) => void) => void;
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
