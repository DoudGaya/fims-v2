import { Metadata } from 'next';
import AgentEditClient from './AgentEditClient';

export const metadata: Metadata = {
  title: 'Edit Agent | CCSA',
  description: 'Update agent profile and settings',
};

export default async function AgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentEditClient id={id} />;
}
