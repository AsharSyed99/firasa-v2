import SharedSignalClient from './SharedSignalClient';

export async function generateStaticParams() {
  return [{ id: '_placeholder' }];
}

export default function SharedSignalPage() {
  return <SharedSignalClient />;
}
