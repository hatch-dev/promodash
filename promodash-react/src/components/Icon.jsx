const iconPaths = {
  logo: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M5 4h6.5a7.5 7.5 0 0 1 0 15H5V4Zm4 4v7h2.5a3.5 3.5 0 1 0 0-7H9Zm7.5 11 2.7-2.7L21 18.1 19.1 20l-1.8-1.8L15.5 20l-1.8-1.9 2.8-2.8 1.9 1.9L20.3 15 22 16.8 18.5 20l-2-1Z" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4.2l2 2H19a2 2 0 0 1 2 2v1H3V6.5ZM3 10h18l-1.4 8.2A2.2 2.2 0 0 1 17.4 20H6.6a2.2 2.2 0 0 1-2.2-1.8L3 10Z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M7 2h2v3h6V2h2v3h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10Z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M11 16V7.8l-3.6 3.6L6 10l6-6 6 6-1.4 1.4L13 7.8V16h-2ZM5 18h14v2H5v-2Z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="m9.2 16.6-4.1-4.1L3.7 14l5.5 5.5L21 7.7l-1.4-1.4L9.2 16.6Z" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4 17.5V21h3.5L18 10.5 14.5 7 4 17.5ZM20.7 7.8a1 1 0 0 0 0-1.4l-3.1-3.1a1 1 0 0 0-1.4 0l-1.3 1.3 4.5 4.5 1.3-1.3Z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4 4h9v2H6v12h7v2H4V4Zm12.6 4.4L21.2 13l-4.6 4.6-1.4-1.4 2.2-2.2H10v-2h7.4l-2.2-2.2 1.4-1.4Z" />
    </svg>
  ),
};

export default function Icon({ name }) {
  return iconPaths[name] || null;
}
