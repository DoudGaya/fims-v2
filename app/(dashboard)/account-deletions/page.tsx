import { Metadata } from 'next';
// import AccountDeletionsClient from './AccountDeletionsClient';
import AccountDeletionsClient from './AccountDeletionsClient';

export const metadata: Metadata = {
  title: 'Account Deletions | CCSA FIMS',
  description: 'Manage account deletion requests',
};

export default function AccountDeletionsPage() {
  return <AccountDeletionsClient />;
}
