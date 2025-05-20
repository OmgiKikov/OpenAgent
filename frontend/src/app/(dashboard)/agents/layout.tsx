import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Conversation | OpenAgent',
  description: 'Interactive agent conversation powered by OpenAgent',
  openGraph: {
    title: 'Agent Conversation | OpenAgent',
    description: 'Interactive agent conversation powered by OpenAgent',
    type: 'website',
  },
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
