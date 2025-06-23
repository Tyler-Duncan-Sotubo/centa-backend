export const payroll = [
  // Base
  { key: 'payroll.currency', value: 'NGN' }, // Nigerian Naira
  { key: 'payroll.pay_cycle', value: ['monthly'] }, // Pay once per month
  { key: 'payroll.pay_day', value: 28 }, // 28th of every month

  // Payroll Run
  { key: 'payroll.multi_level_approval', value: false },
  {
    key: 'payroll.approver_chain',
    value: ['payroll_specialist', 'super_admin'],
  },
  {
    key: 'payroll.approval_fallback',
    value: ['super_admin', 'hr_director'],
  },
  { key: 'payroll.approver', value: 'payroll_specialist' },
  { key: 'payroll.enable_proration', value: true },
  { key: 'payroll.proration_method', value: 'calendar_days' },

  // 13th Month
  { key: 'payroll.enable_13th_month', value: true },
  { key: 'payroll.13th_month_payment_date', value: '2024-12-28' }, // 28th December
  { key: 'payroll.13th_month_payment_amount', value: 100000 }, // ₦100,000
  { key: 'payroll.13th_month_payment_type', value: 'fixed' }, // Fixed amount
  { key: 'payroll.13th_month_payment_percentage', value: 0 }, // 0% of salary
  { key: 'payroll.13th_month_payment_percentage_of_salary', value: 0 }, // 0% of salary

  // Payroll Settings
  { key: 'payroll.apply_paye', value: false },
  { key: 'payroll.apply_nhf', value: false },
  { key: 'payroll.apply_pension', value: false },
  { key: 'payroll.apply_nhis', value: false },
  { key: 'payroll.apply_nsitf', value: true },
  { key: 'payroll.default_pension_employee_percent', value: 8 }, // 8% employee
  { key: 'payroll.default_pension_employer_percent', value: 10 }, // 10% employer
  { key: 'payroll.nhf_percent', value: 2.5 }, // NHF fixed rate 2.5%

  // Salary Structure
  { key: 'payroll.basic_percent', value: 50 },
  { key: 'payroll.housing_percent', value: 25 },
  { key: 'payroll.transport_percent', value: 10 },
  {
    key: 'payroll.allowance_others',
    value: [
      { type: 'Utility', percentage: 3 },
      { type: 'Medical', percentage: 3 },
      { type: 'Meal', percentage: 2 },
      { type: 'Data', percentage: 1 },
      { type: 'Balance', percentage: 6 },
    ],
  },

  // Employee Attendance To Payroll
  { key: 'payroll.use_overtime', value: true }, // Overtime allowed
  { key: 'payroll.overtime_rate_multiplier', value: 1.5 }, // 1.5x overtime rate
  { key: 'payroll.deduction_for_absence', value: true }, // Deduct for absences

  // Employee Leave To Payroll
  { key: 'payroll.use_leave', value: true }, // Leave allowed
  { key: 'payroll.leave_deduction', value: true }, // Deduct for leave
  { key: 'payroll.leave_deduction_percent', value: 0.5 }, // 50% deduction for leave

  // Employee Loan To Payroll
  { key: 'payroll.use_loan', value: true },
  { key: 'payroll.loan_max_percent', value: 0.5 }, // max 50% of annual gross
  { key: 'payroll.loan_min_amount', value: 10000 }, // min ₦10,000
  { key: 'payroll.loan_max_amount', value: 1000000 }, // max ₦1,000,000

  // Tax To Payroll
  { key: 'payroll.default_tax_relief', value: 200000 }, // ₦200,000 personal income tax relief
];
