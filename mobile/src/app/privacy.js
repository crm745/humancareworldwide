import { LegalScreen } from '../components/LegalScreen';

const SECTIONS = [
  ['Information We Collect', 'We collect information you provide directly, including your name, contact number, email, and — where relevant to a request — patient medical details, care level, and uploaded medical reports.'],
  ['How We Use Your Information', 'Your information is used to process and coordinate your requests, communicate updates about your case, verify your identity via OTP, and improve our services. We do not sell your personal data to third parties.'],
  ['Sharing With Medical Providers', 'Relevant medical and contact information is shared only with the specific hospitals, transport providers, or care teams involved in fulfilling your request, and only to the extent necessary for that purpose.'],
  ['Data Security', 'We use industry-standard measures to protect your data, including encrypted transmission and access controls limiting who within our team can view sensitive medical information.'],
  ['Data Retention', 'We retain your account and case data for as long as your account is active, or as required to meet legal, regulatory, and insurance record-keeping obligations.'],
  ['Your Rights', 'You may request access to, correction of, or deletion of your personal data, subject to applicable legal and record-keeping requirements, by contacting our support team.'],
  ['Communication Preferences', 'You may opt out of non-essential communications at any time from your Profile settings, while still receiving essential updates about active requests.'],
  ['Contact Us', 'For privacy-related questions or requests, contact us at '],
];

export default function Privacy() {
  return <LegalScreen titleKey="privacy_title" sections={SECTIONS} />;
}
