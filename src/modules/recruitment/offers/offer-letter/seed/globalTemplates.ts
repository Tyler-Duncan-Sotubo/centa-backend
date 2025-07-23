export const globalTemplates = [
  /* ───────────────────────── 1. Professional Full-Time Offer ───────────────────────── */
  {
    name: 'Professional Full-Time Offer',
    isDefault: true,
    isSystemTemplate: true,
    content: `
<!-- PRO FULL-TIME OFFER TEMPLATE -->
<div style="text-align: right; margin-bottom: 20px;">
  <img src="{{companyLogoUrl}}" alt="Company Logo" style="height: 60px;" />
</div>
<p><strong>Subject:</strong> Employment offer from {{companyName}}</p>

<p>Dear {{candidateFirstName}},</p>

<p>
  We are pleased to offer you the position of <strong>{{jobTitle}}</strong> at
  <strong>{{companyName}}</strong>.
</p>

<p>
  Your annual cost to company is <strong>₦{{salaryNumeric}}</strong>
  ({{salaryWords}}).&nbsp;The breakdown of your gross salary and information
  specific to employee benefits can be found in <strong>Annexure A</strong>.
</p>

<p>
  We would like you to start on <strong>{{startDate}}</strong> from your base
  location: <strong>{{workLocation}}</strong>.<br />
  You will work with the {{teamName}} team and report directly to
  {{managerName}} ({{managerTitle}}).
</p>

<p>
  If you choose to accept this job offer, please sign and return this letter by
  <strong>{{offerExpiryDate}}</strong>.&nbsp;Once we receive your acceptance, we
  will provide onboarding information and required documentation.
</p>

<p>
  We are confident you will find this opportunity rewarding. On behalf of
  {{companyName}}, welcome aboard!
</p>

<p>​Sincerely,<br />{{hrName}}<br />{{hrTitle}}, {{companyName}}</p>

<hr />

<h3>Annexure A – Salary Details</h3>
<table>
  <thead>
    <tr>
      <th style="text-align:left;">Component</th>
      <th style="text-align:left;">Amount (₦)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Basic Pay</td><td>{{salary.basic}}</td></tr>
    <tr><td>House Rent Allowance</td><td>{{salary.hra}}</td></tr>
    <tr><td>Other Allowances</td><td>{{salary.allowances}}</td></tr>
    <tr><td>Pension Benefits</td><td>{{salary.pension}}</td></tr>
    <tr><td><strong>Gross Monthly Salary</strong></td><td><strong>{{salary.total}}</strong></td></tr>
  </tbody>
</table>

<p>
  <em>Salary is paid on the {{payDay}} of each month via {{paymentMethod}}.</em>
</p>

<h4>Additional Terms</h4>
<p><strong>Probation:</strong> You will be on probation for {{probationPeriod}} from your joining date.</p>
<p><strong>Salary Revision:</strong> Compensation may be revised after {{revisionAfter}}, subject to performance.</p>
<p><strong>Employee Benefits:</strong> {{companyName}} will sponsor Group Health Insurance with a coverage of ₦{{insuranceCoverage}}.</p>
<p><strong>Confidentiality:</strong> You agree not to disclose proprietary information without approval.</p>
<p><strong>Termination:</strong> Employment is at-will and may be ended by either party with or without notice.</p>

<hr />

<p><strong>Accepted by:</strong> {{candidateFullName}}</p>

<p class="signature">
  Candidate Signature: <strong>{{sig_cand}}</strong><br />
  Date: <strong>{{date_cand}}</strong>
</p>

<p class="signature">
  Employer Signature: <strong>{{sig_emp}}</strong><br />
  Date: <strong>{{date_emp}}</strong>
</p>
    `.trim(),
  },

  /* ───────────────────────── 2. Simple Standard Offer ───────────────────────── */
  {
    name: 'Simple Standard Offer',
    isDefault: false,
    isSystemTemplate: true,
    content: `
<!-- SIMPLE STANDARD OFFER TEMPLATE -->
<div style="text-align: right; margin-bottom: 20px;">
  <img src="{{companyLogoUrl}}" alt="Company Logo" style="height: 60px;" />
</div>
<p>
  <strong>{{companyName}}</strong><br />
  {{companyAddress}}<br />
  {{companyEmail}}<br />
  {{companyPhone}}
</p>

<p>{{todayDate}}</p>

<p>Dear {{candidateFullName}},</p>

<p>
  We are pleased to extend an offer of employment with {{companyName}} as a
  <strong>{{jobTitle}}</strong>. After careful consideration, we’re confident you will
  be a great match for our team.
</p>

<p>
  As the {{jobTitle}}, your responsibilities will include {{jobSummary}}.
  If you accept, you will report to {{managerName}} and begin work on
  <strong>{{startDate}}</strong>.
</p>

<p>
  The starting salary for this position is <strong>₦{{baseSalary}}</strong> paid
  {{payFrequency}} by {{paymentMethod}}.
</p>

<p>You will also be eligible for:</p>
<ul>
  <li>Bonus: {{bonusDetails}}</li>
  <li>Benefits: {{benefitsSummary}}</li>
</ul>

<p>
  To accept this offer, please sign and return this letter by
  <strong>{{responseDueDate}}</strong>.
</p>

<p>
  If you have any questions, please reach out to {{contactPerson}} at
  {{contactEmail}}.
</p>

<p>Congratulations and welcome to {{companyName}}!</p>

<p>​Sincerely,<br />{{hrName}}<br />{{hrJobTitle}}</p>

<hr />

<h4>Signatures</h4>

<p class="signature">
  Employer Signature: <strong>{{sig_emp}}</strong><br />
  Employer Name: {{hrName}}<br />
  Date: <strong>{{date_emp}}</strong>
</p>

<p class="signature">
  Candidate Signature: <strong>{{sig_cand}}</strong><br />
  Candidate Name: {{candidateFullName}}<br />
  Date: <strong>{{date_cand}}</strong>
</p>
    `.trim(),
  },
];
