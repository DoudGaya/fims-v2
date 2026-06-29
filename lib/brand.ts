export const brandColors = {
  primary: "#013358",
  primaryHover: "#02426F",
  primaryActive: "#012944",
  primaryLight: "#DCEAF3",
  primaryExtraLight: "#F3F8FC",
  white: "#FFFFFF",
  offWhite: "#F8FAFC",
  lightGray: "#E5E7EB",
  gray: "#94A3B8",
  darkGray: "#475569",
  text: "#1E293B",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
} as const;

export const brandGradients = {
  primary: "linear-gradient(135deg, #013358 0%, #02426F 100%)",
  darkProfessional: "linear-gradient(135deg, #012944 0%, #013358 60%, #02426F 100%)",
  softBlue: "linear-gradient(135deg, #DCEAF3 0%, #FFFFFF 100%)",
} as const;

export const stakeholderTypes = [
  "Input Supplier",
  "Off-taker",
  "Processor",
  "Aggregator",
  "Financial Institution",
  "Insurance Provider",
  "Logistics Provider",
  "Equipment Provider",
  "Government Agency",
  "NGO / Development Partner",
  "Research Institution",
  "Training Provider",
  "Agri-tech Company",
] as const;

export const agribusinessInterestAreas = [
  "Input distribution",
  "Off-take / procurement",
  "Processing",
  "Aggregation",
  "Farmer financing",
  "Insurance",
  "Logistics and storage",
  "Mechanization",
  "Training and advisory",
  "Research and surveys",
  "Climate-smart agriculture",
  "Digital agriculture",
  "Market access",
] as const;
