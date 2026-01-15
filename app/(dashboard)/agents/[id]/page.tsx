import { Metadata } from 'next';
import AgentDetailsClient from './AgentDetailsClient';

export const metadata: Metadata = {
  title: 'Agent Details | CCSA',
  description: 'View agent profile and performance',
};

export default async function AgentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentDetailsClient id={id} />;
}
