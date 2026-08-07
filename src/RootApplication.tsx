import { useLocation } from 'react-router-dom';
import AccessibilityTools from './AccessibilityTools';
import AgeGate from './AgeGate';
import LearningPlatformRouter from './LearningPlatformRouter';
import ProductionSubscriptionCheckoutPage from './ProductionSubscriptionCheckoutPage';

export default function RootApplication() {
  const path = useLocation().pathname;
  const subscription = path.match(/^\/lms\/subscribe\/([^/]+)$/);

  if (subscription) {
    return <>
      <AgeGate />
      <AccessibilityTools />
      <ProductionSubscriptionCheckoutPage planId={decodeURIComponent(subscription[1])} />
    </>;
  }

  return <LearningPlatformRouter />;
}
