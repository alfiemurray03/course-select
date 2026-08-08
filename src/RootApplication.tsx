import { useLocation } from 'react-router-dom';
import AccessibilityTools from './AccessibilityTools';
import AgeGate from './AgeGate';
import LearningPlatformRouter from './LearningPlatformRouter';
import ProductionSubscriptionCheckoutPage from './ProductionSubscriptionCheckoutPage';
import ProgrammeCoursePlayer from './ProgrammeCoursePlayer';

export default function RootApplication() {
  const path = useLocation().pathname;
  const subscription = path.match(/^\/lms\/subscribe\/([^/]+)$/);
  const course = path.match(/^\/lms\/course\/([^/]+)$/);

  if (subscription) {
    return <>
      <AgeGate />
      <AccessibilityTools />
      <ProductionSubscriptionCheckoutPage planId={decodeURIComponent(subscription[1])} />
    </>;
  }

  if (course) {
    return <>
      <AgeGate />
      <AccessibilityTools />
      <ProgrammeCoursePlayer slug={decodeURIComponent(course[1])} />
    </>;
  }

  return <LearningPlatformRouter />;
}
