// Static reference data for the services grid — not user-generated, so a
// database table would be overkill. Edit this file to change copy or add a service.
module.exports = [
  {
    slug: 'air_ambulance',
    name: 'Air Ambulance',
    subtitle: 'Domestic / International',
    description: 'Bed-to-bed medical evacuation by air with complete medical care.',
    provides: ['24/7 Availability', 'Modern Medical Setup', 'Expert Medical Team', 'End-to-End Assistance'],
  },
  {
    slug: 'ground_ambulance',
    name: 'Ground Ambulance',
    subtitle: 'City to City / Local',
    description: 'Road-based patient transport with trained paramedic support.',
    provides: ['24/7 Availability', 'Trained Paramedics', 'Equipped Ambulance', 'Real-Time Tracking'],
  },
  {
    slug: 'hospitalization',
    name: 'Hospitalization Assistance',
    subtitle: 'Admission & Coordination',
    description: 'End-to-end support for hospital admission, coordination, and billing.',
    provides: ['Cashless Coordination', 'Hospital Network Access', 'Case Management', 'Billing Support'],
  },
  {
    slug: 'medical_escort',
    name: 'Medical Escort',
    subtitle: 'Commercial Airlines',
    description: 'A trained medical professional accompanies the patient on a commercial flight.',
    provides: ['Qualified Medical Escort', 'Pre-Flight Assessment', 'In-Flight Monitoring', 'Airline Coordination'],
  },
  {
    slug: 'mortal_remains',
    name: 'Mortal Remains Transportation',
    subtitle: 'Repatriation Services',
    description: 'Dignified, compliant transportation of mortal remains, domestic or international.',
    provides: ['Documentation Support', 'Embalming Coordination', 'Customs Clearance', 'Family Liaison'],
  },
  {
    slug: 'home_healthcare',
    name: 'Home Healthcare Services',
    subtitle: 'Care At Home',
    description: "Qualified nursing and medical care delivered at the patient's home.",
    provides: ['Qualified Nursing Staff', 'Doctor Visits On Request', 'Equipment Support', 'Flexible Scheduling'],
  },
  {
    slug: 'teleconsultation',
    name: 'Teleconsultation',
    subtitle: 'Remote Doctor Access',
    description: 'Connect with a doctor remotely for guidance and follow-up care.',
    provides: ['24/7 Availability', 'Licensed Doctors', 'Multi-Language Support', 'Digital Prescriptions'],
  },
  {
    slug: 'other',
    name: 'Other Services',
    subtitle: 'Custom Assistance',
    description: 'Any other medical assistance need not listed above — talk to our team.',
    provides: ['Dedicated Case Manager', 'Custom Assessment', 'Global Network', '24/7 Support'],
  },
];
