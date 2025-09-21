import { defaultModule, MODULE_SETTING_KEY } from '../constants/constants';

export const onboarding = [
  { key: MODULE_SETTING_KEY('payroll'), value: defaultModule('payroll') },
  { key: MODULE_SETTING_KEY('company'), value: defaultModule('company') },
  { key: MODULE_SETTING_KEY('employees'), value: defaultModule('employees') },
];
