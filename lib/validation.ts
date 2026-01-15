import { z } from 'zod';

// Farmer validation schema
export const farmerSchema = z.object({
  nin: z.string().min(1, 'NIN is required').length(11, 'NIN must be exactly 11 digits').regex(/^\d+$/, 'NIN must contain only digits'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.union([
    z.string().min(1).transform(val => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return date.toISOString();
    }),
    z.literal('').transform(() => undefined),
    z.undefined()
  ]).optional(),
  gender: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    // Convert to proper case format
    const normalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    // Validate that it's one of the allowed values
    const allowedValues = ['Male', 'Female'];
    if (!allowedValues.includes(normalized)) {
      throw new Error(`Invalid gender. Expected one of: ${allowedValues.join(', ')}`);
    }
    return normalized;
  }),
  phone: z.string().min(1, 'Phone number is required').length(11, 'Phone number must be exactly 11 digits').regex(/^\d+$/, 'Phone must contain only digits'),
  email: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      throw new Error('Invalid email address');
    }
    return val;
  }),
  whatsAppNumber: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  employmentStatus: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  maritalStatus: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    // Convert to proper case format
    const normalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    // Validate that it's one of the allowed values
    const allowedValues = ['Single', 'Married', 'Divorced', 'Widowed'];
    if (!allowedValues.includes(normalized)) {
      throw new Error(`Invalid marital status. Expected one of: ${allowedValues.join(', ')}`);
    }
    return normalized;
  }),
  address: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  state: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  lga: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  ward: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bankName: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  accountName: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  accountNumber: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    if (!/^\d{10}$/.test(val)) {
      throw new Error('Account number must be exactly 10 digits');
    }
    return val;
  }),
  bvn: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    if (!/^\d{11}$/.test(val)) {
      throw new Error('BVN must be exactly 11 digits');
    }
    return val;
  }),
  farmSize: z.number().positive('Farm size must be positive').optional(),
  primaryCrop: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  secondaryCrop: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  farmingExperience: z.number().nonnegative('Farming experience cannot be negative').optional(),
  farmLatitude: z.number().optional(),
  farmLongitude: z.number().optional(),
  farmPolygon: z.any().optional(),
  clusterId: z.string().min(1, 'Cluster assignment is required'),
});

// Referee validation schema
export const refereeSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().length(11, 'Phone number must be exactly 11 digits').regex(/^\d+$/, 'Phone must contain only digits'),
  relationship: z.string().min(2, 'Relationship must be specified'),
});

// User validation schema
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().optional(),
  role: z.enum(['agent', 'admin']).default('agent'),
});
