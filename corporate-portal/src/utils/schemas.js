// Zod schemas for every form. Country-aware rules (phone, PIN code) live in superRefine.
import { z } from 'zod';

import { COMPANY_TYPES, CURRENCIES } from '@/data/constants';
import {
  EMAIL_RE,
  IFSC_RE,
  SWIFT_RE,
  URL_RE,
  USERNAME_RE,
  digitsOnly,
  isValidIban,
  isValidPhone,
  passwordChecks,
  pincodeRule,
  registrationRule,
} from './validators';

const req = (label) => z.string().trim().min(1, `${label} is required`);
const email = (label) => req(label).regex(EMAIL_RE, 'Enter a valid email address');

export const companySchema = z
  .object({
    companyName: req('Company name').min(3, 'Company name must be at least 3 characters').max(120),
    registrationNumber: z.string().trim().max(30),
    companyType: z.enum(['', ...COMPANY_TYPES]).refine((v) => v !== '', 'Select a company type'),
    country: z.enum(['', 'IN', 'AE', 'OM', 'SA', 'QA', 'GB', 'US', 'OTHER']).refine((v) => v !== '', 'Select a country'),
    countryOther: z.string().trim(),
    state: req('State / region'),
    city: req('City').regex(/^[\p{L} .'-]+$/u, 'Enter a valid city name'),
    address: req('Office address').min(10, 'Enter the full office address'),
    pincode: z.string().trim(),
    officialEmail: email('Official email'),
    officialPhone: req('Official phone number'),
    website: z
      .string()
      .trim()
      .refine((v) => !v || URL_RE.test(v), 'Enter a valid website, e.g. www.company.com'),
    contactName: req('Contact person name').regex(/^[\p{L} .'-]+$/u, 'Use letters only'),
    contactDesignation: req('Designation'),
    contactEmail: email('Contact person email'),
    contactPhone: req('Contact person phone'),
  })
  .superRefine((d, ctx) => {
    const country = d.country;
    if (country === 'OTHER' && !d.countryOther) ctx.addIssue({ code: 'custom', path: ['countryOther'], message: 'Enter the country name' });
    const reg = registrationRule(d.companyType, country);
    if (reg) {
      if (reg.required && !d.registrationNumber) ctx.addIssue({ code: 'custom', path: ['registrationNumber'], message: `${reg.label} is required` });
      else if (d.registrationNumber && !reg.test(d.registrationNumber)) ctx.addIssue({ code: 'custom', path: ['registrationNumber'], message: reg.error });
    }
    const pin = pincodeRule(country);
    if (pin.required && !d.pincode) ctx.addIssue({ code: 'custom', path: ['pincode'], message: 'Postal / ZIP code is required' });
    else if (d.pincode && !pin.test(d.pincode)) ctx.addIssue({ code: 'custom', path: ['pincode'], message: `Invalid postal / ZIP code — ${pin.hint}` });
    if (d.officialPhone && !isValidPhone(d.officialPhone, country, 'office'))
      ctx.addIssue({
        code: 'custom',
        path: ['officialPhone'],
        message: country === 'IN' ? 'Enter a 10-digit number with STD code' : 'Enter a valid phone number (7–15 digits)',
      });
    if (d.contactPhone && !isValidPhone(d.contactPhone, country, 'mobile'))
      ctx.addIssue({
        code: 'custom',
        path: ['contactPhone'],
        message: country === 'IN' ? 'Enter a valid 10-digit mobile number' : 'Enter a valid phone number (7–15 digits)',
      });
  });

export const bankSchema = z
  .object({
    bankType: z.enum(['Domestic', 'International']),
    bankName: req('Bank name').max(80),
    accountHolder: req('Account holder name').regex(/^[\p{L}0-9 .&'()-]+$/u, 'Use letters, numbers and . & ( ) - only'),
    accountNumber: z.string().trim(),
    confirmAccountNumber: z.string().trim(),
    ifsc: z.string().trim().toUpperCase(),
    branchName: z.string().trim(),
    branchAddress: z.string().trim(),
    swift: z.string().trim().toUpperCase(),
    iban: z.string().trim().toUpperCase(),
    bankCountry: z.string().trim(),
    bankAddress: z.string().trim(),
    currency: z.enum(['', ...CURRENCIES]),
  })
  .superRefine((d, ctx) => {
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (d.bankType === 'Domestic') {
      if (!d.accountNumber) issue('accountNumber', 'Account number is required');
      else if (!/^\d{9,18}$/.test(d.accountNumber)) issue('accountNumber', 'Account number must be 9–18 digits');
      if (!d.confirmAccountNumber) issue('confirmAccountNumber', 'Re-enter the account number');
      else if (d.confirmAccountNumber !== d.accountNumber) issue('confirmAccountNumber', 'Account numbers do not match');
      if (!d.ifsc) issue('ifsc', 'IFSC code is required');
      else if (!IFSC_RE.test(d.ifsc)) issue('ifsc', 'Invalid IFSC — 11 characters, e.g. HDFC0001234');
      if (!d.branchName) issue('branchName', 'Branch name is required');
      if (!d.branchAddress) issue('branchAddress', 'Branch address is required');
    } else {
      if (!d.accountNumber) issue('accountNumber', 'Account number is required');
      else if (!/^[A-Z0-9]{6,34}$/i.test(d.accountNumber)) issue('accountNumber', 'Use 6–34 letters or digits, no spaces');
      if (!d.swift) issue('swift', 'SWIFT / BIC code is required');
      else if (!SWIFT_RE.test(d.swift)) issue('swift', 'Invalid SWIFT — 8 or 11 characters, e.g. NBADAEAAXXX');
      if (d.iban && !isValidIban(d.iban)) issue('iban', 'Invalid IBAN — check the number and its check digits');
      if (!d.bankCountry) issue('bankCountry', 'Bank country is required');
      if (!d.bankAddress) issue('bankAddress', 'Bank address is required');
      if (!d.currency) issue('currency', 'Select the account currency');
    }
  });

export const strongPassword = z
  .string()
  .min(1, 'Password is required')
  .refine((v) => passwordChecks(v).every((c) => c.ok), 'Password does not meet all the requirements');

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Enter your username or email')
    .refine((v) => !v.includes('@') || EMAIL_RE.test(v), 'Enter a valid email address')
    .refine((v) => v.includes('@') || v.length >= 3, 'Username must be at least 3 characters'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
});

export const emailOnlySchema = z.object({ email: email('Email') });

export const resetPasswordSchema = z
  .object({ password: strongPassword, confirmPassword: z.string().min(1, 'Confirm your password') })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const credentialsSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(4, 'Username must be at least 4 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(USERNAME_RE, 'Use lowercase letters, numbers, “.”, “_” or “-”; start and end with a letter or number'),
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: strongPassword,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const serviceRequestSchema = z.object({
  patientName: req('Patient name').regex(/^[\p{L} .'-]+$/u, 'Use letters only'),
  age: req('Age')
    .regex(/^\d{1,3}$/, 'Enter the age in years')
    .refine((v) => Number(v) <= 120, 'Enter a valid age'),
  gender: z.enum(['Male', 'Female', 'Other']),
  pickup: req('Pickup location').min(3, 'Enter the pickup hospital / address'),
  destination: req('Destination').min(3, 'Enter the destination'),
  preferredDate: req('Preferred date').refine((v) => new Date(v).setHours(23, 59) >= Date.now(), 'Date cannot be in the past'),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']),
  contactPhone: req('Contact phone').refine(
    (v) => digitsOnly(v).length >= 7 && digitsOnly(v).length <= 15 && /^[+\d\s()-]+$/.test(v),
    'Enter a valid phone number',
  ),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
});

export const ticketSchema = z.object({
  subject: req('Subject').min(5, 'Subject must be at least 5 characters').max(120),
  category: req('Category'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  description: req('Description').min(20, 'Please describe the issue in at least 20 characters').max(2000),
});
