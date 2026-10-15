import { BroadcastClient } from './BroadcastClient';

export const metadata = {
  title: 'Email Broadcast & Announcements | Tenvi Admin',
  description: 'Dispatch platform announcements, update notes, and system notices directly to member inboxes.',
};

export default function AdminBroadcastPage() {
  return <BroadcastClient />;
}
