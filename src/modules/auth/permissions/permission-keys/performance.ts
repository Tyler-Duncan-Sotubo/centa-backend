export const PerformancePermissions = [
  // General access
  'performance.read', // View performance dashboard (Admin, Manager, Employee)
  'performance.settings', // View performance settings (Admin, Super Admin)

  // Goal Management
  'performance.goals.create', // Create own goals (Employee, Manager)
  'performance.goals.edit', // Edit own goals (Employee, Manager)
  'performance.goals.read', // View goals (All roles)
  'performance.goals.approve', // Approve goals (Manager, Admin)
  'performance.goals.manage_all', // Manage goals for all users (Admin, Super Admin)

  // Review Cycle Management
  'performance.cycles.read', // View review cycles (All roles)
  'performance.cycles.manage', // Create/update review cycles (Admin, Super Admin)

  // Assessments
  'performance.reviews.submit_self', // Submit self-assessment (Employee)
  'performance.reviews.submit_peer', // Submit peer review (Employee)
  'performance.reviews.submit_manager', // Submit manager review (Manager)
  'performance.reviews.read', // View own reviews (All roles)
  'performance.reviews.read_team', // View team reviews (Manager)
  'performance.reviews.manage_all', // View/edit all reviews (Admin, Super Admin)

  // Calibration & Ratings
  'performance.calibration.view', // View calibration data (Admin, Super Admin)
  'performance.calibration.export', // Export calibration data (Admin, Super Admin)

  // Notifications / Reminders
  'performance.reminders.configure', // Configure review/goal reminders (Admin)
];
