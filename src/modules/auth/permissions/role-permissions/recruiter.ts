export const RecruiterPermissions = [
  'ess.login',
  // Jobs
  'jobs.read',
  'jobs.manage',

  // Applications
  'applications.read',
  'applications.manage',

  // Interviews
  'interviews.read',
  'interviews.schedule',
  'interviews.submit_feedback',
  'interviews.manage',

  // Offers
  'offers.read',
  'offers.manage',

  // Read-only on org structure
  'company.read',
  'company.manage',
  'company.summary',
  'company.elements',

  'locations.read',
  'locations.manage',
  'locations.managers',

  'department.read',
  'department.manage',
  'department.hierarchy',

  // Limited employee context (for application matching)
  'employees.read_one',
  'employees.manage',
  'employees.assign_manager',

  // Reports (recruitment-related)
  'reports.attendance.read', // optional, remove if not needed

  // Permissions (view-only, optional)
  'roles.read',
];
