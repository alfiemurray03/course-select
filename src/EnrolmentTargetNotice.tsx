import { Check, Clock3, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import './enrolment-target.css';

export default function EnrolmentTargetNotice() {
  return <section className="section enrolment-target-section"><div className="container enrolment-target-card">
    <div className="enrolment-target-icon"><Clock3 size={31} /></div>
    <div className="enrolment-target-copy">
      <span>Enrolment service target</span>
      <h2>We aim to enrol learners within 3–5 business working days</h2>
      <p>The target starts when Sousa Murray eLearning has received successful payment and complete, accurate learner information. Sundays and UK public bank holidays observed by Sousa Murray eLearning do not count, including Christmas and New Year public bank holidays and substitute days.</p>
      <div className="enrolment-target-points">
        <span><Check size={16} /> Payment must be complete</span>
        <span><Check size={16} /> Every learner record must be valid</span>
        <span><ShieldCheck size={16} /> Sousa Murray eLearning remains the support contact</span>
      </div>
    </div>
    <div className="enrolment-target-action"><Mail size={22} /><p>Waiting beyond the target?</p><Link className="button button-secondary" to="/contact?topic=order-enrolment">Contact Sousa Murray eLearning</Link></div>
  </div></section>;
}
