export const expenses = [
  {
    key: 'expense.multi_level_approval',
    value: true,
  },
  {
    key: 'expense.approver_chain',
    value: ['manager', 'finance_manager'],
  },
  {
    key: 'expense.approval_fallback',
    value: ['super_admin', 'hr_director'],
  },
];
