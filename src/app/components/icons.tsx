import type { SVGProps } from 'react';

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
        <path d="M12 2a5 5 0 0 0-5 5c0 1.84.95 3.51 2.43 4.42" />
        <path d="M12 2a5 5 0 0 1 5 5c0 1.84-.95 3.51-2.43 4.42" />
        <path d="M19.43 11.42c1.48-.91 2.43-2.58 2.43-4.42a5 5 0 0 0-5-5" />
        <path d="M4.57 11.42c-1.48-.91-2.43-2.58-2.43-4.42a5 5 0 0 1 5-5" />
        <path d="M12 13a7 7 0 0 0-7 7c0 1.55.63 3.05 1.76 4.12A5.98 5.98 0 0 0 12 22a5.98 5.98 0 0 0 5.24-2.88C18.37 18.05 19 16.55 19 15a7 7 0 0 0-7-7z" />
        <path d="M10.32 16.68c.2-.22.42-.42.68-.58" />
        <path d="M13 16.1c.26.16.48.36.68.58" />
    </svg>
  ),
};
