import { LegalScreen } from '../components/LegalScreen';

const SECTIONS = [
  ['Acceptance of Terms', 'By creating an account or using the HumanCare WorldWide app, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the platform.'],
  ['Nature of Services', 'HumanCare WorldWide facilitates medical assistance services including air and ground ambulance coordination, hospitalization assistance, teleconsultation, home healthcare, and related support. We act as a coordinator between you and licensed medical providers — we do not ourselves provide direct medical treatment through this app.'],
  ['Not a Substitute for Emergency Services', 'This app is not a replacement for local emergency services. In a life-threatening emergency, contact your local emergency number immediately in addition to using this app.'],
  ['Account Responsibilities', 'You are responsible for the accuracy of information you submit, including patient details, medical history, and contact information. Inaccurate information may delay or affect the assistance provided.'],
  ['Payments & Insurance', 'Where services are billed directly or coordinated through an insurance provider or corporate account, applicable charges, coverage limits, and payment terms will be communicated prior to service confirmation.'],
  ['Limitation of Liability', 'HumanCare WorldWide coordinates with third-party medical providers and transport operators. While we vet our partner network, we are not liable for the independent actions of third-party providers beyond our reasonable coordination responsibilities.'],
  ['Changes to These Terms', 'We may update these Terms from time to time. Continued use of the app after changes are posted constitutes acceptance of the revised Terms.'],
  ['Contact Us', 'For questions about these Terms, contact us at '],
];

export default function Terms() {
  return <LegalScreen titleKey="terms_title" sections={SECTIONS} />;
}
