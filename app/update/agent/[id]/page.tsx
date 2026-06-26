import { Metadata } from 'next';
import UpdateAgentClient from './UpdateAgentClient';

export const metadata: Metadata = {
  title: 'Update Agent Profile | CCSA',
  description: 'Update your agent profile securely',
};

export default async function UpdateAgentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <UpdateAgentClient id={params.id} />
      </div>
    </div>
  );
}
